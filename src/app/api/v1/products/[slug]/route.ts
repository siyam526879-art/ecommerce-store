import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        category: true,
        images: { orderBy: { order: "asc" } },
        variants: { where: { isActive: true } },
      },
    });

    if (!product) throw new NotFoundError("Product");
    return success(product);
  } catch (err) {
    return errorResponse(err);
  }
}