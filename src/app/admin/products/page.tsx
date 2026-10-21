import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProductsClient } from "./products-client";

export const metadata = { title: "Products | Admin" };

export default async function ProductsPage() {
  // Fetch directly from Neon DB using Prisma for real-time data
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true } // Include category if needed in client
  });

  const clientProducts = products.map((product) => ({ ...product, basePrice: String(product.basePrice), compareAtPrice: product.compareAtPrice == null ? product.compareAtPrice : String(product.compareAtPrice), costPrice: product.costPrice == null ? product.costPrice : String(product.costPrice) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your store products. Total: {products.length}
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="bg-yellow-500 text-black hover:bg-yellow-400 border-0">
            <Plus className="mr-2 h-4 w-4" /> New Product
          </Button>
        </Link>
      </div>

      {/* Pass real-time DB data to existing client component */}
      <ProductsClient initial={clientProducts} />
    </div>
  );
}