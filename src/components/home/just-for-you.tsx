"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";

const FIRST = 18;
const MORE = 7;

export function JustForYou() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (offset: number, limit: number) => {
    const res = await fetch("/api/just-for-you?offset=" + offset + "&limit=" + limit, { cache: "no-store" });
    return res.json();
  };

  useEffect(() => {
    let alive = true;
    fetchPage(0, FIRST)
      .then((json) => {
        if (!alive || !Array.isArray(json?.products)) return;
        setProducts(json.products);
        setTotal(json.total ?? json.products.length);
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const loadMore = async () => {
    setLoading(true);
    try {
      const json = await fetchPage(products.length, MORE);
      if (Array.isArray(json?.products)) {
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...json.products.filter((p: any) => !seen.has(p.id))];
        });
        setTotal(json.total ?? total);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No products available yet</p>;
  }

  const hasMore = products.length < total;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {products.map((p) => (
          <div key={p.id} className="rounded-sm bg-white p-2">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded border-2 border-[#f85606] px-16 py-2 text-sm font-bold uppercase text-[#f85606] hover:bg-[#f85606] hover:text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Load more
          </button>
        </div>
      )}
    </>
  );
}