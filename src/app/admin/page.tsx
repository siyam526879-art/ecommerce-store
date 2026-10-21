import { ShoppingCart, Users, AlertTriangle, DollarSign } from "lucide-react";
import { cookies } from "next/headers";
import { StatCard } from "@/components/admin/stat-card";
import { PageTitle } from "@/components/admin/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/layout/status-badge";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { LiveSales } from "@/components/admin/live-sales";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/admin/dashboard`,
    {
      cache: "no-store",
      headers: { cookie: cookieStore.toString() },
    }
  );

  if (!res.ok) {
    return (
      <div>
        <PageTitle title="Dashboard" />
        <p className="text-destructive">Failed to load dashboard data.</p>
      </div>
    );
  }

  const { data } = await res.json();

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" description="Overview of your store performance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total revenue" value={data.revenue.total} icon={DollarSign}
          format="currency" trend={{ value: data.revenue.trend, label: "vs last month" }} />
        <StatCard label="Orders this month" value={data.orders.thisMonth} icon={ShoppingCart} />
        <StatCard label="Customers" value={data.customers} icon={Users} />
        <StatCard label="Low stock items" value={data.lowStockCount} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Sales &amp; profit - last 30 days (live)</CardTitle></CardHeader>
          <CardContent><LiveSales /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick stats</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total orders</span>
              <span className="font-medium">{data.orders.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending orders</span>
              <span className="font-medium">{data.orders.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active products</span>
              <span className="font-medium">{data.products}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">This month revenue</span>
              <span className="font-medium">{formatPrice(data.revenue.thisMonth)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent orders</CardTitle>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map((o: any) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div>
                    <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.user?.name ?? o.user?.email}  {new Date(o.placedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(Number(o.total))}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}