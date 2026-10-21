import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, requireRole, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("customers.view");
    const { id } = await params;
    const customer = await prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      select: {
        id: true, email: true, name: true, phone: true, createdAt: true, isActive: true,
        addresses: true,
        orders: { orderBy: { placedAt: "desc" }, take: 10, include: { _count: { select: { items: true } } } },
        _count: { select: { orders: true } },
      },
    });
    if (!customer) throw new NotFoundError("Customer");
    return success({ customer });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("customers.manage");
    const { id } = await params;
    const body = z.object({
      name: z.string().optional(),
      phone: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }).parse(await request.json());

    const existing = await prisma.user.findFirst({ where: { id, role: "CUSTOMER" } });
    if (!existing) throw new NotFoundError("Customer");

    const updated = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, name: true, isActive: true },
    });

    await logAudit({
      userId: user.id, action: "UPDATE", resource: "customer", resourceId: id,
      metadata: body, ...getRequestInfo(request),
    });

    return success({ customer: updated });
  } catch (err) {
    return errorResponse(err);
  }
}