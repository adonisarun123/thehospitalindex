import { z } from "zod";
import { badRequest, handler, ok } from "@/lib/api/respond";
import { POLICY } from "@/lib/policy";
import { suggestBranches, suggestTaxa } from "@/lib/queries/branches";
import { matchPlaces } from "@/lib/queries/geo";
import { urls } from "@/lib/urls";

const Query = z
  .object({ q: z.string().trim().min(POLICY.typeaheadMinChars).max(80), kind: z.enum(["what", "where"]).default("what") })
  .strict();

/** SRH-01: suggestions grouped as branches, specialties/services and places, each with its parent location. */
export const GET = handler(async (req) => {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(req, "q must be 2–80 characters; kind must be 'what' or 'where'.");
  const { q, kind } = parsed.data;

  if (kind === "where") {
    const places = await matchPlaces(q, 8);
    return ok(req, {
      items: places.map((p) => ({ group: "Places", label: p.name, sub: p.parentLabel, value: p.name, id: p.id, href: p.path })),
    });
  }
  const [taxa, branches] = await Promise.all([suggestTaxa(q, 5), suggestBranches(q, 5)]);
  return ok(req, {
    items: [
      ...taxa.map((t) => ({
        group: t.kind === "specialty" ? "Specialties" : "Services",
        label: t.name,
        sub: t.plainLabel,
        value: t.name,
      })),
      ...branches.map((b) => ({
        group: "Hospitals",
        label: b.qualifier ? `${b.name}, ${b.qualifier}` : b.name,
        sub: b.place,
        href: urls.branch(b.slug, b.publicId),
      })),
    ],
  });
});
