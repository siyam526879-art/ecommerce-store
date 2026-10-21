import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth-guard";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser?.passwordHash) {
      return errorResponse({
        message: "No password set on this account",
        status: 400,
      });
    }

    const ok = await bcrypt.compare(body.currentPassword, dbUser.passwordHash);
    if (!ok) {
      return errorResponse({
        message: "Current password is incorrect",
        status: 400,
      });
    }

    const newHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}