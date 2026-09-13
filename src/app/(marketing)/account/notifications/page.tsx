import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "cn";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Notifications</h1>
      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications yet" description="We'll let you know about order updates, deals, and more." />
      ) : (
        <div className="divide-y rounded-xl border">
          {notifications.map((n) => (
            <Link key={n.id} href={n.link ?? "#"} className={cn("block p-4 hover:bg-muted/50", !n.isRead && "bg-accent/40")}>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
