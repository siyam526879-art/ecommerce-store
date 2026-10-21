"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Prod = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  sku: string;
  isFeatured: boolean;
  basePrice: number;
  compareAtPrice: number | null;
  stock: number;
  status: string;
  images: string[];
  image: string | null;
};
type Cat = { id: string; name: string; slug: string; parent?: { id: string; name: string } | null };

const TAKA = "\u09F3";
const inputCls = "w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#f85606]";

async function errMsg(res: Response, fallback: string) {
  const j = await res.json().catch(() => null);
  return j?.error?.message ?? j?.message ?? fallback;
}

function ProductFields({
  initial,
  categoryId,
  submitLabel,
  onSaved,
  productId,
}: {
  initial?: Prod;
  categoryId: string;
  submitLabel: string;
  onSaved: () => void;
  productId?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial ? String(initial.basePrice) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(initial?.compareAtPrice ? String(initial.compareAtPrice) : "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "0");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
        const json = await res.json().catch(() => null);
        const url = json?.data?.url;
        if (!res.ok || !url) throw new Error(json?.error?.message ?? "Upload failed (JPG, PNG or WebP, max 5MB)");
        urls.push(url);
      }
      setImages((p) => [...p, ...urls]);
      toast.success(urls.length + " photo(s) uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const [descUploading, setDescUploading] = useState(false);
  const addDescImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDescUploading(true);
    try {
      let add = "";
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
        const json = await res.json().catch(() => null);
        const url = json?.data?.url;
        if (!res.ok || !url) throw new Error(json?.error?.message ?? "Upload failed (JPG, PNG or WebP, max 5MB)");
        add += "\n[img:" + url + "]\n";
      }
      setDescription((d) => d + add);
      toast.success("Photo added to details");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setDescUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the product name");
    if (basePrice === "" || Number(basePrice) < 0) return toast.error("Enter the price");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        shortDescription,
        description,
        basePrice: Number(basePrice),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        sku: sku.trim() || undefined,
        categoryId,
        status,
        isFeatured,
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        trackInventory: true,
        metaTitle: "",
        metaDescription: "",
        images,
      };
      const res = await fetch(productId ? "/api/v1/admin/products/" + productId : "/api/v1/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await errMsg(res, "Could not save the product (" + res.status + ")"));
      toast.success(productId ? "Product updated" : "Product added");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Product name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Mini Speaker" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Short description</label>
        <input className={inputCls} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Details</label>
        <div className="space-y-2">
          <textarea className={inputCls} rows={7} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
              {descUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Add photo to details
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={descUploading}
                onChange={(e) => {
                  addDescImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-gray-500">The photo appears on the store where its [img:...] line is. Move the line to change its place.</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Photos</label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((url, i) => (
            <div key={url + i} className="group relative aspect-square overflow-hidden rounded border bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-[#f85606] px-1.5 py-0.5 text-[10px] text-white">Primary</span>}
              <button
                type="button"
                onClick={() => setImages((p) => p.filter((_, x) => x !== i))}
                className="absolute right-1 top-1 rounded bg-white/90 p-1 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed hover:bg-gray-50">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <Upload className="mb-1 h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-500">Upload</span>
              </>
            )}
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Price ({TAKA})</label>
          <input type="number" step="0.01" className={inputCls} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Compare at price</label>
          <input type="number" step="0.01" className={inputCls} value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Stock</label>
          <input type="number" className={inputCls} value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">SKU</label>
          <input className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status</label>
          <select className="rounded border px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Active (visible on store)</option>
            <option value="DRAFT">Draft (hidden)</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Featured
        </label>
      </div>

      <button
        type="submit"
        disabled={saving || uploading}
        className="flex w-full items-center justify-center gap-2 rounded bg-[#f85606] py-2.5 font-bold text-white hover:bg-[#d94b05] disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
      </button>
    </form>
  );
}

export default function SubCategoryProductsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [cat, setCat] = useState<Cat | null>(null);
  const [products, setProducts] = useState<Prod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Prod | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/categories/" + id + "/products", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json?.data) {
        setCat(json.data.category);
        setProducts(json.data.products);
      }
    } catch {
      /* ignored */
    } finally {
      setLoaded(true);
    }
  }, [id]);

  const popupOpen = adding || !!editing;

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!popupOpen) load();
    }, 10000);
    return () => clearInterval(t);
  }, [load, popupOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(null);
        setAdding(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remove = async (p: Prod) => {
    if (!window.confirm("Delete '" + p.name + "'?")) return;
    try {
      const res = await fetch("/api/v1/admin/products/" + p.id, { method: "DELETE" });
      if (!res.ok) return toast.error(await errMsg(res, "Delete failed"));
      toast.success("Product deleted");
      setEditing(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const closePopup = () => {
    setEditing(null);
    setAdding(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/sub-category-products" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#f85606]">
            <ArrowLeft className="h-4 w-4" /> Sub Category Products
          </Link>
          <h1 className="text-2xl font-bold">
            {cat ? cat.name : "..."}{" "}
            <span className="text-base font-normal text-gray-500">{cat?.parent ? "(" + cat.parent.name + ")" : ""}</span>
          </h1>
          <p className="text-sm text-gray-500">
            {products.length} products &middot; live, refreshes every 10 seconds. Click a product to edit it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded bg-[#f85606] px-5 py-2.5 font-bold text-white hover:bg-[#d94b05]"
        >
          <Plus className="h-5 w-5" /> Add product
        </button>
      </div>

      {!loaded && <p className="text-sm text-gray-500">Loading...</p>}
      {loaded && products.length === 0 && (
        <div className="rounded-lg border bg-white p-10 text-center">
          <p className="text-gray-500">No products in this sub category yet.</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 inline-flex items-center gap-2 rounded bg-[#f85606] px-5 py-2 font-bold text-white hover:bg-[#d94b05]"
          >
            <Plus className="h-4 w-4" /> Add the first product
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {products.map((p) => (
          <div key={p.id} className="relative">
          <button
            type="button"
            onClick={() => remove(p)}
            aria-label="Delete product"
            className="absolute right-2 top-2 z-10 rounded-full bg-white p-2 text-red-600 shadow hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(p)}
            className="w-full overflow-hidden rounded-lg border bg-white text-left transition hover:border-[#f85606] hover:shadow-md"
          >
            <div className="aspect-square bg-gray-100">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">No photo</div>
              )}
            </div>
            <div className="space-y-0.5 p-3">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-sm font-bold text-[#f85606]">
                {TAKA}
                {p.basePrice.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500">
                Stock {p.stock} &middot; {p.status}
              </p>
            </div>
          </button>
          </div>
        ))}
      </div>

      {popupOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={closePopup}>
          <div className="my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-bold">{editing ? "Edit product" : "Add product"}</h3>
              <div className="flex items-center gap-4">
                {editing && (
                  <button type="button" onClick={() => remove(editing)} className="flex items-center gap-1 text-sm text-red-600">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
                <button type="button" onClick={closePopup} aria-label="Close" className="text-gray-500 hover:text-gray-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <ProductFields
                key={editing ? editing.id : "new"}
                initial={editing ?? undefined}
                productId={editing?.id}
                categoryId={id}
                submitLabel={editing ? "Save changes" : "Add product"}
                onSaved={() => {
                  closePopup();
                  load();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}