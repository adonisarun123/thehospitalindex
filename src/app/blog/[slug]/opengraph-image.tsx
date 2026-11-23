import { getPost, posts } from "@/content/blog";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "The Hospital Index guide";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamicParams = false;
export const generateStaticParams = () => posts.map((p) => ({ slug: p.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  return ogCard({ eyebrow: p?.category ?? "Guide", title: p?.title ?? "The Hospital Index" });
}
