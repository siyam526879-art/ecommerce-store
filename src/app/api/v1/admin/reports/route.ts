import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { z } from "zod";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission("reports.view");
    const q = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = q.to ? new Date(q.to) : new Date();

    const where = {
      placedAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
    };

    const [orders, revenue, topProducts, newCustomers] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { total: true } }),
      prisma.orderItem.groupBy({
        by: ["name"],
        where: { order: { placedAt: { gte: from, lte: to }, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: from, lte: to } },
      }),
    ]);

    // Daily breakdown
    const allOrders = await prisma.order.findMany({
      where,
      select: { placedAt: true, total: true },
    });
    const daily = new Map<string, { orders: number; revenue: number }>();
    for (const o of allOrders) {
      const day = o.placedAt.toISOString().slice(0, 10);
      const cur = daily.get(day) ?? { orders: 0, revenue: 0 };
      daily.set(day, { orders: cur.orders + 1, revenue: cur.revenue + Number(o.total) });
    }

    return success({
      period: { from: from.toISOString(), to: to.toISOString() },
      orders,
      revenue: Number(revenue._sum.total ?? 0),
      newCustomers,
      topProducts: topProducts.map((p) => ({
        name: p.name,
        quantity: p._sum.quantity ?? 0,
        revenue: Number(p._sum.total ?? 0),
      })),
      daily: Array.from(daily.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    return errorResponse(err);
  }
}