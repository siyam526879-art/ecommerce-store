import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export async function logAudit(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata as Prisma.InputJsonValue,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
