"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  attributes?: Record<string, string>;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

const CART_VERSION = 6;

// Detect mojibake / corrupted strings
function cleanText(s: string): string {
  if (typeof s !== "string") return "";
  // Remove common mojibake sequences
  const stripped = s.replace(/[][^\s]*/g, "").replace(/[\u0080-\u00BF]+/g, "");
  return stripped.replace(/\s+/g, " ").trim();
}

function isCorruptedString(s: string): boolean {
  if (typeof s !== "string") return true;
  // Reject strings with common mojibake markers
  if (/[]/.test(s)) return true;
  // Reject strings with weird non-ASCII (allow standard letters + emoji ranges)
  if (/[\u0080-\u00FF]{2,}/.test(s)) return true;
  return false;
}

function sanitizeItems(items: any): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && typeof i === "object")
    .filter((i) => !isCorruptedString(i.name ?? ""))
    .filter((i) => !isCorruptedString(i.slug ?? ""))
    .map((i) => ({
      variantId: String(i.variantId ?? ""),
      productId: String(i.productId ?? ""),
      name: cleanText(String(i.name ?? "")),
      slug: cleanText(String(i.slug ?? "")),
      price: Number(i.price ?? 0),
      image: typeof i.image === "string" ? i.image : undefined,
      attributes: i.attributes && typeof i.attributes === "object" ? i.attributes : undefined,
      quantity: Math.max(1, Number(i.quantity ?? 1)),
      stock: Math.max(0, Number(i.stock ?? 0)),
    }))
    .filter((i) => i.variantId && i.name);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            const newQty = Math.min(existing.quantity + quantity, item.stock);
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: newQty, image: item.image ?? i.image }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, name: item.name.trim(), quantity: Math.min(quantity, item.stock) },
            ],
          };
        });
      },
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i
          ),
        })),
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "ecommerce-cart",
      storage: createJSONStorage(() => localStorage),
      version: CART_VERSION,
      migrate: (persistedState: any, version: number) => {
        if (version < CART_VERSION) {
          // Sanitize instead of full clear
          const clean = sanitizeItems(persistedState?.items);
          return { items: clean };
        }
        return persistedState;
      },
      merge: (persistedState: any, currentState) => {
        // ALWAYS sanitize on every rehydrate  even same version
        const clean = sanitizeItems(persistedState?.items);
        return { ...currentState, items: clean };
      },
    }
  )
);