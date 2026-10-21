"use client";

import { useState } from "react";
import { Loader2, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface RefundFormProps {
  orderId: string;
  orderNumber: string;
  total: number;
  currency: string;
  hasPayment: boolean;
  isRefunded: boolean;
  onSuccess?: () => void;
}

export function RefundForm({
  orderId,
  orderNumber,
  total,
  currency,
  hasPayment,
  isRefunded,
  onSuccess,
}: RefundFormProps) {
  const [amount, setAmount] = useState(total.toFixed(2));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Already refunded
  if (isRefunded) {
    return (
      <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-sm">
        <p className="font-medium text-green-700 dark:text-green-400">
          ✓ This order has been refunded
        </p>
      </div>
    );
  }

  // No payment to refund
  if (!hasPayment) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">No refundable payment found</p>
        <p className="text-xs">
          Only orders with successful card payments can be refunded via this tool.
        </p>
      </div>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const isPartial = numAmount < total && numAmount > 0;
  const isFull = numAmount === total;
  const isValid = numAmount > 0 && numAmount <= total;

  const handleRefund = async () => {
    if (!isValid) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          reason: reason || "requested_by_customer",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message ?? "Refund failed");
      }

      toast.success(
        `Refund of ${formatPrice(numAmount)} processed successfully`
      );
      setShowConfirm(false);

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("[REFUND ERROR]", err);
      toast.error(err.message ?? "Refund failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 flex gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-amber-900 dark:text-amber-200">
          Refunds cannot be undone. The customer will receive the amount via
          their original payment method within 5-10 business days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Order total</p>
          <p className="font-semibold text-base">{formatPrice(total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Currency</p>
          <p className="font-semibold text-base">{currency}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Refund amount</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          max={total}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAmount(total.toFixed(2))}
          >
            Full ({formatPrice(total)})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAmount((total / 2).toFixed(2))}
          >
            Half ({formatPrice(total / 2)})
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Reason (optional)</Label>
        <Textarea
          rows={2}
          placeholder="e.g., Product damaged, Customer request..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {numAmount > 0 && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between mb-1">
            <span>Type:</span>
            <span className="font-medium">
              {isFull ? "Full Refund" : isPartial ? "Partial Refund" : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-semibold">{formatPrice(numAmount)}</span>
          </div>
        </div>
      )}

      {!showConfirm ? (
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => setShowConfirm(true)}
          disabled={!isValid || loading}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Process Refund
        </Button>
      ) : (
        <div className="space-y-2 border rounded-lg p-4 bg-destructive/5">
          <p className="text-sm font-medium">
            Confirm refund of {formatPrice(numAmount)}?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={handleRefund}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, refund"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}