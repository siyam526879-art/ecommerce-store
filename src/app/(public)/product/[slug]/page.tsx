import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PriceDisplay } from "@/components/product/price-display";
import { ProductGallery } from "@/components/product/product-gallery";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ProductCard } from "@/components/product/product-card";
import { ProductReviews } from "@/components/product/product-reviews";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Truck, RotateCcw, Shield, Package } from "lucide-react";
import { ProductJsonLd } from "@/components/seo/product-json-ld";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE" },
    select: { name: true, metaTitle: true, metaDescription: true },
  });
  if (!product) return { title: "Product not found" };
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.name,
  };
}

function Description({ text }: { text: string }) {
  const parts = text.split(/(\[img:[^\]\s]+\])/g);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700">
      {parts.map((p, i) => {
        const m = p.match(/^\[img:([^\]\s]+)\]$/);
        if (m) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={m[1]} alt="" className="mx-auto h-auto max-w-full rounded" />;
        }
        return p.trim() ? (
          <p key={i} className="whitespace-pre-line">
            {p.trim()}
          </p>
        ) : null;
      })}
    </div>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      variants: { where: { isActive: true } },
      reviews: { select: { rating: true } },
    },
  });

  if (!product) notFound();

  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const inStock = product.trackInventory ? totalStock > 0 : true;

  const parentId = product.category.parentId;
  const relatedCats = parentId
    ? await prisma.category.findMany({
        where: { OR: [{ parentId }, { id: parentId }] },
        select: { id: true },
      })
    : [];
  const similarIds = Array.from(new Set([product.categoryId, ...relatedCats.map((c) => c.id)]));

  const similarRows = await prisma.product.findMany({
    where: { status: "ACTIVE", id: { not: product.id }, categoryId: { in: similarIds } },
    orderBy: { createdAt: "desc" },
    take: 24,
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  const similar = [...similarRows]
    .sort((a, b) => Number(b.categoryId === product.categoryId) - Number(a.categoryId === product.categoryId))
    .slice(0, 12)
    .map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    }));

  const plainDescription = (product.description ?? "").replace(/\[img:[^\]\s]+\]/g, "").trim();

  const jsonLdProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: plainDescription,
    shortDescription: product.shortDescription,
    sku: product.sku,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    stock: totalStock,
    images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
    category: { name: product.category.name },
    reviews: product.reviews,
  };

  return (
    <Container className="py-8">
      <ProductJsonLd product={jsonLdProduct} />

      <Breadcrumbs
        items={[
          { label: "Shop", href: "/shop" },
          { label: product.category.name, href: `/shop?category=${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
        <ProductGallery
          images={product.images.map((img) => ({ url: img.url, alt: img.alt ?? product.name }))}
        />

        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
            {product.category.name}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>

          <PriceDisplay
            price={Number(product.basePrice)}
            compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : null}
            size="lg"
          />

          <div className="mt-4">
            {inStock ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Stock available
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Stock out
              </Badge>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground mt-6 leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          <Separator className="my-6" />

          <AddToCartButton
            productId={product.id}
            productSlug={product.slug}
            productName={product.name}
            variants={product.variants.map((v) => ({
              id: v.id,
              price: Number(v.price),
              stock: v.stock,
              sku: v.sku,
              attributes: v.attributes as Record<string, string>,
            }))}
            image={product.images[0]?.url}
            disabled={!inStock}
          />

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t">
            {[
              { icon: Truck, label: "Free shipping", desc: "On orders over \u09F31,000" },
              { icon: RotateCcw, label: "7-day returns", desc: "Easy & free" },
              { icon: Shield, label: "Secure payment", desc: "SSL encrypted" },
              { icon: Package, label: "Fast delivery", desc: "1-5 business days" },
            ].map((item) => (
              <div key={item.label} className="flex gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {product.description && product.description.trim() && (
        <section className="mt-12 border-t pt-8">
          <h2 className="mb-4 text-xl font-semibold">Product details of {product.name}</h2>
          <div className="mx-auto max-w-3xl">
            <Description text={product.description} />
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-12 border-t pt-8">
          <h2 className="mb-5 text-xl font-semibold">Customers who viewed this item also viewed</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <ProductReviews productId={product.id} />
    </Container>
  );
}