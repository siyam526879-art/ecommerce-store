import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundError("Page");
    return success({ page });
  } catch (err) {
    return errorResponse(err);
  }
}