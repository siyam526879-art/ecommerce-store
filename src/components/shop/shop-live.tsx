"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { SortDropdown } from "@/components/shop/sort-dropdown";
import { PaginationControls } from "@/components/shop/pagination-controls";
import { PackageSearch } from "lucide-react";
import Link from "next/link";

export function ShopLive({
  category,
  q,
  minPrice,
  maxPrice,
  sort,
  page,
}: {
  category?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  sort: string;
  page: number;
}) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (q) p.set("q", q);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("pageSize", "24");
    const load = async () => {
      try {
        const res = await fetch("/api/shop-live?" + p.toString(), { cache: "no-store" });
        const json = await res.json();
        if (alive && Array.isArray(json?.products)) setData(json);
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
  }, [category, q, minPrice, maxPrice, sort, page]);

  const shown = data?.products?.length ?? 0;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-sm bg-white px-4 py-3">
        <p className="text-sm text-gray-600">
          {q ? <span className="font-semibold text-gray-900">Results for &quot;{q}&quot; &middot; </span> : data?.activeName ? <span className="font-semibold text-gray-900">{data.activeName} &middot; </span> : null}
          {data ? "Showing " + shown + " of " + total + " products" : "Loading..."}
        </p>
        <SortDropdown current={sort} />
      </div>

      {!data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-sm bg-white" />
          ))}
        </div>
      )}

      {data && shown === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-sm bg-white py-16 text-center">
          <PackageSearch className="h-10 w-10 text-gray-300" />
          <p className="text-lg font-semibold text-gray-700">No products found</p>
          <p className="text-sm text-gray-500">There are no products here yet.</p>
          <Link href="/shop" className="mt-3 rounded bg-[#f85606] px-5 py-2 text-sm font-bold text-white">
            View all products
          </Link>
        </div>
      )}

      {data && shown > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {data.products.map((p: any) => (
              <div key={p.id} className="rounded-sm bg-white p-2">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          {data.totalPages > 1 && <PaginationControls currentPage={page} totalPages={data.totalPages} className="mt-10" />}
        </>
      )}
    </div>
  );
}