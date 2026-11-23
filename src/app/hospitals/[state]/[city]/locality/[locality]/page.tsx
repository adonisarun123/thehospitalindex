import { POLICY } from "@/lib/policy";
import { countsFor } from "@/lib/queries/geo";
import { resolveChild, resolveLocality, resolveState } from "@/lib/routes/geo";
import { buildListingRoute } from "@/lib/routes/listing-route";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

const route = buildListingRoute<{ state: string; city: string; locality: string }>(async (p) => {
  const s = await resolveState(p.state);
  if (!s) return { kind: "missing" };
  if ("redirectStateSlug" in s) return { kind: "redirect", to: urls.locality(s.redirectStateSlug, p.city, p.locality) };
  const c = await resolveChild("settlement", s.state.id, p.city);
  if (!c) return { kind: "missing" };
  if ("redirectSlug" in c) return { kind: "redirect", to: urls.locality(s.state.slug, c.redirectSlug, p.locality) };
  const locality = await resolveLocality(c.geo.id, p.locality);
  if (!locality) return { kind: "missing" };

  const counts = await countsFor(locality);
  const basePath = urls.locality(s.state.slug, c.geo.slug, locality.slug);
  return {
    kind: "ok",
    d: {
      basePath,
      heading: `Hospitals in ${locality.name}, ${c.geo.name}`,
      title: `Hospitals in ${locality.name}, ${c.geo.name}`,
      description: (total) =>
        `${total} hospital ${total === 1 ? "branch" : "branches"} located in ${locality.name}, ${c.geo.name}, with sourced services and checked contact details.`,
      crumbs: [
        { name: "Hospitals in India", href: urls.country() },
        { name: s.state.name, href: urls.state(s.state.slug) },
        { name: c.geo.name, href: urls.city(s.state.slug, c.geo.slug) },
        { name: locality.name, href: basePath },
      ],
      input: { scope: { localityId: locality.id } },
      // SEO-01: a locality hub needs five qualifying branches and distinct local guidance.
      hub: {
        indexableBranches: counts.indexable,
        minBranches: POLICY.index.taxonomyHubMinBranches,
        context: locality.hasReviewedContext ? { text: locality.localContext! } : null,
      },
      fallbackLinks: [{ href: urls.city(s.state.slug, c.geo.slug), label: `All of ${c.geo.name}` }],
    },
  };
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
