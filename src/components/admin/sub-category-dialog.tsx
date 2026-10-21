"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";

type Parent = { id: string; name: string };
type Row = { id: string; name: string; slug: string; parent?: { id: string; name: string } | null };

export function SubCategoryDialog({
  parent,
  onClose,
  onChanged,
}: {
  parent: Parent | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [subs, setSubs] = useState<Row[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!parent) return;
    try {
      const res = await fetch("/api/v1/admin/categories?pageSize=100");
      const json = await res.json();
      const all: Row[] = Array.isArray(json?.data) ? json.data : [];
      setSubs(all.filter((c) => c.parent?.id === parent.id));
    } catch {
      setSubs([]);
    }
  }, [parent]);

  useEffect(() => {
    setEditId(null);
    setNewName("");
    load();
  }, [load]);

  if (!parent) return null;

  const errMsg = async (res: Response, fallback: string) => {
    const j = await res.json().catch(() => null);
    return j?.error?.message ?? j?.message ?? fallback;
  };

  const save = async (id: string) => {
    if (editName.trim().length < 2) return toast.error("Name must be at least 2 letters");
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) return toast.error(await errMsg(res, "Update failed"));
      toast.success("Sub category updated");
      setEditId(null);
      await load();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this sub category?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories/" + id, { method: "DELETE" });
      if (!res.ok) return toast.error(await errMsg(res, "Delete failed"));
      toast.success("Sub category deleted");
      await load();
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
        body: JSON.stringify({ name: newName.trim(), parentId: parent.id, order: 0, isActive: true }),
      });
      if (!res.ok) return toast.error(await errMsg(res, "Create failed"));
      toast.success("Sub category added");
      setNewName("");
      await load();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-bold">Sub categories of {parent.name}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[50vh] divide-y overflow-y-auto">
          {subs.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-gray-500">No sub categories yet</p>
          )}
          {subs.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-5 py-3">
              {editId === s.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:border-[#f85606]"
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
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500">/{s.slug}</p>
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
                  <button type="button" disabled={busy} onClick={() => remove(s.id)} className="text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New sub category name"
            className="flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#f85606]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={add}
            className="flex items-center gap-1 rounded bg-[#f85606] px-4 py-2 text-sm font-bold text-white hover:bg-[#d94b05]"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
