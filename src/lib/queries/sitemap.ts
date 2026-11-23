import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { POLICY } from "@/lib/policy";

type Row = { path: string; lastmod: string | null };
const rows = async (q: ReturnType<typeof sql>) => (await db().execute(q)).rows as Row[];
const G = POLICY.index.geoHubMinBranches;
const T = POLICY.index.taxonomyHubMinBranches;

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

/** Only hubs that pass the SEO-01 threshold: canonical, indexable pages and nothing else. */
export function hubUrls() {
  return rows(sql`
    with counts as (
      select g.id, g.kind, g.slug, st.slug as state_slug, stl.slug as settlement_slug,
             count(b.id) filter (where b.is_indexable) as n, max(b.updated_at) as lastmod
      from geography g
      left join geography st on st.id = g.state_id
      left join geography stl on stl.id = g.settlement_id
      join hospital_branch b on (case g.kind
          when 'district' then b.district_id when 'settlement' then b.settlement_id
          when 'locality' then b.locality_id else b.state_id end) = g.id
      where g.is_active and g.local_context is not null and g.local_context_reviewed_at is not null
        and g.kind <> 'subdistrict'
      group by g.id, st.slug, stl.slug
    )
    select case kind
        when 'district' then '/hospitals/' || state_slug || '/district/' || slug
        when 'settlement' then '/hospitals/' || state_slug || '/' || slug
        when 'locality' then '/hospitals/' || state_slug || '/' || settlement_slug || '/locality/' || slug
        else '/hospitals/' || slug end as path,
      lastmod::text as lastmod
    from counts where n >= case when kind = 'locality' then ${T}::int else ${G}::int end
    union all
    select case when h.geography_id is null then '/specialties/' || s.slug
                when h.specialty_id is not null then '/hospitals/' || st.slug || '/' || g.slug || '/specialty/' || s.slug
                else '/hospitals/' || st.slug || '/' || g.slug || '/service/' || v.slug end,
           max(b.updated_at)::text
    from hub_content h
    left join geography g on g.id = h.geography_id and g.kind = 'settlement'
    left join geography st on st.id = g.state_id
    left join specialty s on s.id = h.specialty_id
    left join service v on v.id = h.service_id
    join branch_offering o on o.ended_at is null and o.status in ('hospital_supplied','checked_against_source')
      and (o.specialty_id = h.specialty_id or o.service_id = h.service_id)
    join hospital_branch b on b.id = o.branch_id and b.is_indexable and (h.geography_id is null or b.settlement_id = h.geography_id)
    where h.is_approved and h.reviewed_at is not null and h.locale = 'en'
      and num_nonnulls(h.specialty_id, h.service_id) = 1
      and (h.geography_id is null or g.id is not null)
      and not (h.geography_id is null and h.service_id is not null)
    group by h.id, h.geography_id, h.specialty_id, s.slug, v.slug, st.slug, g.slug
    having count(distinct b.id) >= ${T}::int
    order by 1`);
}
