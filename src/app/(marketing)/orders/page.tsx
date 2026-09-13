import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { getUserOrders } from "@/features/orders/queries";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const user = await requireUser();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const result = await getUserOrders(user.id, params);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-bold">My Orders</h1>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Package}
          className="mt-6"
          title="No orders yet"
          description="When you place an order, it will show up here."
          action={<Button asChild><Link href="/search">Start Shopping</Link></Button>}
        />
      ) : (
        <div className="mt-6 space-y-3">
          {result.items.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-xl border p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">Placed {formatDate(order.placedAt)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="relative size-12 overflow-hidden rounded-md bg-muted">
                    {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="48px" />}
                  </div>
                ))}
                {order.items.length > 3 && <span className="text-xs text-muted-foreground">+{order.items.length - 3} more</span>}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{order.sellerOrders.length} seller(s)</span>
                <span className="font-semibold">{formatCurrency(Number(order.total))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <PaginationBar page={result.page} totalPages={result.totalPages} basePath="/orders" />
      </div>
    </div>
  );
}
