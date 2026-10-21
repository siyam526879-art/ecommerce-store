"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingCart, Loader2, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "./quantity-selector";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";

interface Variant {
  id: string;
  price: number;
  stock: number;
  sku?: string | null;
  attributes?: Record<string, string>;
}

interface AddToCartButtonProps {
  productId: string;
  productSlug: string;
  productName: string;
  variants: Variant[];
  disabled?: boolean;
  image?: string;
}

export function AddToCartButton({
  productId,
  productSlug,
  productName,
  variants,
  disabled,
  image,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const pending = useRef<null | "add" | "buy">(null);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const currentStock = selectedVariant?.stock ?? 0;

  const openLogin = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));
  };

  const itemData = () => ({
    variantId: selectedVariant!.id,
    productId,
    name: productName,
    slug: productSlug,
    price: selectedVariant!.price,
    image,
    attributes: selectedVariant!.attributes,
    stock: selectedVariant!.stock,
  });

  const doAdd = () => {
    if (!selectedVariant) return;
    setAdding(true);
    addItem(itemData(), quantity);
    toast.success("Added to cart");
    setTimeout(() => {
      setAdding(false);
      setQuantity(1);
    }, 500);
  };

  const doBuy = () => {
    if (!selectedVariant) return;
    addItem(itemData(), quantity);
    updateQuantity(selectedVariant.id, quantity);
    router.push("/checkout?only=" + encodeURIComponent(selectedVariant.id));
  };

  useEffect(() => {
    if (status === "authenticated" && pending.current) {
      const p = pending.current;
      pending.current = null;
      if (p === "add") doAdd();
      else doBuy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const requireLogin = (kind: "add" | "buy") => {
    if (status === "loading") return true;
    if (!loggedIn) {
      pending.current = kind;
      toast("Please sign in to continue");
      openLogin();
      return true;
    }
    return false;
  };

  const handleAdd = () => {
    if (requireLogin("add")) return;
    doAdd();
  };

  const handleBuy = () => {
    if (requireLogin("buy")) return;
    doBuy();
  };

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Options</label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const label = v.attributes
                ? Object.values(v.attributes).join(" / ")
                : v.sku ?? v.id.slice(0, 8);
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setQuantity(1);
                  }}
                  disabled={v.stock <= 0}
                  className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                    selectedVariantId === v.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : v.stock <= 0
                      ? "border-muted bg-muted text-muted-foreground cursor-not-allowed line-through"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <QuantitySelector value={quantity} onChange={setQuantity} max={currentStock} disabled={disabled} />
        <Button
          onClick={handleAdd}
          disabled={disabled || adding || currentStock <= 0}
          className="flex-1 bg-[#ffb000] text-gray-900 hover:bg-[#e69f00]"
          size="lg"
        >
          {adding ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Added
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
            </>
          )}
        </Button>
      </div>

      {loggedIn && (
        <Button
          onClick={handleBuy}
          disabled={disabled || currentStock <= 0}
          size="lg"
          className="w-full bg-[#f85606] text-white hover:bg-[#d94b05]"
        >
          <Zap className="mr-2 h-4 w-4" /> Buy now
        </Button>
      )}
    </div>
  );
}