"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ShoppingCart, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { formatPrice, cleanProductName } from "@/lib/utils";
import { toast } from "sonner";

export function CartButton() {
  const { status } = useSession();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const count = mounted ? items.reduce((s, i) => s + i.quantity, 0) : 0;
  const list = mounted ? items : [];
  const subtotal = list.reduce((s, i) => s + i.price * i.quantity, 0);

  const buy = (variantId: string) => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      toast("Please sign in to place an order");
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));
      return;
    }
    window.location.assign("/checkout?only=" + encodeURIComponent(variantId));
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Cart"
        onClick={() => setOpen((o) => !o)}
        className="relative text-white hover:opacity-80"
      >
        <ShoppingCart className="h-8 w-8" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-[#f85606]">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[130] mt-3 w-[22rem] max-w-[92vw] overflow-hidden rounded-md border bg-white text-gray-800 shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">My cart ({count})</p>
            <Link href="/cart" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#f85606] hover:underline">
              View cart
            </Link>
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-gray-500">
              <ShoppingBag className="h-8 w-8 text-gray-300" />
              Your cart is empty
            </div>
          ) : (
            <>
              <p className="border-b bg-orange-50 px-4 py-2 text-xs text-gray-600">
                Click a product to order it.
              </p>
              <ul className="max-h-[55vh] divide-y overflow-y-auto">
                {list.map((i) => (
                  <li key={i.variantId} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50">
                    <button
                      type="button"
                      onClick={() => buy(i.variantId)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                        {i.image ? (
                          <Image src={i.image} alt={cleanProductName(i.name)} fill sizes="48px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{cleanProductName(i.name)}</p>
                        <p className="text-xs text-gray-500">
                          {i.quantity} x {formatPrice(i.price)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#f85606]">{formatPrice(i.price * i.quantity)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i.variantId)}
                      aria-label="Remove"
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}