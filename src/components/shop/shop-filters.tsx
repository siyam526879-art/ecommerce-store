"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";

type Sub = { id: string; name: string; slug: string; image: string | null };
type Cat = { id: string; name: string; slug: string; image: string | null; subs: Sub[] };

function Circle({ image, name }: { image: string | null; name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 text-sm font-bold text-[#f85606]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function ShopFilters({
  categories,
  active,
  minPrice,
  maxPrice,
}: {
  categories: Cat[];
  active?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [hover, setHover] = useState<{ id: string; left: number; top: number } | null>(null);
  const [min, setMin] = useState(minPrice ?? "");
  const [max, setMax] = useState(maxPrice ?? "");

  const hrefFor = (slug: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (slug) p.set("category", slug);
    else p.delete("category");
    p.delete("page");
    const s = p.toString();
    return "/shop" + (s ? "?" + s : "");
  };

  const applyPrice = () => {
    const p = new URLSearchParams(sp.toString());
    if (min) p.set("minPrice", min);
    else p.delete("minPrice");
    if (max) p.set("maxPrice", max);
    else p.delete("maxPrice");
    p.delete("page");
    const s = p.toString();
    router.push("/shop" + (s ? "?" + s : ""));
  };

  const hasFilters = !!(active || minPrice || maxPrice);
  const hovered = categories.find((c) => c.id === hover?.id && c.subs.length > 0) ?? null;

  const enter = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ id, left: r.right, top: Math.max(100, Math.min(r.top, window.innerHeight * 0.4)) });
  };

  return (
    <div className="flex max-h-[calc(100vh-8rem)] flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between border-b pb-3">
        <h2 className="text-lg font-bold">Filters</h2>
        {hasFilters && (
          <Link href="/shop" className="text-sm text-[#f85606] hover:underline">
            Clear all
          </Link>
        )}
      </div>

      <h3 className="mb-2 shrink-0 text-sm font-semibold text-gray-500">Categories</h3>

      <nav className="min-h-[120px] flex-1 overflow-y-auto pr-1" onMouseLeave={() => setHover(null)} onScroll={() => setHover(null)}>
        <Link
          href={hrefFor(null)}
          onMouseEnter={() => setHover(null)}
          className={"block rounded px-3 py-2 text-sm hover:bg-orange-50 " + (!active ? "font-bold text-[#f85606]" : "text-gray-700")}
        >
          All Categories
        </Link>

        {categories.map((c) => {
          const hasSubs = c.subs.length > 0;
          const isActive = active === c.slug || c.subs.some((s) => s.slug === active);
          return (
            <div key={c.id} onMouseEnter={(e) => (hasSubs ? enter(e, c.id) : setHover(null))}>
              <Link
                href={hrefFor(c.slug)}
                className={
                  "flex items-center justify-between gap-2 rounded px-3 py-2 text-sm hover:bg-orange-50 " +
                  (isActive ? "font-bold text-[#f85606]" : "text-gray-700")
                }
              >
                <span className="truncate">{c.name}</span>
                {hasSubs && (
                  <span className="flex shrink-0 items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </span>
                )}
              </Link>
            </div>
          );
        })}

        {hovered && hover && (
          <div className="fixed z-[70] w-72 pl-2" style={{ left: hover.left, top: hover.top }}>
            <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-white p-2 shadow-2xl">
              {hovered.subs.map((s) => (
                <Link
                  key={s.id}
                  href={hrefFor(s.slug)}
                  className={
                    "flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-orange-50 " +
                    (active === s.slug ? "font-bold text-[#f85606]" : "text-gray-700")
                  }
                >
                  {s.image && <Circle image={s.image} name={s.name} />}
                  <span className="truncate">{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-4 shrink-0 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Price range</h3>
        <div className="flex items-center gap-2">
          <input type="number" min={0} placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-[#f85606]" />
          <span className="text-gray-400">-</span>
          <input type="number" min={0} placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-[#f85606]" />
        </div>
        <button type="button" onClick={applyPrice} className="mt-2 w-full rounded border border-[#f85606] py-1.5 text-sm font-semibold text-[#f85606] hover:bg-[#f85606] hover:text-white">
          Apply Price
        </button>
      </div>
    </div>
  );
}