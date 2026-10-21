import AccountAIWidget from "@/components/account/account-ai-widget";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { HeroSlider } from "@/components/home/hero-slider";
import { PromoBanner } from "@/components/home/promo-banner";
import { JustForYou } from "@/components/home/just-for-you";
import { LiveProducts } from "@/components/home/live-products";
import { CategoryGrid } from "@/components/home/category-grid";
import { LoadMoreProducts } from "@/components/home/load-more-products";
import { Smartphone, Truck, Tag, Zap, ArrowRight, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, allCategories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: {
        category: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, image: true },
    }),
  ]);

  const mapProduct = (p: any) => ({
    ...p,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
  });

  const mainCategories = allCategories.filter((c) => !c.parentId);

  const heroProducts = products
    .filter((p: any) => p.images?.[0]?.url)
    .slice(0, 8)
    .map((p: any) => ({ id: p.id, name: p.name, image: p.images[0].url as string }));

  const discounted = products.filter(
    (p: any) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.basePrice)
  );
  const flashProducts = (discounted.length > 0 ? discounted : products).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#eff0f5] pb-10">
      {/* HERO */}
      <section className="pt-4">
        <Container>
          <div className="grid gap-0 lg:grid-cols-[1fr_245px]">
            <HeroSlider products={heroProducts} />

            <aside className="hidden bg-gradient-to-b from-orange-50 to-pink-50 lg:block">
              <div className="flex items-center gap-2 px-4 py-3">
                <Smartphone className="h-6 w-6 text-[#f85606]" />
                <span className="text-sm font-semibold text-gray-800">Download the App</span>
              </div>
              <div className="mx-2 rounded-md bg-gradient-to-br from-orange-500 to-pink-500 p-4 text-white">
                <p className="mb-3 text-xs font-semibold">&#9733; 4.8 Rated</p>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-[#f85606]">
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold leading-tight">Free<br />Delivery</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-[#f85606]">
                    <Tag className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold leading-tight">Limited<br />Time</span>
                </div>
              </div>
              <div className="space-y-2 p-3">
                <div className="rounded-lg border bg-white px-3 py-2 text-center text-xs font-medium text-gray-700">App Store</div>
                <div className="rounded-lg border bg-white px-3 py-2 text-center text-xs font-medium text-gray-700">Google Play</div>
                <p className="pt-1 text-[11px] text-gray-500">Download the App Now!</p>
                <AccountAIWidget />
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* PROMO BANNER */}
      <section className="pt-7">
        <Container>
          <PromoBanner />
        </Container>
      </section>

      {/* CATEGORIES */}
      {mainCategories.length > 0 && (
        <section className="pt-7">
          <Container>
            <h2 className="mb-3 text-xl text-gray-800">Categories</h2>
            <CategoryGrid
              categories={mainCategories.slice(0, 16).map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                image: c.image ?? null,
                subs: allCategories
                  .filter((s) => s.parentId === c.id)
                  .map((s) => ({ id: s.id, name: s.name, slug: s.slug, image: s.image ?? null })),
              }))}
            />
          </Container>
        </section>
      )}

      {/* FLASH SALE */}
      <section className="pt-7">
        <Container>
          <h2 className="mb-3 text-xl text-gray-800">Flash Sale</h2>
          <div className="rounded-sm bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="flex items-center gap-2 font-semibold text-[#f85606]">
                <Zap className="h-5 w-5 fill-[#f85606]" /> On Sale Now
              </span>
              <Link href="/shop" className="rounded border border-[#f85606] px-4 py-1 text-xs font-bold uppercase text-[#f85606] hover:bg-[#f85606] hover:text-white">
                Shop All Products
              </Link>
            </div>
            <div className="p-4">
              <LiveProducts discount pageSize={6} cols="grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" />
            </div>
          </div>
        </Container>
      </section>

      {/* JUST FOR YOU */}
      <section className="pt-7">
        <Container>
          <h2 className="mb-3 text-xl text-gray-800">Just For You</h2>
          <JustForYou />
        </Container>
      </section>

      {/* FEATURES */}
      <section className="mt-8 border-t bg-white py-10">
        <Container>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { icon: Truck, title: "Free Delivery", desc: "On orders over 500 Taka" },
              { icon: ShieldCheck, title: "Secure Payment", desc: "100% protected" },
              { icon: RotateCcw, title: "Easy Returns", desc: "7 days policy" },
              { icon: Headphones, title: "24/7 Support", desc: "Dedicated care" },
            ].map((item, i) => (
              <div key={i} className="group flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#f85606] transition group-hover:bg-[#f85606] group-hover:text-white">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-gray-800">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}




