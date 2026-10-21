import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number | string;
    compareAtPrice?: number | string | null;
    images?: { url: string; alt?: string | null }[];
    category?: { name: string; slug: string } | null;
    status?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const price = Number(product.basePrice);
  const compareAt = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;
  const discount =
    compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : null;

  return (
    <div className="group relative">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`View ${product.name}`}
        className="block overflow-hidden rounded-lg border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-xs text-muted-foreground"
              aria-hidden="true"
            >
              No image
            </div>
          )}

          {discount && (
            <span
              className="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded"
              aria-label={`${discount} percent off`}
            >
              -{discount}%
            </span>
          )}
        </div>

        <div className="p-3 space-y-1">
          {product.category && (
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {product.category.name}
            </p>
          )}
          <p className="font-medium text-sm line-clamp-2">{product.name}</p>
          <div className="flex items-baseline gap-2">
            <p className="font-semibold">{formatPrice(price)}</p>
            {compareAt && compareAt > price && (
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(compareAt)}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* productName pass করা হলো aria-label-এর জন্য */}
      <WishlistButton productId={product.id} />
    </div>
  );
}