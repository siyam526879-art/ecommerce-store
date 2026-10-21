import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const filterSchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission("orders.view");
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20)));
    const filters = filterSchema.parse(raw);

    const where: Prisma.OrderWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.q && {
        OR: [
          { orderNumber: { contains: filters.q, mode: "insensitive" } },
          { user: { email: { contains: filters.q, mode: "insensitive" } } },
          { user: { name: { contains: filters.q, mode: "insensitive" } } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return paginated(orders, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}