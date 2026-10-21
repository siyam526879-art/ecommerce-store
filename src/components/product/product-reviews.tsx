"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, ImagePlus, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Review = {
  id: string;
  rating: number;
  text: string;
  images: string[];
  createdAt: string;
  name: string;
  mine: boolean;
};
type Data = {
  reviews: Review[];
  summary: { count: number; avg: number; dist: number[] };
  loggedIn: boolean;
  canDeleteAny: boolean;
};

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={size + " " + (n <= Math.round(value) ? "fill-[#ffb000] text-[#ffb000]" : "text-gray-300")}
        />
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const filled = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/product-reviews?productId=" + encodeURIComponent(productId), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.reviews) return;
      setData(json);
      if (!filled.current) {
        filled.current = true;
        const mine = (json.reviews as Review[]).find((r) => r.mine);
        if (mine) {
          setRating(mine.rating);
          setText(mine.text);
          setImages(mine.images);
        }
      }
    } catch {
      /* ignored */
    }
  }, [productId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openLogin = () => window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) return toast.error("You can add up to 5 photos");
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/v1/review-upload", { method: "POST", body: fd });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          openLogin();
          throw new Error("Please sign in");
        }
        if (!res.ok || !json?.url) throw new Error(json?.error ?? "Upload failed");
        urls.push(json.url);
      }
      setImages((p) => [...p, ...urls]);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!data?.loggedIn) return openLogin();
    if (rating < 1) return toast.error("Choose a star rating");
    setSaving(true);
    try {
      const res = await fetch("/api/v1/product-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, text, images }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Could not save your review");
      toast.success("Review saved");
      filled.current = true;
      load();
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Review) => {
    if (!window.confirm("Delete this review?")) return;
    const res = await fetch("/api/v1/product-reviews?id=" + encodeURIComponent(r.id), { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete");
    if (r.mine) {
      setRating(0);
      setText("");
      setImages([]);
    }
    toast.success("Review deleted");
    load();
  };

  const summary = data?.summary ?? { count: 0, avg: 0, dist: [0, 0, 0, 0, 0] };
  const hasMine = !!data?.reviews.some((r) => r.mine);

  return (
    <section id="reviews" className="mt-12 border-t pt-8">
      <h2 className="mb-5 text-xl font-semibold">Ratings &amp; Reviews</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <p className="text-4xl font-bold">
            {summary.avg.toFixed(1)}
            <span className="text-lg font-normal text-gray-500">/5</span>
          </p>
          <Stars value={summary.avg} size="h-5 w-5" />
          <p className="mt-1 text-xs text-gray-500">{summary.count} ratings</p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = summary.dist[n - 1];
            const pct = summary.count ? (c / summary.count) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-3 text-xs">
                <Stars value={n} size="h-3 w-3" />
                <div className="h-2 flex-1 overflow-hidden rounded bg-gray-200">
                  <div className="h-full bg-[#ffb000]" style={{ width: pct + "%" }} />
                </div>
                <span className="w-8 text-right text-gray-500">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-4">
        <p className="mb-2 font-medium">{hasMine ? "Your review" : "Write a review"}</p>
        {data && !data.loggedIn ? (
          <button type="button" onClick={openLogin} className="rounded bg-[#f85606] px-5 py-2 text-sm font-bold text-white hover:bg-[#d94b05]">
            Sign in to write a review
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={n + " star"}>
                  <Star className={"h-7 w-7 " + (n <= rating ? "fill-[#ffb000] text-[#ffb000]" : "text-gray-300")} />
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Share your experience with this product"
              className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#f85606]"
            />
            <div className="flex flex-wrap items-center gap-3">
              {images.map((u, i) => (
                <div key={u + i} className="group relative h-16 w-16 overflow-hidden rounded border bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, x) => x !== i))}
                    className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed text-gray-400 hover:bg-gray-50">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <span className="text-[10px]">Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={saving || uploading}
              className="flex items-center gap-2 rounded bg-[#f85606] px-6 py-2 text-sm font-bold text-white hover:bg-[#d94b05] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {hasMine ? "Update review" : "Submit review"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 divide-y">
        <p className="pb-3 text-sm font-medium">Product Reviews ({summary.count})</p>
        {data && data.reviews.length === 0 && <p className="py-6 text-sm text-gray-500">No reviews yet. Be the first to review this product.</p>}
        {data?.reviews.map((r) => (
          <div key={r.id} className="space-y-2 py-4">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              {data.canDeleteAny && (
                <button type="button" onClick={() => remove(r)} className="text-gray-400 hover:text-red-600" aria-label="Delete review">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {r.name} &middot; {new Date(r.createdAt).toLocaleDateString()}
            </p>
            {r.text && <p className="whitespace-pre-line text-sm text-gray-800">{r.text}</p>}
            {r.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {r.images.map((u, i) => (
                  <button key={u + i} type="button" onClick={() => setZoom(u)} className="h-20 w-20 overflow-hidden rounded border bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="Review photo" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          <button type="button" className="absolute right-4 top-4 text-white" aria-label="Close">
            <X className="h-7 w-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-[90vh] max-w-[92vw] rounded object-contain" />
        </div>
      )}
    </section>
  );
}