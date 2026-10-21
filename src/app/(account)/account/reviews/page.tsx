"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

type R = { id: string; rating: number; text: string; createdAt: string; name: string; slug: string; image: string | null };

export default function MyReviewsPage() {
  const [list, setList] = useState<R[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/my-reviews", { cache: "no-store" });
      const json = await res.json();
      setList(json.reviews ?? []);
    } catch {
      setList([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    const res = await fetch("/api/v1/my-reviews?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete");
    toast.success("Review deleted");
    load();
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-medium">My Reviews</h1>
      {!list && <p className="text-sm text-gray-500">Loading...</p>}
      {list && list.length === 0 && <p className="rounded-sm bg-white py-14 text-center text-gray-600">You have not written any reviews yet.</p>}
      <div className="space-y-3">
        {list?.map((r) => (
          <div key={r.id} className="flex gap-4 rounded-sm bg-white p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={"/product/" + r.slug} className="line-clamp-1 text-sm font-medium hover:text-[#f85606]">
                {r.name}
              </Link>
              <span className="inline-flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={"h-4 w-4 " + (n <= r.rating ? "fill-[#ffb000] text-[#ffb000]" : "text-gray-300")} />
                ))}
              </span>
              {r.text && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.text}</p>}
              <p className="mt-1 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}