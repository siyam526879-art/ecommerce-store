import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  email: z.string().email(),
  sessionToken: z.string().min(10),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        resetSessionToken: true,
        resetSessionExpires: true,
      },
    });

    if (!user || !user.resetSessionToken || !user.resetSessionExpires) {
      return errorResponse({
        message: "Invalid or expired session. Please verify OTP again.",
        status: 400,
      });
    }

    if (new Date() > user.resetSessionExpires) {
      return errorResponse({
        message: "Session expired. Please verify OTP again.",
        status: 400,
      });
    }

    if (user.resetSessionToken !== body.sessionToken) {
      return errorResponse({
        message: "Invalid session. Please verify OTP again.",
        status: 400,
      });
    }

    const newHash = await bcrypt.hash(body.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordResetAttempts: 0,
        resetSessionToken: null,
        resetSessionExpires: null,
      },
    });

    return success({
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}