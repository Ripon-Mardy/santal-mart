import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SellerActions } from "@/components/admin/seller-actions";
import { CommissionInput } from "@/components/admin/commission-input";
import { setSellerCommissionAction } from "@/features/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Star } from "lucide-react";

export const metadata: Metadata = { title: "Seller Details" };

export default async function AdminSellerDetailPage({ params }: PageProps<"/admin/sellers/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const seller = await prisma.seller.findUnique({
    where: { id },
    include: {
      user: true,
      store: { include: { _count: { select: { products: true } } } },
      wallet: true,
      commission: true,
      _count: { select: { sellerOrders: true } },
    },
  });
  if (!seller) notFound();

  const [productCount, orderCount, avgRating] = await Promise.all([
    prisma.product.count({ where: { sellerId: seller.id } }),
    prisma.sellerOrder.count({ where: { sellerId: seller.id, status: { not: "CANCELLED" } } }),
    prisma.sellerReview.aggregate({ where: { sellerId: seller.id }, _avg: { productQualityRating: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{seller.store?.name ?? seller.businessName}</h2>
          <p className="text-sm text-muted-foreground">{seller.user.name} · {seller.user.email} · Applied {formatDate(seller.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={seller.status} />
          <SellerActions sellerId={seller.id} status={seller.status} />
        </div>
      </div>

      {seller.rejectionReason && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Reason: {seller.rejectionReason}</p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={String(productCount)} icon={Package} href={`/admin/products?sellerId=${seller.id}`} />
        <StatCard label="Orders" value={String(orderCount)} icon={ShoppingCart} />
        <StatCard label="Available Balance" value={formatCurrency(toNumber(seller.wallet?.balance ?? 0))} icon={DollarSign} />
        <StatCard label="Avg. Rating" value={(avgRating._avg.productQualityRating ?? 0).toFixed(1)} icon={Star} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Business Name:</span> {seller.businessName}</p>
            <p><span className="text-muted-foreground">Business Type:</span> {seller.businessType ?? "-"}</p>
            <p><span className="text-muted-foreground">Tax ID:</span> {seller.taxId ?? "-"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {seller.phone}</p>
            {seller.store && <p><Link href={`/stores/${seller.store.slug}`} className="text-primary hover:underline">View public store →</Link></p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Commission Override</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">Leave blank to use the platform default or category rate.</p>
            <CommissionInput
              initialRate={seller.commission ? toNumber(seller.commission.rate) : null}
              onSave={setSellerCommissionAction.bind(null, seller.id)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
