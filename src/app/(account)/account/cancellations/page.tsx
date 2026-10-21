"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { id: string; name: string; quantity: number; price: number; image: string | null };
type Order = { id: string; orderNumber: string; status: string; total: number; placedAt: string; items: Item[] };

const TAKA = "\u09F3";

export default function CancellationsPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    fetch("/api/v1/my-orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setOrders((j.orders ?? []).filter((o: Order) => o.status === "CANCELLED" || o.status === "REFUNDED")))
      .catch(() => setOrders([]));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-medium">My Cancellations</h1>
      {!orders && <p className="text-sm text-gray-500">Loading...</p>}
      {orders && orders.length === 0 && (
        <div className="rounded-sm bg-white py-14 text-center">
          <p className="mb-3 text-gray-600">You have no cancelled orders.</p>
          <Link href="/account/orders" className="rounded bg-[#f85606] px-5 py-2 text-sm font-bold text-white">
            My Orders
          </Link>
        </div>
      )}
      <div className="space-y-3">
        {orders?.map((o) => (
          <div key={o.id} className="rounded-sm bg-white">
            <div className="flex justify-between border-b px-4 py-2 text-xs text-gray-500">
              <span>{o.orderNumber}</span>
              <span className="font-semibold text-red-600">{o.status.charAt(0) + o.status.slice(1).toLowerCase()}</span>
            </div>
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-gray-500">Qty {i.quantity}</p>
                </div>
                <p className="text-sm font-semibold">
                  {TAKA}
                  {(i.price * i.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}