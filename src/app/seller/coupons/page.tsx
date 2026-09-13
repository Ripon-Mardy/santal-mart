import type { Metadata } from "next";
import { Ticket } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CouponFormDialog } from "@/components/coupon/coupon-form-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { createSellerCouponAction, updateSellerCouponAction, deleteSellerCouponAction } from "@/features/seller/actions";

export const metadata: Metadata = { title: "Coupons" };

export default async function SellerCouponsPage() {
  const seller = await requireApprovedSeller();
  const coupons = await prisma.coupon.findMany({ where: { sellerId: seller.sellerId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{coupons.length} coupon(s)</p>
        <CouponFormDialog onSubmit={createSellerCouponAction} />
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" description="Create a coupon to offer discounts to customers." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell className="text-sm">
                    {coupon.discountType === "PERCENTAGE" ? `${toNumber(coupon.value)}%` : coupon.discountType === "FIXED_AMOUNT" ? `৳${toNumber(coupon.value)}` : "Free Shipping"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(coupon.endsAt)}</TableCell>
                  <TableCell>{coupon.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CouponFormDialog
                        coupon={{
                          id: coupon.id,
                          code: coupon.code,
                          description: coupon.description ?? "",
                          discountType: coupon.discountType,
                          value: toNumber(coupon.value),
                          minOrderAmount: coupon.minOrderAmount ? toNumber(coupon.minOrderAmount) : undefined,
                          maxDiscount: coupon.maxDiscount ? toNumber(coupon.maxDiscount) : undefined,
                          usageLimit: coupon.usageLimit ?? undefined,
                          perUserLimit: coupon.perUserLimit ?? undefined,
                          startsAt: coupon.startsAt,
                          endsAt: coupon.endsAt,
                          isActive: coupon.isActive,
                        }}
                        onSubmit={updateSellerCouponAction.bind(null, coupon.id)}
                      />
                      <DeleteEntityButton onDelete={deleteSellerCouponAction.bind(null, coupon.id)} entityLabel="coupon" />
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
