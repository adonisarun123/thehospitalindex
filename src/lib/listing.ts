import "server-only";
import { cache } from "react";
import { POLICY } from "@/lib/policy";
import {
  listBranches,
  listFacets,
  listServices,
  listSpecialties,
  type ListFilters,
  type ListResult,
} from "@/lib/queries/branches";
import { titleCaseEnum } from "@/lib/text";

export type SearchParams = Record<string, string | string[] | undefined>;

export const FACILITY_TYPES = [
  "general_hospital",
  "multispecialty_hospital",
  "specialty_hospital",
  "teaching_hospital",
  "nursing_home",
  "community_health_centre",
  "primary_health_centre",
  "day_care_centre",
] as const;
export const OWNERSHIPS = ["government", "private", "charitable", "ppp", "other"] as const;
export const ACCESS_CODES: Record<string, string> = {
  step_free_entrance: "Step-free entrance",
  lift: "Lift",
  accessible_toilet: "Accessible toilet",
  accessible_parking: "Accessible parking",
  wheelchair: "Wheelchair available",
};

const taxa = cache(async () => {
  const [specialties, services] = await Promise.all([listSpecialties(), listServices()]);
  return { specialties, services };
});

const multi = (sp: SearchParams, key: string): string[] => {
  const v = sp[key];
  return (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.trim()).filter(Boolean);
};
const single = (sp: SearchParams, key: string): string | undefined => {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
};

export type Chip = { label: string; removeQuery: string };

export type Listing = {
  result: ListResult;
  facets: Awaited<ReturnType<typeof listFacets>>;
  /** Cleaned public selection, without `page`. Rebuilds the same view from a pasted URL (NAV-03). */
  query: URLSearchParams;
  chips: Chip[];
  hasFilters: boolean;
  selected: {
    types: string[];
    ownerships: string[];
    specialties: string[];
    services: string[];
    access: string[];
    localities: string[];
    emergency: boolean;
    accredited: boolean;
    sort: "default" | "rating";
    q?: string;
  };
  options: Awaited<ReturnType<typeof taxa>>;
  /** null = `?page=` was malformed or out of range → the caller returns 404 (§22). */
  valid: boolean;
};

export type ListingInput = {
  scope?: ListFilters["scope"];
  /** A taxon fixed by the route itself (city-specialty hub), not a removable filter. */
  lockedSpecialtyId?: string;
  lockedServiceId?: string;
  /** Free text is only accepted on /search. */
  allowQuery?: boolean;
  /** Locality slugs → ids, when the scope is a settlement. */
  localityIdsBySlug?: Record<string, string>;
};

/**
 * Parses the public filter contract (SRH-03) from the URL, drops anything
 * that is not on the allow-list, and runs the listing + facet queries.
 */
export async function loadListing(input: ListingInput, sp: SearchParams): Promise<Listing> {
  const options = await taxa();
  const bySlug = (list: { slug: string; id: string }[]) => new Map(list.map((t) => [t.slug, t.id]));
  const specBySlug = bySlug(options.specialties);
  const svcBySlug = bySlug(options.services);

  const types = multi(sp, "type").filter((v) => (FACILITY_TYPES as readonly string[]).includes(v));
  const ownerships = multi(sp, "ownership").filter((v) => (OWNERSHIPS as readonly string[]).includes(v));
  const specialties = input.lockedSpecialtyId ? [] : multi(sp, "specialty").filter((s) => specBySlug.has(s));
  const services = input.lockedServiceId ? [] : multi(sp, "service").filter((s) => svcBySlug.has(s));
  const access = multi(sp, "access").filter((c) => c in ACCESS_CODES);
  const localities = multi(sp, "locality").filter((s) => input.localityIdsBySlug?.[s]);
  const emergency = single(sp, "emergency") === "1";
  const accredited = single(sp, "accredited") === "1";
  const sort = single(sp, "sort") === "rating" ? "rating" : "default";
  const q = input.allowQuery ? single(sp, "q")?.slice(0, 120) : undefined;

  const rawPage = single(sp, "page");
  const pageOk = rawPage === undefined || /^[1-9][0-9]{0,4}$/.test(rawPage);
  const page = pageOk && rawPage ? Number(rawPage) : 1;

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  for (const k of ["where", "geo"]) {
    const v = input.allowQuery ? single(sp, k) : undefined;
    if (v) query.set(k, v);
  }
  types.forEach((v) => query.append("type", v));
  ownerships.forEach((v) => query.append("ownership", v));
  specialties.forEach((v) => query.append("specialty", v));
  services.forEach((v) => query.append("service", v));
  access.forEach((v) => query.append("access", v));
  localities.forEach((v) => query.append("locality", v));
  if (emergency) query.set("emergency", "1");
  if (accredited) query.set("accredited", "1");
  if (sort !== "default") query.set("sort", sort);

  const filters: ListFilters = {
    scope: input.scope,
    q,
    facilityTypes: types,
    ownerships,
    specialtyIds: input.lockedSpecialtyId ? [input.lockedSpecialtyId] : specialties.map((s) => specBySlug.get(s)!),
    serviceIds: input.lockedServiceId ? [input.lockedServiceId] : services.map((s) => svcBySlug.get(s)!),
    accessCodes: access,
    localityIds: localities.map((s) => input.localityIdsBySlug![s]),
    emergency,
    accredited,
    sort,
    page,
    pageSize: POLICY.pageSize,
  };

  const [result, facets] = await Promise.all([
    listBranches(filters),
    listFacets({
      scope: input.scope,
      q,
      specialtyIds: input.lockedSpecialtyId ? [input.lockedSpecialtyId] : undefined,
      serviceIds: input.lockedServiceId ? [input.lockedServiceId] : undefined,
    }),
  ]);

  const without = (key: string, value?: string) => {
    const next = new URLSearchParams(query);
    if (value === undefined) next.delete(key);
    else {
      const keep = next.getAll(key).filter((v) => v !== value);
      next.delete(key);
      keep.forEach((v) => next.append(key, v));
    }
    return next.toString();
  };
  const nameOf = (list: { slug: string; name: string }[], slug: string) => list.find((t) => t.slug === slug)?.name ?? slug;
  const chips: Chip[] = [
    ...types.map((v) => ({ label: titleCaseEnum(v), removeQuery: without("type", v) })),
    ...ownerships.map((v) => ({ label: titleCaseEnum(v), removeQuery: without("ownership", v) })),
    ...specialties.map((v) => ({ label: nameOf(options.specialties, v), removeQuery: without("specialty", v) })),
    ...services.map((v) => ({ label: nameOf(options.services, v), removeQuery: without("service", v) })),
    ...access.map((v) => ({ label: ACCESS_CODES[v], removeQuery: without("access", v) })),
    ...localities.map((v) => ({
      label: facets.localities.find((l) => l.value === v)?.label ?? v,
      removeQuery: without("locality", v),
    })),
    ...(emergency ? [{ label: "Emergency department", removeQuery: without("emergency") }] : []),
    ...(accredited ? [{ label: "Current accreditation", removeQuery: without("accredited") }] : []),
    ...(sort === "rating" ? [{ label: "Sorted by patient rating", removeQuery: without("sort") }] : []),
  ];

  return {
    result,
    facets,
    query,
    chips,
    hasFilters: chips.length > 0,
    selected: { types, ownerships, specialties, services, access, localities, emergency, accredited, sort, q },
    options,
    valid: pageOk && !result.outOfRange,
  };
}

/**
 * §22 index policy for a listing URL.
 *  - filtered or sorted views: noindex, no canonical
 *  - a qualifying hub: indexable, self-canonical, including numbered pages
 *  - a hub below the SEO-01 threshold: 200 + noindex, still crawlable
 */
export function listingRobots(opts: { hubIndexable: boolean; hasFilters: boolean }) {
  const index = opts.hubIndexable && !opts.hasFilters;
  return { index, follow: true };
}
