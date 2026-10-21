"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTitle } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/layout/status-badge";

interface ShippingMethod {
  id: string;
  zoneId: string;
  name: string;
  price: number | string;
  dhakaPrice?: number | string | null;
  outsideDhakaPrice?: number | string | null;
  freeThreshold: number | string | null;
  estimatedDays: string | null;
  isActive: boolean;
}

interface ShippingSettings {
  freeDeliveryEnabled: boolean;
  freeDeliveryMinimum: number | string;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: unknown;
  isActive: boolean;
  methods: ShippingMethod[];
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

interface MethodForm {
  name: string;
  dhakaPrice: string;
  outsideDhakaPrice: string;
  estimatedDays: string;
}

const emptyForm: MethodForm = {
  name: "",
  dhakaPrice: "60",
  outsideDhakaPrice: "120",
  estimatedDays: "",
};

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T>;

  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.error?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  if (payload.success !== true || payload.data === undefined) {
    throw new Error("The server response is incomplete.");
  }

  return payload.data;
}

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingZone, setCreatingZone] = useState(false);
  const [creatingMethod, setCreatingMethod] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<MethodForm>(emptyForm);
  const [settings, setSettings] = useState<ShippingSettings>({
    freeDeliveryEnabled: false,
    freeDeliveryMinimum: 1000,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingRates, setEditingRates] = useState<{
    id: string;
    dhakaPrice: string;
    outsideDhakaPrice: string;
  } | null>(null);

  const load = useCallback(async (showError = true) => {
    setLoading(true);

    try {
      const response = await fetch("/api/v1/admin/shipping", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readResponse<{ zones: ShippingZone[]; settings?: ShippingSettings }>(response);

      const bangladeshZones = (data.zones ?? []).filter((zone) => {
        return (
          Array.isArray(zone.countries) &&
          zone.countries.includes("BD")
        );
      });

      setZones(bangladeshZones);

      if (data.settings) {
        setSettings({
          freeDeliveryEnabled: data.settings.freeDeliveryEnabled === true,
          freeDeliveryMinimum: data.settings.freeDeliveryMinimum ?? 1000,
        });
      }
    } catch (error) {
      if (showError) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load shipping settings."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createZone = async () => {
    setCreatingZone(true);

    try {
      const response = await fetch("/api/v1/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "zone",
          name: "Bangladesh",
          countries: ["BD"],
          isActive: true,
        }),
      });

      await readResponse<{ zone: ShippingZone }>(response);

      toast.success("Bangladesh shipping zone is ready.");
      await load(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the Bangladesh shipping zone."
      );
    } finally {
      setCreatingZone(false);
    }
  };

  const createMethod = async (zoneId: string) => {
    const name = form.name.trim();
    const dhakaPrice = Number(form.dhakaPrice);
    const outsideDhakaPrice = Number(form.outsideDhakaPrice);

    if (name.length < 2) {
      toast.error("Enter a shipping method name with at least 2 characters.");
      return;
    }

    if (!Number.isFinite(dhakaPrice) || dhakaPrice < 0) {
      toast.error("Enter a valid Dhaka delivery charge.");
      return;
    }

    if (!Number.isFinite(outsideDhakaPrice) || outsideDhakaPrice < 0) {
      toast.error("Enter a valid Outside Dhaka delivery charge.");
      return;
    }

    setCreatingMethod(true);

    try {
      const response = await fetch("/api/v1/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "method",
          zoneId,
          name,
          price: dhakaPrice,
          dhakaPrice,
          outsideDhakaPrice,
          estimatedDays: form.estimatedDays.trim() || undefined,
          isActive: true,
        }),
      });

      await readResponse<{ method: ShippingMethod }>(response);

      toast.success("Shipping method created successfully.");
      setForm(emptyForm);
      await load(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the shipping method."
      );
    } finally {
      setCreatingMethod(false);
    }
  };

  const saveSettings = async () => {
    const minimum = Number(settings.freeDeliveryMinimum);

    if (!Number.isFinite(minimum) || minimum < 0) {
      toast.error("Enter a valid minimum order amount.");
      return;
    }

    setSavingSettings(true);

    try {
      const response = await fetch("/api/v1/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "settings",
          freeDeliveryEnabled: settings.freeDeliveryEnabled,
          freeDeliveryMinimum: minimum,
        }),
      });

      const result = await readResponse<{ settings?: ShippingSettings }>(response);

      if (result.settings) {
        setSettings(result.settings);
      } else {
        setSettings((current) => ({
          ...current,
          freeDeliveryMinimum: minimum,
        }));
      }

      toast.success("Free delivery settings saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save free delivery settings."
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const saveMethodRates = async () => {
    if (!editingRates) return;

    const dhakaPrice = Number(editingRates.dhakaPrice);
    const outsideDhakaPrice = Number(editingRates.outsideDhakaPrice);

    if (!Number.isFinite(dhakaPrice) || dhakaPrice < 0) {
      toast.error("Enter a valid Dhaka delivery charge.");
      return;
    }

    if (!Number.isFinite(outsideDhakaPrice) || outsideDhakaPrice < 0) {
      toast.error("Enter a valid Outside Dhaka delivery charge.");
      return;
    }

    setBusyId(editingRates.id);

    try {
      const response = await fetch(
        `/api/v1/admin/shipping/${editingRates.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "method",
            dhakaPrice,
            outsideDhakaPrice,
          }),
        }
      );

      await readResponse<{ method: ShippingMethod }>(response);

      toast.success("Courier delivery rates updated.");
      setEditingRates(null);
      await load(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update courier rates."
      );
    } finally {
      setBusyId(null);
    }
  };
  const toggleMethod = async (
    method: ShippingMethod,
    active: boolean
  ) => {
    setBusyId(method.id);

    try {
      const response = await fetch(
        `/api/v1/admin/shipping/${method.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "method",
            isActive: active,
          }),
        }
      );

      await readResponse<{ method: ShippingMethod }>(response);

      setZones((current) =>
        current.map((zone) => ({
          ...zone,
          methods: zone.methods.map((item) =>
            item.id === method.id
              ? { ...item, isActive: active }
              : item
          ),
        }))
      );

      toast.success(
        active ? "Shipping method activated." : "Shipping method deactivated."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the shipping method."
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteMethod = async (method: ShippingMethod) => {
    const confirmed = window.confirm(
      `Delete "${method.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setBusyId(method.id);

    try {
      const response = await fetch(
        `/api/v1/admin/shipping/${method.id}?kind=method`,
        { method: "DELETE" }
      );

      await readResponse<{ ok: boolean }>(response);

      setZones((current) =>
        current.map((zone) => ({
          ...zone,
          methods: zone.methods.filter((item) => item.id !== method.id),
        }))
      );

      toast.success("Shipping method deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the shipping method."
      );
    } finally {
      setBusyId(null);
    }
  };

  const methods = zones.flatMap((zone) => zone.methods ?? []);
  const activeMethods = methods.filter((method) => method.isActive).length;
  const zone = zones[0] ?? null;

  return (
    <div className="space-y-6 pb-10">
      <PageTitle
        title="Shipping Management"
        description="Configure delivery charges and shipping services across Bangladesh."
      />

      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
              <ShieldCheck className="h-4 w-4" />
              BANGLADESH ONLY
            </div>

            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Delivery & Shipping
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              Manage delivery methods, shipping costs, and free delivery
              eligibility from one place.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4">
            <div className="rounded-lg bg-white/10 p-3">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Bangladesh</p>
              <p className="text-sm text-emerald-50/80">
                Country code: BD
              </p>
            </div>
          </div>
        </div>

        <Globe2 className="pointer-events-none absolute -bottom-10 -right-6 h-48 w-48 text-white/[0.06]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shipping zone</p>
              <p className="mt-1 text-xl font-bold">
                {loading ? "—" : zone ? "1 configured" : "Not configured"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total methods</p>
              <p className="mt-1 text-xl font-bold">
                {loading ? "—" : methods.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-green-100 p-3 text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active methods</p>
              <p className="mt-1 text-xl font-bold">
                {loading ? "—" : activeMethods}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="mt-1 text-xl font-bold">BDT (৳)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Bangladesh shipping zone
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Only deliveries within Bangladesh are enabled in this setup.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh shipping data"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading shipping configuration...
            </div>
          ) : zone ? (
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{zone.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Bangladesh · BD · BDT currency
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={zone.isActive ? "ACTIVE" : "ARCHIVED"}
                />
                <span className="rounded-full border px-3 py-1 text-xs font-medium">
                  Domestic delivery
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <MapPin className="h-7 w-7" />
              </div>

              <h3 className="text-lg font-semibold">
                Set up Bangladesh shipping
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Create the Bangladesh shipping zone before adding delivery
                methods. Existing shipping records will not be deleted.
              </p>

              <Button
                type="button"
                className="mt-5"
                onClick={createZone}
                disabled={creatingZone}
              >
                {creatingZone ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {creatingZone ? "Setting up..." : "Create Bangladesh Zone"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
            Global Free Delivery Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control free delivery for eligible orders across shipping methods.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Enable Free Delivery</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, qualifying orders can receive free delivery.
              </p>
            </div>
            <label className="flex items-center gap-3">
              <Checkbox
                checked={settings.freeDeliveryEnabled}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    freeDeliveryEnabled: checked === true,
                  }))
                }
                aria-label="Enable free delivery"
              />
              <span className="text-sm font-semibold">
                {settings.freeDeliveryEnabled ? "ON" : "OFF"}
              </span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <label htmlFor="free-delivery-minimum" className="text-sm font-medium">
                Minimum order for free delivery (৳)
              </label>
              <Input
                id="free-delivery-minimum"
                type="number"
                min="0"
                step="0.01"
                value={String(settings.freeDeliveryMinimum)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    freeDeliveryMinimum: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Default: ৳1,000. Changes take effect after saving.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => void saveSettings()}
              disabled={savingSettings}
            >
              {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingSettings ? "Saving..." : "Save Free Delivery Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {zone && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                Add delivery method
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure the delivery option, price, and estimated delivery
                time for Bangladesh.
              </p>
            </CardHeader>

            <CardContent>
              <form
                className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createMethod(zone.id);
                }}
              >
                <div className="space-y-2">
                  <label htmlFor="shipping-method-name" className="text-sm font-medium">
                    Method name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="shipping-method-name"
                    placeholder="e.g. Standard Delivery"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Give customers a clear delivery option.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="shipping-dhaka-price" className="text-sm font-medium">
                    Dhaka delivery charge (৳) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="shipping-dhaka-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="60"
                    value={form.dhakaPrice}
                    onChange={(event) =>
                      setForm({ ...form, dhakaPrice: event.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Delivery charge within Dhaka.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="shipping-outside-price" className="text-sm font-medium">
                    Outside Dhaka charge (৳) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="shipping-outside-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="120"
                    value={form.outsideDhakaPrice}
                    onChange={(event) =>
                      setForm({ ...form, outsideDhakaPrice: event.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Delivery charge outside Dhaka.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="shipping-days" className="text-sm font-medium">
                    Estimated delivery
                  </label>
                  <Input
                    id="shipping-days"
                    placeholder="e.g. 2–4 business days"
                    value={form.estimatedDays}
                    onChange={(event) =>
                      setForm({ ...form, estimatedDays: event.target.value })
                    }
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tell customers when to expect their orders.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 border-t pt-4 md:col-span-2 xl:col-span-4">
                  <p className="text-xs text-muted-foreground">
                    New methods will be active immediately.
                  </p>
                  <Button type="submit" disabled={creatingMethod}>
                    {creatingMethod ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {creatingMethod ? "Creating..." : "Add Delivery Method"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    Delivery methods
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Manage the shipping options available to your customers.
                  </p>
                </div>

                <div className="rounded-full border px-3 py-1.5 text-sm">
                  {methods.length} {methods.length === 1 ? "method" : "methods"}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : methods.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <Truck className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">No delivery methods yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add your first delivery method using the form above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editingRates && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                      <h3 className="font-semibold">Edit courier delivery rates</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Update the Dhaka and Outside Dhaka charges for the selected courier.
                      </p>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="edit-dhaka-price" className="text-sm font-medium">
                            Dhaka charge (৳)
                          </label>
                          <Input
                            id="edit-dhaka-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingRates.dhakaPrice}
                            onChange={(event) =>
                              setEditingRates((current) =>
                                current
                                  ? { ...current, dhakaPrice: event.target.value }
                                  : current
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="edit-outside-price" className="text-sm font-medium">
                            Outside Dhaka charge (৳)
                          </label>
                          <Input
                            id="edit-outside-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingRates.outsideDhakaPrice}
                            onChange={(event) =>
                              setEditingRates((current) =>
                                current
                                  ? { ...current, outsideDhakaPrice: event.target.value }
                                  : current
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingRates(null)}
                          disabled={busyId === editingRates.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void saveMethodRates()}
                          disabled={busyId === editingRates.id}
                        >
                          {busyId === editingRates.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Rates
                        </Button>
                      </div>
                    </div>
                  )}

                  {methods.map((method) => (
                    <div
                      key={method.id}
                      className="flex flex-col gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-lg bg-muted p-3">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{method.name}</h3>
                            <StatusBadge
                              status={method.isActive ? "ACTIVE" : "ARCHIVED"}
                            />
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <span>
                              Dhaka: <strong className="text-foreground">
                                {money(method.dhakaPrice ?? method.price)}
                              </strong>
                            </span>
                            <span>
                              Outside Dhaka: <strong className="text-foreground">
                                {money(method.outsideDhakaPrice ?? method.price)}
                              </strong>
                            </span>

                            {method.estimatedDays && (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {method.estimatedDays}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-4 border-t pt-3 sm:justify-end sm:border-0 sm:pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === method.id}
                          onClick={() =>
                            setEditingRates({
                              id: method.id,
                              dhakaPrice: String(method.dhakaPrice ?? method.price ?? 0),
                              outsideDhakaPrice: String(method.outsideDhakaPrice ?? method.price ?? 0),
                            })
                          }
                        >
                          Edit Rates
                        </Button>

                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={method.isActive}
                            disabled={busyId === method.id}
                            onCheckedChange={(checked) =>
                              void toggleMethod(method, checked === true)
                            }
                            aria-label={`Activate ${method.name}`}
                          />
                          <span>{method.isActive ? "Enabled" : "Disabled"}</span>
                        </label>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === method.id}
                          onClick={() => void deleteMethod(method)}
                          aria-label={`Delete ${method.name}`}
                        >
                          {busyId === method.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">Shipping configuration</p>
          <p className="mt-1 leading-6">
            International shipping is intentionally unavailable. This page
            manages Bangladesh shipping only. Existing records for other
            countries are not deleted by this interface.
          </p>
        </div>
      </div>
    </div>
  );
}

