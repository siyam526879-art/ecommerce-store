import { ProductForm } from "../product-form";
import { PageTitle } from "@/components/admin/page-title";
import { prisma } from "@/lib/db";

export const metadata = { title: "New Product" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageTitle title="New product" />
      <ProductForm categories={categories} />
    </div>
  );
}