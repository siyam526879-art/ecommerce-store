import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth-guard";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(2),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  postalCode: z.string().min(2),
  country: z.string().min(2),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = addressSchema.parse(await request.json());

    const existing = await prisma.address.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Address");

    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: body,
    });

    return success({ address: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.address.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: {
        _count: {
          select: { shippingOrders: true, billingOrders: true },
        },
      },
    });

    if (!existing) {
      return errorResponse({ message: "Address not found", status: 404 });
    }

    const totalOrders =
      existing._count.shippingOrders + existing._count.billingOrders;

    // Soft delete: keep row so Order history stays intact
    await prisma.address.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDefault: false,
      },
    });

    return success({
      ok: true,
      softDeleted: true,
      linkedOrders: totalOrders,
    });
  } catch (err) {
    console.error("[DELETE /addresses/:id] error:", err);
    return errorResponse(err);
  }
}