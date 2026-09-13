"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsMenu, type NotificationItem } from "@/components/layout/notifications-menu";
import { SidebarNav, type NavGroup } from "@/components/dashboard/sidebar-nav";
import { siteConfig } from "@/config/site";

export function DashboardShell({
  navGroups,
  title,
  notifications,
  unreadCount,
  children,
}: {
  navGroups: NavGroup[];
  title: string;
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground md:block">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-white">{siteConfig.name}</Link>
        </div>
        <div className="px-3 py-4">
          <SidebarNav groups={navGroups} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground [&_button]:text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle className="text-white">{siteConfig.name}</SheetTitle>
          </SheetHeader>
          <div className="px-3 py-2">
            <SidebarNav groups={navGroups} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href="/"><ArrowLeft className="size-4" /> Marketplace</Link>
          </Button>
          <NotificationsMenu notifications={notifications} unreadCount={unreadCount} />
          <UserMenu />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
