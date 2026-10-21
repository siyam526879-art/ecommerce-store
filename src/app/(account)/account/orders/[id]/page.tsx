import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/layout/status-badge";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS } from "@/lib/constants";
import { Package, MapPin, CreditCard } from "lucide-react";

interface OrderDetailProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: OrderDetailProps) {
  const { id } = await params;
  return { title: `Order ${id.slice(0, 8)}` };
}

export default async function OrderDetailPage({ params }: OrderDetailProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: { include: { variant: { include: { product: { select: { slug: true, images: { where: { isPrimary: true }, take: 1 } } } } } } },
      shippingAddress: true,
      payments: true,
      statusLog: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const currentStatusIndex = ORDER_STATUS.indexOf(order.status as any);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "My Account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: order.orderNumber },
        ]}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.placedAt).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Status timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {ORDER_STATUS.slice(0, 5).map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center relative">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${
                    i <= currentStatusIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < currentStatusIndex ? "" : i + 1}
                </div>
                <p className="text-xs mt-2 text-center capitalize">{s.toLowerCase()}</p>
                {i < 4 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      i < currentStatusIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                  {item.variant.product.images[0] && (
                    <Image
                      src={item.variant.product.images[0].url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.variant.attributes && Object.keys(item.variant.attributes as object).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(item.variant.attributes as Record<string, string>)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("  ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-sm">{formatPrice(Number(item.total))}</p>
              </div>
            ))}
            <Separator className="my-4" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping {order.deliveryZone ? `(${order.deliveryZone === "inside" ? "Inside Dhaka" : "Outside Dhaka"})` : ""}</span>
                <span>{formatPrice(Number(order.shippingAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(Number(order.taxAmount))}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Shipping address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p className="mt-2">{order.shippingAddress.phone}</p>}
            </CardContent>
          </Card>

          {order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{p.provider}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}