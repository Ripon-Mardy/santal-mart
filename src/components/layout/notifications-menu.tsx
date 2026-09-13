"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/format";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions";
import { cn } from "cn";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationsMenu({ notifications, unreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={isPending}
              onClick={() => startTransition(async () => { await markAllNotificationsReadAction(); })}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} asChild className="cursor-pointer whitespace-normal">
                <Link
                  href={n.link ?? "#"}
                  onClick={() => {
                    if (!n.isRead) startTransition(async () => { await markNotificationReadAction(n.id); });
                  }}
                  className={cn("flex flex-col items-start gap-0.5 py-2", !n.isRead && "bg-accent/50")}
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                  <span className="text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
