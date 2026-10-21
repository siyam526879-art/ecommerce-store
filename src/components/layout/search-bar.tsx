"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { MiniLoader } from "./page-loader";

type Item = { id: string; name: string; slug: string; price: number; image: string | null };

const TAKA = "\u09F3";

export function SearchBar({ siteName }: { siteName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startNav] = useTransition();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setItems([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggest?q=" + encodeURIComponent(term), { signal: ctrl.signal });
        const json = await res.json();
        setItems(Array.isArray(json?.items) ? json.items : []);
      } catch {
        /* ignored */
      } finally {
        if (!ctrl.signal.aborted) setFetching(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const navigate = (href: string) => {
    setOpen(true);
    startNav(() => {
      router.push(href);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    const exact = items.find((i) => i.name.toLowerCase() === term.toLowerCase());
    navigate(exact ? "/product/" + exact.slug : "/search?q=" + encodeURIComponent(term));
  };

  const showPanel = open && (q.trim().length > 0 || navigating);
  const showLoader = navigating || (fetching && items.length === 0);

  return (
    <div ref={boxRef} className="relative flex-1">
      <form onSubmit={submit} className="flex h-11 w-full overflow-hidden rounded-sm bg-white">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={"Search in " + siteName}
          className="flex-1 px-4 text-sm text-gray-800 outline-none placeholder:text-gray-400"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search" className="flex w-14 items-center justify-center bg-[#fde8dc] text-[#f85606] hover:bg-[#fbd5c0]">
          <Search className="h-5 w-5" />
        </button>
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-[120] mt-1 overflow-hidden rounded-md border bg-white shadow-2xl">
          {showLoader ? (
            <MiniLoader siteName={siteName} />
          ) : items.length > 0 ? (
            <ul className="max-h-[60vh] divide-y overflow-y-auto">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/product/" + it.slug)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-orange-50"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-gray-100">
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-gray-800">{it.name}</span>
                    <span className="text-sm font-semibold text-[#f85606]">
                      {TAKA}
                      {it.price.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/search?q=" + encodeURIComponent(q.trim()))}
                  className="w-full px-4 py-2.5 text-center text-sm font-semibold text-[#f85606] hover:bg-orange-50"
                >
                  See all results for &quot;{q.trim()}&quot;
                </button>
              </li>
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <SearchX className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Not found</p>
              <p className="text-xs text-gray-500">No product matches &quot;{q.trim()}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}