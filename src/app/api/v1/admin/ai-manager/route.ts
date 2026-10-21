import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-guard";

const DEMAND_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING"];

export async function GET(request: Request) {
  try {
    await requirePermission("reports.view");

    const url = new URL(request.url);
    const skuQuery = url.searchParams.get("sku")?.trim() ?? "";

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: DEMAND_STATUSES },
        },
      },
      select: {
        orderId: true,
        variantId: true,
        name: true,
        sku: true,
        quantity: true,
        order: {
          select: {
            orderNumber: true,
            status: true,
            placedAt: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            stock: true,
            price: true,
            isActive: true,
            attributes: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                status: true,
                costPrice: true,
                basePrice: true,
                images: {
                  orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                  take: 1,
                  select: { url: true, alt: true },
                },
              },
            },
          },
        },
      },
      orderBy: { order: { placedAt: "desc" } },
    });

    type OrderDetail = {
      orderId: string;
      orderNumber: string;
      status: string;
      placedAt: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string | null;
      quantity: number;
    };

    const grouped = new Map<string, {
      variantId: string;
      productId: string;
      productName: string;
      imageUrl: string | null;
      sku: string;
      currentStock: number;
      unitPrice: number;
      costReference: number | null;
      quantity: number;
      orderIds: Set<string>;
      orders: OrderDetail[];
    }>();

    for (const item of items) {
      if (
        item.variant.product.status !== "ACTIVE" ||
        !item.variant.isActive
      ) continue;

      const key = item.variantId;
      const existing = grouped.get(key);

      const orderDetail: OrderDetail = {
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        status: item.order.status,
        placedAt: item.order.placedAt.toISOString(),
        customerName: item.order.user.name || "Name not provided",
        customerEmail: item.order.user.email,
        customerPhone: item.order.user.phone,
        quantity: item.quantity,
      };

      if (existing) {
        existing.quantity += item.quantity;
        existing.orderIds.add(item.orderId);
        existing.orders.push(orderDetail);
      } else {
        grouped.set(key, {
          variantId: item.variant.id,
          productId: item.variant.product.id,
          productName: item.variant.product.name,
          imageUrl: item.variant.product.images[0]?.url ?? null,
          sku: item.variant.sku ?? item.sku ?? item.variant.product.sku ?? "",
          currentStock: item.variant.stock,
          unitPrice: Number(item.variant.price),
          costReference: item.variant.product.costPrice == null
            ? null
            : Number(item.variant.product.costPrice),
          quantity: item.quantity,
          orderIds: new Set([item.orderId]),
          orders: [orderDetail],
        });
      }
    }

    const demand = Array.from(grouped.values())
      .map((item) => ({
        variantId: item.variantId,
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        sku: item.sku,
        currentStock: item.currentStock,
        unitPrice: item.unitPrice,
        costReference: item.costReference,
        quantity: item.quantity,
        customerOrders: item.orderIds.size,
        orders: item.orders,
        suggestedPurchase: Math.max(0, item.quantity - item.currentStock),
      }))
      .sort((a, b) => b.suggestedPurchase - a.suggestedPurchase);

    let skuLookup = null;

    if (skuQuery) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: { equals: skuQuery, mode: "insensitive" } },
            { variants: { some: { sku: { equals: skuQuery, mode: "insensitive" } } } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          status: true,
          description: true,
          shortDescription: true,
          basePrice: true,
          stock: true,
          trackInventory: true,
          category: { select: { name: true } },
          images: {
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
            take: 1,
            select: { url: true, alt: true },
          },
          variants: {
            where: { sku: { equals: skuQuery, mode: "insensitive" } },
            select: {
              id: true,
              sku: true,
              price: true,
              stock: true,
              attributes: true,
              isActive: true,
            },
          },
        },
      });

      skuLookup = product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.variants[0]?.sku ?? product.sku,
        status: product.status,
        description: product.description,
        shortDescription: product.shortDescription,
        price: Number(product.variants[0]?.price ?? product.basePrice),
        stock: product.variants[0]?.stock ?? product.stock,
        trackInventory: product.trackInventory,
        category: product.category.name,
        imageUrl: product.images[0]?.url ?? null,
        variant: product.variants[0] ? {
          id: product.variants[0].id,
          attributes: product.variants[0].attributes,
          isActive: product.variants[0].isActive,
        } : null,
      } : null;
    }

    return success({
      generatedAt: new Date().toISOString(),
      includedStatuses: DEMAND_STATUSES,
      totalProducts: demand.length,
      totalUnits: demand.reduce((sum, item) => sum + item.quantity, 0),
      demand,
      skuLookup,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
