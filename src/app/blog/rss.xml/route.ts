import { plain, posts } from "@/content/blog";
import { SITE_NAME, SITE_URL } from "@/lib/env";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (d: string) => new Date(`${d}T00:00:00+05:30`).toUTCString();

/** RSS 2.0 feed of the guides, for readers and for discovery. */
export function GET() {
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${rfc822(p.datePublished)}</pubDate><category>${esc(p.category)}</category><description>${esc(plain(p.excerpt))}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(`${SITE_NAME} Blog`)}</title><link>${SITE_URL}/blog</link><description>Practical, sourced guides for patients and families using hospitals in India.</description><language>en-in</language><atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>${posts.length ? `<lastBuildDate>${rfc822(posts.reduce((m, p) => (p.dateModified > m ? p.dateModified : m), ""))}</lastBuildDate>` : ""}${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
