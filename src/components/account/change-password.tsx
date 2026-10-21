"use client";

import { useState } from "react";
import { Lock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const save = async () => {
    if (!current || !next || !confirm) {
      toast.error("Please fill all fields");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error?.message ?? "Failed");
      toast.success("Password changed!");
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="py-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Password</div>
          <span className="font-medium tracking-widest">••••••••</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Lock className="h-3.5 w-3.5 mr-1.5" /> Change
        </Button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-3 border-t">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Change password</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Current password
        </label>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          New password (min 8 chars)
        </label>
        <Input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Confirm new password
        </label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            "Save password"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}