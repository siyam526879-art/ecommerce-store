"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WishlistButtonProps {
  productId: string;
}

export function WishlistButton({ productId }: WishlistButtonProps) {
  const router = useRouter();
  const { status } = useSession();
  const { productIds, load, toggle } = useWishlistStore();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      load();
    }
  }, [status, load]);

  const isWishlisted = productIds.includes(productId);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== "authenticated") {
      toast.error("Please sign in to use wishlist");
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));
      return;
    }

    setPending(true);
    try {
      const { added } = await toggle(productId);
      toast.success(added ? "Added to wishlist" : "Removed from wishlist");
    } catch (err: any) {
      if (err?.message === "UNAUTHORIZED") {
        toast.error("Please sign in");
        window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));
      } else {
        toast.error("Failed to update wishlist");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur p-2 transition-all hover:bg-background",
        isWishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={cn(
            "h-4 w-4 transition-all",
            isWishlisted ? "fill-red-500 text-red-500" : "text-foreground"
          )}
        />
      )}
    </button>
  );
}