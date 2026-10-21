import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Find all SHIPPED/DELIVERED orders with PENDING payments
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["SHIPPED", "DELIVERED"] },
      payments: { some: { status: "PENDING" } },
    },
    include: { payments: true },
  });

  console.log("Found " + orders.length + " orders to fix");

  for (const order of orders) {
    await prisma.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "SUCCESS" },
    });
    console.log("  ✅ Fixed: " + order.orderNumber);
  }

  console.log("\nDONE!");
}

main().finally(() => prisma.$disconnect());
