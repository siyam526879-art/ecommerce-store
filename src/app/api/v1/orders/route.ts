import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";

// ==========================================
// POST /api/v1/orders — DEPRECATED
// ==========================================
// This endpoint is no longer used for creating orders.
// Order creation now goes through:
//   - POST /api/v1/checkout/cod            (Cash on Delivery)
//   - POST /api/v1/checkout/create-intent  (Stripe card payment)
//
// Both routes use the order.service.ts layer for consistency.
export async function POST() {
  return Response.json(
    {
      success: false,
      error: {
        code: "DEPRECATED",
        message:
          "This endpoint is deprecated. Use /api/v1/checkout/cod (COD) or /api/v1/checkout/create-intent (Stripe) instead.",
      },
    },
    { status: 410 }
  );
}

// ==========================================
// GET /api/v1/orders — current user's orders
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    const userId = session.user.id;

    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") ?? 1)
    );
    const pageSize = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20))
    );

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: {
            include: {
              variant: {
                select: {
                  id: true,
                  sku: true,
                  attributes: true,
                  product: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return success({
      orders,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return errorResponse(err);
  }
}