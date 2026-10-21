const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      name: true,
      slug: true,
      basePrice: true,
      stock: true,
      trackInventory: true,
      category: { select: { name: true } },
      variants: {
        where: { isActive: true },
        select: { price: true, stock: true },
      },
    },
    take: 100,
  });

  console.log(`Active products found: ${products.length}`);

  for (const p of products) {
    const prices = p.variants.map(v => Number(v.price));
    const price = prices.length
      ? Math.min(...prices)
      : Number(p.basePrice);

    console.log(JSON.stringify({
      name: p.name,
      category: p.category?.name,
      price,
      stock: p.trackInventory
        ? (p.variants.length
            ? p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0)
            : p.stock)
        : "inventory not tracked",
      slug: p.slug,
    }));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
