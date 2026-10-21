"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Package, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Item = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  placedAt: string;
  items: Item[];
};

type ReturnRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  reason: string;
  items: unknown;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
};

const TAKA = "\u09F3";

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-green-100 text-green-800",
};

function money(value: number) {
  return TAKA + Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ReturnsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [orderId, setOrderId] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, returnsRes] = await Promise.all([
        fetch("/api/v1/my-orders", { cache: "no-store" }),
        fetch("/api/v1/my-returns", { cache: "no-store" }),
      ]);

      if (ordersRes.status === 401 || returnsRes.status === 401) {
        setError("Please sign in to manage your returns.");
        return;
      }

      const ordersData = await ordersRes.json();
      const returnsData = await returnsRes.json();

      if (!ordersRes.ok) throw new Error("Could not load your orders.");
      if (!returnsRes.ok || returnsData.success === false) {
        throw new Error(returnsData.error || "Could not load return requests.");
      }

      setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
      setReturns(Array.isArray(returnsData.returns) ? returnsData.returns : []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chosenOrder = orders.find((order) => order.id === orderId);
  const chosenItems = chosenOrder?.items.filter((item) => (selected[item.id] || 0) > 0) ?? [];
  const estimatedRefund = chosenItems.reduce(
    (sum, item) => sum + item.price * (selected[item.id] || 0),
    0
  );

  function selectOrder(id: string) {
    setOrderId(id);
    setSelected({});
    setMessage("");
    setError("");
  }

  function updateQuantity(item: Item, value: number) {
    setSelected((previous) => {
      const next = { ...previous };
      if (value <= 0) delete next[item.id];
      else next[item.id] = Math.min(value, item.quantity);
      return next;
    });
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!chosenOrder) {
      setError("Please select a delivered order.");
      return;
    }

    if (chosenItems.length === 0) {
      setError("Please select at least one product to return.");
      return;
    }

    if (reason.trim().length < 5) {
      setError("Please explain the reason (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/my-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: reason.trim(),
          items: chosenItems.map((item) => ({
            orderItemId: item.id,
            quantity: selected[item.id],
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Could not submit your request."
        );
      }

      setMessage("Your return request has been submitted successfully.");
      setOrderId("");
      setSelected({});
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your returns...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-[#f85606]">
          <RotateCcw className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return & Refund</h1>
          <p className="mt-1 text-sm text-gray-500">
            Request a return and track the status of your refund.
          </p>
        </div>
      </div>

      {message && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Create a return request</h2>
        <p className="mb-5 text-sm text-gray-500">
          Only delivered orders with confirmed payment are eligible.
        </p>

        {orders.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-10 text-center">
            <Package className="mx-auto mb-3 h-9 w-9 text-gray-400" />
            <p className="font-medium text-gray-700">No orders found</p>
            <p className="mt-1 text-sm text-gray-500">Your orders will appear here.</p>
          </div>
        ) : (
          <form onSubmit={submitRequest} className="space-y-5">
            <div>
              <label htmlFor="return-order" className="mb-2 block text-sm font-semibold text-gray-700">
                Select order
              </label>
              <select
                id="return-order"
                value={orderId}
                onChange={(e) => selectOrder(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#f85606] focus:ring-2 focus:ring-orange-100"
                required
              >
                <option value="">Choose an order</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} — {order.status} — {money(order.total)}
                  </option>
                ))}
              </select>
            </div>

            {chosenOrder && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Select products and quantities</h3>
                {chosenOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {money(item.price)} each · Purchased: {item.quantity}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <label htmlFor={`qty-${item.id}`} className="mb-1 block text-xs text-gray-500">
                        Return qty
                      </label>
                      <select
                        id={`qty-${item.id}`}
                        value={selected[item.id] || 0}
                        onChange={(e) => updateQuantity(item, Number(e.target.value))}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                      >
                        <option value={0}>None</option>
                        {Array.from({ length: item.quantity }, (_, i) => i + 1).map((qty) => (
                          <option key={qty} value={qty}>{qty}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-orange-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700">Estimated product refund</span>
                    <span className="text-lg font-bold text-[#f85606]">{money(estimatedRefund)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Final amount is subject to admin inspection and approval. Delivery charges or discounts may affect the final amount.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="return-reason" className="mb-2 block text-sm font-semibold text-gray-700">
                Reason for return
              </label>
              <textarea
                id="return-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={5}
                maxLength={2000}
                rows={4}
                placeholder="Tell us why you want to return these products..."
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#f85606] focus:ring-2 focus:ring-orange-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !orderId || chosenItems.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f85606] px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {submitting ? "Submitting..." : "Submit return request"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Your return requests</h2>

        {returns.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">You have not submitted any return requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((item) => (
              <article key={item.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{item.orderNumber}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Requested {new Date(item.createdAt).toLocaleDateString("en-BD")}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[item.status] || "bg-gray-100 text-gray-700"}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-600">{item.reason}</p>
                  <p className="mt-2 text-sm font-bold text-gray-900">
                    Requested amount: {money(item.refundAmount)}
                  </p>
                  {item.status === "REQUESTED" && (
                    <p className="mt-2 text-xs text-amber-700">Waiting for admin review.</p>
                  )}
                  {item.status === "APPROVED" && (
                    <p className="mt-2 text-xs text-blue-700">Approved. Refund processing may still be pending.</p>
                  )}
                  {item.status === "REJECTED" && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-red-700">
                      <XCircle className="h-4 w-4" /> This request was rejected.
                    </p>
                  )}
                  {item.status === "COMPLETED" && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> The return workflow is marked completed.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}