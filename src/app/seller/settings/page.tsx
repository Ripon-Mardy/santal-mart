import type { Metadata } from "next";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { ShippingZonesManager } from "@/components/seller/shipping-zones-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Store Settings" };

export default async function SellerSettingsPage() {
  const seller = await requireApprovedSeller();
  const zones = await prisma.shippingZone.findMany({ where: { sellerId: seller.sellerId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">Store Settings</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Shipping Zones</CardTitle></CardHeader>
        <CardContent>
          <ShippingZonesManager zones={zones.map((z) => ({ id: z.id, name: z.name, division: z.division, city: z.city, flatRate: toNumber(z.flatRate) }))} />
        </CardContent>
      </Card>
    </div>
  );
}
