import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireRole, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { NotFoundError, AppError } from "@/lib/errors";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = z.object({
      name: z.string().min(2).optional(),
      role: z.enum(["STAFF", "ADMIN"]).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    }).parse(await request.json());

    const existing = await prisma.user.findFirst({
      where: { id, role: { in: ["STAFF", "ADMIN"] } },
    });
    if (!existing) throw new NotFoundError("Staff member");
    if (existing.id === admin.id && body.role && body.role !== admin.role) {
      throw new AppError("Cannot change your own role", 400);
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.password !== undefined) data.passwordHash = await bcrypt.hash(body.password, 12);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await logAudit({
      userId: admin.id, action: "UPDATE", resource: "staff", resourceId: id,
      metadata: body, ...getRequestInfo(request),
    });

    return success({ staff: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    if (id === admin.id) throw new AppError("Cannot delete yourself", 400);
    await prisma.user.delete({ where: { id } });
    await logAudit({
      userId: admin.id, action: "DELETE", resource: "staff", resourceId: id,
      ...getRequestInfo(request),
    });
    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}