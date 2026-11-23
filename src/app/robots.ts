import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

/**
 * §22: robots.txt is an additional crawl control only. Pages that rely on
 * `noindex` (search, filtered views, thin hubs) are NOT disallowed here,
 * because a crawler must fetch a URL to see its noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account/", "/admin/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
