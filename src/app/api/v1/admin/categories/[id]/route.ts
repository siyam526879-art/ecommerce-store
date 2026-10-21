import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { NotFoundError, AppError } from "@/lib/errors";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/v1/admin/categories/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("categories.view");
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) throw new NotFoundError("Category");

    return success({ category });
  } catch (err) {
    return errorResponse(err);
  }
}

// PATCH /api/v1/admin/categories/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requirePermission("categories.manage");
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Category");

    if (body.parentId === id) {
      throw new AppError("Category cannot be its own parent", 400);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: body,
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      resource: "category",
      resourceId: id,
      metadata: { name: updated.name },
      ...getRequestInfo(request),
    });

    return success({ category: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE /api/v1/admin/categories/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await requirePermission("categories.manage");
    const { id } = await params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!existing) throw new NotFoundError("Category");

    if (existing._count.products > 0) {
      throw new AppError(
        `Cannot delete: ${existing._count.products} products are in this category`,
        400
      );
    }

    if (existing._count.children > 0) {
      throw new AppError(
        `Cannot delete: ${existing._count.children} subcategories exist`,
        400
      );
    }

    await prisma.category.delete({ where: { id } });

    await logAudit({
      userId: user.id,
      action: "DELETE",
      resource: "category",
      resourceId: id,
      metadata: { name: existing.name },
      ...getRequestInfo(request),
    });

    return success({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}