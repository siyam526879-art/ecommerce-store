"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Trash2, ArrowRight, ShoppingBag, Zap } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useCartStore } from "@/lib/store/cart-store";
import { formatPrice, cleanProductName } from "@/lib/utils";
import { toast } from "sonner";

export default function CartPage() {
  const { status } = useSession();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const subtotalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const requireLogin = () => {
    if (status === "loading") return true;
    if (status !== "authenticated") {
      toast("Please sign in to place an order");
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));
      return true;
    }
    return false;
  };

  const buyOne = (variantId: string) => {
    if (requireLogin()) return;
    window.location.assign("/checkout?only=" + encodeURIComponent(variantId));
  };

  const buyAll = () => {
    if (requireLogin()) return;
    window.location.assign("/checkout");
  };

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Shopping Cart" breadcrumbs={[{ label: "Cart" }]} />
        <Container className="py-16">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Looks like you haven't added anything yet."
            action={{ label: "Start shopping", href: "/shop" }}
          />
        </Container>
      </>
    );
  }

  // Courier and shipping charge are selected and calculated at checkout.
  const total = subtotalValue;

  return (
    <>
      <PageHeader title="Shopping Cart" breadcrumbs={[{ label: "Cart" }]} />
      <Container className="py-8">
        <p className="mb-4 rounded bg-orange-50 px-4 py-2 text-sm text-gray-700">
          Click a product to order it. Each product is ordered separately.
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.variantId} className="transition hover:border-[#f85606]">
                <CardContent className="flex gap-4 p-4">
                  <button
                    type="button"
                    onClick={() => buyOne(item.variantId)}
                    className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted"
                    aria-label="Order this product"
                  >
                    {item.image ? (
                      <Image src={item.image} alt={cleanProductName(item.name)} fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => buyOne(item.variantId)}
                          className="line-clamp-2 text-left font-medium hover:text-[#f85606]"
                        >
                          {cleanProductName(item.name)}
                        </button>
                        {item.attributes && Object.keys(item.attributes).length > 0 && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(" / ")}
                          </p>
                        )}
                        <Link href={`/product/${item.slug}`} className="text-xs text-gray-500 hover:underline">
                          View product
                        </Link>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.variantId)} aria-label="Remove">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(q) => updateQuantity(item.variantId, q)}
                        max={item.stock}
                      />
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                        )}
                        <button
                          type="button"
                          onClick={() => buyOne(item.variantId)}
                          className="mt-2 inline-flex items-center gap-1 rounded bg-[#f85606] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d94b05]"
                        >
                          <Zap className="h-3 w-3" /> Order this
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="text-lg font-semibold">Order summary</h2>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Subtotal before shipping</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <Button onClick={buyAll} className="w-full bg-[#f85606] text-white hover:bg-[#d94b05]" size="lg">
                  Proceed to checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/shop">Continue shopping</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}