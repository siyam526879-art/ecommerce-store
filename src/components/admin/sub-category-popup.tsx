"use client";

import { useState } from "react";
import { Pencil, Trash2, ImagePlus, X, Check, Plus } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  parent?: { id: string; name: string } | null;
  _count: { products: number };
};

async function errMsg(res: Response, fallback: string) {
  const j = await res.json().catch(() => null);
  return j?.error?.message ?? j?.message ?? fallback;
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  const url = json?.data?.url ?? json?.url;
  if (!res.ok || !url) throw new Error(json?.error?.message ?? "Upload failed (JPG, PNG or WebP, max 5MB)");
  return url;
}

function Avatar({ image, name, size }: { image?: string | null; name: string; size: string }) {
  return (
    <div className={size + " flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 font-bold text-[#f85606]"}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export function SubCategoryPopup({
  parent,
  all,
  onClose,
  onChanged,
}: {
  parent: { id: string; name: string } | null;
  all: Row[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!parent) return null;
  const subs = all.filter((c) => c.parent?.id === parent.id);

  const patch = async (id: string, body: object, ok: string) => {
    const res = await fetch("/api/v1/admin/categories/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error(await errMsg(res, "Update failed"));
      return false;
    }
    toast.success(ok);
    onChanged();
    return true;
  };

  const save = async (id: string) => {
    if (editName.trim().length < 2) return toast.error("Name must be at least 2 letters");
    setBusy(true);
    try {
      const ok = await patch(id, { name: editName.trim() }, "Saved");
      if (ok) setEditId(null);
    } finally {
      setBusy(false);
    }
  };

  const changePhoto = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await patch(id, { image: await uploadFile(file) }, "Photo updated");
    } catch (err: any) {
      toast.error(err?.message || "Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  const newPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      setNewImage(await uploadFile(file));
    } catch (err: any) {
      toast.error(err?.message || "Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Row) => {
    if (!window.confirm("Delete '" + s.name + "'?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories/" + s.id, { method: "DELETE" });
      if (!res.ok) return toast.error(await errMsg(res, "Delete failed"));
      toast.success("Deleted");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (newName.trim().length < 2) return toast.error("Name must be at least 2 letters");
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          parentId: parent.id,
          image: newImage ?? undefined,
          order: 0,
          isActive: true,
        }),
      });
      if (!res.ok) return toast.error(await errMsg(res, "Create failed"));
      toast.success("Added");
      setNewName("");
      setNewImage(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setEditId(null);
    setNewName("");
    setNewImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-bold">Sub categories of {parent.name}</h3>
          <button type="button" onClick={close} aria-label="Close" className="text-gray-500 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="border-b bg-gray-50 px-5 py-2 text-xs text-gray-500">
          Click the photo to change it. Use the pencil to rename.
        </p>

        <div className="max-h-[50vh] divide-y overflow-y-auto">
          {subs.length === 0 && <p className="px-5 py-6 text-center text-sm text-gray-500">No sub categories yet</p>}
          {subs.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3">
              <label className="relative cursor-pointer" title="Change photo">
                <Avatar image={s.image} name={s.name} size="h-14 w-14 text-xl" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f85606] text-white">
                  <ImagePlus className="h-3 w-3" />
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => changePhoto(s.id, e)} />
              </label>

              {editId === s.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 rounded border px-2 py-1.5 text-sm outline-none focus:border-[#f85606]"
                    autoFocus
                  />
                  <button type="button" disabled={busy} onClick={() => save(s.id)} className="text-green-600" aria-label="Save">
                    <Check className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="text-gray-500" aria-label="Cancel">
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-[11px] text-gray-400">
                      /{s.slug} &middot; {s._count.products} products
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(s.id);
                      setEditName(s.name);
                    }}
                    className="text-gray-600 hover:text-[#f85606]"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(s)} className="text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t p-4">
          <p className="text-xs font-semibold text-gray-600">New sub category</p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer" title="Add photo">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {newImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={newImage} alt="New" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={newPhoto} />
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Name (e.g., Monitor)"
              className="flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#f85606]"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={add}
            className="flex w-full items-center justify-center gap-1 rounded bg-[#f85606] py-2 text-sm font-bold text-white hover:bg-[#d94b05]"
          >
            <Plus className="h-4 w-4" /> Add sub category
          </button>
        </div>
      </div>
    </div>
  );
}