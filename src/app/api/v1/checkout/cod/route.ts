import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { createOrder } from "@/services/order.service";
import { sendEmail, orderConfirmationHtml } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "Cart is empty"),
  addressId: z.string().min(1),
  shippingMethodId: z.string().min(1).optional(),
  deliveryZone: z.enum(["inside", "outside"]).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    // ===== COD enabled check =====
    const codSetting = await prisma.siteSetting.findUnique({
      where: { key: "payments.cod.enabled" },
    });

    let codEnabled = true;
    if (codSetting) {
      const v = codSetting.value as any;
      codEnabled = v === true || v === "true";
    }

    if (!codEnabled) {
      return Response.json(
        {
          success: false,
          error: {
            code: "COD_DISABLED",
            message: "Cash on delivery is not available",
          },
        },
        { status: 400 }
      );
    }

    // ===== Parse body =====
    const body = schema.parse(await request.json());

    // ===== SYNC client items  DB cart =====
    // Service reads from DB cart, so we must sync first
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    // Clear existing cart items
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Insert fresh items
    for (const item of body.items) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }

    // ===== Create order via service (reads from DB cart) =====
    const result = await createOrder({
      userId: user.id,
      shippingAddressId: body.addressId,
      shippingMethodId: body.shippingMethodId,
      deliveryZone: body.shippingMethodId ? undefined : body.deliveryZone,
      paymentMethod: "cod",
      notes: body.notes,
    });

    const order = result.order;

    // ===== Send confirmation email (optional) =====
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: true,
        items: { select: { name: true, quantity: true, price: true } },
      },
    });

    if (orderWithItems && orderWithItems.user.email) {
      try {
        await sendEmail({
          to: orderWithItems.user.email,
          subject: "Order " + orderWithItems.orderNumber + " confirmed",
          html: orderConfirmationHtml({
            orderNumber: orderWithItems.orderNumber,
            customerName: orderWithItems.user.name || "Customer",
            total: Number(orderWithItems.total),
            items: orderWithItems.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: Number(i.price),
            })),
          }),
        });
      } catch (emailErr) {
        console.error("[COD EMAIL FAILED]", emailErr);
      }
    }

    // ===== Audit log =====
    await logAudit({
      userId: user.id,
      action: "COD_ORDER_PLACED",
      resource: "order",
      resourceId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        total: order.total,
      },
      ...getRequestInfo(request),
    });

    return success(
      {
        orderNumber: order.orderNumber,
        orderId: order.id,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}