"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/admin/stat-card";
import { PageTitle } from "@/components/admin/page-title";
import { formatPrice } from "@/lib/utils";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<any>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/v1/admin/reports?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setData(data));
  };

  useEffect(() => { load(); }, []);

  if (!data) return <div>Loading...</div>;

  const maxRevenue = Math.max(...data.daily.map((d: any) => d.revenue), 1);

  return (
    <div className="space-y-6">
      <PageTitle title="Reports" description="Sales and performance analytics" />

      <Card>
        <CardContent className="p-5">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={load}>Apply</Button>
            <Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>
              Last 30 days
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={data.revenue} icon={DollarSign} format="currency" />
        <StatCard label="Orders" value={data.orders} icon={ShoppingCart} />
        <StatCard label="New customers" value={data.newCustomers} icon={Users} />
        <StatCard
          label="Avg. order value"
          value={data.orders > 0 ? data.revenue / data.orders : 0}
          icon={TrendingUp}
          format="currency"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 flex items-end gap-1">
              {data.daily.map((d: any) => (
                <div
                  key={d.date}
                  className="flex-1 bg-primary rounded-t hover:opacity-80 transition-opacity"
                  style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                  title={`${d.date}: ${formatPrice(d.revenue)} (${d.orders} orders)`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this period</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.quantity} sold</p>
                    </div>
                    <p className="font-semibold">{formatPrice(p.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}