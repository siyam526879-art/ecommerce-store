"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface Return {
  id: string;
  status: string;
  reason: string;
  refundAmount: number | string;
  createdAt: string;
  order?: {
    orderNumber: string;
    user?: { name?: string | null; email: string };
  };
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/v1/admin/returns", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.error ?? "Could not load return requests.");
      }

      const data = result.data;
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load return requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    if (updatingIds.includes(id)) return;

    setUpdatingIds((current) => [...current, id]);

    try {
      const response = await fetch("/api/v1/admin/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.error ??
            result.message ??
            `Could not update return status (${response.status}).`
        );
      }

      toast.success(
        typeof result.message === "string"
          ? result.message
          : typeof result.data?.message === "string"
            ? result.data.message
            : status === "APPROVED"
              ? "Return approved. Check the refund result."
              : `Return status updated to ${status}.`
      );

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update return status."
      );
      await load();
    } finally {
      setUpdatingIds((current) => current.filter((itemId) => itemId !== id));
    }
  };

  return (
    <div>
      <PageTitle
        title="Return & Refund"
        description={`${returns.length} requests`}
      />

      {loading && returns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading return requests...
        </p>
      ) : (
        <DataTable
          data={returns}
          keyExtractor={(r) => r.id}
          columns={[
            {
              key: "order",
              header: "Order",
              render: (r) => r.order?.orderNumber ?? "—",
            },
            {
              key: "customer",
              header: "Customer",
              render: (r) =>
                r.order?.user?.name ?? r.order?.user?.email ?? "—",
            },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <span className="line-clamp-1" title={r.reason}>
                  {r.reason}
                </span>
              ),
            },
            {
              key: "amount",
              header: "Refund",
              render: (r) => formatPrice(Number(r.refundAmount)),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "date",
              header: "Date",
              render: (r) => new Date(r.createdAt).toLocaleDateString(),
            },
            {
              key: "actions",
              header: "Action",
              render: (r) => (
                <Select
                  value={r.status}
                  disabled={updatingIds.includes(r.id) || r.status === "COMPLETED"}
                  onValueChange={(value) => void updateStatus(r.id, value)}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REQUESTED">Requested</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
