import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requireRole, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { ConflictError } from "@/lib/errors";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["STAFF", "ADMIN"]),
});

export async function GET() {
  try {
    await requireRole("ADMIN");
    const staff = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    return success({ staff });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("ADMIN");
    const body = createSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw new ConflictError("Email already exists");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const created = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        role: body.role,
        passwordHash,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAudit({
      userId: user.id, action: "CREATE", resource: "staff", resourceId: created.id,
      metadata: { email: created.email, role: created.role },
      ...getRequestInfo(request),
    });

    return success({ staff: created }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}