import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const id = session?.user?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const rows = await prisma.review.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      product: {
        select: { name: true, slug: true, images: { orderBy: { order: "asc" }, take: 1, select: { url: true } } },
      },
    },
  });

  return NextResponse.json({
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: (r.body ?? "").replace(/\[img:[^\]\s]+\]/g, "").trim(),
      createdAt: r.createdAt,
      name: r.product.name,
      slug: r.product.slug,
      image: r.product.images[0]?.url ?? null,
    })),
  });
}

export async function DELETE() {
  return NextResponse.json({ error: "Only an admin can delete reviews" }, { status: 403 });
}
