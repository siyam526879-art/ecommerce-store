import { prisma } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { AppError } from "@/lib/errors";
import { CURRENCY } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";

interface CreatePaymentIntentParams {
  orderId: string;
  paymentId: string;
  amount: number;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<string> {
  if (!isStripeConfigured() || !stripe) {
    throw new AppError(
      "Payment system is not configured. Please contact support.",
      503,
      "PAYMENT_NOT_CONFIGURED"
    );
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Stripe uses cents
      currency: CURRENCY.stripe,
      metadata: {
        orderId: params.orderId,
        paymentId: params.paymentId,
        ...params.metadata,
      },
      automatic_payment_methods: { enabled: true },
      capture_method: "automatic",
    });

    // Update payment record with intent ID
    await prisma.payment.update({
      where: { id: params.paymentId },
      data: { providerPaymentId: intent.id },
    });

    if (!intent.client_secret) {
      throw new AppError("Failed to create payment intent", 500, "STRIPE_ERROR");
    }

    return intent.client_secret;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[Stripe] Create intent failed:", err);
    throw new AppError("Payment initialization failed", 500, "STRIPE_ERROR");
  }
}

export async function createRefund(params: {
  paymentId: string;
  amount?: number;
  reason?: string;
}): Promise<string> {
  if (!isStripeConfigured() || !stripe) {
    throw new AppError("Payment system is not configured", 503, "PAYMENT_NOT_CONFIGURED");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { order: { include: { user: true } } },
  });

  if (!payment) throw new AppError("Payment not found", 404);
  if (payment.provider !== "stripe") {
    throw new AppError("Refunds only supported for card payments", 400, "INVALID_PAYMENT_PROVIDER");
  }
  if (payment.status !== "SUCCEEDED") {
    throw new AppError("Payment cannot be refunded", 400, "PAYMENT_NOT_REFUNDABLE");
  }

  const refundAmount = params.amount ?? Number(payment.amount);
  if (refundAmount > Number(payment.amount)) {
    throw new AppError("Refund amount exceeds payment", 400, "REFUND_TOO_LARGE");
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.providerPaymentId,
      amount: Math.round(refundAmount * 100),
      reason: "requested_by_customer",
      metadata: { paymentId: params.paymentId },
    });

    // Create refund record
    await prisma.refund.create({
      data: {
        paymentId: params.paymentId,
        amount: new Decimal(refundAmount),
        status: refund.status === "succeeded" ? "SUCCEEDED" : "PENDING",
        providerRefundId: refund.id,
        reason: params.reason,
      },
    });

    // Update payment status
    const totalRefunded = await prisma.refund.aggregate({
      where: { paymentId: params.paymentId },
      _sum: { amount: true },
    });
    const refundedTotal = Number(totalRefunded._sum.amount ?? 0);
    const newStatus =
      refundedTotal >= Number(payment.amount) ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await prisma.payment.update({
      where: { id: params.paymentId },
      data: {
        status: newStatus,
        refundedAt: newStatus === "REFUNDED" ? new Date() : undefined,
      },
    });

    if (newStatus === "REFUNDED") {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "REFUNDED" },
      });
    }

    return refund.id;
  } catch (err) {
    console.error("[Stripe] Refund failed:", err);
    throw new AppError("Refund failed", 500, "REFUND_FAILED");
  }
}