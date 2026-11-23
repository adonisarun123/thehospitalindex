import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { POLICY } from "@/lib/policy";

const PUBLIC_STATUS = sql`('hospital_supplied','checked_against_source')`;

async function many<T>(q: SQL): Promise<T[]> {
  const { rows } = await db().execute(q);
  return rows as T[];
}

export type BranchCore = {
  id: string;
  publicId: string;
  slug: string;
  displayName: string;
  legalName: string | null;
  branchQualifier: string | null;
  facilityType: string;
  ownership: string | null;
  status: string;
  statusReason: string | null;
  orgName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  pincode: string | null;
  postalAddress: string | null;
  lat: number | null;
  lng: number | null;
  coordPrecision: string;
  hasEmergency: string;
  emergency24h: string;
  emergencyCheckedAt: string | null;
  emergencyIsCurrent: boolean;
  overview: string | null;
  lastCheckedAt: string | null;
  isIndexable: boolean;
  updatedAt: string;
  state: { name: string; slug: string };
  district: { name: string; slug: string } | null;
  settlement: { name: string; slug: string; kind: string | null };
  locality: { name: string; slug: string } | null;
  reviewCount: number;
  ratingSum: number;
  histogram: [number, number, number, number, number];
};

/** Lifecycle states that have a public page. Everything else is 404 (or a redirect row). */
export const PUBLIC_PAGE_STATUSES = ["published", "temporarily_closed", "permanently_closed", "disputed"] as const;

export async function getBranchCore(publicId: string): Promise<BranchCore | null> {
  const rows = await many<BranchCore>(sql`
    select b.id, b.public_id as "publicId", b.slug, b.display_name as "displayName", b.legal_name as "legalName",
      b.branch_qualifier as "branchQualifier", b.facility_type as "facilityType", b.ownership, b.status,
      b.status_reason as "statusReason", org.name as "orgName",
      b.address_line1 as "addressLine1", b.address_line2 as "addressLine2", b.landmark, b.pincode,
      b.postal_address as "postalAddress", b.lat, b.lng, b.coord_precision as "coordPrecision",
      b.has_emergency as "hasEmergency", b.emergency_24h as "emergency24h",
      b.emergency_checked_at as "emergencyCheckedAt",
      coalesce(b.emergency_checked_at > now() - make_interval(days => ${POLICY.refreshDays.emergency}), false) as "emergencyIsCurrent",
      b.overview, b.last_checked_at as "lastCheckedAt", b.is_indexable as "isIndexable", b.updated_at as "updatedAt",
      json_build_object('name', st.name, 'slug', st.slug) as state,
      case when dst.id is not null then json_build_object('name', dst.name, 'slug', dst.slug) end as district,
      json_build_object('name', stl.name, 'slug', stl.slug, 'kind', stl.settlement_kind) as settlement,
      case when loc.id is not null then json_build_object('name', loc.name, 'slug', loc.slug) end as locality,
      coalesce(r.review_count, 0)::int as "reviewCount", coalesce(r.rating_sum, 0)::int as "ratingSum",
      json_build_array(coalesce(r.h1,0), coalesce(r.h2,0), coalesce(r.h3,0), coalesce(r.h4,0), coalesce(r.h5,0)) as histogram
    from hospital_branch b
    join geography st on st.id = b.state_id
    join geography stl on stl.id = b.settlement_id
    left join geography dst on dst.id = b.district_id
    left join geography loc on loc.id = b.locality_id
    left join organisation org on org.id = b.org_id
    left join branch_rating r on r.branch_id = b.id
    where b.public_id = ${publicId}
      and b.status::text in (${sql.join(PUBLIC_PAGE_STATUSES.map((s) => sql`${s}`), sql`, `)})`);
  return rows[0] ?? null;
}

export type Sourced = { status: string; lastCheckedAt: string | null; sourceName: string | null; sourceUrl: string | null };

const SRC = sql`sr.name as "sourceName", case when sr.is_public then sr.url end as "sourceUrl"`;

export type Offering = Sourced & {
  kind: "specialty" | "service";
  serviceKind: string | null;
  name: string;
  plainLabel: string | null;
  slug: string;
  careSetting: string;
  availability: string;
  appointmentNote: string | null;
};
export type Contact = Sourced & { role: string; value: string; label: string | null; isShared: boolean };
export type Hours = Sourced & {
  purpose: string;
  weekday: number;
  opens: string | null;
  closes: string | null;
  crossesMidnight: boolean;
  is24h: boolean;
  isClosed: boolean;
  note: string | null;
};
export type Capacity = Sourced & { metric: string; value: number; asOf: string; definition: string | null };
export type Amenity = Sourced & { code: string; category: string; state: string; note: string | null };
export type Price = Sourced & {
  label: string;
  context: string | null;
  minPaise: number | null;
  maxPaise: number | null;
  inclusions: string | null;
  exclusions: string | null;
  sourceDate: string;
};
export type Payer = Sourced & {
  payerKind: string;
  payerName: string;
  plan: string | null;
  mode: string;
  expiresOn: string | null;
  isCurrent: boolean;
};
export type Credential = Sourced & {
  issuer: string;
  category: string;
  programme: string;
  level: string | null;
  scope: string | null;
  expiresOn: string | null;
  registerUrl: string | null;
};
export type Clinician = Sourced & { name: string; designation: string | null; department: string | null; doctorIndexUrl: string | null };
export type SourceLink = { provider: string; code: string; url: string };
export type PublicSource = { name: string; url: string | null; kind: string; observedAt: string };

export type BranchProfile = {
  offerings: Offering[];
  contacts: Contact[];
  hours: Hours[];
  capacity: Capacity[];
  amenities: Amenity[];
  prices: Price[];
  payers: Payer[];
  credentials: Credential[];
  clinicians: Clinician[];
  sourceLinks: SourceLink[];
  sources: PublicSource[];
  hasConflicts: boolean;
};

/**
 * Everything the profile renders. Only facts with a public trust status are
 * returned; expired credentials are dropped here so no code path can badge them.
 */
export async function getBranchProfile(branchId: string): Promise<BranchProfile> {
  const [offerings, contacts, hours, capacity, amenities, prices, payers, credentials, clinicians, sourceLinks, sources, conflicts] =
    await Promise.all([
      many<Offering>(sql`
        select case when o.service_id is not null then 'service' else 'specialty' end as kind, v.kind as "serviceKind",
          coalesce(v.name, s.name) as name, coalesce(v.plain_label, s.plain_label) as "plainLabel",
          coalesce(v.slug, s.slug) as slug, o.care_setting as "careSetting", o.availability,
          o.appointment_note as "appointmentNote", o.status, o.last_checked_at as "lastCheckedAt", ${SRC}
        from branch_offering o
        left join service v on v.id = o.service_id
        left join specialty s on s.id = o.specialty_id
        left join source_record sr on sr.id = o.source_record_id
        where o.branch_id = ${branchId} and o.ended_at is null and o.status in ${PUBLIC_STATUS}
        order by (o.specialty_id is null), s.sort_order, coalesce(v.name, s.name)`),
      many<Contact>(sql`
        select c.role, c.value, c.label, c.is_shared as "isShared", c.status, c.last_checked_at as "lastCheckedAt", ${SRC}
        from branch_contact c left join source_record sr on sr.id = c.source_record_id
        where c.branch_id = ${branchId} and not c.is_suppressed and c.status in ${PUBLIC_STATUS}
        order by c.role`),
      many<Hours>(sql`
        select h.purpose, h.weekday, to_char(h.opens, 'HH24:MI') as opens, to_char(h.closes, 'HH24:MI') as closes,
          h.crosses_midnight as "crossesMidnight", h.is_24h as "is24h", h.is_closed as "isClosed", h.note,
          h.status, h.last_checked_at as "lastCheckedAt", ${SRC}
        from branch_hours h left join source_record sr on sr.id = h.source_record_id
        where h.branch_id = ${branchId} and h.status in ${PUBLIC_STATUS}
          and (h.effective_to is null or h.effective_to >= current_date)
        order by h.purpose, h.weekday, h.opens`),
      many<Capacity>(sql`
        select distinct on (bc.metric) bc.metric, bc.value, bc.as_of::text as "asOf", bc.definition,
          bc.status, null::timestamptz as "lastCheckedAt", ${SRC}
        from branch_capacity bc left join source_record sr on sr.id = bc.source_record_id
        where bc.branch_id = ${branchId} and bc.status in ${PUBLIC_STATUS}
        order by bc.metric, bc.as_of desc`),
      many<Amenity>(sql`
        select a.code, a.category, a.state, a.note, a.status, a.last_checked_at as "lastCheckedAt", ${SRC}
        from branch_amenity a left join source_record sr on sr.id = a.source_record_id
        where a.branch_id = ${branchId} and a.status in ${PUBLIC_STATUS} and a.state in ('yes','no')
        order by a.category, a.code`),
      many<Price>(sql`
        select p.label, p.context, p.min_paise as "minPaise", p.max_paise as "maxPaise", p.inclusions, p.exclusions,
          p.source_date::text as "sourceDate", p.status, null::timestamptz as "lastCheckedAt", ${SRC}
        from branch_price p left join source_record sr on sr.id = p.source_record_id
        where p.branch_id = ${branchId} and p.status in ${PUBLIC_STATUS}
          and (p.effective_to is null or p.effective_to >= current_date)
        order by p.label`),
      many<Payer>(sql`
        select p.payer_kind as "payerKind", p.payer_name as "payerName", p.plan, p.mode,
          p.expires_on::text as "expiresOn",
          coalesce(p.last_checked_at > now() - make_interval(days => ${POLICY.refreshDays.payers}), false) as "isCurrent",
          p.status, p.last_checked_at as "lastCheckedAt", ${SRC}
        from branch_payer p left join source_record sr on sr.id = p.source_record_id
        where p.branch_id = ${branchId} and p.status in ${PUBLIC_STATUS}
          and (p.expires_on is null or p.expires_on >= current_date)
        order by p.payer_kind, p.payer_name`),
      many<Credential>(sql`
        select cr.issuer, cr.category, cr.programme, cr.level, cr.scope, cr.expires_on::text as "expiresOn",
          cr.register_url as "registerUrl", cr.status, cr.last_checked_at as "lastCheckedAt", ${SRC}
        from credential cr left join source_record sr on sr.id = cr.source_record_id
        where cr.branch_id = ${branchId} and cr.status = 'checked_against_source'
          and (cr.expires_on is null or cr.expires_on >= current_date)
        order by cr.category, cr.issuer`),
      many<Clinician>(sql`
        select cl.public_name as name, af.designation, s.name as department, cl.doctor_index_url as "doctorIndexUrl",
          af.status, af.last_checked_at as "lastCheckedAt", ${SRC}
        from affiliation af join clinician cl on cl.id = af.clinician_id
        left join specialty s on s.id = af.specialty_id
        left join source_record sr on sr.id = af.source_record_id
        where af.branch_id = ${branchId} and af.status = 'checked_against_source'
          and (af.active_to is null or af.active_to >= current_date)
        order by s.sort_order nulls last, cl.public_name`),
      many<SourceLink>(sql`
        select p.name as provider, p.code, l.url
        from branch_source_link l join external_provider p on p.id = l.provider_id
        where l.branch_id = ${branchId} and l.match_status = 'confirmed_branch' and l.is_healthy and p.is_enabled
        order by p.name`),
      many<PublicSource>(sql`
        select distinct on (sr.id) sr.name, sr.url, sr.kind, to_char(sr.observed_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as "observedAt"
        from field_assertion fa join source_record sr on sr.id = fa.source_record_id
        where fa.branch_id = ${branchId} and sr.is_public and fa.status in ${PUBLIC_STATUS}
        order by sr.id`),
      many<{ n: number }>(sql`
        select count(*)::int as n from field_assertion fa where fa.branch_id = ${branchId} and fa.status = 'conflicting'`),
    ]);
  return {
    offerings,
    contacts,
    hours,
    capacity,
    amenities,
    prices,
    payers,
    credentials,
    clinicians,
    sourceLinks,
    sources,
    hasConflicts: (conflicts[0]?.n ?? 0) > 0,
  };
}

export type PublicReview = {
  id: string;
  pseudonym: string;
  body: string;
  overall: number;
  visitType: string | null;
  visitMonth: string | null;
  publishedAt: string;
};

/** Keyset pagination on (published_at, id). Cursor is opaque to callers. */
export async function listReviews(branchId: string, opts: { cursor?: string | null; limit?: number } = {}) {
  const limit = Math.min(Math.max(1, opts.limit ?? 10), POLICY.maxApiPageSize);
  let after: SQL = sql``;
  if (opts.cursor) {
    const decoded = Buffer.from(opts.cursor, "base64url").toString("utf8");
    const [at, id] = decoded.split("|");
    if (!at || !/^[0-9a-f-]{36}$/.test(id ?? "") || Number.isNaN(Date.parse(at))) return null;
    after = sql`and (pr.published_at, pr.id) < (${at}::timestamptz, ${id}::uuid)`;
  }
  const rows = await many<PublicReview & { cursorAt: string }>(sql`
    select pr.id, pr.pseudonym, pr.body, pr.overall, pr.visit_type as "visitType",
      to_char(pr.visit_month, 'YYYY-MM') as "visitMonth",
      to_char(pr.published_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as "publishedAt",
      pr.published_at::text as "cursorAt"
    from public_review pr
    where pr.branch_id = ${branchId} ${after}
    order by pr.published_at desc, pr.id desc
    limit ${limit + 1}`);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const next = hasMore && last ? Buffer.from(`${last.cursorAt}|${last.id}`).toString("base64url") : null;
  return { items: page.map((r): PublicReview => ({ id: r.id, pseudonym: r.pseudonym, body: r.body, overall: r.overall, visitType: r.visitType, visitMonth: r.visitMonth, publishedAt: r.publishedAt })), next };
}

export async function findRedirect(path: string): Promise<{ targetPath: string | null; httpStatus: number } | null> {
  const rows = await many<{ targetPath: string | null; httpStatus: number }>(sql`
    select r.target_path as "targetPath", r.http_status as "httpStatus"
    from redirect r where r.source_path = ${path} and r.is_active limit 1`);
  return rows[0] ?? null;
}
