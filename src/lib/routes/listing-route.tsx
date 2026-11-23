import "server-only";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import type { Crumb } from "@/components/breadcrumbs";
import { ListingView } from "@/components/listing-view";
import { hubIsIndexable } from "@/lib/gates";
import { listingRobots, loadListing, type ListingInput, type SearchParams } from "@/lib/listing";
import { abs } from "@/lib/schema-org";
import { withPage } from "@/lib/urls";

export type ListingDescriptor = {
  basePath: string;
  heading: string;
  /** <title> without the site suffix. */
  title: string;
  description: (total: number) => string;
  crumbs: Crumb[];
  input: ListingInput;
  hub: { indexableBranches: number; minBranches: number; context: { text: string; reviewedAt?: string | null; owner?: string | null } | null };
  showFilters?: { specialty: boolean; locality: boolean };
  fallbackLinks?: { href: string; label: string }[];
  top?: React.ReactNode;
  extras?: React.ReactNode;
};

type Resolved = { kind: "ok"; d: ListingDescriptor } | { kind: "redirect"; to: string } | { kind: "missing" };
type RouteProps<P> = { params: Promise<P>; searchParams: Promise<SearchParams> };

/**
 * One implementation of the §22 contract for every listing route:
 * unknown place → 404, alias → one 308, bad or out-of-range ?page → 404,
 * filtered views → noindex, hubs below threshold → noindex but crawlable.
 */
export function buildListingRoute<P extends Record<string, string>>(resolve: (params: P) => Promise<Resolved>) {
  const load = cache(async (paramsKey: string, spKey: string) => {
    const resolved = await resolve(JSON.parse(paramsKey) as P);
    if (resolved.kind !== "ok") return { resolved, listing: null } as const;
    const listing = await loadListing(resolved.d.input, JSON.parse(spKey) as SearchParams);
    return { resolved, listing } as const;
  });

  async function run(props: RouteProps<P>) {
    const [params, sp] = await Promise.all([props.params, props.searchParams]);
    const { resolved, listing } = await load(JSON.stringify(params), JSON.stringify(sp));
    if (resolved.kind === "redirect") permanentRedirect(resolved.to);
    if (resolved.kind === "missing" || !listing) notFound();
    if (!listing.valid) notFound();
    return { d: resolved.d, listing };
  }

  async function generateMetadata(props: RouteProps<P>): Promise<Metadata> {
    const { d, listing } = await run(props);
    const page = listing.result.page;
    const robots = listingRobots({
      hubIndexable: hubIsIndexable({
        indexableBranches: d.hub.indexableBranches,
        minBranches: d.hub.minBranches,
        hasReviewedContext: Boolean(d.hub.context),
      }),
      hasFilters: listing.hasFilters,
    });
    return {
      title: page > 1 ? `${d.title} (page ${page})` : d.title,
      description: d.description(listing.result.total),
      robots,
      // Filtered views carry no canonical: noindex plus a canonical to another URL sends mixed signals.
      alternates: listing.hasFilters ? undefined : { canonical: abs(withPage(d.basePath, new URLSearchParams(), page)) },
    };
  }

  async function Page(props: RouteProps<P>) {
    const { d, listing } = await run(props);
    return (
      <ListingView
        basePath={d.basePath}
        heading={d.heading}
        crumbs={d.crumbs}
        listing={listing}
        context={d.hub.context}
        showFilters={d.showFilters}
        fallbackLinks={d.fallbackLinks}
        top={d.top}
      >
        {d.extras}
      </ListingView>
    );
  }

  return { generateMetadata, Page };
}
