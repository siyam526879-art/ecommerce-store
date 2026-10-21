const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  console.table(users);
  console.log("Total users:", users.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
