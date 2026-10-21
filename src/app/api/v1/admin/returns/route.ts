import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { AppError, NotFoundError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("returns.view");

    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") ?? 1)
    );
    const pageSize = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20))
    );

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: {
            select: {
              orderNumber: true,
              user: { select: { email: true, name: true } },
            },
          },
          refunds: {
            select: {
              id: true,
              paymentId: true,
              amount: true,
              status: true,
              providerRefundId: true,
            },
          },
        },
      }),
      prisma.return.count(),
    ]);

    return paginated(returns, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requirePermission("returns.manage");
    const parsed = patchSchema.safeParse(await request.json());

    if (!parsed.success) {
      throw new AppError("Invalid return status request.", 400, "INVALID_REQUEST");
    }

    const { id, status } = parsed.data;

    const returnRequest = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: true,
            payments: true,
          },
        },
        refunds: true,
      },
    });

    if (!returnRequest) throw new NotFoundError("Return");

    if (returnRequest.status === "COMPLETED") {
      if (status === "COMPLETED") {
        return success({ return: returnRequest, message: "Refund already completed." });
      }
      throw new AppError(
        "A completed return cannot be changed.",
        409,
        "RETURN_ALREADY_COMPLETED"
      );
    }

    if (status === "COMPLETED") {
      throw new AppError(
        "A return can only be completed after Stripe confirms the refund.",
        400,
        "REFUND_CONFIRMATION_REQUIRED"
      );
    }

    if (status === "REQUESTED") {
      if (returnRequest.status !== "REQUESTED") {
        throw new AppError(
          "This return cannot be moved back to Requested.",
          409,
          "INVALID_RETURN_TRANSITION"
        );
      }
      return success({ return: returnRequest });
    }

    if (status === "REJECTED") {
      if (returnRequest.status !== "REQUESTED") {
        throw new AppError(
          "Only a requested return can be rejected.",
          409,
          "INVALID_RETURN_TRANSITION"
        );
      }

      const updated = await prisma.return.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      await logAudit({
        userId: user.id,
        action: "UPDATE_STATUS",
        resource: "return",
        resourceId: id,
        metadata: { status: "REJECTED" },
        ...getRequestInfo(request),
      });

      return success({ return: updated, message: "Return request rejected." });
    }

    // APPROVED: initiate or safely resume the Stripe refund.
    if (returnRequest.status !== "REQUESTED" && returnRequest.status !== "APPROVED") {
      throw new AppError(
        "Only a requested or already approved return can be processed.",
        409,
        "INVALID_RETURN_TRANSITION"
      );
    }

    if (!isStripeConfigured() || !stripe) {
      throw new AppError(
        "Stripe is not configured. No refund was issued.",
        503,
        "PAYMENT_NOT_CONFIGURED"
      );
    }

    const payment = returnRequest.order.payments.find(
      (item) =>
        item.provider === "stripe" &&
        (item.status === "SUCCEEDED" || item.status === "PARTIALLY_REFUNDED") &&
        item.providerPaymentId.startsWith("pi_")
    );

    if (!payment) {
      throw new AppError(
        "No successful Stripe payment was found for this order. No refund was issued.",
        400,
        "NO_REFUNDABLE_STRIPE_PAYMENT"
      );
    }

    const amount = Number(returnRequest.refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError("The refund amount is invalid.", 400, "INVALID_REFUND_AMOUNT");
    }

    // Reuse an existing refund for this return rather than issuing another one.
    const existingRefund = returnRequest.refunds.find(
      (item) => item.paymentId === payment.id
    );

    if (existingRefund?.status === "SUCCEEDED") {
      const updated = await prisma.return.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      await logAudit({
        userId: user.id,
        action: "UPDATE_STATUS",
        resource: "return",
        resourceId: id,
        metadata: { status: "COMPLETED", refundId: existingRefund.id },
        ...getRequestInfo(request),
      });

      return success({ return: updated, message: "Refund was already successful." });
    }

    if (existingRefund?.providerRefundId && existingRefund.status === "PENDING") {
      const providerRefund = await stripe.refunds.retrieve(
        existingRefund.providerRefundId
      );

      if (providerRefund.status === "succeeded") {
        await prisma.refund.update({
          where: { id: existingRefund.id },
          data: { status: "SUCCEEDED" },
        });

        const updated = await prisma.return.update({
          where: { id },
          data: { status: "COMPLETED" },
        });

        return success({
          return: updated,
          message: "Stripe confirmed that the refund succeeded.",
        });
      }

      if (
        providerRefund.status === "pending" ||
        providerRefund.status === "requires_action"
      ) {
        const updated = await prisma.return.update({
          where: { id },
          data: { status: "APPROVED" },
        });

        return success({
          return: updated,
          message: "The Stripe refund is still pending.",
        });
      }

      await prisma.refund.update({
        where: { id: existingRefund.id },
        data: { status: "FAILED" },
      });

      throw new AppError(
        "The previous Stripe refund did not succeed. Review the refund before retrying.",
        409,
        "PREVIOUS_REFUND_FAILED"
      );
    }

    // Include completed and pending refunds so the payment cannot be over-refunded.
    const paymentRefunds = await prisma.refund.findMany({
      where: {
        paymentId: payment.id,
        status: { in: ["SUCCEEDED", "PENDING"] },
      },
      select: { amount: true },
    });

    const alreadyReserved = paymentRefunds.reduce(
      (total, refund) => total + Number(refund.amount),
      0
    );

    if (alreadyReserved + amount > Number(payment.amount) + 0.001) {
      throw new AppError(
        "This refund would exceed the remaining refundable payment amount.",
        400,
        "REFUND_TOO_LARGE"
      );
    }

    // Persist approval before calling Stripe.
    if (returnRequest.status !== "APPROVED") {
      await prisma.return.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.providerPaymentId,
        amount: Math.round(amount * 100),
        reason: "requested_by_customer",
        metadata: {
          returnId: returnRequest.id,
          orderId: returnRequest.orderId,
          paymentId: payment.id,
        },
      },
      {
        idempotencyKey: `return-refund-${returnRequest.id}`,
      }
    );

    const refundStatus =
      refund.status === "succeeded"
        ? "SUCCEEDED"
        : refund.status === "failed" || refund.status === "canceled"
          ? "FAILED"
          : "PENDING";

    const savedRefund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        returnId: returnRequest.id,
        amount: new Decimal(amount.toFixed(2)),
        status: refundStatus,
        providerRefundId: refund.id,
        reason: returnRequest.reason,
      },
    });

    let updatedReturn;

    if (refundStatus === "SUCCEEDED") {
      const successfulRefunds = await prisma.refund.findMany({
        where: { paymentId: payment.id, status: "SUCCEEDED" },
        select: { amount: true },
      });

      const refundedTotal = successfulRefunds.reduce(
        (total, item) => total + Number(item.amount),
        0
      );

      const fullyRefunded = refundedTotal >= Number(payment.amount) - 0.001;

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
          refundedAt: fullyRefunded ? new Date() : null,
        },
      });

      if (fullyRefunded) {
        await prisma.order.update({
          where: { id: returnRequest.orderId },
          data: { status: "REFUNDED" },
        });
      }

      updatedReturn = await prisma.return.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
    } else {
      updatedReturn = await prisma.return.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    }

    await logAudit({
      userId: user.id,
      action: "UPDATE_STATUS",
      resource: "return",
      resourceId: id,
      metadata: {
        status: updatedReturn.status,
        refundId: savedRefund.id,
        providerRefundId: refund.id,
        stripeStatus: refund.status,
        amount,
      },
      ...getRequestInfo(request),
    });

    return success({
      return: updatedReturn,
      refund: {
        id: savedRefund.id,
        status: refundStatus,
        providerStatus: refund.status,
        amount,
      },
      message:
        refundStatus === "SUCCEEDED"
          ? "Stripe refund completed successfully."
          : refundStatus === "PENDING"
            ? "Refund submitted to Stripe and is pending confirmation."
            : "Stripe did not complete the refund. Review the refund record.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
