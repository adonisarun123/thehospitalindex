import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ListingView } from "@/components/listing-view";
import { SearchBox } from "@/components/search-box";
import { loadListing, type SearchParams } from "@/lib/listing";
import type { ListFilters } from "@/lib/queries/branches";
import { parentSpecialties } from "@/lib/queries/branches";
import { getGeoById, matchPlaces, type Geo } from "@/lib/queries/geo";
import { PINCODE_RE } from "@/lib/text";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<SearchParams> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function scopeFor(geo: Geo): NonNullable<ListFilters["scope"]> {
  switch (geo.kind) {
    case "state":
    case "union_territory":
      return { stateId: geo.id };
    case "district":
      return { districtId: geo.id };
    case "settlement":
      return { settlementId: geo.id };
    case "locality":
      return { localityId: geo.id };
    default:
      return {};
  }
}

const load = cache(async (spKey: string) => {
  const sp = JSON.parse(spKey) as SearchParams;
  const where = first(sp.where)?.slice(0, 80);
  const geoId = first(sp.geo);

  // SRH-01: a selected place resolves to its stable id; typed text falls back to an exact name, alias or PIN.
  let place: { label: string; scope: NonNullable<ListFilters["scope"]> } | null = null;
  let unresolved = false;
  let alternatives: Awaited<ReturnType<typeof matchPlaces>> = [];
  if (geoId && UUID.test(geoId)) {
    const geo = await getGeoById(geoId);
    if (geo) place = { label: geo.name, scope: scopeFor(geo) };
  }
  if (!place && where) {
    if (PINCODE_RE.test(where)) {
      place = { label: `PIN ${where}`, scope: { pincode: where } };
    } else {
      alternatives = await matchPlaces(where, 6);
      const exact = alternatives.find((a) => a.name.toLowerCase() === where.toLowerCase()) ?? (alternatives.length === 1 ? alternatives[0] : undefined);
      if (exact) {
        const geo = await getGeoById(exact.id);
        if (geo) place = { label: [exact.name, exact.parentLabel].filter(Boolean).join(", "), scope: scopeFor(geo) };
      } else unresolved = true;
    }
  }
  const listing = await loadListing({ scope: place?.scope, allowQuery: true }, sp);
  const service = listing.result.matchedTaxa.find((t) => t.kind === "service");
  const broader = service ? await parentSpecialties(service.id) : [];
  return { listing, place, where, unresolved, alternatives, service, broader };
});

/** §22: internal search results are shareable but always kept out of the index. */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const sp = await props.searchParams;
  const q = first(sp.q);
  return { title: q ? `Search results for “${q.slice(0, 60)}”` : "Search hospitals", robots: { index: false, follow: true } };
}

export default async function SearchPage(props: Props) {
  const sp = await props.searchParams;
  const { listing, place, where, unresolved, alternatives, service, broader } = await load(JSON.stringify(sp));
  if (!listing.valid) notFound();
  const q = listing.selected.q;
  const heading = q ? `Results for “${q}”${place ? ` in ${place.label}` : ""}` : place ? `Hospitals in ${place.label}` : "Search hospitals";

  return (
    <ListingView
      basePath="/search"
      heading={heading}
      crumbs={[{ name: "Search", href: "/search" }]}
      listing={listing}
      fallbackLinks={[{ href: urls.country(), label: "Browse by state" }]}
      top={
        <div className="mt-4 max-w-4xl">
          <SearchBox q={q} where={where} geo={listing.query.get("geo") ?? undefined} />
          {unresolved ? (
            <div role="status" className="mt-3 rounded-lg border border-line bg-amber-tint p-3 text-amber-ink">
              <p className="font-semibold">We could not match “{where}” to a place, so these results cover all of India.</p>
              {alternatives.length ? (
                <ul className="mt-1 flex flex-wrap gap-x-4">
                  {alternatives.map((a) => (
                    <li key={a.id}>
                      <Link href={urls.search({ q, where: a.name, geo: a.id })} rel="nofollow" className="link inline-flex min-h-11 items-center">
                        {a.name}
                        {a.parentLabel ? `, ${a.parentLabel}` : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {service && broader.length ? (
            <p className="meta mt-3">
              Results show branches with a published {service.name.toLowerCase()} service. Broader suggestion:{" "}
              {broader.map((s, i) => (
                <span key={s.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={urls.search({ q: s.name, where, geo: listing.query.get("geo") ?? undefined })} rel="nofollow" className="link">
                    hospitals with a {s.name.toLowerCase()} department
                  </Link>
                </span>
              ))}{" "}
              (these may not offer {service.name.toLowerCase()}).
            </p>
          ) : null}
        </div>
      }
    />
  );
}
