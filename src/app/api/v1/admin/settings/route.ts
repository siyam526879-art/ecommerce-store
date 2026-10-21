import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    await requirePermission("settings.view");
    const settings = await prisma.siteSetting.findMany();
    const map: Record<string, any> = {};
    for (const s of settings) map[s.key] = s.value;
    return success({ settings: map });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    const body = z.record(z.string(), z.any()).parse(await request.json());

    await prisma.$transaction(
      Object.entries(body).map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        })
      )
    );

    await logAudit({
      userId: user.id, action: "UPDATE", resource: "settings",
      metadata: { keys: Object.keys(body) },
      ...getRequestInfo(request),
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}