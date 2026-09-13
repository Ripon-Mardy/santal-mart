import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MapPin, CreditCard } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { getOrderForUser } from "@/features/orders/queries";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderTimeline } from "@/components/order/order-timeline";
import { ReturnRequestDialog } from "@/components/order/return-request-dialog";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order Details" };

export default async function OrderDetailPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const justPlaced = sp.placed === "1";

  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {justPlaced && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">Order placed successfully!</p>
            <p className="text-sm">Estimated delivery in 3-5 business days. Payment status: {order.paymentStatus}.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4 text-sm">
          <p className="mb-2 flex items-center gap-1.5 font-medium"><MapPin className="size-4" /> Delivery Address</p>
          <p>{order.address.fullName} · {order.address.phone}</p>
          <p className="text-muted-foreground">{order.address.line1}, {order.address.city}, {order.address.division}</p>
        </div>
        <div className="rounded-xl border p-4 text-sm">
          <p className="mb-2 flex items-center gap-1.5 font-medium"><CreditCard className="size-4" /> Payment</p>
          <p>{order.paymentMethod.replace(/_/g, " ")}</p>
          <p className="text-muted-foreground">Status: {order.paymentStatus}</p>
          {order.couponCode && <p className="text-muted-foreground">Coupon: {order.couponCode}</p>}
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {order.sellerOrders.map((so) => (
          <div key={so.id} className="rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
              <div>
                <Link href={`/stores/${so.seller.store?.slug}`} className="font-medium hover:text-primary">{so.seller.store?.name}</Link>
                <p className="text-xs text-muted-foreground">Suborder {so.subOrderNumber}{so.trackingNumber && ` · Tracking: ${so.trackingNumber}`}</p>
              </div>
              <StatusBadge status={so.status} />
            </div>
            <div className="grid gap-6 p-4 md:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                {so.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="64px" />}
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{item.productName}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                      <p className="text-muted-foreground">Qty {item.quantity} × {formatCurrency(Number(item.price))}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium">{formatCurrency(Number(item.total))}</span>
                      {so.status === "DELIVERED" && !item.review && (
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          <Link href={`/products/${item.productId}#reviews`}>Write Review</Link>
                        </Button>
                      )}
                      {so.status === "DELIVERED" && item.returnRequests.length === 0 && <ReturnRequestDialog orderItemId={item.id} />}
                      {item.returnRequests.length > 0 && <StatusBadge status={item.returnRequests[0].status} />}
                    </div>
                  </div>
                ))}
                <div className="space-y-1 border-t pt-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(so.subtotal))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(Number(so.shippingFee))}</span></div>
                  {Number(so.discountShare) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(Number(so.discountShare))}</span></div>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Tracking</p>
                <OrderTimeline events={so.statusEvents} currentStatus={so.status} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end rounded-xl border p-4">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(Number(order.shippingTotal))}</span></div>
          {Number(order.discountTotal) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(Number(order.discountTotal))}</span></div>}
          <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatCurrency(Number(order.total))}</span></div>
        </div>
      </div>
    </div>
  );
}
