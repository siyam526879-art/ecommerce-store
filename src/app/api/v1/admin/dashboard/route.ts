import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";

export async function GET() {
  try {
    await requirePermission("reports.view");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalOrders,
      monthOrders,
      totalCustomers,
      totalProducts,
      pendingOrders,
      lowStock,
      recentOrders,
      salesByDay,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          placedAt: { gte: startOfMonth },
          status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          placedAt: { gte: startOfLastMonth, lt: startOfMonth },
          status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { placedAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.productVariant.count({
        where: { stock: { lte: 5 }, product: { status: "ACTIVE" } },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { placedAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          placedAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      // Sales by day (last 30 days)
      prisma.order.findMany({
        where: {
          placedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        select: { placedAt: true, total: true },
      }),
    ]);

    // Aggregate sales by day
    const salesMap = new Map<string, number>();
    for (const o of salesByDay) {
      const day = o.placedAt.toISOString().slice(0, 10);
      salesMap.set(day, (salesMap.get(day) ?? 0) + Number(o.total));
    }
    const salesChart = Array.from(salesMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const revenueNow = Number(totalRevenue._sum.total ?? 0);
    const monthNow = Number(monthRevenue._sum.total ?? 0);
    const monthPrev = Number(lastMonthRevenue._sum.total ?? 0);
    const revenueTrend = monthPrev > 0 ? ((monthNow - monthPrev) / monthPrev) * 100 : 0;

    return success({
      revenue: { total: revenueNow, thisMonth: monthNow, trend: revenueTrend },
      orders: { total: totalOrders, thisMonth: monthOrders, pending: pendingOrders },
      customers: totalCustomers,
      products: totalProducts,
      lowStockCount: lowStock,
      recentOrders,
      salesChart,
    });
  } catch (err) {
    return errorResponse(err);
  }
}