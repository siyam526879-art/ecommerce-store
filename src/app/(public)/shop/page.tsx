import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { ShopFilters } from "@/components/shop/shop-filters";
import { ShopLive } from "@/components/shop/shop-live";

interface ShopPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  }>;
}

export const metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const sort = params.sort ?? "newest";

  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, image: true, parentId: true },
  });

  const categories = all
    .filter((c) => !c.parentId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      subs: all
        .filter((s) => s.parentId === c.id)
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug, image: s.image })),
    }));

  return (
    <div className="bg-[#eff0f5] pb-10 pt-6">
      <Container>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="relative z-30 h-fit rounded-sm bg-white p-4 lg:sticky lg:top-28">
            <ShopFilters categories={categories} active={params.category} minPrice={params.minPrice} maxPrice={params.maxPrice} />
          </aside>
          <ShopLive category={params.category} q={params.q} minPrice={params.minPrice} maxPrice={params.maxPrice} sort={sort} page={page} />
        </div>
      </Container>
    </div>
  );
}