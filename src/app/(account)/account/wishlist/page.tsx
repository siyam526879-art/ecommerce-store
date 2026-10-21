import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart } from "lucide-react";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          category: { select: { name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = items.map((i) => ({
    ...i.product,
    basePrice: Number(i.product.basePrice),
    compareAtPrice: i.product.compareAtPrice ? Number(i.product.compareAtPrice) : null,
  }));

  if (products.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Wishlist</h1>
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save items you love for later."
          action={{ label: "Browse products", href: "/shop" }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Wishlist</h1>
      <p className="text-muted-foreground mb-6">{products.length} item{products.length === 1 ? "" : "s"}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}