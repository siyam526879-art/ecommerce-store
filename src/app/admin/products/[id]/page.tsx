import { notFound } from "next/navigation";
import { PageTitle } from "@/components/admin/page-title";
import { prisma } from "@/lib/db";
import { ProductForm } from "../product-form";

export const metadata = { title: "Edit Product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        variants: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) notFound();

  // ✅ Serialize Decimal → Number before passing to Client Component
  const serializedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    sku: product.sku,
    categoryId: product.categoryId,
    status: product.status,
    isFeatured: product.isFeatured,
    weight: product.weight ? Number(product.weight) : null,
    stock: product.stock,
    trackInventory: product.trackInventory,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
      order: img.order,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: Number(v.price),
      stock: v.stock,
      attributes: v.attributes,
    })),
  };

  return (
    <div>
      <PageTitle title={`Edit: ${product.name}`} />
      <ProductForm categories={categories} product={serializedProduct} />
    </div>
  );
}