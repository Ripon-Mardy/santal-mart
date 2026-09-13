import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartItemCount } from "@/features/cart/queries";
import { SearchBar } from "@/components/layout/search-bar";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsMenu, type NotificationItem } from "@/components/layout/notifications-menu";
import { CartCountHydrator, CartLink } from "@/components/layout/cart-link";
import { CategoryNav } from "@/components/layout/category-nav";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { siteConfig } from "@/config/site";

export async function Navbar() {
  const session = await auth();

  const [itemCount, notifications, unreadCount, categories] = await Promise.all([
    session?.user ? getCartItemCount(session.user.id) : Promise.resolve(0),
    session?.user
      ? prisma.notification.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    session?.user ? prisma.notification.count({ where: { userId: session.user.id, isRead: false } }) : Promise.resolve(0),
    prisma.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { sortOrder: "asc" }, take: 8, select: { id: true, name: true, slug: true } }),
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
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <CartCountHydrator initialCount={itemCount} />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <MobileMenu categories={categories} isAuthenticated={!!session?.user} role={session?.user?.role} />
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-primary">
          {siteConfig.name}
        </Link>
        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-1">
          {session?.user && <NotificationsMenu notifications={notificationItems} unreadCount={unreadCount} />}
          <CartLink />
          <UserMenu />
        </div>
      </div>
      <div className="border-t md:block">
        <div className="mx-auto hidden max-w-7xl gap-6 px-4 py-2 md:flex">
          <CategoryNav categories={categories} />
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
