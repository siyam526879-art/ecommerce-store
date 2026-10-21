import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    const userId = session.user.id;
    const role = (session.user as any).role;

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                attributes: true,
                product: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        user: { select: { id: true, name: true, email: true } },
        statusLog: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) throw new NotFoundError("Order");

    if (role !== "ADMIN" && role !== "STAFF" && order.userId !== userId) {
      throw new ForbiddenError();
    }

    return success({ order });
  } catch (err) {
    return errorResponse(err);
  }
}