import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { POLICY } from "@/lib/policy";

type Row = { path: string; lastmod: string | null };
const rows = async (q: ReturnType<typeof sql>) => (await db().execute(q)).rows as Row[];
const PUBLIC_STATUS = sql`('hospital_supplied','checked_against_source')`;
const G = POLICY.index.geoHubMinBranches;
const T = POLICY.index.taxonomyHubMinBranches;
/** With data-summary hubs switched off, this threshold is unreachable and only reviewed context counts. */
const D = POLICY.index.dataSummaryHubs ? POLICY.index.dataSummaryMinBranches : 2_000_000_000;

/** States that have at least one indexable branch: one branch shard per state keeps files stable (SEO-06). */
export async function branchShards(): Promise<{ slug: string; lastmod: string | null }[]> {
  const r = await db().execute(sql`
    select st.slug, max(b.updated_at)::text as lastmod
    from hospital_branch b join geography st on st.id = b.state_id
    where b.is_indexable group by st.slug order by st.slug`);
  return r.rows as { slug: string; lastmod: string | null }[];
}

export function branchUrls(stateSlug: string) {
  return rows(sql`
    select '/hospital/' || b.slug || '-' || b.public_id as path, b.updated_at::text as lastmod
    from hospital_branch b join geography st on st.id = b.state_id
    where b.is_indexable and st.slug = ${stateSlug}
    order by b.public_id limit 50000`);
}

/** The newest change to any indexable branch: the hubs shard's lastmod in the sitemap index. */
export async function hubsLastmod(): Promise<string | null> {
  const r = await db().execute(sql`select max(updated_at)::text as lastmod from hospital_branch where is_indexable`);
  return (r.rows[0] as { lastmod: string | null } | undefined)?.lastmod ?? null;
}

/**
 * Every hub that the page itself would mark indexable, and nothing else. The
 * rules mirror lib/gates.ts hubIsIndexable as used by each route:
 *   state, district, city — ≥ G indexable branches with reviewed context, or ≥ D with the data summary;
 *   locality              — ≥ T indexable branches with reviewed context only;
 *   city-specialty/service, national specialty — ≥ T with approved hub content, or ≥ D with the data summary.
 */
export function hubUrls() {
  return rows(sql`
    with geo_counts as (
      select g.kind, g.slug, st.slug as state_slug, stl.slug as settlement_slug,
             (g.local_context is not null and g.local_context_reviewed_at is not null) as reviewed,
             count(b.id) as n, max(b.updated_at) as lastmod
      from geography g
      left join geography st on st.id = g.state_id
      left join geography stl on stl.id = g.settlement_id
      join hospital_branch b on b.is_indexable and (case g.kind
          when 'district' then b.district_id when 'settlement' then b.settlement_id
          when 'locality' then b.locality_id else b.state_id end) = g.id
      where g.is_active and g.kind <> 'subdistrict'
      group by g.id, st.slug, stl.slug
    )
    select case kind
        when 'district' then '/hospitals/' || state_slug || '/district/' || slug
        when 'settlement' then '/hospitals/' || state_slug || '/' || slug
        when 'locality' then '/hospitals/' || state_slug || '/' || settlement_slug || '/locality/' || slug
        else '/hospitals/' || slug end as path,
      lastmod::text as lastmod
    from geo_counts
    where case when kind = 'locality' then reviewed and n >= ${T}::int
               else n >= ${G}::int and (reviewed or n >= ${D}::int) end

    union all
    select '/hospitals/' || st.slug || '/' || g.slug || '/specialty/' || sp.slug, max(b.updated_at)::text
    from hospital_branch b
    join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
    join specialty sp on sp.id = o.specialty_id and sp.is_active
    join geography g on g.id = b.settlement_id and g.is_active
    join geography st on st.id = b.state_id
    where b.is_indexable
    group by st.slug, g.id, g.slug, sp.id, sp.slug
    having count(distinct b.id) >= ${T}::int and (count(distinct b.id) >= ${D}::int or exists (
      select 1 from hub_content h where h.is_approved and h.reviewed_at is not null and h.locale = 'en'
        and h.geography_id = g.id and h.specialty_id = sp.id))

    union all
    select '/hospitals/' || st.slug || '/' || g.slug || '/service/' || v.slug, max(b.updated_at)::text
    from hospital_branch b
    join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
    join service v on v.id = o.service_id and v.is_active
    join geography g on g.id = b.settlement_id and g.is_active
    join geography st on st.id = b.state_id
    where b.is_indexable
    group by st.slug, g.id, g.slug, v.id, v.slug
    having count(distinct b.id) >= ${T}::int and (count(distinct b.id) >= ${D}::int or exists (
      select 1 from hub_content h where h.is_approved and h.reviewed_at is not null and h.locale = 'en'
        and h.geography_id = g.id and h.service_id = v.id))

    union all
    select '/specialties/' || sp.slug, max(b.updated_at)::text
    from hospital_branch b
    join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
    join specialty sp on sp.id = o.specialty_id and sp.is_active
    where b.is_indexable
    group by sp.id, sp.slug
    having count(distinct b.id) >= ${T}::int and (count(distinct b.id) >= ${D}::int or exists (
      select 1 from hub_content h where h.is_approved and h.reviewed_at is not null and h.locale = 'en'
        and h.geography_id is null and h.specialty_id = sp.id))
    order by 1`);
}
