import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const VALID = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
const DAY = 24 * 60 * 60 * 1000;
const TZ_OFFSET = 6 * 60 * 60 * 1000; // Bangladesh UTC+6

const dayKey = (d: Date) => new Date(d.getTime() + TZ_OFFSET).toISOString().slice(0, 10);

async function loadPeriod(from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: from, lt: to }, status: { in: VALID } },
    select: {
      placedAt: true,
      total: true,
      items: {
        select: {
          quantity: true,
          price: true,
          variant: { select: { product: { select: { costPrice: true } } } },
        },
      },
    },
  });

  const byDay = new Map<string, { revenue: number; profit: number; units: number }>();
  const totals = { revenue: 0, orders: orders.length, units: 0, profit: 0, missingCost: 0 };

  for (const o of orders) {
    const key = dayKey(o.placedAt);
    const row = byDay.get(key) ?? { revenue: 0, profit: 0, units: 0 };
    const orderTotal = Number(o.total);
    row.revenue += orderTotal;
    totals.revenue += orderTotal;

    for (const it of o.items) {
      row.units += it.quantity;
      totals.units += it.quantity;
      const cost = it.variant?.product?.costPrice;
      if (cost === null || cost === undefined) {
        totals.missingCost += 1;
      } else {
        const p = (Number(it.price) - Number(cost)) * it.quantity;
        row.profit += p;
        totals.profit += p;
      }
    }
    byDay.set(key, row);
  }
  return { byDay, totals };
}

export async function GET() {
  try {
    await requirePermission("reports.view");

    const now = new Date();
    const start = new Date(now.getTime() - 30 * DAY);
    const prevStart = new Date(now.getTime() - 60 * DAY);

    const [cur, prev] = await Promise.all([
      loadPeriod(start, new Date(now.getTime() + 1000)),
      loadPeriod(prevStart, start),
    ]);

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(new Date(now.getTime() - i * DAY));
      const r = cur.byDay.get(key) ?? { revenue: 0, profit: 0, units: 0 };
      days.push({ date: key, revenue: r.revenue, profit: r.profit, units: r.units });
    }

    return success({
      days,
      current: cur.totals,
      previous: prev.totals,
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}