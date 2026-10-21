import { cookies } from "next/headers";
import { BarChart3 } from "lucide-react";
import { PageTitle } from "@/components/admin/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { SellerDashboardClient } from "../dashboard-client";

export const metadata = { title: "Analytics" };

export default async function SellerAnalyticsPage() {
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
    salesChart: [],
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Analytics"
        description="Detailed performance insights"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(stats.revenue.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(stats.revenue.thisMonth)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.revenue.trend >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(stats.revenue.trend).toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.orders.total}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sales Trend — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SellerDashboardClient chart={stats.salesChart} />
        </CardContent>
      </Card>
    </div>
  );
}