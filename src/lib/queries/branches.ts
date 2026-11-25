import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { POLICY } from "@/lib/policy";
import { normalize } from "@/lib/text";

const PUBLIC_STATUS = sql`('hospital_supplied','checked_against_source')`;
const inList = (values: readonly string[]) => sql`(${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;

async function many<T>(q: SQL): Promise<T[]> {
  const { rows } = await db().execute(q);
  return rows as T[];
}

/* ───────────────────────────── taxonomy ───────────────────────────── */

export type Taxon = { id: string; slug: string; name: string; plainLabel: string | null; kind: "specialty" | "service" };

export function listSpecialties(): Promise<(Taxon & { branches: number })[]> {
  return many(sql`
    select s.id, s.slug, s.name, s.plain_label as "plainLabel", 'specialty' as kind,
      (select count(distinct o.branch_id) from branch_offering o join hospital_branch b on b.id = o.branch_id
        where o.specialty_id = s.id and o.ended_at is null and o.status in ${PUBLIC_STATUS} and b.status = 'published')::int as branches
    from specialty s where s.is_active order by s.sort_order, s.name`);
}

export function listServices(): Promise<Taxon[]> {
  return many(sql`select v.id, v.slug, v.name, v.plain_label as "plainLabel", 'service' as kind
    from service v where v.is_active order by v.name`);
}

export async function getTaxonBySlug(kind: "specialty" | "service", slug: string): Promise<Taxon | null> {
  const table = kind === "specialty" ? sql`specialty` : sql`service`;
  const rows = await many<Taxon>(sql`select t.id, t.slug, t.name, t.plain_label as "plainLabel", ${kind} as kind
    from ${table} t where t.slug = ${slug} and t.is_active`);
  return rows[0] ?? null;
}

/**
 * SRH-02: resolve free text to taxonomy by exact name, plain label, slug or
 * a REVIEWED synonym ("kidney dialysis" → dialysis).
 */
export function resolveTaxa(text: string): Promise<Taxon[]> {
  const norm = normalize(text);
  if (!norm) return Promise.resolve([]);
  return many(sql`
    select s.id, s.slug, s.name, s.plain_label as "plainLabel", 'specialty' as kind from specialty s
     where s.is_active and (lower(s.name) = ${norm} or lower(s.plain_label) = ${norm} or replace(s.slug,'-',' ') = ${norm}
       or exists (select 1 from taxonomy_synonym y where y.specialty_id = s.id and y.normalized = ${norm} and y.reviewed_at is not null))
    union all
    select v.id, v.slug, v.name, v.plain_label, 'service' from service v
     where v.is_active and (lower(v.name) = ${norm} or lower(v.plain_label) = ${norm} or replace(v.slug,'-',' ') = ${norm}
       or exists (select 1 from taxonomy_synonym y where y.service_id = v.id and y.normalized = ${norm} and y.reviewed_at is not null))`);
}

/* ───────────────────────────── listing ───────────────────────────── */

export type ListFilters = {
  scope?: { stateId?: string; districtId?: string; settlementId?: string; localityId?: string; pincode?: string };
  q?: string;
  facilityTypes?: string[];
  ownerships?: string[];
  specialtyIds?: string[];
  serviceIds?: string[];
  emergency?: boolean;
  accredited?: boolean;
  payerCodes?: string[];
  accessCodes?: string[];
  localityIds?: string[];
  sort?: "default" | "rating";
  page?: number;
  pageSize?: number;
};

export type BranchCard = {
  id: string;
  publicId: string;
  slug: string;
  displayName: string;
  branchQualifier: string | null;
  facilityType: string;
  ownership: string | null;
  locality: string | null;
  settlement: string;
  settlementSlug: string;
  state: string;
  stateSlug: string;
  serviceChips: { name: string; status: string }[];
  /** Shown only while the fact is inside its DATA-03 refresh window; null means "not confirmed", never "no". */
  emergency: "yes" | "no" | null;
  /** A current hospital accreditation that an editor checked against its source. */
  accredited: boolean;
  lastCheckedAt: string | null;
  nativeReviewCount: number;
  nativeRatingSum: number;
  sourceLinks: { provider: string; code: string; url: string }[];
  phone: string | null;
  directions: { lat: number; lng: number } | null;
};

/**
 * SRH-03: OR inside a multiselect, AND between groups. Sensitive filters
 * (emergency, accreditation, payer) are satisfied only by confirmed facts
 * that are still inside their DATA-03 refresh window.
 */
function whereClauses(f: ListFilters, taxaFromQuery: Taxon[]): { where: SQL; tsq: SQL | null; qNorm: string | null } {
  const c: SQL[] = [sql`b.status = 'published'`];
  const s = f.scope ?? {};
  if (s.stateId) c.push(sql`b.state_id = ${s.stateId}`);
  if (s.districtId) c.push(sql`b.district_id = ${s.districtId}`);
  if (s.settlementId) c.push(sql`b.settlement_id = ${s.settlementId}`);
  if (s.localityId) c.push(sql`b.locality_id = ${s.localityId}`);
  if (s.pincode) c.push(sql`b.pincode = ${s.pincode}`);

  if (f.facilityTypes?.length) c.push(sql`b.facility_type::text in ${inList(f.facilityTypes)}`);
  if (f.ownerships?.length) c.push(sql`b.ownership::text in ${inList(f.ownerships)}`);
  if (f.localityIds?.length) c.push(sql`b.locality_id::text in ${inList(f.localityIds)}`);
  if (f.specialtyIds?.length)
    c.push(sql`exists (select 1 from branch_offering o where o.branch_id = b.id and o.ended_at is null
      and o.status in ${PUBLIC_STATUS} and o.specialty_id::text in ${inList(f.specialtyIds)})`);
  if (f.serviceIds?.length)
    c.push(sql`exists (select 1 from branch_offering o where o.branch_id = b.id and o.ended_at is null
      and o.status in ${PUBLIC_STATUS} and o.service_id::text in ${inList(f.serviceIds)})`);
  if (f.emergency)
    c.push(sql`b.has_emergency = 'yes'
      and b.emergency_checked_at > now() - make_interval(days => ${POLICY.refreshDays.emergency})`);
  if (f.accredited)
    c.push(sql`exists (select 1 from credential cr where cr.branch_id = b.id
      and cr.category = 'hospital_accreditation' and cr.status = 'checked_against_source'
      and (cr.expires_on is null or cr.expires_on >= current_date))`);
  if (f.payerCodes?.length)
    c.push(sql`exists (select 1 from branch_payer p where p.branch_id = b.id and p.payer_code in ${inList(f.payerCodes)}
      and p.status = 'checked_against_source' and (p.expires_on is null or p.expires_on >= current_date)
      and p.last_checked_at > now() - make_interval(days => ${POLICY.refreshDays.payers}))`);
  if (f.accessCodes?.length)
    c.push(sql`exists (select 1 from branch_amenity a where a.branch_id = b.id and a.code in ${inList(f.accessCodes)}
      and a.state = 'yes' and a.status in ${PUBLIC_STATUS})`);

  let tsq: SQL | null = null;
  let qNorm: string | null = null;
  const q = f.q?.trim();
  if (q) {
    qNorm = normalize(q);
    tsq = sql`websearch_to_tsquery('simple', unaccent(${q}))`;
    const taxonMatch = taxaFromQuery.length
      ? sql` or exists (select 1 from branch_offering o where o.branch_id = b.id and o.ended_at is null
          and o.status in ${PUBLIC_STATUS}
          and (o.specialty_id::text in ${inList(taxaFromQuery.map((t) => t.id))}
            or o.service_id::text in ${inList(taxaFromQuery.map((t) => t.id))}))`
      : sql``;
    // A name match never bypasses the other filters: this clause is ANDed with them (§05 acceptance example).
    // SRH-02 typo tolerance: every word of the query must be close to some word of the name
    // ("sampge hospitl" → Sampige Hospital). 0.5 is a tuning default; revisit with real query logs.
    const tokens = qNorm.split(" ").filter((t) => t.length >= 3).slice(0, 6);
    const fuzzy = tokens.length
      ? sql.join(tokens.map((t) => sql`word_similarity(${t}, bs.haystack) >= 0.5`), sql` and `)
      : sql`${qNorm} <% bs.haystack`;
    c.push(sql`(bs.doc @@ ${tsq} or (${fuzzy})${taxonMatch})`);
  }
  return { where: sql.join(c, sql` and `), tsq, qNorm };
}

const FROM = sql`
  from hospital_branch b
  join geography st on st.id = b.state_id
  join geography stl on stl.id = b.settlement_id
  left join geography loc on loc.id = b.locality_id
  left join branch_rating r on r.branch_id = b.id
  left join branch_search bs on bs.branch_id = b.id`;

const CARD_COLS = sql`
  b.id, b.public_id as "publicId", b.slug, b.display_name as "displayName",
  b.branch_qualifier as "branchQualifier", b.facility_type as "facilityType", b.ownership,
  loc.name as locality, stl.name as settlement, stl.slug as "settlementSlug", st.name as state, st.slug as "stateSlug",
  case when b.has_emergency in ('yes','no')
        and b.emergency_checked_at > now() - make_interval(days => ${POLICY.refreshDays.emergency})
       then b.has_emergency::text end as emergency,
  exists (select 1 from credential cr where cr.branch_id = b.id
    and cr.category = 'hospital_accreditation' and cr.status = 'checked_against_source'
    and (cr.expires_on is null or cr.expires_on >= current_date)) as accredited,
  b.last_checked_at as "lastCheckedAt",
  coalesce(r.review_count, 0)::int as "nativeReviewCount", coalesce(r.rating_sum, 0)::int as "nativeRatingSum",
  (select c.value from branch_contact c
    where c.branch_id = b.id and c.status = 'checked_against_source' and not c.is_suppressed
      and c.role in ('switchboard','opd','admissions')
    order by array_position(array['switchboard','opd','admissions']::text[], c.role::text) limit 1) as phone,
  case when b.lat is not null and b.coord_precision in ('rooftop','street')
       then json_build_object('lat', b.lat, 'lng', b.lng) end as directions,
  (select coalesce(json_agg(json_build_object('name', x.name, 'status', x.status)), '[]'::json) from (
      select coalesce(v.name, s.name) as name, o.status
      from branch_offering o
      left join service v on v.id = o.service_id
      left join specialty s on s.id = o.specialty_id
      where o.branch_id = b.id and o.ended_at is null and o.source_record_id is not null and o.status in ${PUBLIC_STATUS}
      group by coalesce(v.name, s.name), o.status, s.sort_order
      order by s.sort_order nulls last, coalesce(v.name, s.name)
      limit ${POLICY.cardServiceChips}) x) as "serviceChips",
  (select coalesce(json_agg(json_build_object('provider', p.name, 'code', p.code, 'url', l.url) order by p.name), '[]'::json)
     from branch_source_link l join external_provider p on p.id = l.provider_id
    where l.branch_id = b.id and l.match_status = 'confirmed_branch' and l.is_healthy and p.is_enabled) as "sourceLinks"`;

export type ListResult = {
  items: BranchCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** True when ?page= points past the last page (§22: return 404). */
  outOfRange: boolean;
  matchedTaxa: Taxon[];
};

export async function listBranches(f: ListFilters): Promise<ListResult> {
  const pageSize = Math.min(Math.max(1, f.pageSize ?? POLICY.pageSize), POLICY.maxApiPageSize);
  const page = Math.max(1, f.page ?? 1);
  const matchedTaxa = f.q ? await resolveTaxa(f.q) : [];
  const { where, tsq, qNorm } = whereClauses(f, matchedTaxa);

  // SRH-04 default order: exact/alias name → exact specialty or service → text relevance → completeness → stable id.
  let order: SQL;
  if (f.sort === "rating") {
    // SRH-05: needs five active native reviews; ties by count then id; ineligible branches grouped afterwards.
    order = sql`(coalesce(r.review_count, 0) >= ${POLICY.ratingSortMinReviews}) desc,
      case when coalesce(r.review_count, 0) >= ${POLICY.ratingSortMinReviews}
           then r.rating_sum::numeric / r.review_count end desc nulls last,
      coalesce(r.review_count, 0) desc, b.id`;
  } else if (tsq && qNorm) {
    const taxonTier = matchedTaxa.length
      ? sql`exists (select 1 from branch_offering o where o.branch_id = b.id and o.ended_at is null
          and o.status in ${PUBLIC_STATUS}
          and (o.specialty_id::text in ${inList(matchedTaxa.map((t) => t.id))}
            or o.service_id::text in ${inList(matchedTaxa.map((t) => t.id))}))`
      : sql`(b.id is null)`; // a bare constant is not allowed in ORDER BY
    order = sql`
      (lower(unaccent(b.display_name)) = ${qNorm}
        or exists (select 1 from branch_alias a where a.branch_id = b.id and a.normalized = ${qNorm})) desc,
      ${taxonTier} desc,
      ts_rank_cd(bs.doc, ${tsq}) desc,
      word_similarity(${qNorm}, bs.haystack) desc,
      b.completeness desc, b.id`;
  } else {
    order = sql`b.completeness desc, b.display_name, b.id`;
  }

  const [countRows, items] = await Promise.all([
    many<{ total: number }>(sql`select count(*)::int as total ${FROM} where ${where}`),
    many<BranchCard>(sql`select ${CARD_COLS} ${FROM} where ${where}
      order by ${order} limit ${pageSize} offset ${(page - 1) * pageSize}`),
  ]);
  const total = countRows[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, pageCount, outOfRange: page > pageCount, matchedTaxa };
}

/** Facet counts inside the geography scope and text query, ignoring the other filters. */
export async function listFacets(f: ListFilters) {
  const taxa = f.q ? await resolveTaxa(f.q) : [];
  const { where } = whereClauses({ scope: f.scope, q: f.q }, taxa);
  const [facilityTypes, ownerships, specialties, localities] = await Promise.all([
    many<{ value: string; count: number }>(
      sql`select b.facility_type::text as value, count(*)::int as count ${FROM} where ${where} group by 1 order by 2 desc`,
    ),
    many<{ value: string; count: number }>(
      sql`select b.ownership::text as value, count(*)::int as count ${FROM}
          where ${where} and b.ownership is not null group by 1 order by 2 desc`,
    ),
    many<{ value: string; label: string; count: number }>(
      sql`select s.slug as value, s.name as label, count(distinct b.id)::int as count ${FROM}
          join branch_offering o on o.branch_id = b.id and o.ended_at is null and o.status in ${PUBLIC_STATUS}
          join specialty s on s.id = o.specialty_id
          where ${where} group by s.slug, s.name, s.sort_order order by s.sort_order`,
    ),
    many<{ value: string; label: string; count: number }>(
      sql`select loc.slug as value, loc.name as label, count(*)::int as count ${FROM}
          where ${where} and loc.id is not null group by loc.slug, loc.name order by loc.name`,
    ),
  ]);
  return { facilityTypes, ownerships, specialties, localities };
}

/** How many indexable branches a taxonomy hub has inside a geography (SEO-01). */
export async function countIndexable(f: Pick<ListFilters, "scope" | "specialtyIds" | "serviceIds">): Promise<number> {
  const { where } = whereClauses(f, []);
  const rows = await many<{ n: number }>(sql`select count(*)::int as n ${FROM} where ${where} and b.is_indexable`);
  return rows[0]?.n ?? 0;
}

export async function hasApprovedHubContent(key: {
  geographyId?: string | null;
  specialtyId?: string | null;
  serviceId?: string | null;
}): Promise<{ guidance: string; editorialOwner: string | null; reviewedAt: string } | null> {
  const rows = await many<{ guidance: string; editorialOwner: string | null; reviewedAt: string }>(sql`
    select h.guidance, h.editorial_owner as "editorialOwner", h.reviewed_at as "reviewedAt"
    from hub_content h
    where h.is_approved and h.reviewed_at is not null and h.locale = 'en'
      and h.geography_id is not distinct from ${key.geographyId ?? null}::uuid
      and h.specialty_id is not distinct from ${key.specialtyId ?? null}::uuid
      and h.service_id is not distinct from ${key.serviceId ?? null}::uuid
    limit 1`);
  return rows[0] ?? null;
}

/* ───────────────────────────── typeahead ───────────────────────────── */

export async function suggestBranches(q: string, limit = 6) {
  const norm = normalize(q);
  return many<{ publicId: string; slug: string; name: string; qualifier: string | null; place: string }>(sql`
    select b.public_id as "publicId", b.slug, b.display_name as name, b.branch_qualifier as qualifier,
           stl.name || ', ' || st.name as place
    ${FROM}
    where b.status = 'published' and (bs.haystack like ${"%" + norm + "%"} or ${norm} <% bs.haystack)
    order by (bs.haystack like ${norm + "%"}) desc, word_similarity(${norm}, bs.haystack) desc, b.completeness desc, b.id
    limit ${limit}`);
}

export async function suggestTaxa(q: string, limit = 6): Promise<Taxon[]> {
  const norm = normalize(q);
  return many(sql`
    select * from (
      select s.id, s.slug, s.name, s.plain_label as "plainLabel", 'specialty' as kind,
             greatest(similarity(lower(s.name), ${norm}), similarity(lower(coalesce(s.plain_label,'')), ${norm})) as score,
             (lower(s.name) like ${norm + "%"} or lower(coalesce(s.plain_label,'')) like ${norm + "%"}
               or exists (select 1 from taxonomy_synonym y where y.specialty_id = s.id and y.reviewed_at is not null
                          and y.normalized like ${norm + "%"})) as prefix
      from specialty s where s.is_active
      union all
      select v.id, v.slug, v.name, v.plain_label, 'service',
             greatest(similarity(lower(v.name), ${norm}), similarity(lower(coalesce(v.plain_label,'')), ${norm})),
             (lower(v.name) like ${norm + "%"} or lower(coalesce(v.plain_label,'')) like ${norm + "%"}
               or exists (select 1 from taxonomy_synonym y where y.service_id = v.id and y.reviewed_at is not null
                          and y.normalized like ${norm + "%"}))
      from service v where v.is_active
    ) t where t.prefix or t.score > 0.3
    order by t.prefix desc, t.score desc, t.name limit ${limit}`);
}

/** NAV-01 / §04: taxonomy hubs inside a settlement that already meet the SEO-01 threshold. */
export function qualifyingTaxonHubs(settlementId: string) {
  return many<{ kind: "specialty" | "service"; slug: string; name: string; branches: number }>(sql`
    select case when h.specialty_id is not null then 'specialty' else 'service' end as kind,
           coalesce(s.slug, v.slug) as slug, coalesce(s.name, v.name) as name, count(distinct b.id)::int as branches
    from hub_content h
    left join specialty s on s.id = h.specialty_id
    left join service v on v.id = h.service_id
    join branch_offering o on o.ended_at is null and o.status in ${PUBLIC_STATUS}
      and (o.specialty_id = h.specialty_id or o.service_id = h.service_id)
    join hospital_branch b on b.id = o.branch_id and b.settlement_id = h.geography_id and b.is_indexable
    where h.geography_id = ${settlementId} and h.is_approved and h.reviewed_at is not null
      and num_nonnulls(h.specialty_id, h.service_id) = 1
    group by 1, 2, 3
    having count(distinct b.id) >= ${POLICY.index.taxonomyHubMinBranches}::int
    order by 3`);
}

/** §05 acceptance example: the broader specialty behind a service, offered as a labelled suggestion. */
export function parentSpecialties(serviceId: string): Promise<Taxon[]> {
  return many(sql`select s.id, s.slug, s.name, s.plain_label as "plainLabel", 'specialty' as kind
    from service_specialty x join specialty s on s.id = x.specialty_id where x.service_id = ${serviceId} and s.is_active`);
}
