"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Hero = { id: string; image: string; link: string };
type Promo = { image: string; link: string };

async function upload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  const url = json?.data?.url;
  if (!res.ok || !url) throw new Error(json?.error?.message ?? "Upload failed (JPG, PNG or WebP, max 5MB)");
  return url;
}

const input = "w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#f85606]";

export default function WebsiteBannersPage() {
  const [hero, setHero] = useState<Hero[]>([]);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/home-banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setHero(Array.isArray(j.hero) ? j.hero : []);
        setPromo(j.promo ?? null);
      })
      .finally(() => setLoaded(true));
  }, []);

  const addHero = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added: Hero[] = [];
      for (const f of Array.from(files)) {
        added.push({ id: Math.random().toString(36).slice(2, 10), image: await upload(f), link: "/shop" });
      }
      setHero((h) => [...h, ...added]);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const changeHero = async (id: string, files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const url = await upload(f);
      setHero((h) => h.map((x) => (x.id === id ? { ...x, image: url } : x)));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const setPromoImage = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const url = await upload(f);
      setPromo((p) => ({ image: url, link: p?.link ?? "/shop" }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/home-banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero, promo }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved. The store updates within 8 seconds.");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/admin/settings" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#f85606]">
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Website Banners</h1>
            <p className="text-sm text-gray-500">Upload the photos shown on the store homepage. Click Save to publish.</p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || busy}
            className="flex items-center gap-2 rounded bg-[#f85606] px-6 py-2.5 font-bold text-white hover:bg-[#d94b05] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border bg-white p-5">
        <div>
          <h2 className="font-semibold">Top slider (Flash Sale)</h2>
          <p className="text-xs text-gray-500">Recommended size 1200 x 420. With no photos, the default slider is shown.</p>
        </div>

        {hero.map((h, i) => (
          <div key={h.id} className="flex flex-col gap-3 rounded border p-3 sm:flex-row">
            <label className="group relative block h-28 w-full shrink-0 cursor-pointer overflow-hidden rounded bg-gray-100 sm:w-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.image} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-semibold text-white group-hover:flex">
                Change photo
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { changeHero(h.id, e.target.files); e.target.value = ""; }} />
            </label>
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Slide {i + 1}</p>
              <input
                className={input}
                value={h.link}
                onChange={(e) => setHero((l) => l.map((x) => (x.id === h.id ? { ...x, link: e.target.value } : x)))}
                placeholder="Link when clicked, e.g. /shop?category=books"
              />
            </div>
            <button type="button" onClick={() => setHero((l) => l.filter((x) => x.id !== h.id))} className="self-start text-red-600" aria-label="Delete slide">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}

        <label className="inline-flex cursor-pointer items-center gap-2 rounded border-2 border-dashed px-4 py-3 text-sm font-medium hover:bg-gray-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add slide photo
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={busy} onChange={(e) => { addHero(e.target.files); e.target.value = ""; }} />
        </label>
      </section>

      <section className="space-y-4 rounded-lg border bg-white p-5">
        <div>
          <h2 className="font-semibold">Wide banner (Big Saving)</h2>
          <p className="text-xs text-gray-500">Recommended size 1400 x 160. With no photo, the default banner is shown.</p>
        </div>

        {promo?.image ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={promo.image} alt="" className="h-auto w-full rounded border object-cover" />
            <input className={input} value={promo.link} onChange={(e) => setPromo({ ...promo, link: e.target.value })} placeholder="Link when clicked, e.g. /shop" />
            <div className="flex gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50">
                <ImagePlus className="h-4 w-4" /> Change photo
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { setPromoImage(e.target.files); e.target.value = ""; }} />
              </label>
              <button type="button" onClick={() => setPromo(null)} className="rounded border px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Remove (use default)
              </button>
            </div>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border-2 border-dashed px-4 py-3 text-sm font-medium hover:bg-gray-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload banner photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { setPromoImage(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </section>
    </div>
  );
}