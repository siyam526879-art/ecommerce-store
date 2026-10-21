import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ orders: [] }, { status: 401 });

  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      placedAt: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          variant: {
            select: {
              product: {
                select: { slug: true, images: { orderBy: { order: "asc" }, take: 1, select: { url: true } } },
              },
            },
          },
        },
      },
    },
  });

  const orders = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: Number(o.total),
    placedAt: o.placedAt,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: Number(i.price),
      slug: i.variant?.product?.slug ?? null,
      image: i.variant?.product?.images?.[0]?.url ?? null,
    })),
  }));

  return NextResponse.json({ orders });
}