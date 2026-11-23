import { badRequest, handler, notFound, ok } from "@/lib/api/respond";
import { getBranchCore, listReviews } from "@/lib/queries/profile";

/** §27 GET /hospitals/{id}/reviews: published native reviews only, keyset-paginated. */
export const GET = handler(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{6,12}$/.test(id)) return notFound(req, "Unknown hospital.");
  const sp = new URL(req.url).searchParams;
  for (const k of sp.keys()) if (k !== "cursor" && k !== "limit") return badRequest(req, `Unsupported query parameter: ${k}`);
  const limit = sp.get("limit");
  if (limit !== null && !/^[1-9][0-9]?$/.test(limit)) return badRequest(req, "limit must be an integer from 1 to 50.");
  const b = await getBranchCore(id);
  if (!b) return notFound(req, "Unknown hospital.");
  const page = await listReviews(b.id, { cursor: sp.get("cursor"), limit: limit ? Number(limit) : undefined });
  if (!page) return badRequest(req, "cursor is not valid.");
  return ok(req, { kind: "native" as const, label: "Visit evidence checked", count: b.reviewCount, items: page.items, next: page.next });
});
