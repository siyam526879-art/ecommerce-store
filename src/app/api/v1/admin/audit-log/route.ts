import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("audit.view");
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20)));
    const resource = request.nextUrl.searchParams.get("resource");

    const where: Prisma.AuditLogWhereInput = {
      ...(resource && { resource }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return paginated(logs, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}