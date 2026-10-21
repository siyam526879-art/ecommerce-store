"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Images, LogOut, Store } from "lucide-react";

type Box = { top: number; left: number; width: number; height: number };

function findSidebar(): HTMLElement | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ok = (el: HTMLElement) => {
    if (el.closest("[data-settings-sidebar]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 150 && r.width < vw * 0.45 && r.height > vh * 0.8 && r.left < 40;
  };
  const asides = Array.from(document.querySelectorAll("aside")) as HTMLElement[];
  for (const a of asides) if (ok(a)) return a;
  const nodes = Array.from(document.querySelectorAll("a, span, h1, h2, h3, div, p")) as HTMLElement[];
  for (const n of nodes) {
    if (n.closest("[data-settings-sidebar]")) continue;
    if (n.children.length > 0 || n.textContent?.trim() !== "Admin Panel") continue;
    let el: HTMLElement | null = n;
    while (el && el !== document.body) {
      if (ok(el)) return el;
      el = el.parentElement;
    }
  }
  return null;
}

const item = (on: boolean) =>
  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition " +
  (on ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100");

export function SettingsSidebarHost() {
  const pathname = usePathname() ?? "";
  const [box, setBox] = useState<Box | null>(null);
  const active = pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");

  useEffect(() => {
    if (!active) {
      setBox(null);
      return;
    }
    const measure = () => {
      const el = findSidebar();
      if (!el) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setBox((prev) =>
        prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height }
      );
    };
    measure();
    const id = window.setInterval(measure, 300);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, pathname]);

  if (!active || !box) return null;

  const bannersActive = pathname.startsWith("/admin/settings/banners");

  return createPortal(
    <div
      data-settings-sidebar
      style={{ position: "fixed", top: box.top, left: box.left, width: box.width, height: box.height, zIndex: 45 }}
      className="flex flex-col overflow-hidden border-r border-gray-200 bg-white"
    >
      <Link href="/admin" className="flex h-16 shrink-0 items-center gap-3 px-6 text-xl font-bold text-gray-900">
        <Store className="h-7 w-7" /> Admin Panel
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto border-t border-gray-100 px-3 py-4">
        <Link href="/admin/settings/banners" className={item(bannersActive)}>
          <Images className="h-5 w-5" /> Website Banners
        </Link>
      </nav>

      <div className="shrink-0 border-t border-gray-100 px-3 py-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </div>
    </div>,
    document.body
  );
}
