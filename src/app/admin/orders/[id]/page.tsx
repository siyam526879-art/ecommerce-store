"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageTitle } from "@/components/admin/page-title";
import { OrderQuickAdvance } from "@/components/admin/order-quick-advance";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const reload = () => {
    fetch(`/api/v1/admin/orders/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setOrder(data.order);
        setNewStatus(data.order.status);
      });
  };

  useEffect(() => {
    reload();
  }, [id]);

  if (!order) return <div>Loading...</div>;

  const allowed = TRANSITIONS[order.status] ?? [];

  const updateStatus = async () => {
    if (newStatus === order.status) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Failed");
      }
      toast.success("Order updated");
      setNote("");
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  //  FIX 1: Handle refund using state (not DOM)
  const handleRefund = async () => {
    const amountInput = document.getElementById("refund-amount") as HTMLInputElement;
    const reasonInput = document.getElementById("refund-reason") as HTMLTextAreaElement;
    const amount = parseFloat(amountInput?.value ?? "0");
    const reason = reasonInput?.value ?? "";

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!confirm("Issue this refund? This cannot be undone.")) return;

    setRefundLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Refund failed");
      }
      toast.success("Refund issued");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRefundLoading(false);
    }
  };

  //  FIX 2: "SUCCEEDED"  "SUCCESS" (matches DB)
  const hasPayment = order.payments?.some(
    (p: any) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED"
  );

  return (
    <div className="space-y-6">
      <PageTitle
        title={`Order ${order.orderNumber}`}
        description={`Placed ${new Date(order.placedAt).toLocaleString()}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex gap-3 p-2 rounded hover:bg-muted/50">
                <div className="relative w-14 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                  {item.variant?.product?.images?.[0]?.url ? (
                    <img
                      src={item.variant.product.images[0].url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.variant?.attributes && Object.keys(item.variant.attributes).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(item.variant.attributes as Record<string, string>)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" / ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity} x {formatPrice(Number(item.price))}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(Number(item.total))}</p>
              </div>
            ))}
            <div className="pt-4 space-y-1 text-sm border-t">
              <Row label="Subtotal" value={formatPrice(Number(order.subtotal))} />
              {Number(order.discountAmount) > 0 && (
                <Row label="Discount" value={`-${formatPrice(Number(order.discountAmount))}`} />
              )}
              <Row
                label={
                  "Shipping" +
                  (order.shippingMethodName
                    ? " (" +
                      order.shippingMethodName +
                      (order.shippingEstimatedDays
                        ? " · " + order.shippingEstimatedDays
                        : "") +
                      ")"
                    : order.deliveryZone
                      ? " (" + (order.deliveryZone === "inside" ? "Inside Dhaka" : "Outside Dhaka") + ")"
                      : "")
                }
                value={formatPrice(Number(order.shippingAmount))}
              />
              <Row label="Tax" value={formatPrice(Number(order.taxAmount))} />
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{order.user?.name ?? ""}</p>
              <p className="text-muted-foreground">{order.user?.email}</p>
              {order.user?.phone && (
                <p className="text-muted-foreground">{order.user.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.line1}</p>
              {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderQuickAdvance orderId={order.id} currentStatus={order.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current:</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="space-y-1.5">
                <Label>New status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={order.status}>{order.status} (current)</SelectItem>
                    {allowed.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button
                onClick={updateStatus}
                disabled={loading || newStatus === order.status}
                className="w-full"
              >
                {loading ? "Updating..." : "Update status"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.statusLog?.map((log: any) => (
                <div key={log.id} className="flex justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                    <p>
                      {log.fromStatus}  {log.toStatus}
                    </p>
                    {log.note && (
                      <p className="text-xs text-muted-foreground">{log.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Agent's Refund Section  in right column, after Status history */}
          {hasPayment && order.status !== "REFUNDED" && (
            <Card>
              <CardHeader>
                <CardTitle>Refund</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Issue a full or partial refund to the customer's original payment method.
                </p>
                <div className="space-y-1.5">
                  <Label>Refund amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={Number(order.total).toFixed(2)}
                    id="refund-amount"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea
                    rows={2}
                    id="refund-reason"
                    placeholder="Customer request, damaged item, etc."
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleRefund}
                  disabled={refundLoading}
                >
                  {refundLoading ? "Processing..." : "Issue refund"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}