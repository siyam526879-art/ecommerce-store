import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, requireRole, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { NotFoundError, AppError } from "@/lib/errors";
import { z } from "zod";
import { ORDER_STATUS } from "@/lib/constants";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("orders.view");
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            variant: {
              select: {
                sku: true,
                attributes: true,
                product: {
                  select: {
                    name: true,
                    images: { take: 1, orderBy: [{ isPrimary: "desc" }] },
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        payments: true,
        statusLog: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) throw new NotFoundError("Order");
    return success({ order });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("orders.view");
    const { id } = await params;
    const { status, note } = z.object({
      status: z.string(),
      note: z.string().optional(),
    }).parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError("Order");

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400, "INVALID_TRANSITION");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === "SHIPPED" && { paidAt: new Date() }),
        },
      });
      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: status,
          note,
          changedBy: user.id,
        },
      });

      // ===== Payment status sync =====
      // COD: mark payment as SUCCESS when shipped/delivered
      if (status === "DELIVERED") {
        await tx.payment.updateMany({
          where: { orderId: id, status: "PENDING" },
          data: { status: "SUCCESS" },
        });
      }
      // CANCELLED: mark payment as FAILED
      if (status === "CANCELLED") {
        await tx.payment.updateMany({
          where: { orderId: id, status: "PENDING" },
          data: { status: "FAILED" },
        });
      }
      // REFUNDED: mark payment as REFUNDED
      if (status === "REFUNDED") {
        await tx.payment.updateMany({
          where: { orderId: id },
          data: { status: "REFUNDED" },
        });
      }

      // Restore stock on cancellation
      if (status === "CANCELLED") {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return o;
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE_STATUS",
      resource: "order",
      resourceId: id,
      metadata: { from: order.status, to: status },
      ...getRequestInfo(request),
    });

    return success({ order: updated });
  } catch (err) {
    return errorResponse(err);
  }
}