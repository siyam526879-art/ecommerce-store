"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS } from "@/lib/constants";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  placedAt: string;
  user?: { name?: string | null; email: string };
  _count: { items: number };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    fetch(`/api/v1/admin/orders?${params}`)
      .then((r) => r.json())
      .then((json) => {
        const list = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.orders)
          ? json.data.orders
          : [];
        setOrders(list);
      })
      .catch(() => setOrders([]));
  }, [status, q]);

  const goToOrder = (id: string) => {
    if (id) router.push("/admin/orders/" + id);
  };

  return (
    <div>
      <PageTitle title="Orders" description={(orders?.length ?? 0) + " shown"} />

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search order # or customer..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Array.isArray(ORDER_STATUS) ? ORDER_STATUS : Object.values(ORDER_STATUS)).map((s: any) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border bg-muted/50 p-8 text-center text-sm text-muted-foreground">
          No orders found.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Order</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Items</th>
                <th className="text-left p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => goToOrder(o.id)}
                  className="border-t hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono font-medium text-primary">
                    {o.orderNumber}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{o.user?.name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.user?.email}
                    </p>
                  </td>
                  <td className="p-3">{o._count.items}</td>
                  <td className="p-3">{formatPrice(Number(o.total))}</td>
                  <td className="p-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="p-3">
                    {new Date(o.placedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}