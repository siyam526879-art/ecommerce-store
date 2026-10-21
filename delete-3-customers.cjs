const { PrismaClient } = require("@prisma/client");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const prisma = new PrismaClient();

const emails = [
  "nimekhan512@gmail.com",
  "siyam526879@gmail.com",
  "bajizmulla@gmail.com"
];

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: { in: emails },
      role: "CUSTOMER"
    },
    select: {
      id: true,
      email: true,
      role: true,
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

  if (users.length !== emails.length) {
    throw new Error(
      `Safety stop: expected ${emails.length} CUSTOMER accounts, found ${users.length}. No data deleted.`
    );
  }

  console.log("\n===== TARGET ACCOUNTS =====");
  console.table(users.map(u => ({
    email: u.email,
    role: u.role,
    orders: u._count.orders,
    addresses: u._count.addresses,
    reviews: u._count.reviews,
    wishlist: u._count.wishlist,
    auditLogs: u._count.auditLogs
  })));

  const rl = readline.createInterface({ input: stdin, output: stdout });

  const answer = await rl.question(
    "\nWARNING: This permanently deletes these customers and their related order/payment/return data.\nType DELETE-THREE-CUSTOMERS to continue: "
  );

  rl.close();

  if (answer.trim() !== "DELETE-THREE-CUSTOMERS") {
    console.log("Cancelled. No data deleted.");
    return;
  }

  const userIds = users.map(u => u.id);

  const result = await prisma.$transaction(async tx => {
    const orders = await tx.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });

    const orderIds = orders.map(o => o.id);

    const payments = orderIds.length
      ? await tx.payment.findMany({
          where: { orderId: { in: orderIds } },
          select: { id: true }
        })
      : [];

    const returns = orderIds.length
      ? await tx.return.findMany({
          where: { orderId: { in: orderIds } },
          select: { id: true }
        })
      : [];

    const paymentIds = payments.map(p => p.id);
    const returnIds = returns.map(r => r.id);

    // Refunds must be deleted before their Payment or Return.
    const refundConditions = [];
    if (paymentIds.length) {
      refundConditions.push({ paymentId: { in: paymentIds } });
    }
    if (returnIds.length) {
      refundConditions.push({ returnId: { in: returnIds } });
    }

    const refundsDeleted = refundConditions.length
      ? (await tx.refund.deleteMany({
          where: { OR: refundConditions }
        })).count
      : 0;

    // Remove records that restrict Order deletion.
    const couponUsagesDeleted = orderIds.length
      ? (await tx.couponUsage.deleteMany({
          where: { orderId: { in: orderIds } }
        })).count
      : 0;

    const returnsDeleted = orderIds.length
      ? (await tx.return.deleteMany({
          where: { orderId: { in: orderIds } }
        })).count
      : 0;

    const reviewsDeleted = (await tx.review.deleteMany({
      where: { userId: { in: userIds } }
    })).count;

    const auditLogsDeleted = (await tx.auditLog.deleteMany({
      where: { userId: { in: userIds } }
    })).count;

    // Cascades remove OrderItems, OrderStatusLogs and Payments.
    const ordersDeleted = orderIds.length
      ? (await tx.order.deleteMany({
          where: { id: { in: orderIds } }
        })).count
      : 0;

    // Account, Session, Cart and Wishlist relations have cascades.
    // User-owned addresses can now cascade because their Orders are gone.
    // Seller products are preserved; their sellerId becomes null.
    const usersDeleted = (await tx.user.deleteMany({
      where: {
        id: { in: userIds },
        role: "CUSTOMER",
        email: { in: emails }
      }
    })).count;

    if (usersDeleted !== emails.length) {
      throw new Error(
        `Safety stop: expected to delete ${emails.length} users, deleted ${usersDeleted}.`
      );
    }

    return {
      usersDeleted,
      ordersDeleted,
      refundsDeleted,
      returnsDeleted,
      couponUsagesDeleted,
      reviewsDeleted,
      auditLogsDeleted
    };
  });

  console.log("\n===== TRANSACTION COMMITTED =====");
  console.table([result]);

  const remaining = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, role: true }
  });

  if (remaining.length === 0) {
    console.log("Verified: all three target User accounts are absent.");
  } else {
    console.log("WARNING: some target accounts remain:", remaining);
  }

  console.log("Admin and Staff accounts were not targeted.");
}

main()
  .catch(error => {
    console.error("\nDELETION FAILED. Transaction rolled back if it had not committed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
