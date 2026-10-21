import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse, paginated } from "@/lib/api-response";
import { parseQuery, paginationSchema, searchSchema } from "@/lib/validators/api.schema";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const raw = Object.fromEntries(searchParams.entries());

    const pagination = parseQuery(paginationSchema, raw);
    const search = parseQuery(searchSchema, raw);

    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
      ...(search.q && {
        OR: [
          { name: { contains: search.q, mode: "insensitive" } },
          { description: { contains: search.q, mode: "insensitive" } },
        ],
      }),
      ...(search.category && { category: { slug: search.category } }),
      ...(search.minPrice !== undefined && {
        basePrice: { gte: search.minPrice },
      }),
      ...(search.maxPrice !== undefined && {
        basePrice: { lte: search.maxPrice },
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (search.sort) {
        case "price_asc": return { basePrice: "asc" };
        case "price_desc": return { basePrice: "desc" };
        case "name": return { name: "asc" };
        default: return { createdAt: "desc" };
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          category: { select: { name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return paginated(products, total, pagination.page, pagination.pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}
