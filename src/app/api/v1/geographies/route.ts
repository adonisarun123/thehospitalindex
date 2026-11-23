import { z } from "zod";
import { badRequest, handler, notFound, ok } from "@/lib/api/respond";
import { getGeoById, listPlacesInState, listStates, matchPlaces } from "@/lib/queries/geo";

const Query = z
  .object({
    parent: z.uuid().optional(),
    kind: z.enum(["state", "district", "settlement"]).optional(),
    q: z.string().trim().min(2).max(80).optional(),
    locale: z.literal("en").optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

/** §27: grouped ids, names, parents and published counts. Unknown parent → 404. */
export const GET = handler(async (req) => {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(req, "Unsupported or invalid query parameter.", z.flattenError(parsed.error).fieldErrors as never);
  const { parent, kind, q, limit } = parsed.data;

  if (q) {
    const items = await matchPlaces(q, limit ?? 8);
    return ok(req, { items: items.map(({ id, kind, name, parentLabel, path }) => ({ id, kind, name, parent: parentLabel, path })) });
  }
  if (parent) {
    const p = await getGeoById(parent);
    if (!p || !["state", "union_territory"].includes(p.kind)) return notFound(req, "Unknown geography.");
    const items = await listPlacesInState(p.id, kind === "district" ? "district" : "settlement");
    return ok(req, { items: items.slice(0, limit ?? 50).map((g) => ({ id: g.id, kind: g.kind, name: g.name, slug: g.slug, published: g.published })) });
  }
  const states = await listStates();
  return ok(req, { items: states.map((g) => ({ id: g.id, kind: g.kind, name: g.name, slug: g.slug, published: g.published })) });
});
