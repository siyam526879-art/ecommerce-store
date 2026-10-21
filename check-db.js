import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const orders = await prisma.order.count();
  const products = await prisma.product.count();

  console.log('\n--- USERS ---');
  users.forEach(u => console.log(Email:  | Role:  | Active: ));
  
  console.log('\n--- SUMMARY ---');
  console.log(Total Users: );
  console.log(Total Orders: );
  console.log(Total Products: );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.\(); });
