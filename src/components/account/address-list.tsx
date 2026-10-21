"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, MapPin, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Address {
  id: string;
  label?: string | null;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export function AddressList({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const handleDelete = async (id: string, label?: string | null) => {
    if (!confirm("Delete this address" + (label ? " (" + label + ")" : "") + "?")) return;

    setDeleting(id);
    try {
      const res = await fetch("/api/v1/addresses/" + id, { method: "DELETE" });
      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
      if (!res.ok) {
        throw new Error(json.error?.message ?? "This address cannot be deleted right now");
      }
      toast.success("Address deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id);
    try {
      const res = await fetch("/api/v1/addresses/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
      if (!res.ok) throw new Error(json.error?.message ?? "Failed");
      toast.success("Set as default");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSettingDefault(null);
    }
  };

  if (addresses.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-10 text-center">
        <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="font-semibold mb-1">No saved addresses</h2>
        <p className="text-sm text-muted-foreground">
          Add an address during checkout to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addresses.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border p-4 space-y-3 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <p className="font-semibold">{a.label ?? "Address"}</p>
            {a.isDefault && (
              <span className="text-[10px] uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Default
              </span>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>{a.fullName}</p>
            <p>{a.line1}{a.line2 ? ", " + a.line2 : ""}</p>
            <p>{a.city}{a.state ? ", " + a.state : ""} {a.postalCode}</p>
            <p>{a.country}</p>
            {a.phone && <p className="mt-1">{a.phone}</p>}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            {!a.isDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetDefault(a.id)}
                disabled={settingDefault === a.id}
                className="flex-1"
              >
                {settingDefault === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><Check className="h-3.5 w-3.5 mr-1" /> Set default</>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDelete(a.id, a.label)}
              disabled={deleting === a.id}
              className="flex-1 text-destructive hover:text-destructive"
            >
              {deleting === a.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}