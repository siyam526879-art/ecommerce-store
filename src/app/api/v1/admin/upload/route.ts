import { NextRequest } from "next/server";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";
import { saveUpload } from "@/lib/upload";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    await requirePermission("products.manage");
    const formData = await request.formData();
    const file = formData.get("file");

    const schema = z.instanceof(File).refine((f) => f.size > 0, "File required")
      .refine((f) => f.size <= 5 * 1024 * 1024, "Max 5MB")
      .refine(
        (f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type),
        "JPEG, PNG, or WebP only"
      );

    const parsed = schema.safeParse(file);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 }
      );
    }

    const url = await saveUpload(parsed.data);
    return success({ url });
  } catch (err) {
    return errorResponse(err);
  }
}