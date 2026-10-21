
import { APP_NAME, APP_URL } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

interface ProductJsonLdProps {
  product: {
    name: string;
    slug: string;
    description?: string | null;
    basePrice: number | string;
    images: Array<{ url: string }>;
    category: { name: string };
  };
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.name,
    image: product.images.map((img) => img.url),
    sku: product.slug,
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url: `${APP_URL}/product/${product.slug}`,
      priceCurrency: "USD",
      price: Number(product.basePrice),
      availability: "https://schema.org/InStock",
    },
    brand: {
      "@type": "Brand",
      name: APP_NAME,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}