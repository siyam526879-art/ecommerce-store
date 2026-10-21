import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? "";
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "newest";
  const discount = sp.get("discount") === "1";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(48, Math.max(1, parseInt(sp.get("pageSize") ?? "24") || 24));
  const minPrice = parseFloat(sp.get("minPrice") ?? "");
  const maxPrice = parseFloat(sp.get("maxPrice") ?? "");

  let categoryIds: string[] | null = null;
  let activeName: string | null = null;
  if (category) {
    const all = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true },
    });
    const cat = all.find((c) => c.slug === category);
    if (cat) {
      activeName = cat.name;
      categoryIds = [cat.id, ...all.filter((s) => s.parentId === cat.id).map((s) => s.id)];
    } else {
      categoryIds = [];
    }
  }

  const price: Prisma.DecimalFilter = {};
  if (!isNaN(minPrice)) price.gte = minPrice;
  if (!isNaN(maxPrice)) price.lte = maxPrice;

  const baseWhere: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(categoryIds && { categoryId: { in: categoryIds } }),
    ...(Object.keys(price).length > 0 && { basePrice: price }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { basePrice: "asc" }
    : sort === "price_desc" ? { basePrice: "desc" }
    : sort === "name" ? { name: "asc" }
    : { createdAt: "desc" };

  const include = {
    category: { select: { name: true, slug: true } },
    images: { orderBy: { order: "asc" as const }, take: 1 },
  };

  let rows = await prisma.product.findMany({
    where: discount ? { ...baseWhere, compareAtPrice: { not: null } } : baseWhere,
    orderBy,
    take: 300,
    include,
  });
  if (discount) {
    rows = rows.filter((p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.basePrice));
    if (rows.length === 0) {
      rows = await prisma.product.findMany({ where: baseWhere, orderBy, take: 300, include });
    }
  }

  if (sort === "newest") {
    const bucket = Math.floor(Date.now() / 8000);
    const rand = rng(bucket);
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
  }

  const total = rows.length;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    activeName,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    products: slice.map((p) => ({
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