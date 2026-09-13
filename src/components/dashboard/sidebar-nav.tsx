"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

// `icon` is a pre-rendered element (e.g. `<Package className="size-4" />`),
// not a component reference — Server Components can only pass plain data or
// already-rendered elements to Client Components like this one, never raw
// function/component values (Lucide icons are function components, so
// passing `icon: Package` itself breaks the RSC boundary).
export type NavGroup = {
  title?: string;
  items: { href: string; label: string; icon: ReactNode }[];
};

export function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {groups.map((group, i) => (
        <div key={i}>
          {group.title && <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">{group.title}</p>}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.href === pathname || (item.href !== "/seller/dashboard" && item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
