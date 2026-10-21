import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { generateOrderNumber } from "@/lib/utils";
import { AppError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

interface CreateOrderParams {
  userId: string;
  shippingAddressId: string;
  billingAddressId?: string;
  couponCode?: string;
  notes?: string;
  paymentMethod: "card" | "cod";
  shippingMethodId?: string;
  deliveryZone?: "inside" | "outside";
}

interface CreateOrderResult {
  order: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
  };
  paymentId?: string;
}

export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  // 1. Get cart with full product data
  const cart = await prisma.cart.findUnique({
    where: { userId: params.userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, status: true, trackInventory: true } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError("Cart is empty", 400, "EMPTY_CART");
  }

  // 2. Validate all products are active and in stock (server-side truth)
  for (const item of cart.items) {
    if (item.variant.product.status !== "ACTIVE") {
      throw new AppError(
        `Product "${item.variant.product.name}" is no longer available`,
        400,
        "PRODUCT_UNAVAILABLE"
      );
    }
    if (item.variant.product.trackInventory && item.variant.stock < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${item.variant.product.name}"`,
        400,
        "INSUFFICIENT_STOCK"
      );
    }
  }

  // 3. Calculate totals using DB prices (never trust client)
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0
  );

  // 4. Apply coupon
  let discountAmount = 0;
  let couponId: string | undefined;
  if (params.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: params.couponCode.toUpperCase(), isActive: true },
    });
    if (coupon) {
      const now = new Date();
      const valid =
        (!coupon.startsAt || coupon.startsAt <= now) &&
        (!coupon.expiresAt || coupon.expiresAt >= now) &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
        (!coupon.minOrder || subtotal >= Number(coupon.minOrder));

      if (valid) {
        if (coupon.type === "PERCENT") {
          discountAmount = (subtotal * Number(coupon.value)) / 100;
        } else if (coupon.type === "FIXED") {
          discountAmount = Math.min(Number(coupon.value), subtotal);
        } else if (coupon.type === "FREE_SHIPPING") {
          discountAmount = 0; // applied to shipping below
        }
        couponId = coupon.id;
      }
    }
  }

  // 5. Calculate shipping from persisted global settings and the saved address.
  const [globalFreeDeliveryEnabledSetting, globalFreeDeliveryMinimumSetting] =
    await Promise.all([
      prisma.siteSetting.findUnique({
        where: { key: "shipping.freeDelivery.enabled" },
      }),
      prisma.siteSetting.findUnique({
        where: { key: "shipping.freeDelivery.minimumOrder" },
      }),
    ]);

  const globalFreeDeliveryEnabled =
    globalFreeDeliveryEnabledSetting?.value === true;

  const configuredGlobalMinimum = Number(
    globalFreeDeliveryMinimumSetting?.value ?? 1000
  );

  const globalFreeDeliveryMinimum =
    Number.isFinite(configuredGlobalMinimum) && configuredGlobalMinimum >= 0
      ? configuredGlobalMinimum
      : 1000;

  const qualifiesForGlobalFreeDelivery =
    globalFreeDeliveryEnabled && subtotal >= globalFreeDeliveryMinimum;

  let shippingAmount = 0;
  let shippingMethodName: string | null = null;
  let shippingEstimatedDays: string | null = null;
  let calculatedDeliveryZone: "inside" | "outside" | null = null;

  if (params.shippingMethodId) {
    const method = await prisma.shippingMethod.findUnique({
      where: { id: params.shippingMethodId },
      include: { zone: true },
    });

    const isBangladeshZone =
      method !== null &&
      Array.isArray(method.zone.countries) &&
      method.zone.countries.includes("BD");

    if (!method || !method.isActive || !method.zone.isActive || !isBangladeshZone) {
      throw new AppError(
        "The selected shipping method is unavailable. Please choose another courier.",
        400,
        "INVALID_SHIPPING_METHOD"
      );
    }

    const shippingAddress = await prisma.address.findFirst({
      where: {
        id: params.shippingAddressId,
        userId: params.userId,
        deletedAt: null,
      },
      select: { city: true },
    });

    if (!shippingAddress || !shippingAddress.city.trim()) {
      throw new AppError(
        "A valid delivery address is required to calculate shipping.",
        400,
        "INVALID_SHIPPING_ADDRESS"
      );
    }

    const isDhakaDistrict =
      shippingAddress.city.trim().toLowerCase() === "dhaka";

    calculatedDeliveryZone = isDhakaDistrict ? "inside" : "outside";
    shippingMethodName = method.name;
    shippingEstimatedDays = method.estimatedDays;

    const price = isDhakaDistrict
      ? Number(method.dhakaPrice ?? method.price)
      : Number(method.outsideDhakaPrice ?? method.price);

    const freeThreshold =
      method.freeThreshold !== null ? Number(method.freeThreshold) : null;

    const isFreeShippingCoupon =
      Boolean(couponId) &&
      (await prisma.coupon.findUnique({ where: { id: couponId! } }))?.type ===
        "FREE_SHIPPING";

    if (
      isFreeShippingCoupon ||
      qualifiesForGlobalFreeDelivery ||
      (freeThreshold !== null && subtotal >= freeThreshold)
    ) {
      shippingAmount = 0;
    } else {
      shippingAmount = price;
    }
  } else if (params.deliveryZone) {
    // Backward compatibility for callers that do not select a shipping method.
    const ZONE_PRICE: Record<"inside" | "outside", number> = {
      inside: 60,
      outside: 120,
    };

    calculatedDeliveryZone = params.deliveryZone;

    const isFreeShippingCoupon =
      Boolean(couponId) &&
      (await prisma.coupon.findUnique({ where: { id: couponId! } }))?.type ===
        "FREE_SHIPPING";

    shippingAmount =
      isFreeShippingCoupon || qualifiesForGlobalFreeDelivery
        ? 0
        : ZONE_PRICE[params.deliveryZone];
  } else {
    shippingAmount = qualifiesForGlobalFreeDelivery ? 0 : 60;
  }
  // 6. Tax (configurable via settings)
  const taxSetting = await prisma.siteSetting.findUnique({ where: { key: "tax.rate" } });
  const taxRate = taxSetting ? Number(taxSetting.value) : 0;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;

  const total = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);

  // 7. Create order + decrement stock atomically
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: params.userId,
        status: "PENDING",
        subtotal: new Decimal(subtotal),
        discountAmount: new Decimal(discountAmount),
        shippingAmount: new Decimal(shippingAmount),
        deliveryZone: calculatedDeliveryZone ?? params.deliveryZone ?? null,
        shippingMethodName,
        shippingEstimatedDays,
        taxAmount: new Decimal(taxAmount),
        total: new Decimal(total),
        shippingAddressId: params.shippingAddressId,
        billingAddressId: params.billingAddressId ?? params.shippingAddressId,
        notes: params.notes,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            name: item.variant.product.name,
            sku: item.variant.sku ?? undefined,
            price: item.variant.price,
            quantity: item.quantity,
            total: new Decimal(Number(item.variant.price) * item.quantity),
          })),
        },
        statusLog: {
          create: {
            fromStatus: "PENDING",
            toStatus: "PENDING",
            note: "Order created",
            changedBy: "system",
          },
        },
      },
    });

    // Decrement stock (with safety check via transaction)
    for (const item of cart.items) {
      if (item.variant.product.trackInventory) {
        const updated = await tx.productVariant.update({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity }, // optimistic lock
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (!updated) {
          throw new AppError(
            `Stock race condition for variant ${item.variantId}`,
            409,
            "STOCK_RACE"
          );
        }
      }
    }

    // Record coupon usage
    if (couponId) {
      await tx.couponUsage.create({
        data: { couponId, orderId: order.id, userId: params.userId },
      });
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Create payment record
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: params.paymentMethod === "cod" ? "cod" : "stripe",
        providerPaymentId:
          params.paymentMethod === "cod"
            ? `cod-${order.orderNumber}`
            : `pending-${order.orderNumber}`, // updated by webhook
        amount: new Decimal(total),
        status: "PENDING",
        method: params.paymentMethod,
      },
    });

    return { order, payment };
  });

  return {
    order: {
      id: result.order.id,
      orderNumber: result.order.orderNumber,
      total: Number(result.order.total),
      status: result.order.status,
    },
    paymentId: result.payment.id,
  };
}

export async function releaseOrderStock(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { variant: { select: { product: { select: { trackInventory: true } } } } },
    });

    for (const item of items) {
      // Re-fetch variant to check trackInventory via product
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { trackInventory: true } } },
      });
      if (variant?.product.trackInventory) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  });
}

export async function markOrderConfirmed(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING") return;

    await tx.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED", paidAt: new Date() },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        note: "Payment confirmed",
        changedBy: "system",
      },
    });
  });
}

export async function markOrderFailed(orderId: string, reason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING") return;

    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        note: reason ?? "Payment failed",
        changedBy: "system",
      },
    });
  });

  await releaseOrderStock(orderId);
}
