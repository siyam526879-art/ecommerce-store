import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0") || 0);
  const limit = Math.min(60, Math.max(1, parseInt(sp.get("limit") ?? "18") || 18));

  const where = { status: "ACTIVE" };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
      category: p.category,
      status: p.status,
    })),
  });
}