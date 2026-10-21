"use client";

interface DataPoint {
  date: string;
  total: number;
}

export function SellerDashboardClient({ chart }: { chart: DataPoint[] }) {
  if (!chart || chart.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        No sales data in the last 30 days
      </div>
    );
  }

  const max = Math.max(...chart.map((d) => Number(d.total)), 1);

  return (
    <div>
      <div className="h-56 flex items-end gap-1">
        {chart.map((d) => {
          const height = max > 0 ? (Number(d.total) / max) * 100 : 0;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center group relative"
              title={`${d.date}: $${Number(d.total).toFixed(2)}`}
            >
              <div
                className="w-full bg-primary rounded-t transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute -top-8 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap shadow z-10">
                {d.date}: ${Number(d.total).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{chart[0]?.date}</span>
        <span>{chart[chart.length - 1]?.date}</span>
      </div>
    </div>
  );
}