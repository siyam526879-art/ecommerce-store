import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("payments.view");
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20)));
    const status = request.nextUrl.searchParams.get("status");

    const where: Prisma.PaymentWhereInput = {
      ...(status && { status }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, provider: true, providerPaymentId: true, amount: true, currency: true,
          status: true, method: true, last4: true, createdAt: true,
          order: { select: { orderNumber: true, user: { select: { email: true } } } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return paginated(payments, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}