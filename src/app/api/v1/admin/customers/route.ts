import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("customers.view");
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20)));
    const q = request.nextUrl.searchParams.get("q") ?? "";

    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      ...(q && {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, email: true, name: true, phone: true, createdAt: true, isActive: true,
          _count: { select: { orders: true } },
          orders: { select: { total: true }, orderBy: { placedAt: "desc" }, take: 1 },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(customers, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}