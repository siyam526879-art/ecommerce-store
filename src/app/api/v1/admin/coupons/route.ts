import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const createSchema = z.object({
  code: z.string().min(3).transform((s) => s.toUpperCase()),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.number().min(0),
  minOrder: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await requirePermission("coupons.view");
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { usages: true } } },
    });
    return success({ coupons });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("coupons.manage");
    const body = createSchema.parse(await request.json());

    const existing = await prisma.coupon.findUnique({ where: { code: body.code } });
    if (existing) {
      return Response.json(
        { success: false, error: { code: "CONFLICT", message: "Coupon code already exists" } },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        ...body,
        value: new Decimal(body.value),
        minOrder: body.minOrder ? new Decimal(body.minOrder) : null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    await logAudit({
      userId: user.id, action: "CREATE", resource: "coupon", resourceId: coupon.id,
      metadata: { code: coupon.code }, ...getRequestInfo(request),
    });

    return success({ coupon }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}