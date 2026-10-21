import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const id = session?.user?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { name: true, email: true, phone: true } }),
    prisma.address.findMany({
      where: { userId: id, deletedAt: null },
      orderBy: { isDefault: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ user, addresses, addressCount: addresses.length });
}

const patch = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().max(30).optional().default(""),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const id = session?.user?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name" }, { status: 400 });

  await prisma.user.update({
    where: { id },
    data: { name: parsed.data.name.trim(), phone: parsed.data.phone.trim() || null },
  });
  return NextResponse.json({ ok: true });
}