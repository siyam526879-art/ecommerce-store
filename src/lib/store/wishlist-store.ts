"use client";

import { create } from "zustand";

interface WishlistStore {
  productIds: string[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  toggle: (productId: string) => Promise<{ added: boolean }>;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  productIds: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/v1/wishlist");
      const json = await res.json();
      const items = json?.data?.items ?? [];
      set({
        productIds: items.map((i: any) => i.id).filter(Boolean),
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (productId) => {
    const current = get().productIds;
    const isIn = current.includes(productId);

    // Optimistic update
    if (isIn) {
      set({ productIds: current.filter((id) => id !== productId) });
    } else {
      set({ productIds: [...current, productId] });
    }

    try {
      const res = await fetch("/api/v1/wishlist", {
        method: isIn ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        // revert
        set({ productIds: current });
        throw new Error("UNAUTHORIZED");
      }

      if (!res.ok) {
        set({ productIds: current });
        throw new Error("Failed");
      }

      return { added: !isIn };
    } catch (err) {
      set({ productIds: current });
      throw err;
    }
  },
}));