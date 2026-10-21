"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/v1/admin/customers/${id}`)
      .then((r) => r.json())
      .then(({ data }) => setCustomer(data.customer));
  }, [id]);

  if (!customer) return <div>Loading...</div>;

  const toggleActive = async () => {
    try {
      const res = await fetch(`/api/v1/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      setCustomer({ ...customer, isActive: !customer.isActive });
      toast.success("Customer updated");
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title={customer.name ?? customer.email}
        description={`Customer since ${new Date(customer.createdAt).toLocaleDateString()}`}
        actions={
          <Button variant="outline" onClick={toggleActive}>
            {customer.isActive ? "Deactivate" : "Activate"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {customer.email}</div>
            <div><span className="text-muted-foreground">Phone:</span> {customer.phone ?? ""}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={customer.isActive ? "ACTIVE" : "ARCHIVED"} /></div>
            <div><span className="text-muted-foreground">Total orders:</span> {customer._count.orders}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Addresses ({customer.addresses.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customer.addresses.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved addresses</p>
            )}
            {customer.addresses.map((a: any) => (
              <div key={a.id} className="p-3 rounded border text-sm">
                <p className="font-medium">{a.fullName}</p>
                <p className="text-muted-foreground">
                  {a.line1}<br />
                  {a.city}, {a.state} {a.postalCode}<br />
                  {a.country}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders</p>
          ) : (
            <div className="space-y-2">
              {customer.orders.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.placedAt).toLocaleDateString()}  {o._count.items} items
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(Number(o.total))}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}