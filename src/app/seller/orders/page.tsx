import Link from "next/link";
import { cookies } from "next/headers";
import { ShoppingCart } from "lucide-react";
import { PageTitle } from "@/components/admin/page-title";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/layout/status-badge";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Orders" };

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;

  const url = new URL(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/seller/orders?pageSize=100`
  );
  if (params.status) url.searchParams.set("status", params.status);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const orders = data?.data ?? [];
  const total = data?.pagination?.total ?? orders.length;

  const statuses = ["", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Orders"
        description={`${total} orders`}
      />

      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/seller/orders?status=${s}` : "/seller/orders"}
            className={
              "text-xs px-3 py-1.5 rounded border transition-colors " +
              (params.status === s || (!params.status && !s)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted")
            }
          >
            {s || "All"}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/seller/orders/${o.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium">
                      {o.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.user?.name ?? o.user?.email ?? "Guest"} {" "}
                      {new Date(o.placedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold">
                      {formatPrice(Number(o.total))}
                    </span>
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