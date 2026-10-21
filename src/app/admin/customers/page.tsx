"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface Customer {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  createdAt: string;
  isActive: boolean;
  _count: { orders: number };
  orders: Array<{ total: number | string }>;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    fetch(`/api/v1/admin/customers?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setCustomers(data));
  }, [q]);

  return (
    <div>
      <PageTitle title="Customers" description={`${customers.length} shown`} />
      <Input
        placeholder="Search by name or email..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm mb-4"
      />
      <DataTable
        data={customers}
        keyExtractor={(c) => c.id}
        columns={[
          { key: "name", header: "Customer", render: (c) => (
            <Link href={`/admin/customers/${c.id}`} className="hover:text-primary">
              <p className="font-medium">{c.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{c.email}</p>
            </Link>
          ) },
          { key: "orders", header: "Orders", render: (c) => c._count.orders },
          { key: "lastOrder", header: "Last order", render: (c) =>
            c.orders[0] ? formatPrice(Number(c.orders[0].total)) : "—"
          },
          { key: "joined", header: "Joined", render: (c) => new Date(c.createdAt).toLocaleDateString() },
          { key: "status", header: "Status", render: (c) =>
            <StatusBadge status={c.isActive ? "ACTIVE" : "ARCHIVED"} />
          },
        ]}
      />
    </div>
  );
}