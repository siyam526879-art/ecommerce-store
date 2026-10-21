import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await prisma.siteSetting.findUnique({ where: { key: "home.banners" } });
  const v: any = row?.value ?? {};
  return NextResponse.json({
    hero: Array.isArray(v.hero) ? v.hero : [],
    promo: v.promo && v.promo.image ? v.promo : null,
  });
}