const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const targets = [
  "siyam526879@gmail.com",
  "bajizmulla@gmail.com"
];

async function main() {
  console.log("Checking target accounts...");

  for (const email of targets) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: {
            orders: true,
            accounts: true
          }
        }
      }
    });

    if (!user) {
      console.log("NOT FOUND:", email);
      continue;
    }

    console.log({
      email: user.email,
      id: user.id,
      role: user.role,
      orders: user._count.orders,
      linkedAccounts: user._count.accounts
    });

    if (user.role !== "CUSTOMER") {
      throw new Error("Safety stop: refusing to delete non-CUSTOMER account.");
    }

    if (user._count.orders !== 0) {
      throw new Error("Safety stop: account has orders: " + email);
    }
  }

  const answer = await new Promise(resolve => {
    process.stdout.write(
      "\nType DELETE-TWO-GOOGLE-USERS to confirm: "
    );
    process.stdin.once("data", data => resolve(data.toString().trim()));
  });

  if (answer !== "DELETE-TWO-GOOGLE-USERS") {
    console.log("Cancelled. No users were deleted.");
    return;
  }

  await prisma.$transaction(async tx => {
    for (const email of targets) {
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, role: true }
      });

      if (!user) continue;
      if (user.role !== "CUSTOMER") {
        throw new Error("Safety stop: role changed for " + email);
      }

      await tx.user.delete({ where: { id: user.id } });
      console.log("Deleted:", email);
    }
  });

  for (const email of targets) {
    const remaining = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    console.log(
      remaining ? "ERROR: still exists " + email : "Verified absent: " + email
    );
  }
}

main()
  .catch(e => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
