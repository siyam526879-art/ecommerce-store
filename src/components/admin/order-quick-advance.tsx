"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, CheckCircle2, Truck, Package, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NEXT_STATUS: Record<string, { next: string; label: string } | null> = {
  PENDING: { next: "CONFIRMED", label: "Confirm Order" },
  CONFIRMED: { next: "PROCESSING", label: "Start Processing" },
  PROCESSING: { next: "SHIPPED", label: "Mark as Shipped" },
  SHIPPED: { next: "DELIVERED", label: "Mark as Delivered" },
  DELIVERED: null,
  CANCELLED: null,
  REFUNDED: null,
};

export function OrderQuickAdvance({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const config = NEXT_STATUS[currentStatus];

  const advance = async () => {
    if (!config) return;
    if (!confirm("Move order to " + config.next + "?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/orders/" + orderId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: config.next,
          note: "Advanced to " + config.next,
        }),
      });

      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

      if (!res.ok) throw new Error(json.error?.message || "Failed");

      toast.success("Order moved to " + config.next);
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!confirm("Cancel this order? Stock will be restored.")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/orders/" + orderId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          note: "Cancelled by admin",
        }),
      });

      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

      if (!res.ok) throw new Error(json.error?.message || "Failed");

      toast.success("Order cancelled");
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        No further action possible. Status: <strong>{currentStatus}</strong>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={advance} disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {config.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {(currentStatus === "PENDING" || currentStatus === "CONFIRMED") && (
        <Button
          onClick={cancel}
          disabled={loading}
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Order
        </Button>
      )}
    </div>
  );
}