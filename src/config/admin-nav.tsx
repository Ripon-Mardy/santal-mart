import {
  LayoutDashboard,
  Package,
  Shapes,
  Tag,
  Store,
  UserCog,
  Users,
  ShoppingCart,
  Undo2,
  CreditCard,
  Percent,
  Wallet,
  Ticket,
  Image as ImageIcon,
  Star,
  BarChart3,
  FileBarChart,
  ScrollText,
  Settings,
} from "lucide-react";

import type { NavGroup } from "@/components/dashboard/sidebar-nav";

const ICON_CLASS = "size-4 shrink-0";

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ICON_CLASS} /> }] },
  {
    title: "Marketplace",
    items: [
      { href: "/admin/products", label: "Products", icon: <Package className={ICON_CLASS} /> },
      { href: "/admin/categories", label: "Categories", icon: <Shapes className={ICON_CLASS} /> },
      { href: "/admin/brands", label: "Brands", icon: <Tag className={ICON_CLASS} /> },
      { href: "/admin/stores", label: "Stores", icon: <Store className={ICON_CLASS} /> },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/admin/users", label: "Customers & Admins", icon: <UserCog className={ICON_CLASS} /> },
      { href: "/admin/sellers", label: "Sellers", icon: <Users className={ICON_CLASS} /> },
    ],
  },
  {
    title: "Orders",
    items: [
      { href: "/admin/orders", label: "All Orders", icon: <ShoppingCart className={ICON_CLASS} /> },
      { href: "/admin/refunds", label: "Refunds", icon: <Undo2 className={ICON_CLASS} /> },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", icon: <CreditCard className={ICON_CLASS} /> },
      { href: "/admin/commissions", label: "Commissions", icon: <Percent className={ICON_CLASS} /> },
      { href: "/admin/payouts", label: "Payouts", icon: <Wallet className={ICON_CLASS} /> },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/coupons", label: "Coupons", icon: <Ticket className={ICON_CLASS} /> },
      { href: "/admin/banners", label: "Banners", icon: <ImageIcon className={ICON_CLASS} /> },
    ],
  },
  { title: "Content", items: [{ href: "/admin/reviews", label: "Reviews", icon: <Star className={ICON_CLASS} /> }] },
  {
    title: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Overview", icon: <BarChart3 className={ICON_CLASS} /> },
      { href: "/admin/reports", label: "Reports", icon: <FileBarChart className={ICON_CLASS} /> },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/audit-logs", label: "Audit Logs", icon: <ScrollText className={ICON_CLASS} /> },
      { href: "/admin/settings", label: "Settings", icon: <Settings className={ICON_CLASS} /> },
    ],
  },
];
