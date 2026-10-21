import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0") || 0);
  const take = Math.min(48, Math.max(1, parseInt(searchParams.get("take") ?? "24") || 24));

  try {
    const rows = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: take + 1,
      include: {
        category: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    const hasMore = rows.length > take;
    const products = rows.slice(0, take).map((p: any) => ({
      ...p,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    }));

    return NextResponse.json({ products, hasMore });
  } catch {
    return NextResponse.json({ products: [], hasMore: false, error: true }, { status: 500 });
  }
}