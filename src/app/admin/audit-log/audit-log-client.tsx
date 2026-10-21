"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

interface Log {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string;
  user?: { name?: string | null; email: string } | null;
}

export function AuditLogClient({ initial }: { initial: Log[] }) {
  const [q, setQ] = useState("");
  const [resource, setResource] = useState("all");
  const [action, setAction] = useState("all");

  const filtered = useMemo(() => {
    return initial.filter((l) => {
      if (resource !== "all" && l.resource !== resource) return false;
      if (action !== "all" && l.action !== action) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          l.resourceId?.toLowerCase().includes(s) ||
          l.user?.email?.toLowerCase().includes(s) ||
          l.user?.name?.toLowerCase().includes(s) ||
          l.action.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [initial, q, resource, action]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by user, resource, action..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />

        <select
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All resources</option>
          <option value="product">Product</option>
          <option value="order">Order</option>
          <option value="customer">Customer</option>
          <option value="category">Category</option>
          <option value="coupon">Coupon</option>
          <option value="staff">Staff</option>
          <option value="settings">Settings</option>
          <option value="shippingMethod">Shipping</option>
        </select>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6 text-center border rounded">
          No activity records found.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Resource</th>
                <th className="text-left p-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {l.user?.name ?? l.user?.email ?? "System"}
                  </td>
                  <td className="p-3">
                    <span className="inline-block text-xs px-2 py-0.5 rounded border">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {l.resource}
                    {l.resourceId ? `:${l.resourceId.slice(0, 8)}` : ""}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {l.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} of {initial.length} records
      </p>
    </div>
  );
}