import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth-guard";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    return success({ profile });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = updateSchema.parse(await req.json());

    if (body.email) {
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing && existing.id !== user.id) {
        return errorResponse({ message: "Email already in use", status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return success({ profile: updated });
  } catch (err) {
    return errorResponse(err);
  }
}