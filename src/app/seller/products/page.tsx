import Link from "next/link";
import { cookies } from "next/headers";
import { Package } from "lucide-react";
import { PageTitle } from "@/components/admin/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "My Products" };

export default async function SellerProductsPage() {
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/seller/products?pageSize=100`,
    {
      cache: "no-store",
      headers: { cookie: cookieStore.toString() },
    }
  );

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const products = data?.data ?? [];
  const total = data?.pagination?.total ?? products.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle
          title="My Products"
          description={`${total} products in your catalog`}
        />
        <Button asChild>
          <Link href="/admin/products/new">
            <Package className="h-4 w-4 mr-2" /> Add product
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No products yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {products.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50"
                >
                  <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                    {p.images?.[0]?.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.images[0].url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.category?.name ?? "Uncategorized"} {" "}
                      {p._count?.variants ?? 0} variants
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">
                      {formatPrice(Number(p.basePrice ?? 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.status}</p>
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