import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ email: z.string().email() });

function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = schema.parse(await req.json());
    const email = rawEmail.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordResetToken: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      return success({
        message: "If an account exists, an OTP has been sent.",
      });
    }

    // Enforce the 30-second cooldown on the server too.
    // The existing 10-minute expiry gives us the previous send time.
    const now = Date.now();
    if (
      user.passwordResetToken &&
      user.passwordResetExpires &&
      user.passwordResetExpires.getTime() > now
    ) {
      const previousSentAt = user.passwordResetExpires.getTime() - 10 * 60 * 1000;
      const secondsLeft = Math.ceil((previousSentAt + 30 * 1000 - now) / 1000);
      if (secondsLeft > 0) {
        return errorResponse({
          message: "Please wait " + secondsLeft + " seconds before requesting another code.",
          status: 429,
        });
      }
    }

    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);

    // Do not replace the current valid code unless the new email actually sends.
    const emailSent = await sendEmail({
      to: email,
      subject: "Your password reset OTP",
      html:
        '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">' +
        '<h2 style="color:#111">Password Reset</h2>' +
        '<p>Use this one-time code to reset your password:</p>' +
        '<div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:20px 0">' +
        '<div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111">' + otp + '</div>' +
        '</div>' +
        '<p style="color:#71717a;font-size:14px">This code expires in 10 minutes.</p>' +
        '</div>',
    });

    if (!emailSent) {
      return errorResponse({
        message: "The email could not be sent. Your previous code remains valid if it has not expired. Please try again.",
        status: 503,
      });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedOTP,
        passwordResetExpires: expiresAt,
        passwordResetAttempts: 0,
        resetSessionToken: null,
        resetSessionExpires: null,
      },
    });

    return success({
      message: "If an account exists, an OTP has been sent.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
