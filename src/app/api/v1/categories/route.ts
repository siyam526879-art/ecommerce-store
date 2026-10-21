import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { order: "asc" },
    });
    return success(categories);
  } catch (err) {
    return errorResponse(err);
  }
}
