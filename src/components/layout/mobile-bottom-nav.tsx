"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shapes, Search, ShoppingCart, User } from "lucide-react";

import { cn } from "cn";
import { useCartStore } from "@/stores/cart-store";
import { Badge } from "@/components/ui/badge";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Categories", icon: Shapes },
  { href: "/search?focus=1", label: "Search", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/account/profile", label: "Account", icon: User },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t bg-background/95 backdrop-blur md:hidden">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="size-5" />
            {item.label}
            {item.label === "Cart" && itemCount > 0 && (
              <Badge className="absolute right-4 top-1 flex size-4 items-center justify-center rounded-full p-0 text-[9px]">
                {itemCount > 9 ? "9+" : itemCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
