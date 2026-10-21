import Link from "next/link";
import { cookies } from "next/headers";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PageTitle } from "@/components/admin/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/layout/status-badge";
import { formatPrice } from "@/lib/utils";
import { SellerDashboardClient } from "./dashboard-client";

export const metadata = { title: "Seller Dashboard" };

export default async function SellerDashboardPage() {
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/seller/stats`,
    {
      cache: "no-store",
      headers: { cookie: cookieStore.toString() },
    }
  );

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const stats = data?.data ?? {
    revenue: { total: 0, thisMonth: 0, trend: 0 },
    orders: { total: 0, thisMonth: 0, pending: 0 },
    products: 0,
    lowStockCount: 0,
    recentOrders: [],
    salesChart: [],
  };

  const trendPositive = stats.revenue.trend >= 0;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Dashboard"
        description="Overview of your store performance"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.revenue.total)}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {trendPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={trendPositive ? "text-green-600" : "text-red-600"}>
                {Math.abs(stats.revenue.trend).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders This Month
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders.thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.orders.pending} pending  {stats.orders.total} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <Link
              href="/seller/products"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              Manage products <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales  last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SellerDashboardClient chart={stats.salesChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link
              href="/seller/orders"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentOrders?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No orders yet
              </p>
            ) : (
              stats.recentOrders?.slice(0, 5).map((o: any) => (
                <Link
                  key={o.id}
                  href={`/seller/orders/${o.id}`}
                  className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium truncate">
                      {o.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.user?.name ?? o.user?.email ?? "Guest"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {formatPrice(Number(o.total))}
                    </p>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Required */}
      {(stats.orders.pending > 0 || stats.lowStockCount > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.orders.pending > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-amber-900">
                  {stats.orders.pending} order(s) need confirmation
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/seller/orders?status=PENDING">Review</Link>
                </Button>
              </div>
            )}
            {stats.lowStockCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-amber-900">
                  {stats.lowStockCount} product variant(s) low on stock
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/seller/products?filter=low">Restock</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}