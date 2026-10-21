import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  compareAtPrice: z.number().min(0).nullable().optional(),
  sku: z.string().nullable().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  weight: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0).optional(),
  trackInventory: z.boolean().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string(),
        alt: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("products.view");
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        images: { orderBy: { order: "asc" } },
      },
    });
    if (!product) throw new NotFoundError("Product");
    return success({ product });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("products.manage");
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Product");

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
    if (body.basePrice !== undefined) data.basePrice = new Decimal(body.basePrice);
    if (body.compareAtPrice !== undefined)
      data.compareAtPrice = body.compareAtPrice ? new Decimal(body.compareAtPrice) : null;
    if (body.sku !== undefined) data.sku = body.sku;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.status !== undefined) data.status = body.status;
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
    if (body.weight !== undefined) data.weight = body.weight ? new Decimal(body.weight) : null;
    if (body.stock !== undefined) data.stock = body.stock;
    if (body.trackInventory !== undefined) data.trackInventory = body.trackInventory;
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data });

      if (body.images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (body.images.length > 0) {
          await tx.productImage.createMany({
            data: body.images.map((img, i) => ({
              productId: id,
              url: img.url,
              alt: img.alt,
              order: i,
              isPrimary: img.isPrimary ?? i === 0,
            })),
          });
        }
      }

      return updated;
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      resource: "product",
      resourceId: id,
      metadata: { changes: Object.keys(body) },
      ...getRequestInfo(request),
    });

    return success({ product });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("products.manage");
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "DELETE",
      resource: "product",
      resourceId: id,
      ...getRequestInfo(request),
    });
    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}