import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(2, "Full name required"),
  line1: z.string().min(3, "Address required"),
  line2: z.string().optional(),
  city: z.string().min(1, "District required"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Bangladesh"),
  phone: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

// GET /api/v1/addresses — current user's addresses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    });

    return success({ addresses });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/v1/addresses — create new address
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    const userId = session.user.id;

    const body = addressSchema.parse(await request.json());

    const count = await prisma.address.count({
      where: { userId, deletedAt: null },
    });

    const shouldBeDefault = body.isDefault || count === 0;

    if (shouldBeDefault && count > 0) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        label: body.label,
        fullName: body.fullName,
        line1: body.line1,
        line2: body.line2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode ?? "",
        country: body.country,
        phone: body.phone,
        isDefault: shouldBeDefault,
      },
    });

    return success({ address }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}