import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paginated, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";

// GET /api/v1/admin/inventory
export async function GET(request: NextRequest) {
  try {
    await requirePermission("products.view");

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      200,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 50))
    );
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const filter = request.nextUrl.searchParams.get("filter") ?? "";

    const where: any = {};

    if (q) {
      where.OR = [
        { sku: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (filter === "out") {
      where.stock = { lte: 0 };
    } else if (filter === "low") {
      where.stock = { gt: 0, lte: 5 };
    } else if (filter === "in") {
      where.stock = { gt: 5 };
    }

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        orderBy: [{ stock: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              images: { take: 1, where: { isPrimary: true } },
            },
          },
        },
      }),
      prisma.productVariant.count({ where }),
    ]);

    return paginated(variants, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}