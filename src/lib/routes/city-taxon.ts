import "server-only";
import { POLICY } from "@/lib/policy";
import { countIndexable, getTaxonBySlug, hasApprovedHubContent } from "@/lib/queries/branches";
import { resolveChild, resolveState, isSlug } from "@/lib/routes/geo";
import { buildListingRoute } from "@/lib/routes/listing-route";
import { urls } from "@/lib/urls";

/**
 * City-specialty and city-service hubs (§03, §20). The hub is keyed by a
 * verified taxonomy id, uses the same field as the search filter, and is
 * indexable only with five qualifying branches plus approved local guidance.
 */
export function buildCityTaxonRoute(kind: "specialty" | "service") {
  const path = kind === "specialty" ? urls.citySpecialty : urls.cityService;
  return buildListingRoute<{ state: string; city: string; specialty?: string; service?: string }>(async (p) => {
    const taxonSlug = (kind === "specialty" ? p.specialty : p.service) ?? "";
    const s = await resolveState(p.state);
    if (!s || !isSlug(taxonSlug)) return { kind: "missing" };
    if ("redirectStateSlug" in s) return { kind: "redirect", to: path(s.redirectStateSlug, p.city, taxonSlug) };
    const c = await resolveChild("settlement", s.state.id, p.city);
    if (!c) return { kind: "missing" };
    if ("redirectSlug" in c) return { kind: "redirect", to: path(s.state.slug, c.redirectSlug, taxonSlug) };
    const taxon = await getTaxonBySlug(kind, taxonSlug);
    if (!taxon) return { kind: "missing" };

    const city = c.geo;
    const key = kind === "specialty" ? { specialtyIds: [taxon.id] } : { serviceIds: [taxon.id] };
    const [indexable, content] = await Promise.all([
      countIndexable({ scope: { settlementId: city.id }, ...key }),
      hasApprovedHubContent({
        geographyId: city.id,
        specialtyId: kind === "specialty" ? taxon.id : null,
        serviceId: kind === "service" ? taxon.id : null,
      }),
    ]);
    const basePath = path(s.state.slug, city.slug, taxon.slug);
    const heading =
      kind === "specialty" ? `${taxon.name} hospitals in ${city.name}` : `Hospitals offering ${taxon.name.toLowerCase()} in ${city.name}`;
    return {
      kind: "ok",
      d: {
        basePath,
        heading,
        title: kind === "specialty" ? `${taxon.name} Hospitals in ${city.name}` : `Hospitals Offering ${taxon.name} in ${city.name}`,
        description: (total) =>
          `${total} hospital ${total === 1 ? "branch" : "branches"} in ${city.name} with a published ${taxon.name.toLowerCase()} ${
            kind === "specialty" ? "department" : "service"
          }, with the date each was last checked and an official contact route.`,
        crumbs: [
          { name: "Hospitals in India", href: urls.country() },
          { name: s.state.name, href: urls.state(s.state.slug) },
          { name: city.name, href: urls.city(s.state.slug, city.slug) },
          { name: taxon.name, href: basePath },
        ],
        input: {
          scope: { settlementId: city.id },
          ...(kind === "specialty" ? { lockedSpecialtyId: taxon.id } : { lockedServiceId: taxon.id }),
        },
        hub: {
          indexableBranches: indexable,
          minBranches: POLICY.index.taxonomyHubMinBranches,
          context: content ? { text: content.guidance, reviewedAt: content.reviewedAt, owner: content.editorialOwner } : null,
        },
        showFilters: { specialty: false, locality: false },
        fallbackLinks: [{ href: urls.city(s.state.slug, city.slug), label: `All hospitals in ${city.name}` }],
      },
    };
  });
}
