import type { Metadata } from "next";
import { Download } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { href: "/api/admin/export/orders", label: "Orders" },
  { href: "/api/admin/export/products", label: "Products" },
  { href: "/api/admin/export/sellers", label: "Sellers" },
  { href: "/api/admin/export/customers", label: "Customers" },
  { href: "/api/admin/export/payouts", label: "Payouts" },
];

export default async function AdminReportsPage() {
  await requireAdmin();

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle className="text-base">Export Reports</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {REPORTS.map((report) => (
          <Button key={report.href} asChild variant="outline" className="w-full justify-between">
            <a href={report.href}>
              {report.label} CSV <Download className="size-4" />
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
