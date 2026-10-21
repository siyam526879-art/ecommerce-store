"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/admin/data-table";
import { PageTitle } from "@/components/admin/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Variant {
  id: string;
  sku?: string | null;
  stock: number;
  attributes: any;
  product: { id: string; name: string; slug: string; trackInventory: boolean };
}

export default function InventoryPage() {
  const [items, setItems] = useState<Variant[]>([]);
  const [lowOnly, setLowOnly] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (lowOnly) params.set("low", "1");
    fetch(`/api/v1/admin/inventory?${params}`)
      .then((r) => r.json())
      .then((json) => setItems(Array.isArray(json?.data) ? json.data : []))
  };

  useEffect(() => { load(); }, [lowOnly]);

  const updateStock = async (variantId: string, stock: number) => {
    try {
      const res = await fetch("/api/v1/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, stock }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.map((v) => v.id === variantId ? { ...v, stock } : v));
      toast.success("Stock updated");
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div>
      <PageTitle title="Inventory" description={`${items.length} variants`} />
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="low" checked={lowOnly} onCheckedChange={(c) => setLowOnly(!!c)} />
          <Label htmlFor="low">Low stock only (≤5)</Label>
        </div>
      </div>

      <DataTable
        data={items}
        keyExtractor={(v) => v.id}
        columns={[
          { key: "product", header: "Product", render: (v) => (
            <Link href={`/admin/products/${v.product.id}`} className="hover:text-primary font-medium">
              {v.product.name}
            </Link>
          ) },
          { key: "sku", header: "SKU", render: (v) => v.sku ?? "—" },
          { key: "attrs", header: "Variant", render: (v) => {
            const attrs = v.attributes as Record<string,string>;
            return Object.keys(attrs).length > 0
              ? Object.entries(attrs).map(([k,val]) => `${k}: ${val}`).join(", ")
              : "—";
          } },
          { key: "stock", header: "Stock", render: (v) => {
            if (!v.product.trackInventory) return <span className="text-muted-foreground">Not tracked</span>;
            return (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={v.stock}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setItems((prev) => prev.map((x) => x.id === v.id ? { ...x, stock: val } : x));
                  }}
                  onBlur={(e) => updateStock(v.id, parseInt(e.target.value) || 0)}
                  className="w-20 h-8"
                />
                {v.stock <= 5 && <span className="text-xs text-red-600 font-medium">Low</span>}
              </div>
            );
          } },
        ]}
      />
    </div>
  );
}