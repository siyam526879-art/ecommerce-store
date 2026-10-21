const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const emails = [
    "nimekhan512@gmail.com",
    "siyam526879@gmail.com",
    "bajizmulla@gmail.com"
  ];

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
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

  console.table(users.map(u => ({
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    orders: u._count.orders,
    addresses: u._count.addresses,
    reviews: u._count.reviews,
    wishlist: u._count.wishlist,
    auditLogs: u._count.auditLogs
  })));

  console.log("\nNo records were deleted.");
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
