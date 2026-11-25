/**
 * Public directory model (SRS §25).
 *
 * Everything in this file lives in the `public` Postgres schema and holds
 * only data that is safe to publish or that describes publishable facts.
 * Patient, evidence and staff data lives in `restricted.ts`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const stamps = {
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
};

/* ───────────────────────────── enums ───────────────────────────── */

export const geoKind = pgEnum("geo_kind", [
  "state",
  "union_territory",
  "district",
  "subdistrict",
  "settlement",
  "locality",
]);
export const settlementKind = pgEnum("settlement_kind", ["city", "town", "village"]);
export const aliasKind = pgEnum("alias_kind", [
  "alias",
  "former_name",
  "transliteration",
  "local_script",
  "common_spelling",
]);

/** OPS-06 lifecycle. Only `published` counts in active listings. */
export const branchStatus = pgEnum("branch_status", [
  "staged",
  "checked",
  "published",
  "disputed",
  "temporarily_closed",
  "permanently_closed",
  "duplicate",
  "retired",
]);
export const facilityType = pgEnum("facility_type", [
  "general_hospital",
  "multispecialty_hospital",
  "specialty_hospital",
  "teaching_hospital",
  "nursing_home",
  "community_health_centre",
  "primary_health_centre",
  "day_care_centre",
  "clinic",
  "diagnostic_centre",
  "other",
]);
export const ownership = pgEnum("ownership", ["government", "private", "charitable", "ppp", "other"]);
/** PRO-01: unknown, explicitly unavailable and not applicable are distinct stored states. */
export const triState = pgEnum("tri_state", ["yes", "no", "unknown", "not_applicable"]);
export const coordPrecision = pgEnum("coord_precision", [
  "rooftop",
  "street",
  "locality_centroid",
  "settlement_centroid",
  "unknown",
]);
/** PRD-03 trust labels map onto these. */
export const verification = pgEnum("verification_status", [
  "unverified",
  "hospital_supplied",
  "checked_against_source",
  "conflicting",
  "expired",
  "withdrawn",
]);
export const contactRole = pgEnum("contact_role", [
  "switchboard",
  "opd",
  "admissions",
  "emergency",
  "ambulance",
  "tpa_desk",
  "patient_relations",
  "email",
  "website",
  "contact_page",
  "appointment_url",
]);
export const hoursPurpose = pgEnum("hours_purpose", ["general", "opd", "emergency", "pharmacy", "visiting", "diagnostics"]);
export const careSetting = pgEnum("care_setting", ["opd", "inpatient", "day_care", "emergency", "home", "unspecified"]);
export const availability = pgEnum("offering_availability", ["onsite", "partner", "referral", "unknown"]);
export const serviceKind = pgEnum("service_kind", ["department", "procedure", "programme", "diagnostic", "support"]);
export const capacityMetric = pgEnum("capacity_metric", [
  "total_beds",
  "operational_beds",
  "icu_beds",
  "nicu_beds",
  "picu_beds",
  "operating_theatres",
  "dialysis_stations",
  "isolation_rooms",
]);
export const payerKind = pgEnum("payer_kind", ["insurer", "tpa", "government_scheme"]);
/** `listed_by_hospital`: the hospital lists the payer but does not say what the arrangement is. */
export const payerMode = pgEnum("payer_mode", ["cashless", "reimbursement_assistance", "government_empanelment", "listed_by_hospital"]);
export const sourceKind = pgEnum("source_kind", [
  "authority_register",
  "hospital_submission",
  "editor_verified_public",
  "licensed_dataset",
  "open_dataset",
  /** The branch's or its network's own public website, read without the hospital submitting anything. */
  "hospital_website",
]);
export const linkMatch = pgEnum("link_match_status", ["proposed", "confirmed_branch", "network_level", "ambiguous", "rejected"]);
export const redirectKind = pgEnum("redirect_kind", ["rename", "merge", "geography_rename", "removed"]);

/* ─────────────────────────── geography (§02) ─────────────────────────── */

export const geography = pgTable(
  "geography",
  {
    id: id(),
    kind: geoKind("kind").notNull(),
    settlementKind: settlementKind("settlement_kind"),
    parentId: uuid("parent_id").references((): AnyPgColumn => geography.id, { onDelete: "restrict" }),
    /** Denormalised ancestors so listing queries never walk the tree. */
    stateId: uuid("state_id").references((): AnyPgColumn => geography.id, { onDelete: "restrict" }),
    districtId: uuid("district_id").references((): AnyPgColumn => geography.id, { onDelete: "restrict" }),
    settlementId: uuid("settlement_id").references((): AnyPgColumn => geography.id, { onDelete: "restrict" }),
    /** e.g. `lgd`, `iso-3166-2`. A code is unique only inside its namespace and validity interval. */
    codeNamespace: text("code_namespace"),
    externalCode: text("external_code"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** { "hi": "कर्नाटक", "kn": "ಕರ್ನಾಟಕ" } — only editorially reviewed names. */
    names: jsonb("names").$type<Record<string, string>>().notNull().default({}),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    isActive: boolean("is_active").notNull().default(true),
    hierarchyRevision: integer("hierarchy_revision").notNull().default(1),
    /** SEO-01: reviewed local context is part of the hub index threshold. */
    localContext: text("local_context"),
    localContextReviewedAt: ts("local_context_reviewed_at"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    ...stamps,
  },
  (t) => [
    uniqueIndex("geography_state_slug_uq").on(t.slug).where(sql`${t.kind} in ('state','union_territory')`),
    uniqueIndex("geography_district_slug_uq").on(t.stateId, t.slug).where(sql`${t.kind} = 'district'`),
    uniqueIndex("geography_settlement_slug_uq").on(t.stateId, t.slug).where(sql`${t.kind} = 'settlement'`),
    uniqueIndex("geography_locality_slug_uq").on(t.parentId, t.slug).where(sql`${t.kind} = 'locality'`),
    uniqueIndex("geography_subdistrict_slug_uq").on(t.parentId, t.slug).where(sql`${t.kind} = 'subdistrict'`),
    uniqueIndex("geography_code_uq")
      .on(t.codeNamespace, t.externalCode)
      .where(sql`${t.externalCode} is not null and ${t.validTo} is null`),
    index("geography_parent_idx").on(t.parentId),
    index("geography_state_kind_idx").on(t.stateId, t.kind),
    index("geography_name_trgm_idx").using("gin", sql`lower(${t.name}) gin_trgm_ops`),
    check("geography_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "geography_reserved_slug",
      sql`${t.slug} not in ('district','specialty','locality','service','search','compare')`,
    ),
    check(
      "geography_state_has_no_parent",
      sql`(${t.kind} in ('state','union_territory')) = (${t.parentId} is null)`,
    ),
    check("geography_settlement_kind", sql`(${t.kind} = 'settlement') = (${t.settlementKind} is not null)`),
    check("geography_validity", sql`${t.validTo} is null or ${t.validFrom} is null or ${t.validTo} >= ${t.validFrom}`),
  ],
);

export const geoAlias = pgTable(
  "geo_alias",
  {
    id: id(),
    geographyId: uuid("geography_id")
      .notNull()
      .references(() => geography.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    /** lower-cased, whitespace-collapsed form used for lookups. */
    normalized: text("normalized").notNull(),
    kind: aliasKind("kind").notNull().default("alias"),
    locale: text("locale"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("geo_alias_uq").on(t.geographyId, t.normalized),
    index("geo_alias_norm_idx").on(t.normalized),
    index("geo_alias_trgm_idx").using("gin", sql`${t.normalized} gin_trgm_ops`),
  ],
);

/** PIN ↔ place is many-to-many: a PIN never determines a unique branch or boundary. */
export const geoPincode = pgTable(
  "geo_pincode",
  {
    pincode: char("pincode", { length: 6 }).notNull(),
    geographyId: uuid("geography_id")
      .notNull()
      .references(() => geography.id, { onDelete: "cascade" }),
    sourceRecordId: uuid("source_record_id").references((): AnyPgColumn => sourceRecord.id),
  },
  (t) => [
    primaryKey({ columns: [t.pincode, t.geographyId] }),
    index("geo_pincode_geo_idx").on(t.geographyId),
    check("geo_pincode_format", sql`${t.pincode} ~ '^[1-9][0-9]{5}$'`),
  ],
);

/** Curated urban catchment: nearby settlements shown (labelled) on a city page. */
export const geoCatchment = pgTable(
  "geo_catchment",
  {
    hubId: uuid("hub_id")
      .notNull()
      .references(() => geography.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => geography.id, { onDelete: "cascade" }),
    note: text("note"),
  },
  (t) => [primaryKey({ columns: [t.hubId, t.memberId] }), check("geo_catchment_distinct", sql`${t.hubId} <> ${t.memberId}`)],
);

/* ───────────────────────── sources and provenance ───────────────────────── */

export const sourceRecord = pgTable(
  "source_record",
  {
    id: id(),
    kind: sourceKind("kind").notNull(),
    name: text("name").notNull(),
    url: text("url"),
    /** OPS-01: public lookup access alone is not a reuse right — record the basis. */
    rightsBasis: text("rights_basis").notNull(),
    licence: text("licence"),
    isPublic: boolean("is_public").notNull().default(true),
    observedAt: ts("observed_at").notNull().defaultNow(),
    rightsExpireAt: ts("rights_expire_at"),
    importBatchId: uuid("import_batch_id"),
    ...stamps,
  },
  (t) => [index("source_record_kind_idx").on(t.kind), index("source_record_rights_expiry_idx").on(t.rightsExpireAt)],
);

/* ───────────────────────── organisation and branch ───────────────────────── */

export const organisation = pgTable(
  "organisation",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    kind: text("kind").notNull().default("operator"),
    website: text("website"),
    ...stamps,
  },
  (t) => [check("organisation_kind", sql`${t.kind} in ('operator','trust','group','government_body')`)],
);

export const hospitalBranch = pgTable(
  "hospital_branch",
  {
    id: id(),
    /** Opaque, immutable suffix in the public URL: /hospital/{slug}-{public_id}. */
    publicId: text("public_id").notNull(),
    orgId: uuid("org_id").references(() => organisation.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    legalName: text("legal_name"),
    /** e.g. "HSR Layout" — keeps chain branches distinguishable (CARD-01). */
    branchQualifier: text("branch_qualifier"),
    facilityType: facilityType("facility_type").notNull().default("other"),
    ownership: ownership("ownership"),
    isTeaching: triState("is_teaching").notNull().default("unknown"),
    systemOfMedicine: text("system_of_medicine"),
    status: branchStatus("status").notNull().default("staged"),
    statusReason: text("status_reason"),
    statusEffectiveOn: date("status_effective_on"),

    stateId: uuid("state_id")
      .notNull()
      .references(() => geography.id, { onDelete: "restrict" }),
    districtId: uuid("district_id").references(() => geography.id, { onDelete: "restrict" }),
    /** Nullable only while staged: imports may lack a town; publishing needs one (check below). */
    settlementId: uuid("settlement_id").references(() => geography.id, { onDelete: "restrict" }),
    localityId: uuid("locality_id").references(() => geography.id, { onDelete: "restrict" }),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    landmark: text("landmark"),
    pincode: char("pincode", { length: 6 }),
    postalAddress: text("postal_address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    coordPrecision: coordPrecision("coord_precision").notNull().default("unknown"),
    coordSourceId: uuid("coord_source_id").references(() => sourceRecord.id),

    /** Each is verified independently; reception hours never imply an ED (§11). */
    hasEmergency: triState("has_emergency").notNull().default("unknown"),
    emergency24h: triState("emergency_24h").notNull().default("unknown"),
    emergencyCheckedAt: ts("emergency_checked_at"),

    overview: text("overview"),
    lastCheckedAt: ts("last_checked_at"),
    publishedAt: ts("published_at"),
    publishedRevisionId: uuid("published_revision_id"),
    /** Derived by lib/gates; never edited by hand. */
    completeness: smallint("completeness").notNull().default(0),
    passesPublicationGate: boolean("passes_publication_gate").notNull().default(false),
    isIndexable: boolean("is_indexable").notNull().default(false),
    /** Optimistic concurrency for ADM-03. */
    version: integer("version").notNull().default(1),
    ...stamps,
  },
  (t) => [
    uniqueIndex("hospital_branch_public_id_uq").on(t.publicId),
    index("hospital_branch_listing_idx").on(t.status, t.stateId, t.settlementId),
    index("hospital_branch_district_idx").on(t.status, t.districtId),
    index("hospital_branch_locality_idx").on(t.status, t.localityId),
    index("hospital_branch_org_idx").on(t.orgId),
    index("hospital_branch_pincode_idx").on(t.pincode),
    index("hospital_branch_name_trgm_idx").using("gin", sql`lower(${t.displayName}) gin_trgm_ops`),
    index("hospital_branch_browse_idx").on(t.settlementId, t.completeness.desc(), t.displayName, t.id),
    check("hospital_branch_public_id_format", sql`${t.publicId} ~ '^[a-z0-9]{6,12}$'`),
    check("hospital_branch_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("hospital_branch_pincode_format", sql`${t.pincode} is null or ${t.pincode} ~ '^[1-9][0-9]{5}$'`),
    check(
      "hospital_branch_coords",
      sql`(${t.lat} is null and ${t.lng} is null) or (${t.lat} between 6 and 38 and ${t.lng} between 68 and 98)`,
    ),
    check("hospital_branch_completeness", sql`${t.completeness} between 0 and 100`),
    /** DATA-06: a branch cannot be public without passing the gate. */
    check(
      "hospital_branch_published_needs_gate",
      sql`${t.status} <> 'published' or ${t.passesPublicationGate}`,
    ),
    check(
      "hospital_branch_published_needs_settlement",
      sql`${t.status} <> 'published' or ${t.settlementId} is not null`,
    ),
    check("hospital_branch_index_needs_publish", sql`not ${t.isIndexable} or ${t.status} = 'published'`),
  ],
);

/**
 * Denormalised search document (DB-01). Rebuilt by the SQL function
 * refresh_branch_search(branch_id) whenever a branch, its aliases or its
 * offerings change. Never written by hand.
 */
export const branchSearch = pgTable(
  "branch_search",
  {
    branchId: uuid("branch_id")
      .primaryKey()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    /** A = names and aliases, B = specialties/services/synonyms, C = place names. */
    doc: tsvector("doc").notNull(),
    /** Lower-cased, unaccented names for trigram typo tolerance. */
    haystack: text("haystack").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("branch_search_doc_idx").using("gin", t.doc),
    index("branch_search_trgm_idx").using("gin", sql`${t.haystack} gin_trgm_ops`),
  ],
);

export const branchAlias = pgTable(
  "branch_alias",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalized: text("normalized").notNull(),
    kind: aliasKind("kind").notNull().default("alias"),
    locale: text("locale"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("branch_alias_uq").on(t.branchId, t.normalized),
    index("branch_alias_trgm_idx").using("gin", sql`${t.normalized} gin_trgm_ops`),
  ],
);

/** NAV-02: former addresses resolve to the current one in a single hop. */
export const redirect = pgTable(
  "redirect",
  {
    id: id(),
    sourcePath: text("source_path").notNull(),
    /** null target + 410 = deliberately removed with no successor (§22). */
    targetPath: text("target_path"),
    httpStatus: smallint("http_status").notNull().default(308),
    kind: redirectKind("kind").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    reason: text("reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("redirect_live_source_uq").on(t.sourcePath).where(sql`${t.isActive}`),
    index("redirect_target_idx").on(t.targetPath),
    check("redirect_status", sql`${t.httpStatus} in (301, 308, 410)`),
    check("redirect_target_matches_status", sql`(${t.httpStatus} = 410) = (${t.targetPath} is null)`),
    check("redirect_no_self_loop", sql`${t.targetPath} is null or ${t.targetPath} <> ${t.sourcePath}`),
    check("redirect_path_format", sql`${t.sourcePath} like '/%'`),
  ],
);

export const branchIdentifier = pgTable(
  "branch_identifier",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    /** e.g. `hfr`, `nabh`, `pmjay`, `state-licence:ka`. */
    namespace: text("namespace").notNull(),
    value: text("value").notNull(),
    /** Provenance is required before an external identifier is treated as unique. */
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => sourceRecord.id),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("branch_identifier_live_uq").on(t.namespace, t.value).where(sql`${t.validTo} is null`),
    index("branch_identifier_branch_idx").on(t.branchId),
  ],
);

/* ───────────────────────────── taxonomy (§11) ───────────────────────────── */

export const specialty = pgTable(
  "specialty",
  {
    id: id(),
    code: text("code").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    plainLabel: text("plain_label"),
    labels: jsonb("labels").$type<Record<string, string>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    ...stamps,
  },
  (t) => [check("specialty_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
);

export const service = pgTable(
  "service",
  {
    id: id(),
    code: text("code").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    plainLabel: text("plain_label"),
    kind: serviceKind("kind").notNull(),
    labels: jsonb("labels").$type<Record<string, string>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    ...stamps,
  },
  (t) => [check("service_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
);

/** A service may sit in several clinical categories (DATA-02). */
export const serviceSpecialty = pgTable(
  "service_specialty",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    specialtyId: uuid("specialty_id")
      .notNull()
      .references(() => specialty.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.specialtyId] }), index("service_specialty_rev_idx").on(t.specialtyId)],
);

/** SRH-02: reviewed synonym list ("kidney dialysis" → dialysis). */
export const taxonomySynonym = pgTable(
  "taxonomy_synonym",
  {
    id: id(),
    term: text("term").notNull(),
    normalized: text("normalized").notNull(),
    locale: text("locale").notNull().default("en"),
    specialtyId: uuid("specialty_id").references(() => specialty.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => service.id, { onDelete: "cascade" }),
    reviewedAt: ts("reviewed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("taxonomy_synonym_uq").on(t.normalized, t.locale, t.specialtyId, t.serviceId).nullsNotDistinct(),
    index("taxonomy_synonym_trgm_idx").using("gin", sql`${t.normalized} gin_trgm_ops`),
    check("taxonomy_synonym_one_target", sql`num_nonnulls(${t.specialtyId}, ${t.serviceId}) = 1`),
  ],
);

export const branchOffering = pgTable(
  "branch_offering",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    specialtyId: uuid("specialty_id").references(() => specialty.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => service.id, { onDelete: "restrict" }),
    careSetting: careSetting("care_setting").notNull().default("unspecified"),
    availability: availability("availability").notNull().default("unknown"),
    status: verification("status").notNull().default("unverified"),
    appointmentNote: text("appointment_note"),
    evidenceUrl: text("evidence_url"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    /** null = current. */
    endedAt: ts("ended_at"),
    ...stamps,
  },
  (t) => [
    uniqueIndex("branch_offering_specialty_uq")
      .on(t.branchId, t.specialtyId, t.careSetting)
      .where(sql`${t.specialtyId} is not null and ${t.endedAt} is null`),
    uniqueIndex("branch_offering_service_uq")
      .on(t.branchId, t.serviceId, t.careSetting)
      .where(sql`${t.serviceId} is not null and ${t.endedAt} is null`),
    index("branch_offering_by_specialty_idx").on(t.specialtyId, t.branchId).where(sql`${t.endedAt} is null`),
    index("branch_offering_by_service_idx").on(t.serviceId, t.branchId).where(sql`${t.endedAt} is null`),
    check("branch_offering_one_target", sql`num_nonnulls(${t.specialtyId}, ${t.serviceId}) = 1`),
  ],
);

/* ─────────────────────── structured branch facts (§10–12) ─────────────────────── */

export const branchContact = pgTable(
  "branch_contact",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    role: contactRole("role").notNull(),
    /** E.164 for phones, absolute https URL for web roles, address for email. */
    value: text("value").notNull(),
    label: text("label"),
    isShared: boolean("is_shared").notNull().default(false),
    status: verification("status").notNull().default("unverified"),
    /** OPS-08: a suspect safety-critical number can be hidden at once. */
    isSuppressed: boolean("is_suppressed").notNull().default(false),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [
    index("branch_contact_branch_idx").on(t.branchId, t.role),
    check(
      "branch_contact_value_shape",
      sql`case
            when ${t.role} in ('website','contact_page','appointment_url') then ${t.value} ~ '^https://'
            when ${t.role} = 'email' then ${t.value} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
            else ${t.value} ~ '^\\+[1-9][0-9]{7,14}$'
          end`,
    ),
  ],
);

export const branchHours = pgTable(
  "branch_hours",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    purpose: hoursPurpose("purpose").notNull(),
    /** 0 = Monday … 6 = Sunday. */
    weekday: smallint("weekday").notNull(),
    opens: time("opens"),
    closes: time("closes"),
    /** closes < opens is legal only when the range crosses midnight. */
    crossesMidnight: boolean("crosses_midnight").notNull().default(false),
    is24h: boolean("is_24h").notNull().default(false),
    isClosed: boolean("is_closed").notNull().default(false),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    note: text("note"),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [
    index("branch_hours_branch_idx").on(t.branchId, t.purpose, t.weekday),
    check("branch_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check(
      "branch_hours_shape",
      sql`(${t.is24h} or ${t.isClosed}) = (${t.opens} is null and ${t.closes} is null)`,
    ),
    check(
      "branch_hours_order",
      sql`${t.opens} is null or ${t.crossesMidnight} = (${t.closes} <= ${t.opens})`,
    ),
    check(
      "branch_hours_effective",
      sql`${t.effectiveTo} is null or ${t.effectiveFrom} is null or ${t.effectiveTo} >= ${t.effectiveFrom}`,
    ),
  ],
);

export const branchCapacity = pgTable(
  "branch_capacity",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    metric: capacityMetric("metric").notNull(),
    value: integer("value").notNull(),
    definition: text("definition"),
    /** DATA-05: capacity always carries an as-of date; this is installed, not live, capacity. */
    asOf: date("as_of").notNull(),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    ...stamps,
  },
  (t) => [
    uniqueIndex("branch_capacity_uq").on(t.branchId, t.metric, t.asOf),
    check("branch_capacity_nonnegative", sql`${t.value} >= 0`),
  ],
);

export const branchAmenity = pgTable(
  "branch_amenity",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    /** Controlled code, e.g. `step_free_entrance`, `lift`, `accessible_toilet`, `parking`, `interpreter`. */
    code: text("code").notNull(),
    /** `accessibility` | `patient_support` | `facility`. */
    category: text("category").notNull(),
    state: triState("state").notNull().default("unknown"),
    note: text("note"),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [
    uniqueIndex("branch_amenity_uq").on(t.branchId, t.code),
    index("branch_amenity_filter_idx").on(t.code, t.state),
    check("branch_amenity_category", sql`${t.category} in ('accessibility','patient_support','facility')`),
  ],
);

export const branchPrice = pgTable(
  "branch_price",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    context: text("context"),
    serviceId: uuid("service_id").references(() => service.id),
    /** Integer paise. A single known price stores min only. */
    minPaise: bigint("min_paise", { mode: "number" }),
    maxPaise: bigint("max_paise", { mode: "number" }),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    inclusions: text("inclusions"),
    exclusions: text("exclusions"),
    sourceDate: date("source_date").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    ...stamps,
  },
  (t) => [
    index("branch_price_branch_idx").on(t.branchId),
    check("branch_price_some_value", sql`num_nonnulls(${t.minPaise}, ${t.maxPaise}) >= 1`),
    check("branch_price_nonnegative", sql`coalesce(${t.minPaise}, 0) >= 0 and coalesce(${t.maxPaise}, 0) >= 0`),
    check(
      "branch_price_range",
      sql`${t.minPaise} is null or ${t.maxPaise} is null or ${t.maxPaise} >= ${t.minPaise}`,
    ),
    check(
      "branch_price_effective",
      sql`${t.effectiveTo} is null or ${t.effectiveFrom} is null or ${t.effectiveTo} > ${t.effectiveFrom}`,
    ),
  ],
);

export const branchPayer = pgTable(
  "branch_payer",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    payerKind: payerKind("payer_kind").notNull(),
    payerCode: text("payer_code").notNull(),
    payerName: text("payer_name").notNull(),
    plan: text("plan"),
    mode: payerMode("mode").notNull(),
    empanelmentNo: text("empanelment_no"),
    effectiveFrom: date("effective_from"),
    expiresOn: date("expires_on"),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [
    index("branch_payer_branch_idx").on(t.branchId),
    index("branch_payer_filter_idx").on(t.payerCode, t.branchId),
    check(
      "branch_payer_dates",
      sql`${t.expiresOn} is null or ${t.effectiveFrom} is null or ${t.expiresOn} > ${t.effectiveFrom}`,
    ),
  ],
);

export const credential = pgTable(
  "credential",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    issuer: text("issuer").notNull(),
    /** `hospital_accreditation` | `laboratory_accreditation` | `certification` | `registration` | `licence`. */
    category: text("category").notNull(),
    programme: text("programme").notNull(),
    level: text("level"),
    certificateId: text("certificate_id"),
    scope: text("scope"),
    startsOn: date("starts_on"),
    expiresOn: date("expires_on"),
    registerUrl: text("register_url"),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [
    index("credential_branch_idx").on(t.branchId),
    index("credential_expiry_idx").on(t.expiresOn),
    check(
      "credential_category",
      sql`${t.category} in ('hospital_accreditation','laboratory_accreditation','certification','registration','licence')`,
    ),
    check("credential_dates", sql`${t.expiresOn} is null or ${t.startsOn} is null or ${t.expiresOn} > ${t.startsOn}`),
  ],
);

export const clinician = pgTable("clinician", {
  id: id(),
  publicName: text("public_name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Set only after identity matching (SEO-04). */
  doctorIndexUrl: text("doctor_index_url"),
  ...stamps,
});

export const affiliation = pgTable(
  "affiliation",
  {
    id: id(),
    clinicianId: uuid("clinician_id")
      .notNull()
      .references(() => clinician.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    specialtyId: uuid("specialty_id").references(() => specialty.id),
    designation: text("designation"),
    schedule: jsonb("schedule").$type<Record<string, string>>(),
    activeFrom: date("active_from"),
    activeTo: date("active_to"),
    status: verification("status").notNull().default("unverified"),
    sourceRecordId: uuid("source_record_id").references(() => sourceRecord.id),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [index("affiliation_branch_idx").on(t.branchId), index("affiliation_clinician_idx").on(t.clinicianId)],
);

export const mediaAsset = pgTable(
  "media_asset",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt").notNull().default(""),
    caption: text("caption"),
    credit: text("credit"),
    rightsBasis: text("rights_basis").notNull(),
    rightsExpireAt: ts("rights_expire_at"),
    focalX: doublePrecision("focal_x"),
    focalY: doublePrecision("focal_y"),
    isPublic: boolean("is_public").notNull().default(false),
    ...stamps,
  },
  (t) => [
    index("media_asset_branch_idx").on(t.branchId),
    check("media_asset_kind", sql`${t.kind} in ('photo','logo')`),
  ],
);

export const fieldAssertion = pgTable(
  "field_assertion",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    /** Dotted path of the public fact, e.g. `contact.emergency`, `identity.display_name`. */
    fieldPath: text("field_path").notNull(),
    value: jsonb("value"),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => sourceRecord.id),
    evidenceUrl: text("evidence_url"),
    observedAt: ts("observed_at").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    status: verification("status").notNull(),
    confidence: smallint("confidence"),
    editorId: uuid("editor_id"),
    decision: text("decision"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("field_assertion_branch_idx").on(t.branchId, t.fieldPath, t.observedAt.desc()),
    check("field_assertion_confidence", sql`${t.confidence} is null or ${t.confidence} between 0 and 100`),
  ],
);

/** Immutable public snapshots (ADM-03). */
export const branchRevision = pgTable(
  "branch_revision",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "restrict" }),
    revisionNo: integer("revision_no").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    editorId: uuid("editor_id"),
    reason: text("reason"),
    revertsRevisionId: uuid("reverts_revision_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("branch_revision_uq").on(t.branchId, t.revisionNo)],
);

/** SEO-01: reviewed guidance that a hub needs before it can be indexed. */
export const hubContent = pgTable(
  "hub_content",
  {
    id: id(),
    geographyId: uuid("geography_id").references(() => geography.id, { onDelete: "cascade" }),
    specialtyId: uuid("specialty_id").references(() => specialty.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => service.id, { onDelete: "cascade" }),
    locale: text("locale").notNull().default("en"),
    guidance: text("guidance").notNull(),
    editorialOwner: text("editorial_owner"),
    reviewedAt: ts("reviewed_at"),
    isApproved: boolean("is_approved").notNull().default(false),
    ...stamps,
  },
  (t) => [
    unique("hub_content_uq").on(t.geographyId, t.specialtyId, t.serviceId, t.locale).nullsNotDistinct(),
    check("hub_content_one_taxon", sql`num_nonnulls(${t.specialtyId}, ${t.serviceId}) <= 1`),
    check("hub_content_some_key", sql`num_nonnulls(${t.geographyId}, ${t.specialtyId}, ${t.serviceId}) >= 1`),
  ],
);

/* ─────────────────────── external review sources (§18) ─────────────────────── */

export const externalProvider = pgTable("external_provider", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  /** Link-only is the default until a rights row authorises more (EXT-02). */
  isEnabled: boolean("is_enabled").notNull().default(true),
  ...stamps,
});

export const branchSourceLink = pgTable(
  "branch_source_link",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => externalProvider.id, { onDelete: "restrict" }),
    url: text("url").notNull(),
    externalId: text("external_id"),
    matchStatus: linkMatch("match_status").notNull().default("proposed"),
    isHealthy: boolean("is_healthy").notNull().default(true),
    confirmedBy: uuid("confirmed_by"),
    lastCheckedAt: ts("last_checked_at"),
    ...stamps,
  },
  (t) => [
    uniqueIndex("branch_source_link_uq").on(t.providerId, t.branchId),
    uniqueIndex("branch_source_link_external_uq")
      .on(t.providerId, t.externalId)
      .where(sql`${t.externalId} is not null and ${t.matchStatus} = 'confirmed_branch'`),
    check("branch_source_link_https", sql`${t.url} ~ '^https://'`),
  ],
);

export const providerRights = pgTable(
  "provider_rights",
  {
    id: id(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => externalProvider.id, { onDelete: "restrict" }),
    signedBasis: text("signed_basis").notNull(),
    approvedFields: jsonb("approved_fields").$type<string[]>().notNull().default([]),
    approvedSurfaces: jsonb("approved_surfaces").$type<string[]>().notNull().default([]),
    territory: text("territory"),
    attribution: text("attribution"),
    retentionRule: text("retention_rule"),
    syncCadence: text("sync_cadence"),
    quota: text("quota"),
    owner: text("owner").notNull(),
    startsAt: ts("starts_at").notNull(),
    expiresAt: ts("expires_at"),
    /** The kill switch behind POST /admin/provider-rights/{id}/disable. */
    isActive: boolean("is_active").notNull().default(false),
    ...stamps,
  },
  (t) => [index("provider_rights_provider_idx").on(t.providerId, t.isActive)],
);

/* ─────────────────── public read models for native reviews (§26) ─────────────────── */

/**
 * Allow-listed projection. Deliberately has no private name, exact visit date,
 * phone, OTP, object key or match signal. Rebuildable from approved revisions.
 */
export const publicReview = pgTable(
  "public_review",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    /** Opaque handle to the restricted review thread; not a foreign key on purpose. */
    reviewRef: uuid("review_ref").notNull(),
    pseudonym: text("pseudonym").notNull().default("Patient"),
    body: text("body").notNull(),
    overall: smallint("overall").notNull(),
    dimensions: jsonb("dimensions").$type<Record<string, number>>().notNull().default({}),
    visitType: text("visit_type"),
    /** Month precision only — never the exact visit date. */
    visitMonth: date("visit_month"),
    publishedAt: ts("published_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("public_review_ref_uq").on(t.reviewRef),
    index("public_review_branch_idx").on(t.branchId, t.publishedAt.desc(), t.id),
    check("public_review_overall", sql`${t.overall} between 1 and 5`),
    check("public_review_body_len", sql`char_length(${t.body}) between 30 and 3000`),
    check("public_review_month", sql`${t.visitMonth} is null or extract(day from ${t.visitMonth}) = 1`),
  ],
);

export const branchRating = pgTable(
  "branch_rating",
  {
    branchId: uuid("branch_id")
      .primaryKey()
      .references(() => hospitalBranch.id, { onDelete: "cascade" }),
    reviewCount: integer("review_count").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    h1: integer("h1").notNull().default(0),
    h2: integer("h2").notNull().default(0),
    h3: integer("h3").notNull().default(0),
    h4: integer("h4").notNull().default(0),
    h5: integer("h5").notNull().default(0),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("branch_rating_nonnegative", sql`${t.reviewCount} >= 0 and ${t.ratingSum} >= 0`),
    check("branch_rating_histogram", sql`${t.h1} + ${t.h2} + ${t.h3} + ${t.h4} + ${t.h5} = ${t.reviewCount}`),
    check(
      "branch_rating_sum",
      sql`${t.h1} + 2 * ${t.h2} + 3 * ${t.h3} + 4 * ${t.h4} + 5 * ${t.h5} = ${t.ratingSum}`,
    ),
  ],
);
