const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    const before = await tx.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE "role" = 'ADMIN')::int AS admins,
        COUNT(*) FILTER (WHERE "role" = 'STAFF')::int AS staff
      FROM public."User"
    `);

    if (before[0].admins < 1 || before[0].staff < 1) {
      throw new Error(
        `STOP: Admin=${before[0].admins}, Staff=${before[0].staff}. Both roles must exist. Nothing was deleted.`
      );
    }

    const tables = await tx.$queryRawUnsafe(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN ('User', '_prisma_migrations')
      ORDER BY tablename
    `);

    if (tables.length > 0) {
      const list = tables
        .map(t => `"public"."${t.tablename.replace(/"/g, '""')}"`)
        .join(", ");

      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
    }

    await tx.$executeRawUnsafe(`
      DELETE FROM public."User"
      WHERE "role" NOT IN ('ADMIN', 'STAFF')
    `);

    const after = await tx.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE "role" = 'ADMIN')::int AS admins,
        COUNT(*) FILTER (WHERE "role" = 'STAFF')::int AS staff,
        COUNT(*) FILTER (WHERE "role" NOT IN ('ADMIN', 'STAFF'))::int AS others
      FROM public."User"
    `);

    if (
      after[0].admins !== before[0].admins ||
      after[0].staff !== before[0].staff ||
      after[0].others !== 0
    ) {
      throw new Error("Verification failed. Transaction will roll back.");
    }

    console.log("Admin accounts preserved:", after[0].admins);
    console.log("Staff accounts preserved:", after[0].staff);
    console.log("Other user accounts remaining:", after[0].others);
    console.log("Other public-table data has been cleared.");
  }, { timeout: 120000 });
}

main()
  .catch(err => {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
