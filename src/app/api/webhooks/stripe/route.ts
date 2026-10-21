import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  orderConfirmationEmail,
  refundConfirmationEmail,
} from "@/lib/email-templates";
import { markOrderConfirmed, markOrderFailed } from "@/services/order.service";
import { Decimal } from "@prisma/client/runtime/library";

export const runtime = "nodejs"; // Required for Stripe webhook crypto

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("[Webhook] Stripe not configured");
    return new Response("Not configured", { status: 500 });
  }

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        // Unhandled event type â€” acknowledge to prevent retries
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Webhook] Handler failed for ${event.type}:`, err);
    // Return 500 so Stripe retries
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceeded(intent: any) {
  const paymentId = intent.metadata?.paymentId;
  const orderId = intent.metadata?.orderId;

  if (!paymentId || !orderId) {
    console.error("[Webhook] Missing metadata on intent", intent.id);
    return;
  }

  // IDEMPOTENCY: Check if already processed
  const existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existingPayment) {
    console.error(`[Webhook] Payment ${paymentId} not found`);
    return;
  }
  if (existingPayment.status === "SUCCEEDED") {
    console.log(`[Webhook] Payment ${paymentId} already processed â€” skipping`);
    return;
  }

  // Update payment
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "SUCCEEDED",
      providerPaymentId: intent.id,
      capturedAt: new Date(),
      method: intent.payment_method_types?.[0] ?? "card",
      last4: intent.charges?.data?.[0]?.payment_method_details?.card?.last4,
    },
  });

  // Confirm order
  await markOrderConfirmed(orderId);

  // Send confirmation email
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { select: { name: true, quantity: true, price: true } },
    },
  });
  if (order) {
    const email = orderConfirmationEmail({
      customerName: order.user.name ?? "Customer",
      orderNumber: order.orderNumber,
      total: Number(order.total),
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: Number(i.price),
      })),
    });
    await sendEmail({ to: order.user.email, ...email });
  }

  console.log(`[Webhook] Payment succeeded: ${intent.id} â†’ order ${orderId}`);
}

async function handlePaymentFailed(intent: any) {
  const paymentId = intent.metadata?.paymentId;
  const orderId = intent.metadata?.orderId;

  if (!paymentId || !orderId) return;

  // IDEMPOTENCY
  const existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existingPayment || existingPayment.status === "FAILED") return;

  const lastError = intent.last_payment_error?.message ?? "Payment failed";

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED", metadata: { error: lastError } },
  });

  await markOrderFailed(orderId, lastError);
  console.log(`[Webhook] Payment failed: ${intent.id} â†’ order ${orderId}`);
}

async function handleChargeRefunded(charge: any) {
  const intentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!intentId || !stripe) return;

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: intentId },
    include: { order: { include: { user: true } } },
  });

  if (!payment) return;

  // Stripe is the source of truth. Retrieve the individual refund objects,
  // rather than treating charge.amount_refunded as one individual refund.
  let successfulRefundCents = 0;

  for await (const providerRefund of stripe.refunds.list({
    payment_intent: intentId,
    limit: 100,
  })) {
    const status =
      providerRefund.status === "succeeded"
        ? "SUCCEEDED"
        : providerRefund.status === "failed" ||
            providerRefund.status === "canceled"
          ? "FAILED"
          : "PENDING";

    const metadataReturnId = providerRefund.metadata?.returnId || null;

    if (status === "SUCCEEDED") {
      successfulRefundCents += providerRefund.amount;
    }

    // providerRefundId is unique, making webhook retries idempotent.
    await prisma.refund.upsert({
      where: { providerRefundId: providerRefund.id },
      create: {
        paymentId: payment.id,
        returnId: metadataReturnId,
        amount: new Decimal((providerRefund.amount / 100).toFixed(2)),
        status,
        providerRefundId: providerRefund.id,
        reason: providerRefund.reason ?? undefined,
      },
      update: {
        paymentId: payment.id,
        amount: new Decimal((providerRefund.amount / 100).toFixed(2)),
        status,
        ...(metadataReturnId ? { returnId: metadataReturnId } : {}),
        reason: providerRefund.reason ?? undefined,
      },
    });

    if (metadataReturnId) {
      if (status === "SUCCEEDED") {
        await prisma.return.updateMany({
          where: { id: metadataReturnId },
          data: { status: "COMPLETED" },
        });
      } else if (status === "PENDING") {
        await prisma.return.updateMany({
          where: { id: metadataReturnId, status: { not: "COMPLETED" } },
          data: { status: "APPROVED" },
        });
      }
    }
  }

  // Never count pending or failed refunds toward the completed refund total.
  if (successfulRefundCents <= 0) {
    console.log(
      `[Webhook] No successful refunds to synchronize for payment ${payment.id}`
    );
    return;
  }

  const refundedAmount = successfulRefundCents / 100;
  const paymentAmountCents = Math.round(Number(payment.amount) * 100);
  const fullyRefunded = successfulRefundCents >= paymentAmountCents;
  const newStatus = fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      refundedAt: fullyRefunded ? new Date() : null,
    },
  });

  if (fullyRefunded && payment.order.status !== "REFUNDED") {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "REFUNDED" },
    });

    const email = refundConfirmationEmail({
      customerName: payment.order.user.name ?? "Customer",
      orderNumber: payment.order.orderNumber,
      amount: refundedAmount,
    });

    await sendEmail({ to: payment.order.user.email, ...email });
  }

  console.log(
    `[Webhook] Refunds synchronized for payment ${payment.id}: ${refundedAmount}`
  );
}

