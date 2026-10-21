import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    const role = (session.user as any).role;
    const userId = session.user.id;

    if (role !== "STAFF") throw new ForbiddenError();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // ✅ ALWAYS filter by sellerId = current user
    const productWhere = { sellerId: userId };
    const orderFilter = { items: { some: { variant: { product: { sellerId: userId } } } } };

    const [
      totalProducts, lowStockCount, totalOrders, monthOrders, pendingOrders,
      revenueAgg, monthRevenueAgg, lastMonthRevenueAgg, recentOrders,
    ] = await Promise.all([
      prisma.product.count({ where: { ...productWhere, status: "ACTIVE" } }),
      prisma.productVariant.count({
        where: { stock: { lte: 5 }, product: { ...productWhere, status: "ACTIVE" } },
      }),
      prisma.order.count({ where: orderFilter }),
      prisma.order.count({ where: { placedAt: { gte: startOfMonth }, ...orderFilter } }),
      prisma.order.count({ where: { status: "PENDING", ...orderFilter } }),
      prisma.order.aggregate({
        where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] }, ...orderFilter },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { placedAt: { gte: startOfMonth }, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] }, ...orderFilter },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { placedAt: { gte: startOfLastMonth, lt: startOfMonth }, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] }, ...orderFilter },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { placedAt: "desc" },
        where: orderFilter,
        select: { id: true, orderNumber: true, total: true, status: true, placedAt: true, user: { select: { name: true, email: true } } },
      }),
    ]);

    const revenueNow = Number(revenueAgg._sum?.total ?? 0);
    const monthNow = Number(monthRevenueAgg._sum?.total ?? 0);
    const monthPrev = Number(lastMonthRevenueAgg._sum?.total ?? 0);
    const revenueTrend = monthPrev > 0 ? ((monthNow - monthPrev) / monthPrev) * 100 : 0;

    return success({
      revenue: { total: revenueNow, thisMonth: monthNow, trend: revenueTrend },
      orders: { total: totalOrders, thisMonth: monthOrders, pending: pendingOrders },
      products: totalProducts,
      lowStockCount,
      recentOrders,
      salesChart: [],
    });
  } catch (err) {
    return errorResponse(err);
  }
}