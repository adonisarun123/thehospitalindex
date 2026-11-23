import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "The Hospital Index: find the right hospital branch in India";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Site-wide default social preview; pages with their own image (blog posts) override it. */
export default function Image() {
  return ogCard({ eyebrow: "Hospital directory for India", title: "Find the right hospital branch, not just the brand" });
}
