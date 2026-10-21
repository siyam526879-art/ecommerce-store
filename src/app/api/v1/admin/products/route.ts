import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, paginated, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { generateUniqueSku } from "@/lib/sku-generator";
import { generateMeta } from "@/lib/meta-generator";

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  basePrice: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  categoryId: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  weight: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  trackInventory: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().optional(),
        price: z.number().min(0),
        stock: z.number().int().min(0).default(0),
        attributes: z.record(z.string(), z.string()).default({}),
      })
    )
    .optional(),
  images: z.array(z.string()).optional(),
});

// GET /api/v1/admin/products
export async function GET(request: NextRequest) {
  try {
    await requirePermission("products.view");

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20))
    );
    const q = request.nextUrl.searchParams.get("q") ?? "";

    const where: Prisma.ProductWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          _count: { select: { variants: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return paginated(products, total, page, pageSize);
  } catch (err) {
    console.error("=== PRODUCT LIST ERROR ===");
    console.error("Error:", err);
    return errorResponse(err);
  }
}

// POST /api/v1/admin/products
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("products.manage");
    const body = createSchema.parse(await request.json());

    // ---- Auto-generate: category name ----
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      select: { name: true },
    });
    const categoryName = category?.name ?? "General";

    // ---- Auto-generate: SKU if empty ----
    let finalSku = body.sku?.trim() || "";
    if (!finalSku) {
      finalSku = await generateUniqueSku(categoryName, async (candidate) => {
        const found = await prisma.product.findUnique({
          where: { sku: candidate },
          select: { id: true },
        });
        return !!found;
      });
    }

    // ---- Auto-generate: Meta title/description if empty ----
    const autoMeta = generateMeta(
      body.name,
      categoryName,
      body.shortDescription ?? null
    );
    const finalMetaTitle = body.metaTitle?.trim() || autoMeta.metaTitle;
    const finalMetaDescription =
      body.metaDescription?.trim() || autoMeta.metaDescription;

    const slug =
      body.slug ??
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 7);

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: body.name,
          slug,
          description: body.description,
          shortDescription: body.shortDescription,
          basePrice: new Decimal(body.basePrice),
          compareAtPrice: body.compareAtPrice ? new Decimal(body.compareAtPrice) : null,
          sku: finalSku,
          categoryId: body.categoryId,
          status: body.status,
          isFeatured: body.isFeatured,
          weight: body.weight ? new Decimal(body.weight) : null,
          stock: body.stock,
          trackInventory: body.trackInventory,
          metaTitle: finalMetaTitle,
          metaDescription: finalMetaDescription,
        },
      });

      if (body.variants && body.variants.length > 0) {
        await tx.productVariant.createMany({
          data: body.variants.map((v) => ({
            productId: p.id,
            sku: v.sku,
            price: new Decimal(v.price),
            stock: v.stock,
            attributes: v.attributes as Prisma.InputJsonValue,
          })),
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId: p.id,
            sku: finalSku,
            price: new Decimal(body.basePrice),
            stock: body.stock,
            attributes: {},
          },
        });
      }

      if (body.images && body.images.length > 0) {
        await tx.productImage.createMany({
          data: body.images.map((url, i) => ({
            productId: p.id,
            url,
            order: i,
            isPrimary: i === 0,
          })),
        });
      }

      return p;
    });

    await logAudit({
      userId: user.id,
      action: "CREATE",
      resource: "product",
      resourceId: product.id,
      metadata: { name: product.name },
      ...getRequestInfo(request),
    });

    return success({ product }, 201);
  } catch (err) {
    console.error("=== PRODUCT CREATE ERROR ===");
    console.error("Error:", err);
    return errorResponse(err);
  }
}