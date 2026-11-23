import "server-only";
import { SITE_URL } from "@/lib/env";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iso = (d: string | null) => (d ? new Date(d).toISOString() : null);
const HEADERS = { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=300" };

export function urlset(entries: { path: string; lastmod: string | null }[]) {
  const body = entries
    .map((e) => `<url><loc>${esc(SITE_URL + e.path)}</loc>${e.lastmod ? `<lastmod>${iso(e.lastmod)}</lastmod>` : ""}</url>`)
    .join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: HEADERS });
}

export function sitemapIndex(entries: { path: string; lastmod: string | null }[]) {
  const body = entries
    .map((e) => `<sitemap><loc>${esc(SITE_URL + e.path)}</loc>${e.lastmod ? `<lastmod>${iso(e.lastmod)}</lastmod>` : ""}</sitemap>`)
    .join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`, { headers: HEADERS });
}
