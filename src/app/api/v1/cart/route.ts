import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { z } from "zod";

const addItemSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return success({ items: [] });

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    images: { take: 1, orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) return success({ items: [] });

    const items = cart.items.map((item) => ({
      variantId: item.variantId,
      productId: item.variant.productId,
      name: item.variant.product.name,
      slug: item.variant.product.slug,
      price: Number(item.variant.price),
      image: item.variant.product.images[0]?.url,
      attributes: item.variant.attributes as Record<string, string>,
      quantity: item.quantity,
      stock: item.variant.stock,
    }));

    return success({ items });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } },
        { status: 400 }
      );
    }

    const { variantId, quantity } = parsed.data;

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: { product: { select: { status: true } } },
    });

    if (!variant || variant.product.status !== "ACTIVE") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product variant not found" } },
        { status: 404 }
      );
    }

    if (variant.stock < quantity) {
      return Response.json(
        { success: false, error: { code: "INSUFFICIENT_STOCK" } },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    });

    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, variantId, quantity },
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await request.json();
    const { variantId, quantity } = z.object({
      variantId: z.string(),
      quantity: z.number().int().min(0).max(99),
    }).parse(body);

    const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
    if (!cart) return success({ ok: true });

    if (quantity === 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, variantId },
      });
    } else {
      await prisma.cartItem.updateMany({
        where: { cartId: cart.id, variantId },
        data: { quantity },
      });
    }

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    await prisma.cartItem.deleteMany({
      where: { cart: { userId: session.user.id } },
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}