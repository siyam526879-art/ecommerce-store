import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth-guard";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            compareAtPrice: true,
            status: true,
            stock: true,
            images: { where: { isPrimary: true }, take: 1 },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return success({ items: items.map((i) => i.product) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { productId } = z.object({ productId: z.string() }).parse(await request.json());

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {},
      create: { userId: user.id, productId },
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const { productId } = z.object({ productId: z.string() }).parse(await request.json());

    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}