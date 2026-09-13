import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

import { requireApprovedSeller } from "@/lib/rbac";
import { getSellerOrderDetail } from "@/features/seller/order-queries";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderTimeline } from "@/components/order/order-timeline";
import { OrderStatusUpdater } from "@/components/seller/order-status-updater";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Order Details" };

export default async function SellerOrderDetailPage({ params }: PageProps<"/seller/orders/[id]">) {
  const seller = await requireApprovedSeller();
  const { id } = await params;
  const order = await getSellerOrderDetail(seller.sellerId, id);
  if (!order) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{order.subOrderNumber}</h2>
            <p className="text-sm text-muted-foreground">Order {order.order.orderNumber} · {formatDate(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="56px" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                  <p className="text-muted-foreground">Qty {item.quantity} × {formatCurrency(Number(item.price))}</p>
                </div>
                <span className="text-sm font-medium">{formatCurrency(Number(item.total))}</span>
              </div>
            ))}
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(Number(order.shippingFee))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Commission</span><span>-{formatCurrency(Number(order.commissionTotal))}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Your Payout</span><span>{formatCurrency(Number(order.payoutTotal))}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
          <CardContent>
            <OrderStatusUpdater sellerOrderId={order.id} status={order.status} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.order.user.name}</p>
            <p className="text-muted-foreground">{order.order.user.email}</p>
            <div className="mt-3 border-t pt-3">
              <p className="font-medium">{order.order.address.fullName} · {order.order.address.phone}</p>
              <p className="text-muted-foreground">{order.order.address.line1}, {order.order.address.city}, {order.order.address.division}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tracking</CardTitle></CardHeader>
          <CardContent>
            <OrderTimeline events={order.statusEvents} currentStatus={order.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
