"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["STAFF", "ADMIN"]),
});

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: "STAFF" },
  });

  const load = () => {
    fetch("/api/v1/admin/staff").then((r) => r.json()).then(({ data }) => setStaff(data.staff));
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const res = await fetch("/api/v1/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Failed");
      }
      toast.success("Staff member created");
      reset();
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/v1/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      load();
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/v1/admin/staff/${deleting}`, { method: "DELETE" });
      toast.success("Deleted");
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  return (
    <div>
      <PageTitle title="Staff" description={`${staff.length} members`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add staff member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input {...register("name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...register("email")} />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" {...register("password")} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select defaultValue="STAFF" onValueChange={(v) => setValue("role", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DataTable
            data={staff}
            keyExtractor={(s) => s.id}
            columns={[
              { key: "name", header: "Name", render: (s) => (
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
              ) },
              { key: "role", header: "Role", render: (s) => <StatusBadge status={s.role} /> },
              { key: "status", header: "Status", render: (s) => (
                <button onClick={() => toggleActive(s.id, !s.isActive)}>
                  <StatusBadge status={s.isActive ? "ACTIVE" : "ARCHIVED"} />
                </button>
              ) },
              { key: "joined", header: "Joined", render: (s) => new Date(s.createdAt).toLocaleDateString() },
              { key: "actions", header: "", className: "w-12 text-right", render: (s) => (
                <Button variant="ghost" size="icon" onClick={() => setDeleting(s.id)} className="text-destructive">
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
        title="Delete staff member"
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}