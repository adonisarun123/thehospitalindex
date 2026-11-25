import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { POLICY } from "@/lib/policy";

/**
 * Data behind hub summaries and related-link blocks. Every count uses the
 * same public predicates as the listing (published branches, public offering
 * statuses, accreditation checked against source and unexpired, emergency
 * inside its refresh window), so a summary never claims more than a filter
 * would return.
 */

const PUBLIC_STATUS = sql`('hospital_supplied','checked_against_source')`;

async function many<T>(q: SQL): Promise<T[]> {
  const { rows } = await db().execute(q);
  return rows as T[];
}

export type HubScope = { stateId?: string; districtId?: string; settlementId?: string; specialtyId?: string; serviceId?: string };

function scopeWhere(s: HubScope): SQL {
  const c: SQL[] = [sql`b.status = 'published'`];
  if (s.stateId) c.push(sql`b.state_id = ${s.stateId}`);
  if (s.districtId) c.push(sql`b.district_id = ${s.districtId}`);
  if (s.settlementId) c.push(sql`b.settlement_id = ${s.settlementId}`);
  if (s.specialtyId)
    c.push(sql`exists (select 1 from branch_offering o where o.branch_id = b.id and o.ended_at is null
      and o.status in ${PUBLIC_STATUS} and o.specialty_id = ${s.specialtyId})`);
  if (s.serviceId)
    c.push(sql`exists (select 1 from branch_offering o where o.branch_id = b.id and o.ended_at is null
      and o.status in ${PUBLIC_STATUS} and o.service_id = ${s.serviceId})`);
  return sql.join(c, sql` and `);
}

export type HubStats = {
  published: number;
  indexable: number;
  accredited: number;
  emergency: number;
  government: number;
  privateOwned: number;
  charitable: number;
  settlements: number;
  lastChecked: string | null;
  facilityTypes: { value: string; count: number }[];
  topSpecialties: { slug: string; name: string; count: number }[];
};

export const hubStats = cache(async (key: string): Promise<HubStats> => {
  const s = JSON.parse(key) as HubScope;
  const where = scopeWhere(s);
  const [totals, types, specs] = await Promise.all([
    many<Omit<HubStats, "facilityTypes" | "topSpecialties">>(sql`
      select count(*)::int as published,
        count(*) filter (where b.is_indexable)::int as indexable,
        count(*) filter (where exists (select 1 from credential cr where cr.branch_id = b.id
          and cr.category = 'hospital_accreditation' and cr.status = 'checked_against_source'
          and (cr.expires_on is null or cr.expires_on >= current_date)))::int as accredited,
        count(*) filter (where b.has_emergency = 'yes'
          and b.emergency_checked_at > now() - make_interval(days => ${POLICY.refreshDays.emergency}))::int as emergency,
        count(*) filter (where b.ownership = 'government')::int as government,
        count(*) filter (where b.ownership = 'private')::int as "privateOwned",
        count(*) filter (where b.ownership = 'charitable')::int as charitable,
        count(distinct b.settlement_id)::int as settlements,
        to_char(max(b.last_checked_at) at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as "lastChecked"
      from hospital_branch b where ${where}`),
    many<{ value: string; count: number }>(sql`
      select b.facility_type::text as value, count(*)::int as count
      from hospital_branch b where ${where} group by 1 order by 2 desc, 1 limit 3`),
    s.specialtyId
      ? Promise.resolve([])
      : many<{ slug: string; name: string; count: number }>(sql`
      select sp.slug, sp.name, count(distinct b.id)::int as count
      from hospital_branch b
      join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
      join specialty sp on sp.id = o.specialty_id and sp.is_active
      where ${where} group by sp.slug, sp.name order by 3 desc, 2 limit 8`),
  ]);
  return { ...totals[0], facilityTypes: types, topSpecialties: specs };
});

export const getHubStats = (s: HubScope) => hubStats(JSON.stringify(s));

export type TaxonHub = { kind: "specialty" | "service"; slug: string; name: string; indexable: number; published: number };

/**
 * Specialty and service hubs inside a settlement, from the data itself rather
 * than from approved hub_content rows. Only hubs with at least
 * `taxonomyHubMinBranches` indexable branches are returned, so every link
 * points at a page that can be indexed.
 */
export const cityTaxonHubs = cache((settlementId: string) =>
  many<TaxonHub>(sql`
    select * from (
      select 'specialty' as kind, sp.slug, sp.name, sp.sort_order as so,
        count(distinct b.id) filter (where b.is_indexable)::int as indexable, count(distinct b.id)::int as published
      from hospital_branch b
      join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
      join specialty sp on sp.id = o.specialty_id and sp.is_active
      where b.status = 'published' and b.settlement_id = ${settlementId}
      group by sp.slug, sp.name, sp.sort_order
      union all
      select 'service', v.slug, v.name, 10000,
        count(distinct b.id) filter (where b.is_indexable)::int, count(distinct b.id)::int
      from hospital_branch b
      join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
      join service v on v.id = o.service_id and v.is_active
      where b.status = 'published' and b.settlement_id = ${settlementId}
      group by v.slug, v.name
    ) t where t.indexable >= ${POLICY.index.taxonomyHubMinBranches}::int
    order by t.kind, t.indexable desc, t.name`),
);

export type PlaceLink = { slug: string; name: string; stateSlug: string; stateName: string; published: number };

/** Other settlements in the same state with published branches, largest first. */
export function otherCities(stateId: string, excludeId: string | null) {
  return many<PlaceLink>(sql`
    select g.slug, g.name, st.slug as "stateSlug", st.name as "stateName", count(b.id)::int as published
    from hospital_branch b
    join geography g on g.id = b.settlement_id and g.is_active
    join geography st on st.id = b.state_id
    where b.status = 'published' and b.state_id = ${stateId} ${excludeId ? sql`and g.id <> ${excludeId}` : sql``}
    group by g.id, st.id
    order by count(b.id) desc, g.name
    limit ${POLICY.related.otherCities}`);
}

/** Cities where a specialty (or service) hub qualifies, for the national specialty page and city-taxon hubs. */
export function citiesForTaxon(kind: "specialty" | "service", taxonId: string, excludeSettlementId?: string) {
  const col = kind === "specialty" ? sql`o.specialty_id` : sql`o.service_id`;
  return many<PlaceLink & { indexable: number }>(sql`
    select g.slug, g.name, st.slug as "stateSlug", st.name as "stateName",
      count(distinct b.id)::int as published, count(distinct b.id) filter (where b.is_indexable)::int as indexable
    from hospital_branch b
    join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS} and ${col} = ${taxonId}
    join geography g on g.id = b.settlement_id and g.is_active
    join geography st on st.id = b.state_id
    where b.status = 'published' ${excludeSettlementId ? sql`and g.id <> ${excludeSettlementId}` : sql``}
    group by g.id, st.id
    having count(distinct b.id) filter (where b.is_indexable) >= ${POLICY.index.taxonomyHubMinBranches}::int
    order by count(distinct b.id) filter (where b.is_indexable) desc, g.name
    limit ${POLICY.related.specialtyCities}`);
}

export type BranchLink = {
  publicId: string;
  slug: string;
  name: string;
  facilityType: string;
  place: string;
};

const linkCols = sql`b.public_id as "publicId", b.slug,
  case when b.branch_qualifier is not null then b.display_name || ', ' || b.branch_qualifier else b.display_name end as name,
  b.facility_type::text as "facilityType",
  coalesce(loc.name || ', ', '') || stl.name as place`;
const linkFrom = sql`from hospital_branch b
  join geography stl on stl.id = b.settlement_id
  left join geography loc on loc.id = b.locality_id`;

/** The most complete published branches in a scope: "featured" on state pages. */
export function featuredBranches(stateId: string, limit = 6) {
  return many<BranchLink>(sql`select ${linkCols} ${linkFrom}
    where b.status = 'published' and b.is_indexable and b.state_id = ${stateId}
    order by b.completeness desc, b.display_name, b.id limit ${limit}`);
}

/**
 * Profile interlinking: branches in the same locality first, then the same
 * town; and other branches of the same organisation anywhere in India.
 * Indexable branches are preferred so link equity flows to pages that can rank.
 */
export async function branchRelated(branchId: string) {
  const [me, nearby, siblings] = await Promise.all([
    many<{ settlementId: string }>(sql`select settlement_id as "settlementId" from hospital_branch where id = ${branchId}`),
    many<BranchLink>(sql`
      with me as (select id, settlement_id, locality_id from hospital_branch where id = ${branchId})
      select ${linkCols} ${linkFrom}, me
      where b.status = 'published' and b.id <> me.id and b.settlement_id = me.settlement_id
      order by (b.locality_id is not distinct from me.locality_id and me.locality_id is not null) desc,
        b.is_indexable desc, b.completeness desc, b.id
      limit ${POLICY.related.nearbyBranches}`),
    many<BranchLink & { stateSlug: string }>(sql`
      with me as (select id, org_id from hospital_branch where id = ${branchId})
      select ${linkCols}, st.slug as "stateSlug" ${linkFrom}
      join geography st on st.id = b.state_id, me
      where me.org_id is not null and b.org_id = me.org_id and b.id <> me.id and b.status = 'published'
      order by b.is_indexable desc, b.completeness desc, b.id
      limit ${POLICY.related.siblingBranches}`),
  ]);
  const hubs = me[0] ? await cityTaxonHubs(me[0].settlementId) : [];
  return { nearby, siblings, cityHubs: hubs };
}
