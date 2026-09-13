import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import type { NotificationItem } from "@/components/layout/notifications-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

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
    <DashboardShell navGroups={ADMIN_NAV_GROUPS} title="Admin Dashboard" notifications={notificationItems} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  );
}
