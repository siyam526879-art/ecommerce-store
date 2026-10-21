import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const updateSchema = z.object({
  value: z.number().min(0).optional(),
  minOrder: z.number().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("coupons.manage");
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Coupon");

    const data: any = {};
    if (body.value !== undefined) data.value = new Decimal(body.value);
    if (body.minOrder !== undefined) data.minOrder = body.minOrder ? new Decimal(body.minOrder) : null;
    if (body.maxUses !== undefined) data.maxUses = body.maxUses;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.coupon.update({ where: { id }, data });

    await logAudit({
      userId: user.id, action: "UPDATE", resource: "coupon", resourceId: id,
      ...getRequestInfo(request),
    });

    return success({ coupon: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("coupons.manage");
    const { id } = await params;
    await prisma.coupon.delete({ where: { id } });
    await logAudit({
      userId: user.id, action: "DELETE", resource: "coupon", resourceId: id,
      ...getRequestInfo(request),
    });
    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}