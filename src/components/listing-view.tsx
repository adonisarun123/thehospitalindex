import Link from "next/link";
import { BranchCard } from "@/components/branch-card";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { Filters } from "@/components/filters";
import { JsonLd } from "@/components/json-ld";
import { Pagination } from "@/components/pagination";
import type { Listing } from "@/lib/listing";
import { breadcrumbLd, collectionLd } from "@/lib/schema-org";
import { withPage } from "@/lib/urls";

export type ListingViewProps = {
  basePath: string;
  heading: string;
  crumbs: Crumb[];
  listing: Listing;
  /** Reviewed local context or hub guidance; shown only when it exists. */
  context?: { text: string; reviewedAt?: string | null; owner?: string | null } | null;
  showFilters?: { specialty: boolean; locality: boolean };
  /** Links shown under an empty result (SRH-07): parent and adjacent locations. */
  fallbackLinks?: { href: string; label: string }[];
  /** Extra navigation rendered under the results (localities, specialty hubs). */
  children?: React.ReactNode;
  top?: React.ReactNode;
};

export function ListingView(p: ListingViewProps) {
  const { listing } = p;
  const { result } = listing;
  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + result.items.length - 1;
  const show = p.showFilters ?? { specialty: true, locality: false };
  const countText =
    result.total === 0
      ? "No hospitals match"
      : `${result.total} ${result.total === 1 ? "hospital branch" : "hospital branches"}${
          result.pageCount > 1 ? ` · showing ${first}–${last}` : ""
        }`;

  return (
    <>
      <Breadcrumbs items={p.crumbs} />
      <JsonLd data={breadcrumbLd(p.crumbs)} />
      {result.items.length > 0 && !listing.hasFilters ? (
        <JsonLd
          data={collectionLd({
            name: p.heading,
            url: withPage(p.basePath, listing.query, result.page),
            items: result.items,
            offset: first - 1,
          })}
        />
      ) : null}

      <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">{p.heading}</h1>
      {p.top}
      {p.context ? (
        <div className="mt-3 max-w-3xl">
          <p>{p.context.text}</p>
          {p.context.reviewedAt ? (
            <p className="meta mt-1">
              Local context reviewed {p.context.reviewedAt.slice(0, 10)}
              {p.context.owner ? ` by ${p.context.owner}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* §06: a filter rail on wide screens, a collapsible sheet below 1024px. */}
        <aside aria-label="Filters">
          <details className="card p-4 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
              Filters{listing.chips.length ? ` (${listing.chips.length} active)` : ""}
            </summary>
            <div className="mt-3">
              <Filters idPrefix="sheet" action={p.basePath} listing={listing} show={show} />
            </div>
          </details>
          <div className="card hidden p-4 lg:block">
            <h2 className="mb-3 text-lg font-semibold">Filters</h2>
            <Filters idPrefix="rail" action={p.basePath} listing={listing} show={show} />
          </div>
        </aside>

        <section aria-labelledby="results-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="results-heading" className="text-lg font-semibold" aria-live="polite">
              {countText}
            </h2>
          </div>

          {listing.chips.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
              {listing.chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.removeQuery ? `${p.basePath}?${c.removeQuery}` : p.basePath}
                    rel="nofollow"
                    className="chip min-h-11 gap-2 no-underline hover:border-teal"
                  >
                    {c.label}
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={clearHref(p.basePath, listing)} rel="nofollow" className="link inline-flex min-h-11 items-center px-2">
                  Clear filters
                </Link>
              </li>
            </ul>
          ) : null}

          {result.items.length > 0 ? (
            <ul className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {result.items.map((b) => (
                <li key={b.id}>
                  <BranchCard branch={b} headingLevel="h3" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card mt-4 p-6">
              <p className="font-semibold">
                {listing.hasFilters
                  ? "No published hospital branch matches these filters."
                  : "We have not published any hospital branches here yet."}
              </p>
              <p className="mt-2">
                {listing.hasFilters
                  ? "A filter only matches facts we have confirmed, so a hospital may offer a service we have not verified yet. Try removing a filter."
                  : "This is a gap in directory coverage, not a statement that there are no hospitals here."}
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                {listing.hasFilters ? (
                  <li>
                    <Link href={clearHref(p.basePath, listing)} className="link inline-flex min-h-11 items-center">
                      Clear filters
                    </Link>
                  </li>
                ) : null}
                {(p.fallbackLinks ?? []).map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link inline-flex min-h-11 items-center">
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/coverage" className="link inline-flex min-h-11 items-center">
                    About directory coverage
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <Pagination base={p.basePath} query={listing.query} page={result.page} pageCount={result.pageCount} />
          {p.children}
        </section>
      </div>
    </>
  );
}

function clearHref(basePath: string, listing: Listing): string {
  const keep = new URLSearchParams();
  for (const k of ["q", "where", "geo"]) {
    const v = listing.query.get(k);
    if (v) keep.set(k, v);
  }
  const s = keep.toString();
  return s ? `${basePath}?${s}` : basePath;
}
