import { ProductCard } from "./product-card";

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string;
  compareAtPrice?: number | string | null;
  images?: { url: string; alt?: string | null }[];
  category?: { name: string; slug: string } | null;
  status?: string;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}