import type { Metadata } from "next";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CouponFormDialog } from "@/components/coupon/coupon-form-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { createCouponAction, updateCouponAction, deleteCouponAction } from "@/features/admin/actions";
import { Ticket } from "lucide-react";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireAdmin();
  const [coupons, categories] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { seller: { select: { businessName: true } } } }),
    prisma.category.findMany({ where: { parentId: null }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{coupons.length} coupons</p>
        <CouponFormDialog onSubmit={createCouponAction} scopeOptions={{ categories }} />
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Scope</TableHead><TableHead>Usage</TableHead><TableHead>Valid Until</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell className="text-sm">{coupon.discountType === "PERCENTAGE" ? `${toNumber(coupon.value)}%` : coupon.discountType === "FIXED_AMOUNT" ? `৳${toNumber(coupon.value)}` : "Free Shipping"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{coupon.seller?.businessName ?? "Platform-wide"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(coupon.endsAt)}</TableCell>
                  <TableCell>{coupon.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CouponFormDialog
                        coupon={{
                          id: coupon.id, code: coupon.code, description: coupon.description ?? "", discountType: coupon.discountType,
                          value: toNumber(coupon.value), minOrderAmount: coupon.minOrderAmount ? toNumber(coupon.minOrderAmount) : undefined,
                          maxDiscount: coupon.maxDiscount ? toNumber(coupon.maxDiscount) : undefined, usageLimit: coupon.usageLimit ?? undefined,
                          perUserLimit: coupon.perUserLimit ?? undefined, startsAt: coupon.startsAt, endsAt: coupon.endsAt, isActive: coupon.isActive,
                        }}
                        onSubmit={updateCouponAction.bind(null, coupon.id)}
                        scopeOptions={{ categories }}
                      />
                      <DeleteEntityButton onDelete={deleteCouponAction.bind(null, coupon.id)} entityLabel="coupon" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
