import { branchShards, hubsLastmod } from "@/lib/queries/sitemap";
import { sitemapIndex } from "@/lib/sitemap-xml";
import { lastModified } from "@/content/blog";

export const dynamic = "force-dynamic";

/** SEO-06: a sitemap index with stable shards by template and geography. */
export async function GET() {
  const [shards, hubs] = await Promise.all([branchShards(), hubsLastmod()]);
  return sitemapIndex([
    { path: "/sitemaps/static.xml", lastmod: null },
    { path: "/sitemaps/hubs.xml", lastmod: hubs },
    { path: "/sitemaps/blog.xml", lastmod: lastModified() || null },
    ...shards.map((s) => ({ path: `/sitemaps/branches-${s.slug}.xml`, lastmod: s.lastmod })),
  ]);
}
