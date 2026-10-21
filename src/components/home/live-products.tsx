"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product/product-card";

export function LiveProducts({
  pageSize = 24,
  discount = false,
  cols = "grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
  wrap = false,
}: {
  pageSize?: number;
  discount?: boolean;
  cols?: string;
  wrap?: boolean;
}) {
  const [products, setProducts] = useState<any[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/shop-live?pageSize=" + pageSize + (discount ? "&discount=1" : ""), { cache: "no-store" });
        const json = await res.json();
        if (alive && Array.isArray(json?.products)) setProducts(json.products);
      } catch {
        /* ignored */
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pageSize, discount]);

  if (!products) {
    return (
      <div className={"grid " + cols}>
        {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }
  if (products.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No products available yet</p>;
  }
  return (
    <div className={"grid " + cols}>
      {products.map((p) =>
        wrap ? (
          <div key={p.id} className="rounded-sm bg-white p-2">
            <ProductCard product={p} />
          </div>
        ) : (
          <ProductCard key={p.id} product={p} />
        )
      )}
    </div>
  );
}