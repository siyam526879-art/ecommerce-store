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
    const status = request.nextUrl.searchParams.get("status") ?? "";

    // ✅ ALWAYS filter by current user's products
    const where: any = {
      items: { some: { product: { sellerId: userId } } },
    };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { take: 3 },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return paginated(orders, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}