import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { createRefund } from "@/services/payment.service";
import { sendEmail } from "@/lib/email";
import { refundConfirmationEmail } from "@/lib/email-templates";
import { NotFoundError, AppError } from "@/lib/errors";
import { z } from "zod";

const schema = z.object({
  amount: z.number().min(0.01).optional(),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("orders.refund");
    const { id: orderId } = await params;
    const body = schema.parse(await request.json());

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { where: { status: "SUCCEEDED" } },
        user: true,
      },
    });
    if (!order) throw new NotFoundError("Order");

    const payment = order.payments[0];
    if (!payment) {
      throw new AppError("No successful payment to refund", 400, "NO_PAYMENT");
    }
    if (payment.provider !== "stripe") {
      throw new AppError(
        `Refunds not supported for ${payment.provider} payments`,
        400,
        "INVALID_PROVIDER"
      );
    }

    const refundId = await createRefund({
      paymentId: payment.id,
      amount: body.amount,
      reason: body.reason,
    });

    // Send refund email
    const email = refundConfirmationEmail({
      customerName: order.user.name ?? "Customer",
      orderNumber: order.orderNumber,
      amount: body.amount ?? Number(payment.amount),
    });
    await sendEmail({ to: order.user.email, ...email });

    await logAudit({
      userId: user.id,
      action: "REFUND_ISSUED",
      resource: "order",
      resourceId: orderId,
      metadata: { refundId, amount: body.amount, reason: body.reason },
      ...getRequestInfo(request),
    });

    return success({ refundId });
  } catch (err) {
    return errorResponse(err);
  }
}