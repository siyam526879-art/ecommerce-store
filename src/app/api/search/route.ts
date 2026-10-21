import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  // If no query or empty, return empty array
  if (!q || q.trim() === "") {
    return NextResponse.json([]);
  }

  try {
    // Search for products with case-insensitive partial match
    const products = await prisma.product.findMany({
      where: {
        name: { 
          contains: q.trim(), 
          mode: "insensitive" // Case insensitive search
        },
      },
      take: 10,
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    const results = products.map(p => ({
      id: p.id,
      name: p.name,
      image: p.images && p.images.length > 0 ? p.images[0].url : null,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}