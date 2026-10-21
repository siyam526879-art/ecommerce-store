"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { formatPrice } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  code: z.string().min(3),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minOrder: z.coerce.number().min(0).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number | string;
  minOrder?: number | string | null;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  _count: { usages: number };
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: { code: "", type: "PERCENT", value: 0, isActive: true },
  });
  const type = watch("type");

  const load = () => {
    fetch("/api/v1/admin/coupons")
      .then((r) => r.json())
      .then(({ data }) => setCoupons(data.coupons));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const res = await fetch("/api/v1/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Failed");
      }
      toast.success("Coupon created");
      reset();
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/v1/admin/coupons/${deleting}`, { method: "DELETE" });
      toast.success("Coupon deleted");
      setDeleting(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/v1/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div>
      <PageTitle title="Coupons" description={`${coupons.length} coupons`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>New coupon</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input {...register("code")} placeholder="SUMMER25" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setValue("type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percent</SelectItem>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                    <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value {type === "PERCENT" ? "(%)" : type === "FIXED" ? "($)" : ""}</Label>
                <Input type="number" step="0.01" {...register("value")} />
              </div>
              <div className="space-y-1.5">
                <Label>Min order</Label>
                <Input type="number" step="0.01" {...register("minOrder")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max uses</Label>
                <Input type="number" {...register("maxUses")} />
              </div>
              <div className="space-y-1.5">
                <Label>Expires</Label>
                <Input type="date" {...register("expiresAt")} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="active" checked={watch("isActive")} onCheckedChange={(c) => setValue("isActive", !!c)} />
                <Label htmlFor="active">Active</Label>
              </div>
              <Button type="submit" className="w-full">Create coupon</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DataTable
            data={coupons}
            keyExtractor={(c) => c.id}
            columns={[
              { key: "code", header: "Code", render: (c) => (
                <span className="font-mono font-semibold">{c.code}</span>
              ) },
              { key: "type", header: "Type", render: (c) => c.type.replace("_", " ") },
              { key: "value", header: "Value", render: (c) =>
                c.type === "PERCENT" ? `${c.value}%` :
                c.type === "FIXED" ? formatPrice(Number(c.value)) :
                "Free ship"
              },
              { key: "uses", header: "Uses", render: (c) => `${c.usedCount}${c.maxUses ? `/${c.maxUses}` : ""}` },
              { key: "status", header: "Status", render: (c) => (
                <button onClick={() => toggleActive(c.id, !c.isActive)}>
                  <StatusBadge status={c.isActive ? "ACTIVE" : "ARCHIVED"} />
                </button>
              ) },
              { key: "actions", header: "", className: "w-12 text-right", render: (c) => (
                <Button variant="ghost" size="icon" onClick={() => setDeleting(c.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) },
            ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete coupon"
        description="This coupon will be permanently removed."
        onConfirm={handleDelete}
      />
    </div>
  );
}