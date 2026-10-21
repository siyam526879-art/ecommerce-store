import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("categories.view");
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true } } },
    });
    if (!category) throw new NotFoundError("Category");

    const rows = await prisma.product.findMany({
      where: { categoryId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        sku: true,
        isFeatured: true,
        basePrice: true,
        compareAtPrice: true,
        stock: true,
        status: true,
        images: { orderBy: { order: "asc" }, select: { url: true } },
      },
    });

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      shortDescription: p.shortDescription ?? "",
      sku: p.sku ?? "",
      isFeatured: p.isFeatured,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      stock: p.stock,
      status: p.status,
      images: p.images.map((i) => i.url),
      image: p.images[0]?.url ?? null,
    }));

    return success({ category, products });
  } catch (err) {
    return errorResponse(err);
  }
}