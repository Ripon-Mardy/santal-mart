import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { RefundOrderDialog } from "@/components/admin/refund-order-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Order Details" };

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      address: true,
      payment: true,
      sellerOrders: { include: { items: true, seller: { select: { store: { select: { name: true } } } } } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Order {order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">{order.user.name} · {order.user.email} · {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {order.paymentStatus !== "REFUNDED" && <RefundOrderDialog orderId={order.id} />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground">Payment</p><p className="font-medium">{order.paymentMethod.replace(/_/g, " ")}</p><p className="text-muted-foreground">{order.paymentStatus}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground">Total</p><p className="font-medium">{formatCurrency(Number(order.total))}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground">Delivery Address</p><p className="font-medium">{order.address.city}, {order.address.division}</p></CardContent></Card>
      </div>

      {order.sellerOrders.map((so) => (
        <Card key={so.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              <Link href={`/admin/products?sellerId=${so.sellerId}`} className="hover:text-primary">{so.seller.store?.name}</Link>
              <span className="ml-2 text-xs text-muted-foreground font-normal">{so.subOrderNumber}</span>
            </CardTitle>
            <StatusBadge status={so.status} />
          </CardHeader>
          <CardContent className="space-y-2">
            {so.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="48px" />}
                </div>
                <div className="flex-1 text-sm">
                  <p>{item.productName}</p>
                  <p className="text-muted-foreground">Qty {item.quantity} × {formatCurrency(Number(item.price))}</p>
                </div>
                <span className="text-sm font-medium">{formatCurrency(Number(item.total))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
