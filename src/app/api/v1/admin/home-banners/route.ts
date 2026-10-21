import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  hero: z
    .array(z.object({ id: z.string(), image: z.string().min(1), link: z.string().optional().default("") }))
    .max(12),
  promo: z.object({ image: z.string(), link: z.string().optional().default("") }).nullable(),
});

export async function PUT(req: NextRequest) {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const value = {
    hero: parsed.data.hero,
    promo: parsed.data.promo && parsed.data.promo.image ? parsed.data.promo : null,
  };
  await prisma.siteSetting.upsert({
    where: { key: "home.banners" },
    update: { value },
    create: { key: "home.banners", value },
  });
  return NextResponse.json({ ok: true });
}