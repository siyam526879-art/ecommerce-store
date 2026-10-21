import { PrismaClient } from "@prisma/client";

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
          accounts: true,
          sessions: true,
          addresses: true,
          orders: true,
          wishlist: true,
          reviews: true,
          auditLogs: true,
        },
      },
    },
  });

  console.log("\nCUSTOMER ACCOUNTS AND RELATED DATA\n");
  console.log(JSON.stringify(customers, null, 2));

  for (const customer of customers) {
    const carts = await prisma.cart.count({
      where: { userId: customer.id },
    });

    const orders = await prisma.order.findMany({
      where: { userId: customer.id },
      select: {
        id: true,
        shippingAddressId: true,
        billingAddressId: true,
      },
    });

    console.log("\nCustomer:", customer.email);
    console.log("Cart count:", carts);
    console.log("Order count:", orders.length);
    console.log("Order references:", JSON.stringify(orders));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
