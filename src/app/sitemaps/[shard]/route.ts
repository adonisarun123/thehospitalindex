import { branchUrls, hubUrls } from "@/lib/queries/sitemap";
import { lastModified, posts } from "@/content/blog";
import { urlset } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";

/** Indexable, canonical URLs only. Trust pages still awaiting sign-off (privacy, grievance, corrections) are excluded. */
const STATIC = ["/", "/hospitals", "/how-reviews-work", "/sources", "/coverage", "/about", "/editorial-policy", "/medical-disclaimer", "/glossary", "/faq"];

export async function GET(_req: Request, ctx: { params: Promise<{ shard: string }> }) {
  const { shard } = await ctx.params;
  if (shard === "static.xml") return urlset(STATIC.map((path) => ({ path: path === "/" ? "" : path, lastmod: null })));
  if (shard === "blog.xml")
    return urlset([
      { path: "/blog", lastmod: lastModified() || null },
      ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.dateModified })),
    ]);
  if (shard === "hubs.xml") return urlset(await hubUrls());
  const m = /^branches-([a-z0-9-]+)\.xml$/.exec(shard);
  if (m) {
    const urls = await branchUrls(m[1]);
    if (urls.length) return urlset(urls);
  }
  return new Response("Not found", { status: 404 });
}
