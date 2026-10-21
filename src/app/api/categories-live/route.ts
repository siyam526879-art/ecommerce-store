import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, image: true, description: true, parentId: true },
  });

  const categories = all
    .filter((c) => !c.parentId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      subs: all
        .filter((s) => s.parentId === c.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          image: s.image,
          description: s.description,
        })),
    }));

  return NextResponse.json({ categories });
}