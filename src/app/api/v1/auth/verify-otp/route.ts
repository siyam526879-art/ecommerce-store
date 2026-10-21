import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 15 * 60 * 1000;

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function randomSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        passwordResetToken: true,
        passwordResetExpires: true,
        passwordResetAttempts: true,
      },
    });

    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      return errorResponse({
        message: "Invalid or expired OTP. Please request a new one.",
        status: 400,
      });
    }

    if (user.passwordResetAttempts >= MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordResetAttempts: 0,
        },
      });
      return errorResponse({
        message: "Too many failed attempts. Please request a new OTP.",
        status: 429,
      });
    }

    if (new Date() > user.passwordResetExpires) {
      return errorResponse({
        message: "OTP has expired. Please request a new one.",
        status: 400,
      });
    }

    const hashed = hashOTP(body.otp);
    if (hashed !== user.passwordResetToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetAttempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - (user.passwordResetAttempts + 1);
      return errorResponse({
        message:
          remaining > 0
            ? "Incorrect OTP. " + remaining + " attempts remaining."
            : "Incorrect OTP. No attempts left — request a new OTP.",
        status: 400,
      });
    }

    // ✅ OTP correct — kill it and give session token
    const sessionToken = randomSessionToken();
    const sessionExpires = new Date(Date.now() + SESSION_TTL_MS);

    const consumed = await prisma.user.updateMany({
      where: {
        id: user.id,
        passwordResetToken: hashed,
        passwordResetExpires: { gt: new Date() },
        passwordResetAttempts: { lt: MAX_ATTEMPTS },
      },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordResetAttempts: 0,
        resetSessionToken: sessionToken,
        resetSessionExpires: sessionExpires,
      },
    });
    if (consumed.count !== 1) {
      return errorResponse({ message: "Invalid or already-used OTP. Request a new one.", status: 400 });
    }

    return success({
      verified: true,
      sessionToken,
      sessionExpires,
    });
  } catch (err) {
    return errorResponse(err);
  }
}