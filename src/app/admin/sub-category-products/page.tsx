"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PackagePlus } from "lucide-react";

type Row = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parent?: { id: string; name: string } | null;
  _count: { products: number };
};

export default function SubCategoryProductsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/categories?pageSize=100", { cache: "no-store" });
      const json = await res.json();
      const data: Row[] = Array.isArray(json?.data) ? json.data : [];
      setRows(data.filter((c) => c.parent));
    } catch {
      /* ignored */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.parent?.name ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sub Category Products</h1>
        <p className="text-sm text-gray-500">Choose a sub category to add or manage its products.</p>
      </div>

      {!loaded && <p className="text-sm text-gray-500">Loading...</p>}
      {loaded && rows.length === 0 && (
        <p className="rounded-lg border bg-white p-6 text-sm text-gray-500">
          No sub categories yet. Create one from the Categories page first.
        </p>
      )}

      {Array.from(groups.entries()).map(([parent, list]) => (
        <section key={parent}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{parent}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <Link
                key={s.id}
                href={"/admin/categories/" + s.id + "/products"}
                className="flex items-center gap-4 rounded-lg border bg-white p-4 transition hover:border-[#f85606] hover:shadow-md"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 text-xl font-bold text-[#f85606]">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    s.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="line-clamp-1 text-xs text-gray-500">{s.description || "No description"}</p>
                  <p className="mt-1 text-xs text-[#f85606]">{s._count.products} products</p>
                </div>
                <PackagePlus className="h-5 w-5 shrink-0 text-gray-400" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}