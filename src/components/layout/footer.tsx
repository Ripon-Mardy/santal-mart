import Link from "next/link";

import { siteConfig } from "@/config/site";
import { NewsletterForm } from "@/components/layout/newsletter-form";

const FOOTER_LINKS = [
  {
    title: "Shop",
    links: [
      { href: "/search", label: "All Products" },
      { href: "/search?hasDiscount=true", label: "Deals" },
      { href: "/stores", label: "Stores" },
      { href: "/search?sort=newest", label: "New Arrivals" },
    ],
  },
  {
    title: "Sell on BazarX",
    links: [
      { href: "/register/seller", label: "Become a Seller" },
      { href: "/seller/dashboard", label: "Seller Dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/account/profile", label: "My Account" },
      { href: "/orders", label: "Order Tracking" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/account/security", label: "Account Security" },
      { href: "/account/addresses", label: "Addresses" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary">
              {siteConfig.name}
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{siteConfig.tagline}</p>
            <NewsletterForm />
          </div>
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p>Built as a demo multi-vendor marketplace.</p>
        </div>
      </div>
    </footer>
  );
}
