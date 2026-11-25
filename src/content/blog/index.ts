import type { Block, Post } from "@/content/types";
import { post as admission } from "./admission";
import { post as beforeSurgery } from "./before-surgery";
import { post as branch } from "./branch";
import { post as cashless } from "./cashless";
import { post as choose } from "./choose-hospital-branch";
import { post as emergency } from "./emergency";
import { post as nabh } from "./nabh";
import { post as pmjay } from "./pmjay";
import { post as records } from "./records";
import { post as reimbursement } from "./reimbursement";
import { post as reviews } from "./reviews";
import { post as rights } from "./rights";
import { post as roomRent } from "./room-rent";
import { post as terms } from "./terms";
import { post as unpaidBill } from "./unpaid-bill";

const ALL: Post[] = [choose, emergency, cashless, pmjay, rights, records, nabh, admission, branch, reviews, terms, roomRent, reimbursement, unpaidBill, beforeSurgery];

/** Newest first; ties keep the editorial order above. */
export const posts: Post[] = [...ALL].sort((a, b) => b.datePublished.localeCompare(a.datePublished));

const bySlug = new Map(posts.map((p) => [p.slug, p]));

export const getPost = (slug: string) => bySlug.get(slug);

export function relatedPosts(p: Post): Post[] {
  return p.related.map((s) => bySlug.get(s)).filter((x): x is Post => Boolean(x));
}

/** Plain text with inline marks removed, for word counts, feeds and llms.txt. */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

function blockText(b: Block): string {
  if (b.type === "ul" || b.type === "ol") return b.items.join(" ");
  if (b.type === "callout") return `${b.title ?? ""} ${b.text}`;
  return b.text;
}

export function wordCount(p: Post): number {
  const text = [p.summary, ...p.body.map(blockText), ...(p.faqs ?? []).flatMap((f) => [f.q, f.a])].map(plain).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

/** About 200 words a minute: a cautious pace for health reading. */
export const readingMinutes = (p: Post) => Math.max(1, Math.round(wordCount(p) / 200));

export const lastModified = () => posts.reduce((m, p) => (p.dateModified > m ? p.dateModified : m), "");

/** Fails the build if a related slug or an internal /blog link points nowhere. */
export function brokenLinks(): string[] {
  const out: string[] = [];
  for (const p of posts) {
    for (const r of p.related) if (!bySlug.has(r)) out.push(`${p.slug}: related → ${r}`);
    const texts = [p.summary, ...p.body.map(blockText), ...(p.faqs ?? []).map((f) => f.a)];
    for (const t of texts)
      for (const m of t.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)) if (!bySlug.has(m[1])) out.push(`${p.slug}: link → /blog/${m[1]}`);
  }
  return out;
}
