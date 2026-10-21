"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";

export function SignOutConfirm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const yes = async () => {
    setBusy(true);
    try {
      await signOut({ callbackUrl: "/auth/login" });
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center text-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <LogOut className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold">Sign out?</h3>
        <p className="mt-1 text-sm text-gray-500">Are you sure you want to sign out?</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded border py-2 text-sm font-semibold hover:bg-gray-50">
            No
          </button>
          <button
            type="button"
            onClick={yes}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Yes, sign out
          </button>
        </div>
      </div>
    </div>
  );
}
