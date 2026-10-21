import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@store.com" },
    update: {},
    create: {
      email: "admin@store.com",
      name: "Administrator",
      role: Role.ADMIN,
      passwordHash: adminPassword,
      emailVerified: new Date(),
    },
  });
  console.log("✓ Admin user:", admin.email);

  // Staff user
  const staffPassword = await bcrypt.hash("staff123456", 12);
  const staff = await prisma.user.upsert({
    where: { email: "staff@store.com" },
    update: {},
    create: {
      email: "staff@store.com",
      name: "Staff Member",
      role: Role.STAFF,
      passwordHash: staffPassword,
      emailVerified: new Date(),
    },
  });
  console.log("✓ Staff user:", staff.email);

  // Sample categories
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Clothing", slug: "clothing" },
    { name: "Home & Garden", slug: "home-garden" },
    { name: "Books", slug: "books" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✓ Categories seeded");

  // Sample CMS pages
  const pages = [
    {
      slug: "about",
      title: "About Us",
      content: "<p>Welcome to our store. We are committed to quality.</p>",
    },
    {
      slug: "shipping",
      title: "Shipping & Delivery",
      content: "<p>We ship worldwide. Delivery takes 3-7 business days.</p>",
    },
    {
      slug: "returns",
      title: "Returns & Refunds",
      content: "<p>30-day return policy on all items.</p>",
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: "<p>Your privacy matters to us.</p>",
    },
    {
      slug: "terms",
      title: "Terms & Conditions",
      content: "<p>By using our site, you agree to these terms.</p>",
    },
  ];

  for (const page of pages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log("✓ CMS pages seeded");

  // Site settings
  const settings = [
    { key: "store.name", value: "Store" },
    { key: "store.currency", value: "USD" },
    { key: "store.email", value: "support@store.com" },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✓ Site settings seeded");

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });