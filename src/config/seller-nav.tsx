import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Boxes,
  ShoppingCart,
  Undo2,
  Users,
  Ticket,
  Store,
  Settings,
  LineChart,
  Wallet,
  Star,
} from "lucide-react";

import type { NavGroup } from "@/components/dashboard/sidebar-nav";

const ICON_CLASS = "size-4 shrink-0";

export const SELLER_NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/seller/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ICON_CLASS} /> }] },
  {
    title: "Catalog",
    items: [
      { href: "/seller/products", label: "Products", icon: <Package className={ICON_CLASS} /> },
      { href: "/seller/products/new", label: "Add Product", icon: <PackagePlus className={ICON_CLASS} /> },
      { href: "/seller/inventory", label: "Inventory", icon: <Boxes className={ICON_CLASS} /> },
    ],
  },
  {
    title: "Orders",
    items: [
      { href: "/seller/orders", label: "Orders", icon: <ShoppingCart className={ICON_CLASS} /> },
      { href: "/seller/returns", label: "Returns", icon: <Undo2 className={ICON_CLASS} /> },
    ],
  },
  { title: "Customers", items: [{ href: "/seller/customers", label: "Customers", icon: <Users className={ICON_CLASS} /> }] },
  { title: "Marketing", items: [{ href: "/seller/coupons", label: "Coupons", icon: <Ticket className={ICON_CLASS} /> }] },
  {
    title: "Store",
    items: [
      { href: "/seller/store", label: "Store Profile", icon: <Store className={ICON_CLASS} /> },
      { href: "/seller/settings", label: "Store Settings", icon: <Settings className={ICON_CLASS} /> },
    ],
  },
  { title: "Analytics", items: [{ href: "/seller/analytics", label: "Analytics", icon: <LineChart className={ICON_CLASS} /> }] },
  {
    title: "Finance",
    items: [
      { href: "/seller/payouts", label: "Earnings & Payouts", icon: <Wallet className={ICON_CLASS} /> },
    ],
  },
  { title: "Reviews", items: [{ href: "/seller/reviews", label: "Reviews", icon: <Star className={ICON_CLASS} /> }] },
];
