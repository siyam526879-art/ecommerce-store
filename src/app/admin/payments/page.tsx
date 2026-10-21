"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import { formatPrice } from "@/lib/utils";

interface Payment {
  id: string;
  provider: string;
  providerPaymentId: string;
  amount: number | string;
  status: string;
  method?: string | null;
  last4?: string | null;
  createdAt: string;
  order?: { orderNumber: string; user?: { email: string } };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetch("/api/v1/admin/payments")
      .then((r) => r.json())
      .then(({ data }) => setPayments(data));
  }, []);

  return (
    <div>
      <PageTitle title="Payments" description={`${payments.length} transactions`} />
      <DataTable
        data={payments}
        keyExtractor={(p) => p.id}
        columns={[
          { key: "order", header: "Order", render: (p) => p.order?.orderNumber ?? "—" },
          { key: "provider", header: "Provider", render: (p) => (
            <div>
              <p className="font-medium capitalize">{p.provider}</p>
              <p className="text-xs text-muted-foreground font-mono">{p.providerPaymentId.slice(0, 16)}...</p>
            </div>
          ) },
          { key: "method", header: "Method", render: (p) =>
            p.method ? `${p.method}${p.last4 ? ` •••• ${p.last4}` : ""}` : "—"
          },
          { key: "amount", header: "Amount", render: (p) => formatPrice(Number(p.amount)) },
          { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
          { key: "date", header: "Date", render: (p) => new Date(p.createdAt).toLocaleString() },
        ]}
      />
    </div>
  );
}