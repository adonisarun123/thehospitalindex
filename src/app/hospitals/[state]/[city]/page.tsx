import Link from "next/link";
import { POLICY } from "@/lib/policy";
import { countsFor, listLocalities } from "@/lib/queries/geo";
import { cityTaxonHubs, getHubStats, otherCities } from "@/lib/queries/related";
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
  const [counts, localities, hubs, stats, nearby] = await Promise.all([
    countsFor(city),
    listLocalities(city.id),
    cityTaxonHubs(city.id),
    getHubStats({ settlementId: city.id }),
    otherCities(s.state.id, city.id),
  ]);
  const hubSlugs = new Set(hubs.filter((h) => h.kind === "specialty").map((h) => h.slug));
  const specialtyHubs = hubs.filter((h) => h.kind === "specialty");
  const serviceHubs = hubs.filter((h) => h.kind === "service");
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
        summary: {
          stats,
          place: city.name,
          specialtyHref: (slug) => (hubSlugs.has(slug) ? urls.citySpecialty(s.state.slug, city.slug, slug) : null),
        },
      },
      showFilters: { specialty: true, locality: true },
      fallbackLinks: [{ href: urls.state(s.state.slug), label: `All of ${s.state.name}` }],
      extras: (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {specialtyHubs.length ? (
            <nav aria-labelledby="spec-hubs-heading">
              <h2 id="spec-hubs-heading" className="text-lg font-semibold">
                Hospitals in {city.name} by specialty
              </h2>
              <ul className="mt-2 columns-1 gap-6 sm:columns-2">
                {specialtyHubs.map((h) => (
                  <li key={h.slug}>
                    <Link href={urls.citySpecialty(s.state.slug, city.slug, h.slug)} className="link inline-flex min-h-11 items-center">
                      {h.name} hospitals in {city.name}
                    </Link>{" "}
                    <span className="meta">({h.published})</span>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {serviceHubs.length ? (
            <nav aria-labelledby="svc-hubs-heading">
              <h2 id="svc-hubs-heading" className="text-lg font-semibold">
                Services in {city.name}
              </h2>
              <ul className="mt-2">
                {serviceHubs.map((h) => (
                  <li key={h.slug}>
                    <Link href={urls.cityService(s.state.slug, city.slug, h.slug)} className="link inline-flex min-h-11 items-center">
                      Hospitals offering {h.name.toLowerCase()} in {city.name}
                    </Link>{" "}
                    <span className="meta">({h.published})</span>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
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
          {nearby.length ? (
            <nav aria-labelledby="other-cities-heading">
              <h2 id="other-cities-heading" className="text-lg font-semibold">
                Other cities in {s.state.name}
              </h2>
              <ul className="mt-2 columns-2 gap-6">
                {nearby.map((c) => (
                  <li key={c.slug}>
                    <Link href={urls.city(c.stateSlug, c.slug)} className="link inline-flex min-h-11 items-center">
                      {c.name}
                    </Link>{" "}
                    <span className="meta">({c.published})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                <Link href={urls.state(s.state.slug)} className="link inline-flex min-h-11 items-center">
                  All of {s.state.name}
                </Link>
              </p>
            </nav>
          ) : null}
        </div>
      ),
    },
  };
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
