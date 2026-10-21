"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/layout/status-badge";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  slug?: string;
  basePrice?: number | string;
  price?: number | string;
  status: string;
  images?: { url: string }[];
  category?: { name: string } | null;
  variants?: { id: string }[];
  _count?: { variants: number };
};

export function ProductsClient({ initial }: { initial: Product[] }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.category?.name ?? "").toLowerCase().includes(s)
    );
  }, [q, items]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? "Delete failed");
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const getPrice = (p: Product) => {
    const val = p.basePrice ?? p.price;
    return Number(val ?? 0);
  };

  const getVariantCount = (p: Product) => {
    if (p._count?.variants !== undefined) return p._count.variants;
    return p.variants?.length ?? 0;
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No products found.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50"
                >
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {p.images?.[0]?.url ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No img</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.category?.name ?? "Uncategorized"}  {getVariantCount(p)} variants
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatPrice(getPrice(p))}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/products/${p.id}`} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deleting === p.id}
                      className="text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}