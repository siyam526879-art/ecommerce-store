"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/admin/page-title";
import { CheckCircle2, AlertTriangle, ImagePlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/admin/settings")
      .then((r) => r.json())
      .then(({ data }) => setSettings(data?.settings ?? {}))
      .catch(() => setSettings({}));
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Settings saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const stripeConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div>
      <PageTitle
        title="Store settings"
        description="Configure your store"
        actions={
          <Button onClick={save} disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        }
      />

      <Link
        href="/admin/settings/banners"
        className="mb-6 flex items-center gap-4 rounded-lg border bg-card p-4 transition hover:border-[#f85606] hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#f85606]">
          <ImagePlus className="h-6 w-6" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Website Banners</span>
          <span className="block text-xs text-muted-foreground">Homepage slider and banner photos</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Store name">
              <Input
                value={settings["store.name"] ?? ""}
                onChange={(e) => update("store.name", e.target.value)}
              />
            </Field>
            <Field label="Support email">
              <Input
                type="email"
                value={settings["store.email"] ?? ""}
                onChange={(e) => update("store.email", e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={settings["store.currency"] ?? "USD"}
                onChange={(e) => update("store.currency", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Free shipping threshold">
              <Input
                type="number"
                step="0.01"
                value={settings["shipping.freeThreshold"] ?? ""}
                onChange={(e) =>
                  update("shipping.freeThreshold", parseFloat(e.target.value))
                }
              />
            </Field>
            <Field label="Default shipping cost">
              <Input
                type="number"
                step="0.01"
                value={settings["shipping.defaultCost"] ?? ""}
                onChange={(e) =>
                  update("shipping.defaultCost", parseFloat(e.target.value))
                }
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Tax rate (%)">
              <Input
                type="number"
                step="0.01"
                value={settings["tax.rate"] ?? ""}
                onChange={(e) => update("tax.rate", parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Tax region">
              <Input
                value={settings["tax.region"] ?? ""}
                onChange={(e) => update("tax.region", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Return window (days)">
              <Input
                type="number"
                value={settings["policies.returnWindowDays"] ?? ""}
                onChange={(e) =>
                  update("policies.returnWindowDays", parseInt(e.target.value))
                }
              />
            </Field>
            <Field label="Contact phone">
              <Input
                value={settings["contact.phone"] ?? ""}
                onChange={(e) => update("contact.phone", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        {/* ===== Payments Card ===== */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                id="cod-enabled"
                checked={settings["payments.cod.enabled"] === true}
                onChange={(e) =>
                  update("payments.cod.enabled", e.target.checked)
                }
                className="h-4 w-4 mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="cod-enabled" className="cursor-pointer">
                  Cash on Delivery
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Allow customers to pay when their order is delivered.
                </p>
              </div>
            </div>

            <div
              className={
                "rounded-lg border p-4 " +
                (stripeConfigured
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                  : "bg-amber-50 dark:bg-amber-950/20 border-amber-200")
              }
            >
              <div className="flex items-start gap-3">
                {stripeConfigured ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Card Payments (Stripe)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stripeConfigured
                      ? "Stripe is configured and ready to accept card payments."
                      : "Not configured. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}