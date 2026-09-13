"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Store, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";

export function MobileMenu({
  categories,
  isAuthenticated,
  role,
}: {
  categories: { id: string; name: string; slug: string }[];
  isAuthenticated: boolean;
  role?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-primary">{siteConfig.name}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4">
          <p className="mt-2 text-xs font-medium uppercase text-muted-foreground">Categories</p>
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-muted">
              {c.name}
            </Link>
          ))}
          <div className="my-2 border-t" />
          <Link href="/stores" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-muted">
            All Stores
          </Link>
          <Link href="/register/seller" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-primary hover:bg-muted">
            <Store className="size-4" /> Become a Seller
          </Link>
          {isAuthenticated && role === "SELLER" && (
            <Link href="/seller/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
              <LayoutDashboard className="size-4" /> Seller Dashboard
            </Link>
          )}
          {isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN") && (
            <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
              <LayoutDashboard className="size-4" /> Admin Dashboard
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
