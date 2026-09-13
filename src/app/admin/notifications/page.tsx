import type { Metadata } from "next";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { BellOff } from "lucide-react";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const user = await requireAdmin();
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });

  if (notifications.length === 0) return <EmptyState icon={BellOff} title="No notifications" />;

  return (
    <div className="divide-y rounded-xl border bg-card">
      {notifications.map((n) => (
        <div key={n.id} className="p-4">
          <p className="text-sm font-medium">{n.title}</p>
          <p className="text-sm text-muted-foreground">{n.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
