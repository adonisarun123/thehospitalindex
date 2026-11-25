import "server-only";
import { createElement as h, type ReactNode } from "react";
import Link from "next/link";
import { POLICY } from "@/lib/policy";
import { countIndexable, getTaxonBySlug, hasApprovedHubContent } from "@/lib/queries/branches";
import { citiesForTaxon, cityTaxonHubs, getHubStats } from "@/lib/queries/related";
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
    const [indexable, content, stats, siblings, otherPlaces] = await Promise.all([
      countIndexable({ scope: { settlementId: city.id }, ...key }),
      hasApprovedHubContent({
        geographyId: city.id,
        specialtyId: kind === "specialty" ? taxon.id : null,
        serviceId: kind === "service" ? taxon.id : null,
      }),
      getHubStats({ settlementId: city.id, ...(kind === "specialty" ? { specialtyId: taxon.id } : { serviceId: taxon.id }) }),
      cityTaxonHubs(city.id),
      citiesForTaxon(kind, taxon.id, city.id),
    ]);
    const otherHubs = siblings.filter((h) => !(h.kind === kind && h.slug === taxon.slug));
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
          summary: {
            stats,
            place: city.name,
            subject: kind === "specialty" ? `${taxon.name.toLowerCase()} hospital branches` : `hospital branches offering ${taxon.name.toLowerCase()}`,
          },
        },
        showFilters: { specialty: false, locality: false },
        fallbackLinks: [{ href: urls.city(s.state.slug, city.slug), label: `All hospitals in ${city.name}` }],
        extras: relatedHubs({
          cityName: city.name,
          stateSlug: s.state.slug,
          citySlug: city.slug,
          taxonName: taxon.name,
          taxonSlug: taxon.slug,
          kind,
          otherHubs,
          otherPlaces,
        }),
      },
    };
  });
}

/** Same city, other specialties; same specialty, other cities. Plain links: the two axes users actually move along. */
function relatedHubs(p: {
  cityName: string;
  stateSlug: string;
  citySlug: string;
  taxonName: string;
  taxonSlug: string;
  kind: "specialty" | "service";
  otherHubs: Awaited<ReturnType<typeof cityTaxonHubs>>;
  otherPlaces: Awaited<ReturnType<typeof citiesForTaxon>>;
}) {
  if (!p.otherHubs.length && !p.otherPlaces.length) return null;
  const item = (key: string, href: string, label: string, n: number) =>
    h("li", { key }, h(Link, { href, className: "link inline-flex min-h-11 items-center" }, label), " ", h("span", { className: "meta" }, `(${n})`));
  const nav = (id: string, title: string, items: ReactNode[]) =>
    h("nav", { "aria-labelledby": id }, h("h2", { id, className: "text-lg font-semibold" }, title), h("ul", { className: "mt-2 columns-1 gap-6 sm:columns-2" }, items));
  const label = p.kind === "specialty" ? `${p.taxonName} hospitals` : `Hospitals offering ${p.taxonName.toLowerCase()}`;
  return h(
    "div",
    { className: "mt-10 grid gap-8 md:grid-cols-2" },
    p.otherHubs.length
      ? nav(
          "other-taxa-h",
          `More care in ${p.cityName}`,
          p.otherHubs.map((x) =>
            item(
              `${x.kind}-${x.slug}`,
              x.kind === "specialty" ? urls.citySpecialty(p.stateSlug, p.citySlug, x.slug) : urls.cityService(p.stateSlug, p.citySlug, x.slug),
              x.kind === "specialty" ? `${x.name} hospitals` : `Hospitals offering ${x.name.toLowerCase()}`,
              x.published,
            ),
          ),
        )
      : null,
    p.otherPlaces.length
      ? nav(
          "other-places-h",
          `${label} in other cities`,
          p.otherPlaces.map((c) =>
            item(
              `${c.stateSlug}-${c.slug}`,
              p.kind === "specialty"
                ? urls.citySpecialty(c.stateSlug, c.slug, p.taxonSlug)
                : urls.cityService(c.stateSlug, c.slug, p.taxonSlug),
              `${c.name}, ${c.stateName}`,
              c.published,
            ),
          ),
        )
      : null,
  );
}
