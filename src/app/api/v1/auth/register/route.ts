import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { registerSchema } from "@/lib/validators/auth.schema";
import { ConflictError } from "@/lib/errors";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    return success({ user: { id: user.id, email: user.email, name: user.name } }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
