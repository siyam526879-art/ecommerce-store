import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth-guard";
import { z } from "zod";

// Client calls this to validate cart before showing payment UI
const schema = z.object({
  couponCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { couponCode } = schema.parse(await request.json());

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { name: true, status: true, trackInventory: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return success({ valid: false, error: "Cart is empty" });
    }

    const issues: string[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      if (item.variant.product.status !== "ACTIVE") {
        issues.push(`"${item.variant.product.name}" is no longer available`);
      } else if (item.variant.product.trackInventory && item.variant.stock < item.quantity) {
        issues.push(`Only ${item.variant.stock} left of "${item.variant.product.name}"`);
      } else {
        subtotal += Number(item.variant.price) * item.quantity;
      }
    }

    // Validate coupon
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase(), isActive: true },
      });
      if (!coupon) {
        issues.push("Invalid coupon code");
      } else {
        const now = new Date();
        if (coupon.startsAt && coupon.startsAt > now) issues.push("Coupon not yet active");
        if (coupon.expiresAt && coupon.expiresAt < now) issues.push("Coupon has expired");
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) issues.push("Coupon usage limit reached");
        if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
          issues.push(`Minimum order ${Number(coupon.minOrder)} required`);
        }
        if (coupon.type === "PERCENT") discount = (subtotal * Number(coupon.value)) / 100;
        else if (coupon.type === "FIXED") discount = Math.min(Number(coupon.value), subtotal);
      }
    }

    return success({
      valid: issues.length === 0,
      issues,
      subtotal,
      discount,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
    });
  } catch (err) {
    return errorResponse(err);
  }
}