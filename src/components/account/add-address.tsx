"use client";
import { PhotonAddressAutocomplete } from "@/components/address/photon-address-autocomplete";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AddAddressProps {
  defaultFullName?: string;
  defaultPhone?: string;
}

export function AddAddress({ defaultFullName, defaultPhone }: AddAddressProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    fullName: defaultFullName ?? "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Bangladesh",
    phone: defaultPhone ?? "",
    isDefault: true,
  });

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const useLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (!res.ok) throw new Error("geocode failed");
          const data = await res.json();
          const a = data.address || {};
          setForm((f) => ({
            ...f,
            line1:
              [a.road, a.neighbourhood, a.suburb, a.hamlet]
                .filter(Boolean)
                .join(", ") || f.line1,
            city: a.city || a.town || a.village || a.county || f.city,
            state: a.state || a.division || f.state,
            postalCode: a.postcode || f.postalCode || "0000",
            country: a.country || "Bangladesh",
          }));
          toast.success("Location detected! Verify & save.");
        } catch {
          toast.error("Could not fetch address from location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied");
        } else if (err.code === err.TIMEOUT) {
          toast.error("Location request timed out");
        } else {
          toast.error("Could not get location");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const save = async () => {
    if (
      !form.fullName ||
      !form.line1 ||
      !form.city ||
      !form.postalCode ||
      !form.country
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label || undefined,
          fullName: form.fullName,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state || undefined,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone || undefined,
          isDefault: form.isDefault,
        }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to save address");
      }
      toast.success("Address saved!");
      setOpen(false);
      setForm({
        label: "Home",
        fullName: defaultFullName ?? "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Bangladesh",
        phone: defaultPhone ?? "",
        isDefault: true,
      });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Add new address
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-5 bg-card shadow-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Add new address</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-5 p-4 rounded-lg bg-muted/40 border border-dashed">
        <Button
          type="button"
          variant="default"
          onClick={useLocation}
          disabled={locating}
          className="w-full"
        >
          {locating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting your location...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Use my current location
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Auto-fill address from your device GPS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Label</label>
          <Input
            placeholder="Home, Office, etc."
            value={form.label}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Full name *
          </label>
          <Input
            placeholder="Your name"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            Address line 1 *
          </label>
          <PhotonAddressAutocomplete
            value={form.line1}
            onChange={(value) => update("line1", value)}
            onSelect={(address) => {
              setForm((current) => ({
                ...current,
                line1: address.line1 || current.line1,
                line2: address.line2 || current.line2,
                city: address.city || current.city,
                state: address.state || current.state,
                postalCode: address.postalCode || current.postalCode,
                country: address.country || current.country,
              }));
            }}
            placeholder="Type street, area, city or postcode"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            Address line 2
          </label>
          <Input
            placeholder="Apartment, landmark (optional)"
            value={form.line2}
            onChange={(e) => update("line2", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">City *</label>
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">State</label>
          <Input
            placeholder="State / Division"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Postal code *
          </label>
          <Input
            placeholder="Postal code"
            value={form.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Country *
          </label>
          <Input
            placeholder="Country"
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save address
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}