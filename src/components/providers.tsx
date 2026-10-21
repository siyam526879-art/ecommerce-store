"use client";
import { AuthModalHost } from "@/components/auth/auth-modal";
import { SettingsSidebarHost } from "@/components/admin/settings-sidebar";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <AuthModalHost />
      <SettingsSidebarHost />
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}