const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: {
          orders: true,
          addresses: true,
          reviews: true,
          wishlist: true,
          auditLogs: true
        }
      }
    }
  });

  console.table(
    customers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      orders: u._count.orders,
      addresses: u._count.addresses,
      reviews: u._count.reviews,
      wishlist: u._count.wishlist,
      auditLogs: u._count.auditLogs
    }))
  );

  console.log("Total customers:", customers.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
