import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/v1/admin/categories
export async function GET(request: NextRequest) {
  try {
    await requirePermission("categories.view");

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 50))
    );
    const q = request.nextUrl.searchParams.get("q") ?? "";

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: [{ order: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
      }),
      prisma.category.count({ where }),
    ]);

    return paginated(categories, total, page, pageSize);
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/v1/admin/categories
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("categories.manage");
    const body = schema.parse(await request.json());

    const slug =
      body.slug ??
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        image: body.image,
        parentId: body.parentId ?? null,
        order: body.order,
        isActive: body.isActive,
      },
    });

    await logAudit({
      userId: user.id,
      action: "CREATE",
      resource: "category",
      resourceId: category.id,
      metadata: { name: category.name },
      ...getRequestInfo(request),
    });

    return success({ category }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}