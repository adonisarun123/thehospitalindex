import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { hubIsIndexable } from "@/lib/gates";
import { POLICY } from "@/lib/policy";
import { countsFor, listPlacesInState } from "@/lib/queries/geo";
import { resolveState } from "@/lib/routes/geo";
import { abs, breadcrumbLd } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ state: string }> };

async function run(props: Props) {
  const { state: slug } = await props.params;
  const r = await resolveState(slug);
  if (!r) notFound();
  if ("redirectStateSlug" in r) permanentRedirect(urls.state(r.redirectStateSlug));
  return r.state;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const state = await run(props);
  const counts = await countsFor(state);
  return {
    title: `Hospitals in ${state.name} by City and District`,
    description: `Browse ${counts.published} published hospital ${counts.published === 1 ? "branch" : "branches"} in ${state.name} by city, town and district.`,
    alternates: { canonical: abs(urls.state(state.slug)) },
    // GEO-03: a location with no (or too little) published inventory is visible to people but kept out of the index.
    robots: {
      index: hubIsIndexable({
        indexableBranches: counts.indexable,
        minBranches: POLICY.index.geoHubMinBranches,
        hasReviewedContext: state.hasReviewedContext,
      }),
      follow: true,
    },
  };
}

export default async function StatePage(props: Props) {
  const state = await run(props);
  const [counts, cities, districts] = await Promise.all([
    countsFor(state),
    listPlacesInState(state.id, "settlement"),
    listPlacesInState(state.id, "district"),
  ]);
  const crumbs: Crumb[] = [
    { name: "Hospitals in India", href: urls.country() },
    { name: state.name, href: urls.state(state.slug) },
  ];
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">Hospitals in {state.name}</h1>
      {state.hasReviewedContext ? <p className="mt-3 max-w-3xl">{state.localContext}</p> : null}

      {counts.published === 0 ? (
        <div className="card mt-6 max-w-3xl p-6">
          <p className="font-semibold">We have not published any hospital branches in {state.name} yet.</p>
          <p className="mt-2">
            This is a gap in directory coverage, not a statement that there are no hospitals here. Branches appear once their identity, address and
            a contact route have been checked against a source.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5">
            <li>
              <Link href={urls.country()} className="link inline-flex min-h-11 items-center">
                All states and union territories
              </Link>
            </li>
            <li>
              <Link href="/coverage" className="link inline-flex min-h-11 items-center">
                About directory coverage
              </Link>
            </li>
            <li>
              <Link href="/corrections" className="link inline-flex min-h-11 items-center">
                Suggest a hospital
              </Link>
            </li>
          </ul>
        </div>
      ) : (
        <>
          <p className="meta mt-2">
            {counts.published} published {counts.published === 1 ? "branch" : "branches"} · directory coverage, not the total number of hospitals in{" "}
            {state.name}.
          </p>
          <section aria-labelledby="cities-h" className="mt-8">
            <h2 id="cities-h" className="text-2xl font-semibold">
              Cities, towns and villages
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cities.map((c) => (
                <li key={c.id}>
                  <Link href={urls.city(state.slug, c.slug)} className="card flex min-h-16 items-center justify-between gap-3 p-4 text-ink no-underline hover:border-teal">
                    <span className="font-semibold">{c.name}</span>
                    <span className="meta">{c.published}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {districts.length > 0 ? (
            <section aria-labelledby="districts-h" className="mt-8">
              <h2 id="districts-h" className="text-2xl font-semibold">
                Browse by district
              </h2>
              <ul className="mt-3 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                {districts.map((d) => (
                  <li key={d.id} className="border-b border-line">
                    <Link href={urls.district(state.slug, d.slug)} className="flex min-h-11 items-center justify-between gap-3 py-2 text-ink hover:text-teal">
                      <span className="font-medium">{d.name}</span>
                      <span className="meta">{d.published}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
