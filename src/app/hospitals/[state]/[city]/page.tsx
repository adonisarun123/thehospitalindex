import Link from "next/link";
import { POLICY } from "@/lib/policy";
import { qualifyingTaxonHubs } from "@/lib/queries/branches";
import { countsFor, listLocalities } from "@/lib/queries/geo";
import { resolveChild, resolveState } from "@/lib/routes/geo";
import { buildListingRoute } from "@/lib/routes/listing-route";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

const route = buildListingRoute<{ state: string; city: string }>(async ({ state: stateSlug, city: citySlug }) => {
  const s = await resolveState(stateSlug);
  if (!s) return { kind: "missing" };
  if ("redirectStateSlug" in s) return { kind: "redirect", to: urls.city(s.redirectStateSlug, citySlug) };
  const c = await resolveChild("settlement", s.state.id, citySlug);
  if (!c) return { kind: "missing" };
  if ("redirectSlug" in c) return { kind: "redirect", to: urls.city(s.state.slug, c.redirectSlug) };

  const city = c.geo;
  const [counts, localities, hubs] = await Promise.all([countsFor(city), listLocalities(city.id), qualifyingTaxonHubs(city.id)]);
  const basePath = urls.city(s.state.slug, city.slug);
  return {
    kind: "ok",
    d: {
      basePath,
      heading: `Hospitals in ${city.name}`,
      title: `Hospitals in ${city.name}, ${s.state.name}: Specialties and Locations`,
      description: (total) =>
        `${total} hospital ${total === 1 ? "branch" : "branches"} in ${city.name}, ${s.state.name}. See sourced services, checked contact details and the date each fact was last confirmed.`,
      crumbs: [
        { name: "Hospitals in India", href: urls.country() },
        { name: s.state.name, href: urls.state(s.state.slug) },
        { name: city.name, href: basePath },
      ],
      input: { scope: { settlementId: city.id }, localityIdsBySlug: Object.fromEntries(localities.map((l) => [l.slug, l.id])) },
      hub: {
        indexableBranches: counts.indexable,
        minBranches: POLICY.index.geoHubMinBranches,
        context: city.hasReviewedContext ? { text: city.localContext! } : null,
      },
      showFilters: { specialty: true, locality: true },
      fallbackLinks: [{ href: urls.state(s.state.slug), label: `All of ${s.state.name}` }],
      extras:
        localities.length || hubs.length ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {localities.length ? (
              <nav aria-labelledby="localities-heading">
                <h2 id="localities-heading" className="text-lg font-semibold">
                  Neighbourhoods in {city.name}
                </h2>
                <ul className="mt-2 columns-2 gap-6">
                  {localities.map((l) => (
                    <li key={l.id}>
                      <Link href={urls.locality(s.state.slug, city.slug, l.slug)} className="link inline-flex min-h-11 items-center">
                        {l.name}
                      </Link>{" "}
                      <span className="meta">({l.published})</span>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {hubs.length ? (
              <nav aria-labelledby="hubs-heading">
                <h2 id="hubs-heading" className="text-lg font-semibold">
                  Find care in {city.name}
                </h2>
                <ul className="mt-2">
                  {hubs.map((h) => (
                    <li key={`${h.kind}-${h.slug}`}>
                      <Link
                        href={h.kind === "specialty" ? urls.citySpecialty(s.state.slug, city.slug, h.slug) : urls.cityService(s.state.slug, city.slug, h.slug)}
                        className="link inline-flex min-h-11 items-center"
                      >
                        {h.kind === "specialty" ? `${h.name} hospitals in ${city.name}` : `Hospitals offering ${h.name.toLowerCase()} in ${city.name}`}
                      </Link>{" "}
                      <span className="meta">({h.branches})</span>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        ) : null,
    },
  };
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
