import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";
import { requirePermission, getRequestInfo } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { Decimal } from "@prisma/client/runtime/library";

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function isBangladeshZone(zone: { countries: unknown }) {
  return Array.isArray(zone.countries) && zone.countries.includes("BD");
}

export async function GET() {
  try {
    await requirePermission("shipping.view");

    const allZones = await prisma.shippingZone.findMany({
      include: {
        methods: {
          orderBy: { price: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // International zones are intentionally excluded from this admin screen.
    const zones = allZones.filter(isBangladeshZone);

    const [enabledSetting, minimumSetting] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: { key: "shipping.freeDelivery.enabled" },
      }),
      prisma.siteSetting.findUnique({
        where: { key: "shipping.freeDelivery.minimumOrder" },
      }),
    ]);

    const rawMinimum = Number(minimumSetting?.value ?? 1000);
    const freeDeliveryMinimum =
      Number.isFinite(rawMinimum) && rawMinimum >= 0 ? rawMinimum : 1000;

    return success({
      zones,
      settings: {
        freeDeliveryEnabled: enabledSetting?.value === true,
        freeDeliveryMinimum,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("shipping.manage");
    const body = await request.json();

    if (!body || typeof body !== "object") {
      throw badRequest("Invalid request body.");
    }

    const kind = body.kind;

    if (kind === "settings") {
      if (typeof body.freeDeliveryEnabled !== "boolean") {
        throw badRequest("Free Delivery must be enabled or disabled.");
      }

      if (
        typeof body.freeDeliveryMinimum !== "number" ||
        !Number.isFinite(body.freeDeliveryMinimum) ||
        body.freeDeliveryMinimum < 0
      ) {
        throw badRequest("Minimum order amount must be a non-negative number.");
      }

      await prisma.$transaction([
        prisma.siteSetting.upsert({
          where: { key: "shipping.freeDelivery.enabled" },
          update: { value: body.freeDeliveryEnabled as any },
          create: {
            key: "shipping.freeDelivery.enabled",
            value: body.freeDeliveryEnabled as any,
          },
        }),
        prisma.siteSetting.upsert({
          where: { key: "shipping.freeDelivery.minimumOrder" },
          update: { value: body.freeDeliveryMinimum as any },
          create: {
            key: "shipping.freeDelivery.minimumOrder",
            value: body.freeDeliveryMinimum as any,
          },
        }),
      ]);

      await logAudit({
        userId: user.id,
        action: "UPDATE",
        resource: "shipping_settings",
        metadata: {
          freeDeliveryEnabled: body.freeDeliveryEnabled,
          freeDeliveryMinimum: body.freeDeliveryMinimum,
        },
        ...getRequestInfo(request),
      });

      return success({
        settings: {
          freeDeliveryEnabled: body.freeDeliveryEnabled,
          freeDeliveryMinimum: body.freeDeliveryMinimum,
        },
      });
    }

    if (kind === "zone") {
      // Only one canonical domestic zone is supported for now.
      const allZones = await prisma.shippingZone.findMany();

      const existingZone =
        allZones.find(isBangladeshZone) ??
        allZones.find(
          (zone) => zone.name.trim().toLowerCase() === "bangladesh"
        );

      if (existingZone) {
        const zone = await prisma.shippingZone.update({
          where: { id: existingZone.id },
          data: {
            name: "Bangladesh",
            countries: ["BD"],
            isActive: true,
          },
          include: { methods: { orderBy: { price: "asc" } } },
        });

        await logAudit({
          userId: user.id,
          action: "UPDATE",
          resource: "shipping_zone",
          resourceId: zone.id,
          metadata: { name: zone.name, countries: ["BD"] },
          ...getRequestInfo(request),
        });

        return success({ zone });
      }

      const zone = await prisma.shippingZone.create({
        data: {
          name: "Bangladesh",
          countries: ["BD"],
          isActive: true,
        },
        include: { methods: { orderBy: { price: "asc" } } },
      });

      await logAudit({
        userId: user.id,
        action: "CREATE",
        resource: "shipping_zone",
        resourceId: zone.id,
        metadata: { name: zone.name, countries: ["BD"] },
        ...getRequestInfo(request),
      });

      return success({ zone }, 201);
    }

    if (kind === "method") {
      if (typeof body.zoneId !== "string" || !body.zoneId.trim()) {
        throw badRequest("Select a valid Bangladesh shipping zone.");
      }

      if (typeof body.name !== "string" || body.name.trim().length < 2) {
        throw badRequest("Method name must contain at least 2 characters.");
      }

      const dhakaPrice = body.dhakaPrice ?? body.price;
      const outsideDhakaPrice = body.outsideDhakaPrice ?? body.price;

      if (
        typeof dhakaPrice !== "number" ||
        !Number.isFinite(dhakaPrice) ||
        dhakaPrice < 0
      ) {
        throw badRequest("Dhaka shipping price must be a valid non-negative number.");
      }

      if (
        typeof outsideDhakaPrice !== "number" ||
        !Number.isFinite(outsideDhakaPrice) ||
        outsideDhakaPrice < 0
      ) {
        throw badRequest("Outside Dhaka shipping price must be a valid non-negative number.");
      }

      if (
        body.freeThreshold !== undefined &&
        body.freeThreshold !== null &&
        (
          typeof body.freeThreshold !== "number" ||
          !Number.isFinite(body.freeThreshold) ||
          body.freeThreshold < 0
        )
      ) {
        throw badRequest("Free shipping threshold must be a non-negative number.");
      }

      if (
        body.estimatedDays !== undefined &&
        (
          typeof body.estimatedDays !== "string" ||
          body.estimatedDays.length > 100
        )
      ) {
        throw badRequest("Estimated delivery must be 100 characters or fewer.");
      }

      const zone = await prisma.shippingZone.findUnique({
        where: { id: body.zoneId },
      });

      if (!zone || !isBangladeshZone(zone)) {
        throw badRequest("Shipping methods can only be added to Bangladesh.");
      }

      if (!zone.isActive) {
        throw badRequest("Activate the Bangladesh shipping zone first.");
      }

      const method = await prisma.shippingMethod.create({
        data: {
          zoneId: zone.id,
          name: body.name.trim(),
          price: new Decimal(dhakaPrice),
          dhakaPrice: new Decimal(dhakaPrice),
          outsideDhakaPrice: new Decimal(outsideDhakaPrice),
          freeThreshold:
            body.freeThreshold !== undefined &&
            body.freeThreshold !== null
              ? new Decimal(body.freeThreshold)
              : null,
          estimatedDays: body.estimatedDays?.trim() || null,
          isActive: body.isActive !== false,
        },
      });

      await logAudit({
        userId: user.id,
        action: "CREATE",
        resource: "shipping_method",
        resourceId: method.id,
        metadata: {
          name: method.name,
          zoneId: zone.id,
          price: dhakaPrice,
          dhakaPrice,
          outsideDhakaPrice,
        },
        ...getRequestInfo(request),
      });

      return success({ method }, 201);
    }

    throw badRequest("Unsupported shipping operation.");
  } catch (err) {
    return errorResponse(err);
  }
}
