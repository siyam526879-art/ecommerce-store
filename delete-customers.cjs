const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const emails = [
  "nimekhan512@gmail.com",
  "siyam526879@gmail.com",
  "bajizmulla@gmail.com"
];

async function main() {
  await prisma.$transaction(async (tx) => {
    const customers = await tx.user.findMany({
      where: {
        email: { in: emails },
        role: "CUSTOMER"
      },
      select: { id: true, email: true }
    });

    const ids = customers.map((u) => u.id);

    if (ids.length === 0) {
      console.log("No matching customers found.");
      return;
    }

    await tx.review.deleteMany({
      where: { userId: { in: ids } }
    });

    const result = await tx.user.deleteMany({
      where: {
        id: { in: ids },
        role: "CUSTOMER"
      }
    });

    console.log("Permanently deleted customers:", result.count);
    console.table(customers);
  });
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
