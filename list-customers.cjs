const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
    take: 20,
  });

  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
