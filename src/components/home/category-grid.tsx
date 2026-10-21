"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Sub = { id: string; name: string; slug: string; image: string | null; description?: string | null };
type Cat = { id: string; name: string; slug: string; image: string | null; subs: Sub[] };

function Circle({ image, name }: { image: string | null; name: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 text-xl font-bold text-[#f85606]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export function CategoryGrid({ categories }: { categories: Cat[] }) {
  const [list, setList] = useState<Cat[]>(categories);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/categories-live", { cache: "no-store" });
        const json = await res.json();
        if (alive && Array.isArray(json?.categories)) setList(json.categories.slice(0, 16));
      } catch {
        /* ignored */
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {list.map((cat) => (
        <Link
          key={cat.id}
          href={"/shop?category=" + cat.slug}
          className="flex flex-col items-center gap-2 rounded-sm bg-white p-3 text-center transition hover:shadow-md"
        >
          <Circle image={cat.image} name={cat.name} />
          <span className="line-clamp-2 text-xs font-medium text-gray-700">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}