"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

type Totals = { revenue: number; orders: number; units: number; profit: number; missingCost: number };
type Day = { date: string; revenue: number; profit: number; units: number };
type Data = { days: Day[]; current: Totals; previous: Totals; updatedAt: string };

const UP = "\u2191";
const DOWN = "\u2193";

function pct(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function Change({ cur, prev }: { cur: number; prev: number }) {
  const p = pct(cur, prev);
  const up = p >= 0;
  return (
    <span className={"text-xs font-medium " + (up ? "text-green-600" : "text-red-600")}>
      {up ? UP : DOWN} {Math.abs(p).toFixed(1)}% {up ? "higher" : "lower"} than previous 30 days
    </span>
  );
}

function Stat({ label, value, cur, prev }: { label: string; value: string; cur: number; prev: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <Change cur={cur} prev={prev} />
    </div>
  );
}

export function LiveSales() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/v1/admin/dashboard/live", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.data) throw new Error("fail");
        if (alive) {
          setData(json.data);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data) {
    return <p className="text-sm text-muted-foreground">{error ? "Could not load data" : "Loading..."}</p>;
  }

  const { days, current: c, previous: p } = data;
  const maxRev = Math.max(...days.map((d) => d.revenue), 1);
  const maxAbsProfit = Math.max(...days.map((d) => Math.abs(d.profit)), 1);
  const profitUp = c.profit >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        Live &middot; Last updated {new Date(data.updatedAt).toLocaleTimeString()}
        {error && <span className="text-red-600">(connection problem)</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales (30 days)" value={formatPrice(c.revenue)} cur={c.revenue} prev={p.revenue} />
        <Stat label="Units sold" value={String(c.units)} cur={c.units} prev={p.units} />
        <Stat label="Order" value={String(c.orders)} cur={c.orders} prev={p.orders} />
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{profitUp ? "Profit" : "Loss"}</p>
          <p className={"text-xl font-bold " + (profitUp ? "text-green-600" : "text-red-600")}>
            {formatPrice(Math.abs(c.profit))}
          </p>
          <Change cur={c.profit} prev={p.profit} />
        </div>
      </div>

      {c.missingCost > 0 && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {c.missingCost} sold items have no cost price, so their profit was not calculated.
        </p>
      )}

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Daily sales</p>
        <div className="flex h-40 items-end gap-0.5">
          {days.map((d) => (
            <div
              key={d.date}
              className="flex-1 rounded-t bg-[#f85606] transition-all hover:opacity-80"
              style={{ height: Math.max((d.revenue / maxRev) * 100, 2) + "%" }}
              title={d.date + ": " + formatPrice(d.revenue) + " | " + d.units + " unit"}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{days[0].date}</span>
          <span>{days[days.length - 1].date}</span>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Daily profit (green) / loss (red)</p>
        <div className="flex h-28 gap-0.5">
          {days.map((d) => {
            const h = Math.max((Math.abs(d.profit) / maxAbsProfit) * 100, d.profit === 0 ? 0 : 3);
            return (
              <div
                key={d.date}
                className="flex flex-1 flex-col"
                title={d.date + ": " + (d.profit >= 0 ? "Profit " : "Loss ") + formatPrice(Math.abs(d.profit))}
              >
                <div className="flex flex-1 items-end">
                  {d.profit > 0 && <div className="w-full rounded-t bg-green-500" style={{ height: h + "%" }} />}
                </div>
                <div className="flex flex-1 items-start">
                  {d.profit < 0 && <div className="w-full rounded-b bg-red-500" style={{ height: h + "%" }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}