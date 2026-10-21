"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTitle } from "@/components/admin/page-title";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/layout/status-badge";
import { Pencil, Trash2, ImagePlus, X, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { SubCategoryPopup } from "@/components/admin/sub-category-popup";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  order: number;
  isActive: boolean;
  parent?: { id: string; name: string } | null;
  _count: { products: number; children?: number };
}

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
  if (!res.ok || !url) throw new Error(json?.error?.message ?? "Upload failed (JPG/PNG/WebP, max 5MB)");
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [subOfId, setSubOfId] = useState<string | null>(null);
  const [subEditId, setSubEditId] = useState<string | null>(null);
  const [subEditName, setSubEditName] = useState("");
  const [subNewName, setSubNewName] = useState("");
  const [subNewImage, setSubNewImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", description: "", order: 0, isActive: true },
  });
  const isActive = watch("isActive");

  const load = async () => {
    try {
      const res = await fetch("/api/v1/admin/categories?pageSize=100");
      const json = await res.json();
      const data = json?.data ?? [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mainCategories = categories.filter((c) => !c.parent);
  const subOf = categories.find((c) => c.id === subOfId) ?? null;
  const subs = subOf ? categories.filter((c) => c.parent?.id === subOf.id) : [];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await uploadFile(file));
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Photo upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const resetAll = () => {
    reset({ name: "", description: "", order: 0, isActive: true });
    setImageUrl(null);
    setEditing(null);
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const url = editing ? "/api/v1/admin/categories/" + editing.id : "/api/v1/admin/categories";
      const method = editing ? "PATCH" : "POST";
      const body = { ...data, image: imageUrl ?? (editing ? null : undefined) };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await errMsg(res, "Failed"));
      toast.success(editing ? "Category updated" : "Category created");
      resetAll();
      load();
    } catch (e: any) {
      toast.error(e?.message || "Operation failed");
    }
  };

  const deleteMain = async (c: Category) => {
    const childCount = c._count.children ?? 0;
    if (childCount > 0) {
      toast.error("'" + c.name + "' has " + childCount + " sub categories. Delete them first.");
      setSubOfId(c.id);
      return;
    }
    if (!window.confirm("Delete '" + c.name + "'?")) return;
    try {
      const res = await fetch("/api/v1/admin/categories/" + c.id, { method: "DELETE" });
      if (!res.ok) {
        toast.error(await errMsg(res, "Delete failed"));
        return;
      }
      toast.success("Category deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const subSave = async (id: string) => {
    if (subEditName.trim().length < 2) return toast.error("Name must be at least 2 letters");
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subEditName.trim() }),
      });
      if (!res.ok) return toast.error(await errMsg(res, "Update failed"));
      toast.success("Sub category updated");
      setSubEditId(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const subPhoto = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadFile(file);
      const res = await fetch("/api/v1/admin/categories/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      if (!res.ok) return toast.error(await errMsg(res, "Photo save failed"));
      toast.success("Photo updated");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  const subNewPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      setSubNewImage(await uploadFile(file));
    } catch (err: any) {
      toast.error(err?.message || "Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  const subRemove = async (s: Category) => {
    if (!window.confirm("Delete sub category '" + s.name + "'?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories/" + s.id, { method: "DELETE" });
      if (!res.ok) return toast.error(await errMsg(res, "Delete failed"));
      toast.success("Sub category deleted");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const subAdd = async () => {
    if (!subOf) return;
    if (subNewName.trim().length < 2) return toast.error("Name must be at least 2 letters");
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subNewName.trim(),
          parentId: subOf.id,
          image: subNewImage ?? undefined,
          order: 0,
          isActive: true,
        }),
      });
      if (!res.ok) return toast.error(await errMsg(res, "Create failed"));
      toast.success("Sub category added");
      setSubNewName("");
      setSubNewImage(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const closePopup = () => {
    setSubOfId(null);
    setSubEditId(null);
    setSubNewName("");
    setSubNewImage(null);
  };

  return (
    <div>
      <PageTitle title="Categories" description={mainCategories.length + " categories"} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{editing ? "Edit category" : "New category"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input {...register("name")} placeholder="e.g., Electronics" />
              </div>

              <div className="space-y-1.5">
                <Label>Category photo</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                      {uploading ? "Uploading..." : imageUrl ? "Change photo" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFile}
                        disabled={uploading}
                      />
                    </label>
                    {imageUrl && (
                      <button type="button" onClick={() => setImageUrl(null)} className="flex items-center gap-1 text-xs text-destructive">
                        <X className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input {...register("description")} placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Order</Label>
                <Input type="number" {...register("order")} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="active" checked={isActive} onCheckedChange={(c) => setValue("isActive", !!c)} />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-[#f85606] hover:bg-[#d04604]" disabled={uploading}>
                  {editing ? "Update" : "Create"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetAll}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DataTable
            data={mainCategories}
            keyExtractor={(c) => c.id}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (c) => (
                  <div className="flex items-center gap-3">
                    <Avatar image={c.image} name={c.name} size="h-10 w-10 text-sm" />
                    <div>
                      <button
                        type="button"
                        onClick={() => setSubOfId(c.id)}
                        className="text-left font-medium hover:text-[#f85606] hover:underline"
                      >
                        {c.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        /{c.slug} · {c._count.children ?? 0} sub categories
                      </p>
                    </div>
                  </div>
                ),
              },
              { key: "products", header: "Products", render: (c) => c._count.products },
              {
                key: "status",
                header: "Status",
                render: (c) => <StatusBadge status={c.isActive ? "ACTIVE" : "ARCHIVED"} />,
              },
              {
                key: "actions",
                header: "",
                className: "w-24 text-right",
                render: (c) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(c);
                        setImageUrl(c.image ?? null);
                        reset({
                          name: c.name,
                          description: c.description ?? "",
                          order: c.order,
                          isActive: c.isActive,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMain(c)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <SubCategoryPopup parent={subOf} all={categories} onClose={() => setSubOfId(null)} onChanged={load} />

      {false && subOf && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={closePopup}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-bold">Sub categories of {subOf?.name ?? "Category"}</h3>
              <button type="button" onClick={closePopup} aria-label="Close" className="text-gray-500 hover:text-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="border-b bg-gray-50 px-5 py-2 text-xs text-gray-500">
              Click the photo to change it.
            </p>

            <div className="max-h-[50vh] divide-y overflow-y-auto">
              {subs.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-500">No sub categories yet</p>
              )}
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <label className="relative cursor-pointer" title="Change photo">
                    <Avatar image={s.image} name={s.name} size="h-12 w-12 text-lg" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f85606] text-white">
                      <ImagePlus className="h-3 w-3" />
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => subPhoto(s.id, e)}
                    />
                  </label>

                  {subEditId === s.id ? (
                    <>
                      <input
                        value={subEditName}
                        onChange={(e) => setSubEditName(e.target.value)}
                        className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:border-[#f85606]"
                        autoFocus
                      />
                      <button type="button" disabled={busy} onClick={() => subSave(s.id)} className="text-green-600" aria-label="Save">
                        <Check className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => setSubEditId(null)} className="text-gray-500" aria-label="Cancel">
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-gray-500">
                          /{s.slug} · {s._count.products} products
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubEditId(s.id);
                          setSubEditName(s.name);
                        }}
                        className="text-gray-600 hover:text-[#f85606]"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={busy} onClick={() => subRemove(s)} className="text-red-600" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t p-4">
              <label className="relative cursor-pointer" title="Add photo">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border bg-muted">
                  {subNewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={subNewImage ?? undefined} alt="New" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={busy}
                  onChange={subNewPhoto}
                />
              </label>
              <input
                value={subNewName}
                onChange={(e) => setSubNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && subAdd()}
                placeholder="New sub category name"
                className="flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#f85606]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={subAdd}
                className="flex items-center gap-1 rounded bg-[#f85606] px-4 py-2 text-sm font-bold text-white hover:bg-[#d94b05]"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
