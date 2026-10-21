"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Item = { id: string; name: string; quantity: number; price: number; slug: string | null; image: string | null };
type Order = { id: string; status: string; items: Item[] };

const TAKA = "\u09F3";
const STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

function Stage({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.toUpperCase() === status);
  if (idx === -1) {
    const bad = status === "CANCELLED" || status === "REFUNDED" || status === "RETURNED";
    return (
      <span className={"rounded-full px-3 py-1 text-xs font-bold " + (bad ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700")}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  }
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            <div className={"h-0.5 flex-1 " + (i === 0 ? "bg-transparent" : i <= idx ? "bg-[#f85606]" : "bg-gray-200")} />
            <div
              className={
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " +
                (i < idx ? "bg-[#f85606] text-white" : i === idx ? "bg-[#f85606] text-white ring-4 ring-orange-100" : "bg-gray-200 text-gray-500")
              }
            >
              {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className={"h-0.5 flex-1 " + (i === STEPS.length - 1 ? "bg-transparent" : i < idx ? "bg-[#f85606]" : "bg-gray-200")} />
          </div>
          <span className={"mt-1 text-[11px] " + (i === idx ? "font-bold text-[#f85606]" : "text-gray-500")}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/my-orders", { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json?.orders)) setOrders(json.orders);
    } catch {
      /* ignored */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (loaded && orders.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center">
        <p className="mb-3 text-gray-600">No orders yet</p>
        <Link href="/shop" className="rounded bg-[#f85606] px-5 py-2 text-sm font-bold text-white">
          Shop now
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="overflow-hidden rounded-lg border bg-white">
          <div className="divide-y">
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                  ) : null}
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
          <div className="border-t px-4 py-4">
            <Stage status={o.status} />
          </div>
        </div>
      ))}
    </div>
  );
}