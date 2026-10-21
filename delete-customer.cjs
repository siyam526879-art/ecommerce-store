const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: "cmvfka0fx000auql09hsypvut" },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    console.log("STOP: User not found. Nothing deleted.");
    return;
  }

  if (
    user.email !== "siyam526879@gmail.com" ||
    user.role !== "CUSTOMER"
  ) {
    console.log("STOP: Email or role mismatch. Nothing deleted.");
    return;
  }

  await prisma.user.delete({
    where: { id: user.id },
  });

  console.log("SUCCESS: Customer account deleted:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
