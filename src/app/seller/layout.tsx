import { Clock, XCircle, ShieldAlert } from "lucide-react";

import { requireSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SELLER_NAV_GROUPS } from "@/config/seller-nav";
import type { NotificationItem } from "@/components/layout/notifications-menu";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSeller();

  if (user.sellerStatus !== "APPROVED") {
    return <SellerStatusScreen status={user.sellerStatus ?? "PENDING"} />;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  const notificationItems: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <DashboardShell navGroups={SELLER_NAV_GROUPS} title="Seller Dashboard" notifications={notificationItems} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  );
}

function SellerStatusScreen({ status }: { status: string }) {
  const config = {
    PENDING: {
      icon: Clock,
      title: "Your seller application is under review",
      description: "Our team is reviewing your application. This usually takes 1-2 business days. We'll email you once it's approved.",
      color: "text-amber-500",
    },
    REJECTED: {
      icon: XCircle,
      title: "Your seller application was not approved",
      description: "Unfortunately your application didn't meet our requirements this time. Check your email for details.",
      color: "text-destructive",
    },
    SUSPENDED: {
      icon: ShieldAlert,
      title: "Your store has been suspended",
      description: "Your store is currently suspended by BazarX. Please contact support for more information.",
      color: "text-destructive",
    },
  }[status] ?? { icon: Clock, title: "Application status unknown", description: "", color: "text-muted-foreground" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <config.icon className={`mx-auto size-12 ${config.color}`} />
        <h1 className="mt-4 text-lg font-semibold">{config.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
      </div>
    </div>
  );
}
