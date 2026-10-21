"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Download,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { PageTitle } from "@/components/admin/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

type DemandItem = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  unitPrice: number;
  costReference: number | null;
  quantity: number;
  customerOrders: number;
  suggestedPurchase: number;
  imageUrl: string | null;
  orders: {
    orderId: string;
    orderNumber: string;
    status: string;
    placedAt: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    quantity: number;
  }[];
};

type CustomerOrder = {
  orderId: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  quantity: number;
  productName: string;
  sku: string;
  variantId: string;
};

type Dashboard = {
  revenue: { total: number; thisMonth: number; trend: number };
  orders: { total: number; thisMonth: number; pending: number };
  customers: number;
  products: number;
  lowStockCount: number;
  salesChart: { date: string; total: number }[];
};

type SalesTrendItem = {
  name: string;
  sku: string;
  quantity: number;
  sales: number;
  cost: number | null;
};

type SalesTrendDay = {
  date: string;
  sales: number;
  refunds: number;
  netRevenue: number;
  grossProfit: number;
  orders: number;
  costMissing: number;
  orderDetails: {
    orderNumber: string;
    status: string;
    total: number;
    placedAt: string;
    items: SalesTrendItem[];
  }[];
};

type SalesTrendResponse = {
  generatedAt: string;
  days: SalesTrendDay[];
  totals: {
    sales: number;
    refunds: number;
    netRevenue: number;
    grossProfit: number;
    orders: number;
    costMissing: number;
  };
};

type DemandResponse = {
  generatedAt: string;
  totalProducts: number;
  totalUnits: number;
  demand: DemandItem[];
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

export default function AIManagerPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendResponse | null>(null);
  const [selectedSalesDate, setSelectedSalesDate] = useState("");
  const [demandData, setDemandData] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [skuQuery, setSkuQuery] = useState("");
  const [skuResult, setSkuResult] = useState<Record<string, unknown> | null>(null);
  const [skuSearched, setSkuSearched] = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderPage, setOrderPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, demandResponse, salesTrendResponse] = await Promise.all([
        fetch("/api/v1/admin/dashboard", { cache: "no-store" }),
        fetch("/api/v1/admin/ai-manager", { cache: "no-store" }),
        fetch("/api/v1/admin/ai-manager/sales-trend", { cache: "no-store" }),
      ]);

      const [dashboardBody, demandBody, salesTrendBody] = await Promise.all([
        dashboardResponse.json(),
        demandResponse.json(),
        salesTrendResponse.json(),
      ]);

      if (!dashboardResponse.ok) {
        throw new Error(dashboardBody.error || "Dashboard data could not be loaded.");
      }

      if (!demandResponse.ok) {
        throw new Error(demandBody.error || "Supplier demand could not be loaded.");
      }

      if (!salesTrendResponse.ok) {
        throw new Error(salesTrendBody.error || "Sales trend could not be loaded.");
      }

      const nextDashboard = dashboardBody.data ?? dashboardBody;
      const nextDemand = demandBody.data ?? demandBody;
      const nextSalesTrend = salesTrendBody.data ?? salesTrendBody;

      setDashboard(nextDashboard);
      setDemandData(nextDemand);
      setSalesTrend(nextSalesTrend);

      if (nextSalesTrend.days?.length) {
        setSelectedSalesDate(
          (current) => current || nextSalesTrend.days[nextSalesTrend.days.length - 1].date
        );
      }

      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI Manager data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const timer = window.setInterval(() => {
      void loadData();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadData]);

  async function searchSku(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = skuQuery.trim();
    if (!query) return;

    setSkuLoading(true);
    setSkuSearched(false);
    setSkuResult(null);

    try {
      const response = await fetch(
        "/api/v1/admin/ai-manager?sku=" + encodeURIComponent(query),
        { cache: "no-store" }
      );
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error?.message || body.error || "SKU search failed.");
      }

      const data = body.data ?? body;
      setSkuResult(data.skuLookup ?? null);
      setSkuSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SKU search failed.");
    } finally {
      setSkuLoading(false);
    }
  }

  const allCustomerOrders: CustomerOrder[] = (demandData?.demand ?? [])
    .flatMap((item) =>
      item.orders.map((order) => ({
        ...order,
        productName: item.productName,
        sku: item.sku,
        variantId: item.variantId,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
    );

  const normalizedOrderSearch = orderSearch.trim().toLowerCase();

  const filteredCustomerOrders = allCustomerOrders.filter((order) => {
    const matchesSearch =
      !normalizedOrderSearch ||
      order.orderNumber.toLowerCase().includes(normalizedOrderSearch) ||
      order.customerName.toLowerCase().includes(normalizedOrderSearch) ||
      order.customerEmail.toLowerCase().includes(normalizedOrderSearch) ||
      order.productName.toLowerCase().includes(normalizedOrderSearch) ||
      order.sku.toLowerCase().includes(normalizedOrderSearch);

    const matchesStatus =
      orderStatusFilter === "ALL" ||
      order.status === orderStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalOrderPages = Math.max(
    1,
    Math.ceil(filteredCustomerOrders.length / ordersPerPage)
  );

  const safeOrderPage = Math.min(orderPage, totalOrderPages);

  const paginatedCustomerOrders = filteredCustomerOrders.slice(
    (safeOrderPage - 1) * ordersPerPage,
    safeOrderPage * ordersPerPage
  );

  function exportSupplierDraft() {
    if (!demandData) return;

    const rows = [
      ["Company", "Trillion Mart"],
      ["Document", "Supplier Purchase Draft - Review Required"],
      ["Generated At", demandData.generatedAt],
      [],
      [
        "Product",
        "SKU",
        "Variant ID",
        "Customer Orders",
        "Demand Quantity",
        "Current Stock",
        "Suggested Purchase",
        "Cost Reference",
        "Supplier Unit Price",
        "Supplier",
      ],
      ...demandData.demand.map((item) => [
        item.productName,
        item.sku,
        item.variantId,
        item.customerOrders,
        item.quantity,
        item.currentStock,
        item.suggestedPurchase,
        item.costReference ?? "",
        "",
        "",
      ]),
    ];

    const csv = "\uFEFF" + rows.map((row) =>
      row.map(csvCell).join(",")
    ).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `trillion-mart-supplier-draft-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  const chart = salesTrend?.days ?? [];
  const maxSales = Math.max(1, ...chart.map((day) => day.sales));
  const selectedSalesDay =
    chart.find((day) => day.date === selectedSalesDate) ?? chart[chart.length - 1];

  return (
    <div className="space-y-6">
      <PageTitle
        title="AI Manager"
        description="Business monitoring, demand analysis and supplier purchase planning"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {lastUpdated ? `Last refreshed: ${lastUpdated}` : "Database refreshes every 15 seconds"}
        </div>
        <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh data
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !dashboard ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading business data...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total revenue</p>
                  <p className="text-xl font-semibold">
                    {formatPrice(dashboard?.revenue.total ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This month: {formatPrice(dashboard?.revenue.thisMonth ?? 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <ShoppingCart className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                  <p className="text-xl font-semibold">{dashboard?.orders.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Pending: {dashboard?.orders.pending ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Active products</p>
                  <p className="text-xl font-semibold">{dashboard?.products ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Consolidated demand: {demandData?.totalUnits ?? 0} units
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Low-stock variants</p>
                  <p className="text-xl font-semibold">{dashboard?.lowStockCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Stock at or below 5</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Sales trend — last 30 days
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Database-backed sales, successful refunds and estimated gross profit.
                  Refreshes every 15 seconds.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="mt-1 font-semibold">{formatPrice(salesTrend?.totals.sales ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Successful refunds</p>
                    <p className="mt-1 font-semibold text-red-600">
                      -{formatPrice(salesTrend?.totals.refunds ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Net revenue</p>
                    <p className="mt-1 font-semibold">{formatPrice(salesTrend?.totals.netRevenue ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Gross profit*</p>
                    <p className="mt-1 font-semibold">{formatPrice(salesTrend?.totals.grossProfit ?? 0)}</p>
                  </div>
                </div>

                {chart.length === 0 ? (
                  <p className="py-8 text-sm text-muted-foreground">
                    Sales trend data is not available yet.
                  </p>
                ) : (
                  <>
                    <div className="mt-6 flex h-56 items-end gap-1 overflow-x-auto">
                      {chart.map((day) => (
                        <button
                          key={day.date}
                          type="button"
                          aria-label={`${day.date}, sales ${formatPrice(day.sales)}, refunds ${formatPrice(day.refunds)}`}
                          onClick={() => setSelectedSalesDate(day.date)}
                          className={`flex h-full min-w-2 flex-1 flex-col justify-end rounded-t transition-opacity hover:opacity-70 ${
                            selectedSalesDate === day.date ? "ring-2 ring-primary ring-offset-2" : ""
                          }`}
                          title={`${day.date}\nSales: ${formatPrice(day.sales)}\nRefunds: ${formatPrice(day.refunds)}\nNet: ${formatPrice(day.netRevenue)}\nGross profit: ${formatPrice(day.grossProfit)}`}
                        >
                          <span
                            className={`block w-full rounded-t ${
                              day.netRevenue < 0 ? "bg-red-600" : "bg-primary/80"
                            }`}
                            style={{
                              height: `${Math.max(2, (day.sales / maxSales) * 100)}%`,
                            }}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>{chart[0]?.date}</span>
                      <span>{chart[chart.length - 1]?.date}</span>
                    </div>

                    {selectedSalesDay && (
                      <div className="mt-5 space-y-3 rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">Daily details — {selectedSalesDay.date}</h3>
                          <span className="text-xs text-muted-foreground">
                            {selectedSalesDay.orders} orders
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Sales</p>
                            <p className="font-medium">{formatPrice(selectedSalesDay.sales)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Refunds</p>
                            <p className="font-medium text-red-600">
                              -{formatPrice(selectedSalesDay.refunds)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Net revenue</p>
                            <p className="font-medium">{formatPrice(selectedSalesDay.netRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Gross profit*</p>
                            <p className="font-medium">{formatPrice(selectedSalesDay.grossProfit)}</p>
                          </div>
                        </div>

                        {selectedSalesDay.costMissing > 0 && (
                          <p className="text-xs text-amber-600">
                            Cost data is missing for {selectedSalesDay.costMissing} item line(s).
                            Gross profit is incomplete for this day.
                          </p>
                        )}

                        {selectedSalesDay.orderDetails.length > 0 ? (
                          <div className="space-y-2">
                            {selectedSalesDay.orderDetails.map((order) => (
                              <div key={order.orderNumber} className="rounded-md bg-muted/40 p-3 text-sm">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <span className="font-medium">{order.orderNumber}</span>
                                  <span>{formatPrice(order.total)} · {order.status}</span>
                                </div>
                                <div className="mt-2 space-y-1 text-muted-foreground">
                                  {order.items.map((item, index) => (
                                    <div key={`${order.orderNumber}-${item.sku}-${index}`} className="flex flex-wrap justify-between gap-2">
                                      <span>{item.name} × {item.quantity}</span>
                                      <span>
                                        {formatPrice(item.sales)}
                                        {item.cost === null ? " · cost missing" : ` · cost ${formatPrice(item.cost)}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No qualifying orders were recorded on this date.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <p className="mt-3 text-xs text-muted-foreground">
                  *Gross profit is estimated from item sales minus product cost. It is not net profit
                  and does not subtract operating expenses. Only SUCCEEDED refunds are counted.
                  Refunds appear on the date the refund was recorded.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Business insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Sales monitoring</p>
                  <p className="mt-1 text-muted-foreground">
                    This month&apos;s recorded revenue is{" "}
                    {formatPrice(dashboard?.revenue.thisMonth ?? 0)}.
                    The previous-month comparison is{" "}
                    {Number(dashboard?.revenue.trend ?? 0).toFixed(1)}%.
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Inventory attention</p>
                  <p className="mt-1 text-muted-foreground">
                    {dashboard?.lowStockCount ?? 0} active product variants have
                    stock at or below five units.
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Consolidated customer demand</p>
                  <p className="mt-1 text-muted-foreground">
                    {demandData?.totalProducts ?? 0} product variants appear in
                    eligible customer orders, totalling {demandData?.totalUnits ?? 0} units.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  These are rule-based observations from live store data, not
                  generated AI predictions. No AI provider is connected yet.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SKU Product Finder</CardTitle>
              <p className="text-sm text-muted-foreground">
                Search the product database using an exact product or variant SKU.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={searchSku} className="flex flex-wrap gap-2">
                <input
                  value={skuQuery}
                  onChange={(event) => setSkuQuery(event.target.value)}
                  placeholder="Enter SKU, e.g. TM-ABC-001"
                  className="min-w-[220px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  aria-label="Product SKU"
                />
                <Button type="submit" disabled={skuLoading || !skuQuery.trim()}>
                  {skuLoading ? "Searching..." : "Find product"}
                </Button>
              </form>

              {skuSearched && !skuResult && (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No product was found for this SKU. Check the spelling or search the product list.
                </p>
              )}

              {skuResult && (
                <div className="flex flex-wrap items-start gap-4 rounded-lg border p-4">
                  {typeof skuResult.imageUrl === "string" && (
                    <img
                      src={skuResult.imageUrl}
                      alt={String(skuResult.name ?? "Product")}
                      className="h-28 w-28 rounded-md border object-contain"
                    />
                  )}
                  <div className="min-w-[220px] flex-1 space-y-1 text-sm">
                    <h3 className="font-semibold">{String(skuResult.name ?? "")}</h3>
                    <p>SKU: {String(skuResult.sku ?? "—")}</p>
                    <p>Category: {String(skuResult.category ?? "—")}</p>
                    <p>Price: {formatPrice(Number(skuResult.price ?? 0))}</p>
                    <p>Stock: {skuResult.trackInventory === false ? "Inventory tracking disabled" : String(skuResult.stock ?? 0)}</p>
                    <p>Status: {String(skuResult.status ?? "—")}</p>
                    <p className="text-muted-foreground">{String(skuResult.shortDescription ?? skuResult.description ?? "")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <p className="text-sm text-muted-foreground">
                Every eligible customer order is listed separately, even when multiple customers buy the same product.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_130px]">
                <input
                  value={orderSearch}
                  onChange={(event) => {
                    setOrderSearch(event.target.value);
                    setOrderPage(1);
                  }}
                  placeholder="Search order, customer, product or SKU"
                  aria-label="Search customer orders"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />

                <select
                  value={orderStatusFilter}
                  onChange={(event) => {
                    setOrderStatusFilter(event.target.value);
                    setOrderPage(1);
                  }}
                  aria-label="Filter orders by status"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                </select>

                <select
                  value={ordersPerPage}
                  onChange={(event) => {
                    setOrdersPerPage(Number(event.target.value));
                    setOrderPage(1);
                  }}
                  aria-label="Orders per page"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {filteredCustomerOrders.length} matching order(s) ·{" "}
                  {allCustomerOrders.length} total eligible order entries
                </span>
                <span>
                  Page {safeOrderPage} of {totalOrderPages}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="p-3">Order number</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomerOrders.map((order, index) => (
                      <tr
                        key={`${order.orderId}-${order.variantId}-${index}`}
                        className="border-b last:border-0 align-top"
                      >
                        <td className="p-3 font-medium">{order.orderNumber}</td>
                        <td className="p-3 whitespace-nowrap">
                          {new Date(order.placedAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.customerEmail}
                          </div>
                          {order.customerPhone && (
                            <div className="text-xs text-muted-foreground">
                              {order.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="p-3">{order.productName}</td>
                        <td className="p-3">{order.sku || "—"}</td>
                        <td className="p-3 text-right">{order.quantity}</td>
                        <td className="p-3">
                          <span className="inline-flex rounded-full border px-2 py-1 text-xs">
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <details>
                            <summary className="cursor-pointer text-primary">
                              View
                            </summary>
                            <div className="mt-2 min-w-[190px] space-y-1 rounded-md border p-3 text-xs">
                              <div><strong>Order:</strong> {order.orderNumber}</div>
                              <div><strong>Customer:</strong> {order.customerName}</div>
                              <div><strong>Email:</strong> {order.customerEmail}</div>
                              <div><strong>Product:</strong> {order.productName}</div>
                              <div><strong>SKU:</strong> {order.sku || "—"}</div>
                              <div><strong>Quantity:</strong> {order.quantity}</div>
                              <div><strong>Status:</strong> {order.status}</div>
                              <div><strong>Placed:</strong> {new Date(order.placedAt).toLocaleString()}</div>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}

                    {paginatedCustomerOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No matching customer orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  {filteredCustomerOrders.length === 0
                    ? 0
                    : (safeOrderPage - 1) * ordersPerPage + 1}
                  {"–"}
                  {Math.min(safeOrderPage * ordersPerPage, filteredCustomerOrders.length)}
                  {" of "}
                  {filteredCustomerOrders.length} orders
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={safeOrderPage <= 1}
                    onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={safeOrderPage >= totalOrderPages}
                    onClick={() => setOrderPage((page) => Math.min(totalOrderPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Supplier Order Manager</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Trillion Mart · Consolidated demand from pending, confirmed
                    and processing orders
                  </p>
                </div>
                <Button
                  onClick={exportSupplierDraft}
                  disabled={!demandData || demandData.demand.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export supplier draft
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <strong>Review required:</strong> This file is a purchase-planning
                draft only. It does not contact suppliers, create supplier orders,
                or make payments. Check stock, supplier prices, shipping and
                quantities before approval.
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Demand</th>
                      <th className="p-3 text-right">Stock</th>
                      <th className="p-3 text-right">Suggested purchase</th>
                      <th className="p-3 text-right">Cost reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(demandData?.demand ?? []).map((item) => (
                      <tr key={item.variantId} className="border-b last:border-0">
                        <td className="p-3 font-medium">
                          <div>{item.productName}</div>
                          <details className="mt-1 font-normal">
                            <summary className="cursor-pointer text-xs text-primary">
                              View customer orders ({item.orders.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {item.orders.map((order) => (
                                <div key={order.orderId} className="rounded border p-2 text-xs">
                                  <div className="font-medium">{order.orderNumber}</div>
                                  <div>Customer: {order.customerName}</div>
                                  <div>Email: {order.customerEmail}</div>
                                  {order.customerPhone && <div>Phone: {order.customerPhone}</div>}
                                  <div>Quantity: {order.quantity} · Status: {order.status}</div>
                                  <div>{new Date(order.placedAt).toLocaleString()}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </td>
                        <td className="p-3">{item.sku || "—"}</td>
                        <td className="p-3 text-right">{item.customerOrders}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">{item.currentStock}</td>
                        <td className="p-3 text-right font-semibold">
                          {item.suggestedPurchase}
                        </td>
                        <td className="p-3 text-right">
                          {item.costReference == null
                            ? "Not set"
                            : formatPrice(item.costReference)}
                        </td>
                      </tr>
                    ))}
                    {(!demandData || demandData.demand.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No eligible product demand was found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Suggested purchase quantity is calculated as consolidated order
                demand minus current variant stock, with a minimum of zero.
                Review cancellations, reservations and stock allocation before purchasing.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}




