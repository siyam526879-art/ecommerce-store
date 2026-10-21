const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const emails = [
  "nimekhan512@gmail.com",
  "siyam526879@gmail.com",
  "bajizmulla@gmail.com"
];

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      email: { in: emails },
      role: "CUSTOMER"
    },
    data: {
      isActive: false
    }
  });

  console.log("Customer accounts deactivated:", result.count);

  const remaining = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      email: true,
      role: true,
      isActive: true
    }
  });

  console.table(remaining);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
