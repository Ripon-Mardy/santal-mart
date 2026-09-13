import type { Metadata } from "next";
import { Undo2 } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { getSellerReturns } from "@/features/seller/order-queries";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { SellerReturnActions } from "@/components/seller/return-actions";
import { formatStatus } from "@/lib/format";

export const metadata: Metadata = { title: "Returns" };

export default async function SellerReturnsPage({ searchParams }: PageProps<"/seller/returns">) {
  const seller = await requireApprovedSeller();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const result = await getSellerReturns(seller.sellerId, params);

  if (result.items.length === 0) {
    return <EmptyState icon={Undo2} title="No return requests" description="Customer return requests will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {result.items.map((rr) => (
          <div key={rr.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div className="text-sm">
              <p className="font-medium">{rr.orderItem.productName}</p>
              <p className="text-muted-foreground">{rr.sellerOrder.subOrderNumber} · {rr.user.name} · {formatDate(rr.requestedAt)}</p>
              <p className="text-muted-foreground">Reason: {formatStatus(rr.reason)}{rr.description ? ` — ${rr.description}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={rr.status} />
              {rr.status === "REQUESTED" && <SellerReturnActions returnRequestId={rr.id} />}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <PaginationBar page={result.page} totalPages={result.totalPages} basePath="/seller/returns" />
      </div>
    </div>
  );
}
