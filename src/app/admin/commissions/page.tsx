import type { Metadata } from "next";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { getGlobalCommissionRate } from "@/services/commission.service";
import { GlobalCommissionForm } from "@/components/admin/global-commission-form";
import { CommissionInput } from "@/components/admin/commission-input";
import { setCategoryCommissionAction } from "@/features/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Commissions" };

export default async function AdminCommissionsPage() {
  await requireAdmin();

  const [globalRate, categories] = await Promise.all([
    getGlobalCommissionRate(),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" }, include: { commission: true } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Global Commission Rate</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">Applied to every sale unless a category or seller-specific rate overrides it.</p>
          <GlobalCommissionForm initialRate={globalRate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Category Commission Overrides</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <p className="text-sm font-medium">{cat.name}</p>
              <CommissionInput initialRate={cat.commission ? toNumber(cat.commission.rate) : null} onSave={setCategoryCommissionAction.bind(null, cat.id)} placeholder={`${globalRate}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Seller-specific overrides take priority over category rates and can be set from each seller&apos;s detail page.</p>
    </div>
  );
}
