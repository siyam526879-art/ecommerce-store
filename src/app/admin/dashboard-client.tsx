"use client";

interface DataPoint {
  date: string;
  total: number;
}

export function DashboardClient({ chart }: { chart: DataPoint[] }) {
  if (chart.length === 0) {
    return <p className="text-sm text-muted-foreground">No sales data yet</p>;
  }

  const max = Math.max(...chart.map((d) => Number(d.total)), 1);

  return (
    <div className="h-56 flex items-end gap-1">
      {chart.map((d) => {
        const height = max > 0 ? (Number(d.total) / max) * 100 : 0;
        return (
          <div key={d.date}
            className="flex-1 flex flex-col items-center group relative"
            title={`${d.date}: $${Number(d.total).toFixed(2)}`}>
            <div className="w-full bg-primary rounded-t transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(height, 2)}%` }} />
            <div className="absolute -top-8 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap shadow">
              {d.date}: ${Number(d.total).toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}