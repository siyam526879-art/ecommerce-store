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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("shipping.manage");
    const { id } = await params;
    const body = await request.json();

    if (!body || typeof body !== "object") {
      throw badRequest("Invalid request body.");
    }

    if (body.kind === "zone") {
      const existing = await prisma.shippingZone.findUnique({
        where: { id },
      });

      if (!existing || !isBangladeshZone(existing)) {
        throw badRequest("Only the Bangladesh shipping zone can be changed here.");
      }

      if (
        body.countries !== undefined &&
        (
          !Array.isArray(body.countries) ||
          body.countries.length !== 1 ||
          body.countries[0] !== "BD"
        )
      ) {
        throw badRequest("Only Bangladesh shipping is enabled.");
      }

      const data: {
        name?: string;
        countries?: string[];
        isActive?: boolean;
      } = {};

      if (body.name !== undefined) {
        if (typeof body.name !== "string" || body.name.trim().length < 2) {
          throw badRequest("Zone name must contain at least 2 characters.");
        }

        data.name = "Bangladesh";
      }

      if (body.countries !== undefined) {
        data.countries = ["BD"];
      }

      if (body.isActive !== undefined) {
        if (typeof body.isActive !== "boolean") {
          throw badRequest("isActive must be true or false.");
        }

        data.isActive = body.isActive;
      }

      const updated = await prisma.shippingZone.update({
        where: { id },
        data,
      });

      await logAudit({
        userId: user.id,
        action: "UPDATE",
        resource: "shipping_zone",
        resourceId: id,
        ...getRequestInfo(request),
      });

      return success({ zone: updated });
    }

    if (body.kind !== "method") {
      throw badRequest("Unsupported shipping operation.");
    }

    const existing = await prisma.shippingMethod.findUnique({
      where: { id },
      include: { zone: true },
    });

    if (!existing || !isBangladeshZone(existing.zone)) {
      throw badRequest("Only Bangladesh shipping methods can be changed here.");
    }

    const data: {
      name?: string;
      price?: Decimal;
      dhakaPrice?: Decimal | null;
      outsideDhakaPrice?: Decimal | null;
      freeThreshold?: Decimal | null;
      estimatedDays?: string | null;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2) {
        throw badRequest("Method name must contain at least 2 characters.");
      }

      data.name = body.name.trim();
    }

    if (body.dhakaPrice !== undefined || body.outsideDhakaPrice !== undefined) {
      const dhakaPrice = body.dhakaPrice;
      const outsideDhakaPrice = body.outsideDhakaPrice;

      if (
        typeof dhakaPrice !== "number" ||
        !Number.isFinite(dhakaPrice) ||
        dhakaPrice < 0
      ) {
        throw badRequest("Dhaka shipping price must be a non-negative number.");
      }

      if (
        typeof outsideDhakaPrice !== "number" ||
        !Number.isFinite(outsideDhakaPrice) ||
        outsideDhakaPrice < 0
      ) {
        throw badRequest("Outside Dhaka shipping price must be a non-negative number.");
      }

      data.price = new Decimal(dhakaPrice);
      data.dhakaPrice = new Decimal(dhakaPrice);
      data.outsideDhakaPrice = new Decimal(outsideDhakaPrice);
    } else if (body.price !== undefined) {
      if (
        typeof body.price !== "number" ||
        !Number.isFinite(body.price) ||
        body.price < 0
      ) {
        throw badRequest("Shipping price must be a non-negative number.");
      }

      data.price = new Decimal(body.price);
    }

    if (body.freeThreshold !== undefined) {
      if (
        body.freeThreshold !== null &&
        (
          typeof body.freeThreshold !== "number" ||
          !Number.isFinite(body.freeThreshold) ||
          body.freeThreshold < 0
        )
      ) {
        throw badRequest("Free shipping threshold must be a non-negative number.");
      }

      data.freeThreshold =
        body.freeThreshold === null
          ? null
          : new Decimal(body.freeThreshold);
    }

    if (body.estimatedDays !== undefined) {
      if (
        body.estimatedDays !== null &&
        (
          typeof body.estimatedDays !== "string" ||
          body.estimatedDays.length > 100
        )
      ) {
        throw badRequest("Estimated delivery must be 100 characters or fewer.");
      }

      data.estimatedDays = body.estimatedDays;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        throw badRequest("isActive must be true or false.");
      }

      data.isActive = body.isActive;
    }

    const updated = await prisma.shippingMethod.update({
      where: { id },
      data,
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      resource: "shipping_method",
      resourceId: id,
      ...getRequestInfo(request),
    });

    return success({ method: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("shipping.manage");
    const { id } = await params;
    const kind = request.nextUrl.searchParams.get("kind") ?? "method";

    if (kind === "zone") {
      const zone = await prisma.shippingZone.findUnique({
        where: { id },
      });

      if (!zone || !isBangladeshZone(zone)) {
        throw badRequest("Only the Bangladesh shipping zone can be deleted here.");
      }

      throw badRequest(
        "The Bangladesh shipping zone cannot be deleted from this interface."
      );
    }

    if (kind !== "method") {
      throw badRequest("Unsupported shipping operation.");
    }

    const method = await prisma.shippingMethod.findUnique({
      where: { id },
      include: { zone: true },
    });

    if (!method || !isBangladeshZone(method.zone)) {
      throw badRequest("Only Bangladesh shipping methods can be deleted here.");
    }

    await prisma.shippingMethod.delete({
      where: { id },
    });

    await logAudit({
      userId: user.id,
      action: "DELETE",
      resource: "shipping_method",
      resourceId: id,
      ...getRequestInfo(request),
    });

    return success({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
