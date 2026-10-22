"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { SignOutConfirm } from "@/components/auth/sign-out-confirm";

export function HeaderAccount() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openAuth = (mode: "login" | "register") =>
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: mode }));

  if (status === "loading") return <span className="h-4 w-24" />;

  if (status !== "authenticated") {
    return (
      <>
        <button type="button" onClick={() => openAuth("login")} className="whitespace-nowrap rounded-md px-2 py-2 font-semibold text-white hover:bg-white/15 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">LOGIN</button>
        <button type="button" onClick={() => openAuth("register")} className="whitespace-nowrap rounded-md px-2 py-2 font-semibold text-white hover:bg-white/15 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">SIGN UP</button>
      </>
    );
  }

  const first = (session?.user?.name || session?.user?.email || "My").split(/[\s@]/)[0];
  const role = (session?.user as any)?.role as string | undefined;

  return (
    <div ref={ref} className="relative flex h-9 items-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 uppercase hover:underline">
        {first}&apos;S ACCOUNT <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[140] w-52 overflow-hidden rounded-md border bg-white p-3 text-gray-800 shadow-2xl normal-case">
          <p className="mb-2 truncate text-sm font-semibold">{session?.user?.name || session?.user?.email}</p>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block rounded bg-[#f85606] py-2 text-center text-sm font-bold text-white hover:bg-[#d94b05]"
          >
            My Account
          </Link>
          <Link href="/account/orders" onClick={() => setOpen(false)} className="mt-1 block rounded px-2 py-2 text-sm hover:bg-orange-50">
            My Orders
          </Link>
          {(role === "ADMIN" || role === "STAFF") && (
            <Link href="/admin" onClick={() => setOpen(false)} className="block rounded px-2 py-2 text-sm hover:bg-orange-50">
              Admin Panel
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); setConfirm(true); }}
            className="block w-full rounded px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      )}
      <SignOutConfirm open={confirm} onClose={() => setConfirm(false)} />
    </div>
  );
}

