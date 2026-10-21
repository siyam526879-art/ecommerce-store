import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(5).max(2000),
  items: z.array(
    z.object({
      orderItemId: z.string().min(1),
      quantity: z.number().int().min(1),
    })
  ).min(1).max(100),
});

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return fail("Please sign in to view your return requests.", 401);

    const returns = await prisma.return.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { orderNumber: true, status: true } },
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      returns: returns.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        orderStatus: r.order.status,
        status: r.status,
        reason: r.reason,
        items: r.items,
        refundAmount: Number(r.refundAmount),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[MY RETURNS GET]", error);
    return fail("Could not load return requests.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return fail("Please sign in before requesting a return.", 401);

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid return request.", 400);
    }

    const { orderId, reason, items } = parsed.data;

    const uniqueIds = new Set(items.map((item) => item.orderItemId));
    if (uniqueIds.size !== items.length) {
      return fail("A product can only be selected once per request.", 400);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) return fail("Order not found.", 404);

    if (order.status !== "DELIVERED") {
      return fail("Only delivered orders can be returned.", 400);
    }

    const paid = order.payments.some((payment) =>
      payment.provider === "cod"
        ? payment.status === "SUCCESS" || payment.status === "SUCCEEDED"
        : payment.status === "SUCCEEDED"
    );

    if (!paid) {
      return fail("Payment must be confirmed before requesting a refund.", 400);
    }

    const existing = await prisma.return.findFirst({
      where: {
        orderId,
        userId,
        status: { not: "REJECTED" },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      return fail(
        "A return request already exists for this order. Please check its status.",
        409
      );
    }

    const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
    let refundAmount = 0;

    const selectedItems = items.map((requested) => {
      const orderItem = orderItemsById.get(requested.orderItemId);

      if (!orderItem) {
        throw new Error("INVALID_RETURN_ITEM");
      }

      if (requested.quantity > orderItem.quantity) {
        throw new Error("RETURN_QUANTITY_EXCEEDED");
      }

      const unitPrice = Number(orderItem.price);
      refundAmount += unitPrice * requested.quantity;

      return {
        orderItemId: orderItem.id,
        name: orderItem.name,
        quantity: requested.quantity,
        unitPrice,
        amount: unitPrice * requested.quantity,
      };
    });

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return fail("The calculated refund amount is invalid.", 400);
    }

    const created = await prisma.return.create({
      data: {
        orderId,
        userId,
        reason,
        items: selectedItems,
        refundAmount,
        status: "REQUESTED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Return request submitted successfully.",
        return: {
          id: created.id,
          orderId: created.orderId,
          status: created.status,
          refundAmount: Number(created.refundAmount),
          createdAt: created.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RETURN_ITEM") {
      return fail("One or more selected products do not belong to this order.", 400);
    }

    if (error instanceof Error && error.message === "RETURN_QUANTITY_EXCEEDED") {
      return fail("Requested quantity exceeds the quantity purchased.", 400);
    }

    console.error("[MY RETURNS POST]", error);
    return fail("Could not submit the return request.", 500);
  }
}