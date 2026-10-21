import { prisma } from "@/lib/db";
import { success, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const records = await prisma.shippingMethod.findMany({
      where: {
        isActive: true,
        zone: { isActive: true },
      },
      include: {
        zone: {
          select: {
            countries: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ price: "asc" }, { name: "asc" }],
    });

    const methods = records
      .filter((method) =>
        Array.isArray(method.zone.countries) &&
        method.zone.countries.includes("BD")
      )
      .map((method) => ({
        id: method.id,
        name: method.name,
        price: Number(method.price),
        dhakaPrice:
          method.dhakaPrice === null ? Number(method.price) : Number(method.dhakaPrice),
        outsideDhakaPrice:
          method.outsideDhakaPrice === null ? Number(method.price) : Number(method.outsideDhakaPrice),
        freeThreshold:
          method.freeThreshold === null
            ? null
            : Number(method.freeThreshold),
        estimatedDays: method.estimatedDays,
      }));

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
      methods,
      settings: {
        freeDeliveryEnabled: enabledSetting?.value === true,
        freeDeliveryMinimum,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}