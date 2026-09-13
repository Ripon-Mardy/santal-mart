import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/seller/", "/admin/", "/api/", "/checkout", "/cart", "/account/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
