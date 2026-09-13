import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

// Generated on-demand rather than baked into the production build, so a
// deploy never fails just because the database wasn't reachable at build
// time — and the sitemap stays fresh as products/categories/stores change.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, stores] = await Promise.all([
    prisma.product.findMany({ where: { status: "APPROVED", isPublished: true }, select: { slug: true, updatedAt: true }, take: 5000 }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.store.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = ["", "/search", "/stores", "/login", "/register", "/register/seller"].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
  }));

  return [
    ...staticRoutes,
    ...products.map((p) => ({ url: `${siteConfig.url}/products/${p.slug}`, lastModified: p.updatedAt })),
    ...categories.map((c) => ({ url: `${siteConfig.url}/category/${c.slug}`, lastModified: c.updatedAt })),
    ...stores.map((s) => ({ url: `${siteConfig.url}/stores/${s.slug}`, lastModified: s.updatedAt })),
  ];
}
