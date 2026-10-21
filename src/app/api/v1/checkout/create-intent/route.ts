import { NextRequest } from "next/server";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { createOrder } from "@/services/order.service";
import { createPaymentIntent } from "@/services/payment.service";
import { isStripeConfigured } from "@/lib/stripe";
import { checkoutLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  shippingAddressId: z.string(),
  billingAddressId: z.string().optional(),
  shippingMethodId: z.string().optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    // ---- Rate limiting (10 attempts per hour per user+IP) ----
    const ip = getClientIp(request);
    const { success: allowed, reset } = await checkoutLimiter.limit(
      `checkout:${user.id}:${ip}`
    );
    if (!allowed) {
      return rateLimitResponse(reset);
    }
    // ----------------------------------------------------------

    if (!isStripeConfigured()) {
      return Response.json(
        {
          success: false,
          error: {
            code: "PAYMENT_NOT_CONFIGURED",
            message: "Payment system is not configured. Please contact support.",
          },
        },
        { status: 503 }
      );
    }

    const body = schema.parse(await request.json());

    // Create order (validates stock, calculates totals atomically)
    const { order, paymentId } = await createOrder({
      userId: user.id,
      ...body,
      paymentMethod: "card",
    });

    // Create Stripe PaymentIntent
    const clientSecret = await createPaymentIntent({
      orderId: order.id,
      paymentId: paymentId!,
      amount: order.total,
      metadata: { orderNumber: order.orderNumber, userId: user.id },
    });

    await logAudit({
      userId: user.id,
      action: "CHECKOUT_INITIATED",
      resource: "order",
      resourceId: order.id,
      metadata: { orderNumber: order.orderNumber, total: order.total },
      ...getRequestInfo(request),
    });

    return success({
      orderNumber: order.orderNumber,
      orderId: order.id,
      clientSecret,
    });
  } catch (err) {
    return errorResponse(err);
  }
}