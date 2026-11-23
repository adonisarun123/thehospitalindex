import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { normalize, PINCODE_RE } from "@/lib/text";

export type Geo = {
  id: string;
  kind: "state" | "union_territory" | "district" | "subdistrict" | "settlement" | "locality";
  settlementKind: "city" | "town" | "village" | null;
  slug: string;
  name: string;
  stateId: string | null;
  districtId: string | null;
  settlementId: string | null;
  parentId: string | null;
  localContext: string | null;
  hasReviewedContext: boolean;
};

export type GeoWithCounts = Geo & { published: number; indexable: number };

const geoCols = sql`
  g.id, g.kind, g.settlement_kind as "settlementKind", g.slug, g.name,
  g.state_id as "stateId", g.district_id as "districtId", g.settlement_id as "settlementId",
  g.parent_id as "parentId", g.local_context as "localContext",
  (g.local_context is not null and g.local_context_reviewed_at is not null) as "hasReviewedContext"`;

/** The branch column that points at each geography level. */
const BRANCH_COL = {
  state: sql`b.state_id`,
  union_territory: sql`b.state_id`,
  district: sql`b.district_id`,
  settlement: sql`b.settlement_id`,
  locality: sql`b.locality_id`,
} as const;

async function one<T>(q: ReturnType<typeof sql>): Promise<T | null> {
  const { rows } = await db().execute(q);
  return (rows[0] as T | undefined) ?? null;
}
async function many<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  const { rows } = await db().execute(q);
  return rows as T[];
}

/** GEO-03: every state and UT is always listed, with real published counts (UX-06). */
export function listStates(): Promise<GeoWithCounts[]> {
  return many(sql`
    select ${geoCols},
      count(b.id) filter (where b.status = 'published')::int as published,
      count(b.id) filter (where b.is_indexable)::int as indexable
    from geography g
    left join hospital_branch b on b.state_id = g.id
    where g.kind in ('state','union_territory') and g.is_active
    group by g.id
    order by g.name`);
}

export function getState(slug: string): Promise<Geo | null> {
  return one(sql`select ${geoCols} from geography g
    where g.kind in ('state','union_territory') and g.slug = ${slug} and g.is_active`);
}

export function getChild(
  kind: "district" | "settlement",
  stateId: string,
  slug: string,
): Promise<Geo | null> {
  return one(sql`select ${geoCols} from geography g
    where g.kind = ${kind} and g.state_id = ${stateId} and g.slug = ${slug} and g.is_active`);
}

export function getLocality(settlementId: string, slug: string): Promise<Geo | null> {
  return one(sql`select ${geoCols} from geography g
    where g.kind = 'locality' and g.parent_id = ${settlementId} and g.slug = ${slug} and g.is_active`);
}

export function getGeoById(id: string): Promise<Geo | null> {
  return one(sql`select ${geoCols} from geography g where g.id = ${id}`);
}

/**
 * GEO-02: an alias such as `bangalore` resolves to the canonical place so the
 * caller can issue one permanent redirect.
 */
export function findByAlias(
  kinds: Geo["kind"][],
  stateId: string | null,
  aliasSlug: string,
): Promise<Geo | null> {
  const norm = normalize(aliasSlug);
  return one(sql`
    select ${geoCols} from geo_alias a join geography g on g.id = a.geography_id
    where a.normalized = ${norm} and g.is_active
      and g.kind in (${sql.join(kinds.map((k) => sql`${k}`), sql`, `)})
      ${stateId ? sql`and g.state_id = ${stateId}` : sql``}
    limit 1`);
}

/** Children of a state with published/indexable counts. Only places with inventory are returned. */
export function listPlacesInState(stateId: string, kind: "district" | "settlement"): Promise<GeoWithCounts[]> {
  const col = BRANCH_COL[kind];
  return many(sql`
    select ${geoCols},
      count(b.id) filter (where b.status = 'published')::int as published,
      count(b.id) filter (where b.is_indexable)::int as indexable
    from geography g
    join hospital_branch b on ${col} = g.id
    where g.kind = ${kind} and g.state_id = ${stateId} and g.is_active
    group by g.id
    having count(b.id) filter (where b.status = 'published') > 0
    order by count(b.id) filter (where b.status = 'published') desc, g.name`);
}

export function listLocalities(settlementId: string): Promise<GeoWithCounts[]> {
  return many(sql`
    select ${geoCols},
      count(b.id) filter (where b.status = 'published')::int as published,
      count(b.id) filter (where b.is_indexable)::int as indexable
    from geography g
    join hospital_branch b on b.locality_id = g.id
    where g.kind = 'locality' and g.parent_id = ${settlementId} and g.is_active
    group by g.id
    having count(b.id) filter (where b.status = 'published') > 0
    order by g.name`);
}

export async function countsFor(geo: Geo): Promise<{ published: number; indexable: number }> {
  const col = BRANCH_COL[geo.kind as keyof typeof BRANCH_COL];
  const row = await one<{ published: number; indexable: number }>(sql`
    select count(*) filter (where b.status = 'published')::int as published,
           count(*) filter (where b.is_indexable)::int as indexable
    from hospital_branch b where ${col} = ${geo.id}`);
  return row ?? { published: 0, indexable: 0 };
}

export type PlaceMatch = {
  id: string;
  kind: Geo["kind"];
  name: string;
  slug: string;
  parentLabel: string | null;
  stateSlug: string | null;
  settlementSlug: string | null;
  districtSlug: string | null;
  path: string;
};

const placeSelect = sql`
  g.id, g.kind, g.name, g.slug,
  st.slug as "stateSlug", stl.slug as "settlementSlug", dst.slug as "districtSlug",
  case when g.kind in ('state','union_territory') then null
       when g.kind = 'locality' then stl.name || ', ' || st.name
       when g.kind = 'settlement' and dst.id is not null then dst.name || ' district, ' || st.name
       else st.name end as "parentLabel"`;
const placeJoins = sql`
  left join geography st on st.id = g.state_id
  left join geography stl on stl.id = g.settlement_id
  left join geography dst on dst.id = g.district_id`;

function pathFor(p: Omit<PlaceMatch, "path">): string {
  switch (p.kind) {
    case "state":
    case "union_territory":
      return `/hospitals/${p.slug}`;
    case "district":
      return `/hospitals/${p.stateSlug}/district/${p.slug}`;
    case "settlement":
      return `/hospitals/${p.stateSlug}/${p.slug}`;
    case "locality":
      return `/hospitals/${p.stateSlug}/${p.settlementSlug}/locality/${p.slug}`;
    default:
      return `/hospitals/${p.stateSlug}`;
  }
}

/**
 * SRH-01 "City, locality or PIN". A PIN can map to several places (and never
 * to a unique boundary), so PIN lookups return every mapped place.
 */
export async function matchPlaces(input: string, limit = 8): Promise<PlaceMatch[]> {
  const text = input.trim();
  if (!text) return [];
  let rows: Omit<PlaceMatch, "path">[];
  if (PINCODE_RE.test(text)) {
    rows = await many(sql`
      select ${placeSelect} from geo_pincode p join geography g on g.id = p.geography_id ${placeJoins}
      where p.pincode = ${text} and g.is_active
      order by g.kind, g.name limit ${limit}`);
  } else {
    const norm = normalize(text);
    rows = await many(sql`
      select ${placeSelect}
      from geography g ${placeJoins}
      left join lateral (
        select max(similarity(a.normalized, ${norm})) as s, bool_or(a.normalized = ${norm}) as exact
        from geo_alias a where a.geography_id = g.id
      ) al on true
      where g.is_active and g.kind <> 'subdistrict' and (
        lower(g.name) = ${norm} or lower(g.name) like ${norm + "%"} or lower(g.name) % ${norm}
        or al.exact or al.s > 0.35
      )
      order by
        (lower(g.name) = ${norm} or coalesce(al.exact, false)) desc,
        (lower(g.name) like ${norm + "%"}) desc,
        greatest(similarity(lower(g.name), ${norm}), coalesce(al.s, 0)) desc,
        array_position(array['settlement','locality','district','state','union_territory']::text[], g.kind::text),
        g.name
      limit ${limit}`);
  }
  return rows.map((r) => ({ ...r, path: pathFor(r) }));
}

/** GEO-01 coverage ledger, by state. */
export function coverageLedger() {
  return many<{
    name: string;
    slug: string;
    kind: string;
    discovered: number;
    checked: number;
    published: number;
    indexable: number;
    lastChecked: string | null;
  }>(sql`
    select g.name, g.slug, g.kind,
      count(b.id)::int as discovered,
      count(b.id) filter (where b.status in ('checked','published'))::int as checked,
      count(b.id) filter (where b.status = 'published')::int as published,
      count(b.id) filter (where b.is_indexable)::int as indexable,
      to_char(max(b.last_checked_at) at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as "lastChecked"
    from geography g left join hospital_branch b on b.state_id = g.id
    where g.kind in ('state','union_territory') and g.is_active
    group by g.id order by g.name`);
}
