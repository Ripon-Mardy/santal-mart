export const siteConfig = {
  name: "BazarX",
  tagline: "One Marketplace. Thousands of Stores.",
  description:
    "BazarX is a modern multi-vendor marketplace where customers shop from thousands of independent stores, and sellers build their own storefront in minutes.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const NAV_CATEGORIES_LIMIT = 8;

export const CUSTOMER_NAV = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Categories" },
  { href: "/stores", label: "Stores" },
  { href: "/search?sort=newest", label: "New Arrivals" },
] as const;
