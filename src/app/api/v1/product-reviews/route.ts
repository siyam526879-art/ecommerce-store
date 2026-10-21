import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

function parseBody(body: string | null) {
  const src = body ?? "";
  const text = src.replace(/\[img:[^\]\s]+\]/g, "").trim();
  const images = Array.from(src.matchAll(/\[img:([^\]\s]+)\]/g)).map((m) => m[1]);
  return { text, images };
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;

  const rows = await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true } },
    },
  });

  const dist = [0, 0, 0, 0, 0];
  let sum = 0;
  const reviews = rows.map((r) => {
    dist[Math.min(5, Math.max(1, r.rating)) - 1] += 1;
    sum += r.rating;
    const p = parseBody(r.body);
    return {
      id: r.id,
      rating: r.rating,
      text: p.text,
      images: p.images,
      createdAt: r.createdAt,
      name: r.user?.name || "Customer",
      mine: !!userId && r.userId === userId,
    };
  });

  return NextResponse.json({
    reviews,
    summary: { count: rows.length, avg: rows.length ? sum / rows.length : 0, dist },
    loggedIn: !!userId,
    canDeleteAny: role === "ADMIN" || role === "STAFF",
  });
}

const postSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional().default(""),
  images: z.array(z.string().startsWith("/uploads/")).max(5).optional().default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const { productId, rating, text, images } = parsed.data;

  if (!text.trim() && images.length === 0) {
    return NextResponse.json({ error: "Write a comment or add a photo" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = text.trim() + images.map((u) => "\n[img:" + u + "]").join("");

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId } },
    update: { rating, body, isApproved: true },
    create: { productId, userId, rating, body, isApproved: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  if (!userId) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const review = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && role !== "STAFF") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}