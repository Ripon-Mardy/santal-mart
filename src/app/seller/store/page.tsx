import type { Metadata } from "next";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { StoreProfileForm } from "@/components/seller/store-profile-form";

export const metadata: Metadata = { title: "Store Profile" };

export default async function SellerStorePage() {
  const seller = await requireApprovedSeller();
  const store = await prisma.store.findUniqueOrThrow({ where: { sellerId: seller.sellerId } });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Store Profile</h1>
      <StoreProfileForm store={store} />
    </div>
  );
}
