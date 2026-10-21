import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paginated, errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    const role = (session.user as any).role;
    const userId = session.user.id;

    if (role !== "STAFF") throw new ForbiddenError();

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20)));
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const filter = request.nextUrl.searchParams.get("filter") ?? "";

    // ✅ ALWAYS filter by sellerId = current user
    const where: any = { sellerId: userId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }
    if (filter === "low") {
      where.variants = { some: { stock: { lte: 5 } } };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
          _count: { select: { variants: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return paginated(products, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}