"use client";

import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { MiniLoader } from "@/components/layout/page-loader";

const PAGE_SIZE = 24;
const MIN_LOADING_MS = 2000; // loading koto ms dhore ghurbe
const DONE_SHOW_MS = 5000; // 'No more products' koto ms thakbe

export function LoadMoreProducts({
  initialCount,
  siteName = "Trillion Mart",
}: {
  initialCount: number;
  siteName?: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), DONE_SHOW_MS);
    return () => clearTimeout(t);
  }, [done]);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    const startedAt = Date.now();
    setError(false);
    try {
      const res = await fetch("/api/more-products?skip=" + offset + "&take=" + PAGE_SIZE, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      const wait = MIN_LOADING_MS - (Date.now() - startedAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const next: any[] = Array.isArray(json?.products) ? json.products : [];
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.id))];
      });
      setOffset((o) => o + next.length);
      if (!json?.hasMore || next.length === 0) setDone(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((product) => (
            <div key={product.id} className="rounded-sm bg-white p-2">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        {loading ? (
          <div className="mx-auto max-w-md overflow-hidden rounded-md border bg-white shadow">
            <MiniLoader siteName={siteName} />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <SearchX className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">No more products found</p>
          </div>
        ) : (
          <>
            {error && <p className="mb-2 text-sm text-red-500">Something went wrong. Please try again.</p>}
            <button
              type="button"
              onClick={loadMore}
              className="inline-block rounded border-2 border-[#f85606] px-16 py-2 text-sm font-bold uppercase text-[#f85606] hover:bg-[#f85606] hover:text-white"
            >
              Load More
            </button>
          </>
        )}
      </div>
    </>
  );
}