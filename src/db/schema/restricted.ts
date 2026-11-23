/**
 * Restricted model for reviews, evidence, access and operations (SRS §26).
 *
 * Everything here lives in the `restricted` Postgres schema. The public
 * renderer never queries it; it reads the allow-listed projections in
 * `public.ts` (public_review, branch_rating) instead.
 *
 * Hard rules encoded below:
 *  - no document bytes, raw OCR text or raw phone numbers in any column
 *  - phone numbers are stored as ciphertext plus a separately keyed lookup digest
 *  - audit and consent tables are append-only by convention (enforced by grants)
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const restricted = pgSchema("restricted");

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const stamps = {
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
};
/** Branch ids are plain uuids here: the restricted role does not own public tables. */
const branchRef = (name = "branch_id") => uuid(name);

/* ───────────────────────────── enums ───────────────────────────── */

export const reviewState = restricted.enum("review_state", [
  "draft",
  "submitted",
  "checking",
  "needs_clarification",
  "visit_matched",
  "editorial_review",
  "published",
  "declined",
  "suspended",
  "removed",
  "withdrawn",
]);
export const scanState = restricted.enum("scan_state", ["pending", "clean", "infected", "unsupported", "failed"]);
export const caseState = restricted.enum("case_state", ["open", "assigned", "awaiting_requester", "resolved", "closed"]);
export const staffRole = restricted.enum("staff_role", [
  "geographic_editor",
  "evidence_verifier",
  "content_moderator",
  "appeals_lead",
  "privacy_lead",
  "platform_admin",
]);
export const otpPurpose = restricted.enum("otp_purpose", ["login", "account_deletion", "evidence_reconsent", "number_change"]);
export const jobState = restricted.enum("job_state", ["pending", "running", "succeeded", "failed", "dead_letter"]);

/* ─────────────────────── patient account and session (§14) ─────────────────────── */

export const account = restricted.table("account", {
  id: id(),
  status: text("status").notNull().default("active"),
  /** REV-01: adult self-review attestation, versioned. */
  adultAttestedAt: ts("adult_attested_at"),
  deletedAt: ts("deleted_at"),
  ...stamps,
});

export const identity = restricted.table(
  "identity",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "cascade" }),
    /** AES-GCM ciphertext of the E.164 number; key lives outside the database. */
    mobileCiphertext: bytea("mobile_ciphertext").notNull(),
    mobileKeyVersion: smallint("mobile_key_version").notNull(),
    /** HMAC of the E.164 number under a separate lookup key. */
    mobileLookup: bytea("mobile_lookup").notNull(),
    lookupKeyVersion: smallint("lookup_key_version").notNull(),
    verifiedAt: ts("verified_at").notNull(),
    lastVerifiedAt: ts("last_verified_at").notNull(),
    /** null = the current binding. */
    releasedAt: ts("released_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("identity_current_account_uq").on(t.accountId).where(sql`${t.releasedAt} is null`),
    uniqueIndex("identity_current_mobile_uq")
      .on(t.mobileLookup, t.lookupKeyVersion)
      .where(sql`${t.releasedAt} is null`),
  ],
);

export const session = restricted.table(
  "session",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "cascade" }),
    tokenHash: bytea("token_hash").notNull(),
    rotatedFromId: uuid("rotated_from_id"),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    lastSeenAt: ts("last_seen_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("session_token_uq").on(t.tokenHash), index("session_account_idx").on(t.accountId, t.expiresAt)],
);

export const otpChallenge = restricted.table(
  "otp_challenge",
  {
    id: id(),
    mobileLookup: bytea("mobile_lookup").notNull(),
    purpose: otpPurpose("purpose").notNull(),
    /** Keyed digest of the code, or the provider's verification token. Never the code. */
    codeDigest: bytea("code_digest"),
    providerRef: text("provider_ref"),
    attempts: smallint("attempts").notNull().default(0),
    maxAttempts: smallint("max_attempts").notNull().default(5),
    expiresAt: ts("expires_at").notNull(),
    resendAfter: ts("resend_after").notNull(),
    consumedAt: ts("consumed_at"),
    /** AUTH-02: a resend supersedes the previous code. */
    supersededAt: ts("superseded_at"),
    deliveryStatus: text("delivery_status"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("otp_one_active_uq")
      .on(t.mobileLookup, t.purpose)
      .where(sql`${t.consumedAt} is null and ${t.supersededAt} is null`),
    index("otp_expiry_idx").on(t.expiresAt),
    check("otp_attempts", sql`${t.attempts} >= 0 and ${t.attempts} <= ${t.maxAttempts}`),
    check("otp_has_verifier", sql`num_nonnulls(${t.codeDigest}, ${t.providerRef}) >= 1`),
  ],
);

/* ─────────────────────────── reviews (§14, §17) ─────────────────────────── */

export const review = restricted.table(
  "review",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "restrict" }),
    branchId: branchRef().notNull(),
    state: reviewState("state").notNull().default("draft"),
    caseReference: text("case_reference").notNull(),
    publishedRevisionId: uuid("published_revision_id"),
    /** Set when a merge leaves the branch unestablished (OPS-05). */
    isQuarantined: boolean("is_quarantined").notNull().default(false),
    submittedAt: ts("submitted_at"),
    decidedAt: ts("decided_at"),
    withdrawnAt: ts("withdrawn_at"),
    version: integer("version").notNull().default(1),
    ...stamps,
  },
  (t) => [
    /** MOD-02: one review thread per account per branch, safe under concurrency. */
    uniqueIndex("review_account_branch_uq").on(t.accountId, t.branchId),
    uniqueIndex("review_case_reference_uq").on(t.caseReference),
    index("review_queue_idx").on(t.state, t.submittedAt),
    index("review_branch_idx").on(t.branchId, t.state),
    check(
      "review_published_has_revision",
      sql`${t.state} <> 'published' or ${t.publishedRevisionId} is not null`,
    ),
  ],
);

export const reviewRevision = restricted.table(
  "review_revision",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    revisionNo: integer("revision_no").notNull(),
    overall: smallint("overall").notNull(),
    dimensions: jsonb("dimensions").$type<Record<string, number>>().notNull().default({}),
    body: text("body").notNull(),
    visitType: text("visit_type"),
    departmentSpecialtyId: uuid("department_specialty_id"),
    /** Private matching fields. Purged with the evidence (EVD retention table). */
    privatePatientName: text("private_patient_name"),
    privateVisitDate: date("private_visit_date"),
    privateFieldsPurgedAt: ts("private_fields_purged_at"),
    /** `pending` | `approved` | `rejected` | `superseded`. */
    status: text("status").notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("review_revision_no_uq").on(t.reviewId, t.revisionNo),
    check("review_revision_overall", sql`${t.overall} between 1 and 5`),
    check("review_revision_body_len", sql`char_length(${t.body}) between 30 and 3000`),
    check("review_revision_status", sql`${t.status} in ('pending','approved','rejected','superseded')`),
  ],
);

/** VER-01: all four checks must be true before a revision can publish. */
export const encounterCheck = restricted.table(
  "encounter_check",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => reviewRevision.id, { onDelete: "cascade" }),
    documentKindOk: boolean("document_kind_ok").notNull().default(false),
    branchAndDateOk: boolean("branch_and_date_ok").notNull().default(false),
    patientNameOk: boolean("patient_name_ok").notNull().default(false),
    accountLinkOk: boolean("account_link_ok").notNull().default(false),
    /** `otp_mobile_on_document` | `hospital_confirmation`. */
    linkMethod: text("link_method"),
    outcome: text("outcome").notNull().default("pending"),
    reasonCode: text("reason_code"),
    verifierId: uuid("verifier_id"),
    secondVerifierId: uuid("second_verifier_id"),
    decidedAt: ts("decided_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("encounter_check_review_idx").on(t.reviewId),
    check("encounter_check_outcome", sql`${t.outcome} in ('pending','matched','needs_clarification','declined','held')`),
    check(
      "encounter_check_matched_needs_all_four",
      sql`${t.outcome} <> 'matched' or (${t.documentKindOk} and ${t.branchAndDateOk} and ${t.patientNameOk} and ${t.accountLinkOk} and ${t.linkMethod} is not null)`,
    ),
    check(
      "encounter_check_link_method",
      sql`${t.linkMethod} is null or ${t.linkMethod} in ('otp_mobile_on_document','hospital_confirmation')`,
    ),
  ],
);

/* ─────────────────────────── evidence (§16) ─────────────────────────── */

export const legalHold = restricted.table(
  "legal_hold",
  {
    id: id(),
    ownerStaffId: uuid("owner_staff_id").notNull(),
    reason: text("reason").notNull(),
    reviewOn: date("review_on").notNull(),
    releasedAt: ts("released_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("legal_hold_open_idx").on(t.reviewOn).where(sql`${t.releasedAt} is null`)],
);

export const evidenceObject = restricted.table(
  "evidence_object",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "restrict" }),
    branchId: branchRef().notNull(),
    /** Random opaque key in the private quarantine bucket. No file bytes in Postgres. */
    storageKey: text("storage_key").notNull(),
    objectVersion: text("object_version").notNull(),
    previewKey: text("preview_key"),
    contentType: text("content_type").notNull(),
    byteCount: integer("byte_count").notNull(),
    pageCount: smallint("page_count"),
    scanState: scanState("scan_state").notNull().default("pending"),
    uploadCompletedAt: ts("upload_completed_at"),
    retentionDeadline: ts("retention_deadline"),
    holdId: uuid("hold_id").references(() => legalHold.id),
    purgedAt: ts("purged_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("evidence_object_key_uq").on(t.storageKey, t.objectVersion),
    index("evidence_object_review_idx").on(t.reviewId),
    index("evidence_object_expiry_idx").on(t.retentionDeadline).where(sql`${t.purgedAt} is null`),
    check("evidence_object_type", sql`${t.contentType} in ('application/pdf','image/jpeg','image/png')`),
    check("evidence_object_size", sql`${t.byteCount} > 0 and ${t.byteCount} <= 10485760`),
    check("evidence_object_pages", sql`${t.pageCount} is null or ${t.pageCount} between 1 and 5`),
  ],
);

export const evidenceMatch = restricted.table(
  "evidence_match",
  {
    id: id(),
    evidenceObjectId: uuid("evidence_object_id")
      .notNull()
      .references(() => evidenceObject.id, { onDelete: "cascade" }),
    encounterCheckId: uuid("encounter_check_id").references(() => encounterCheck.id, { onDelete: "set null" }),
    /** Small decision codes only, e.g. { branch: "ok", date: "ok", name: "variant" }. */
    matchedFields: jsonb("matched_fields").$type<Record<string, string>>().notNull().default({}),
    /** Keyed anti-reuse signal for the encounter. Pseudonymous personal data: 180-day default. */
    encounterSignature: bytea("encounter_signature"),
    signatureKeyVersion: smallint("signature_key_version"),
    signatureExpiresAt: ts("signature_expires_at"),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    /** One approved review per encounter; closes the reuse race without exposing the other account. */
    uniqueIndex("evidence_match_signature_uq")
      .on(t.encounterSignature, t.signatureKeyVersion)
      .where(sql`${t.isApproved} and ${t.encounterSignature} is not null`),
    index("evidence_match_signature_expiry_idx").on(t.signatureExpiresAt),
  ],
);

/* ─────────────────────── consent, rights and holds (§29) ─────────────────────── */

export const consentEvent = restricted.table(
  "consent_event",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "restrict" }),
    reviewId: uuid("review_id").references(() => review.id, { onDelete: "set null" }),
    /** `review_terms` | `evidence_processing` | `hospital_confirmation` | `public_publication` | `marketing`. */
    purpose: text("purpose").notNull(),
    policyVersion: text("policy_version").notNull(),
    locale: text("locale").notNull().default("en"),
    /** `granted` | `withdrawn`. */
    action: text("action").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("consent_event_account_idx").on(t.accountId, t.purpose, t.createdAt.desc()),
    check("consent_event_action", sql`${t.action} in ('granted','withdrawn')`),
    check(
      "consent_event_purpose",
      sql`${t.purpose} in ('review_terms','evidence_processing','hospital_confirmation','public_publication','marketing')`,
    ),
  ],
);

export const rightsCase = restricted.table(
  "rights_case",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    accountId: uuid("account_id").references(() => account.id, { onDelete: "set null" }),
    /** `access` | `correction` | `erasure` | `withdrawal` | `grievance` | `number_rebind`. */
    kind: text("kind").notNull(),
    state: caseState("state").notNull().default("open"),
    ownerStaffId: uuid("owner_staff_id"),
    dueOn: date("due_on"),
    resolution: text("resolution"),
    downstreamComplete: boolean("downstream_complete").notNull().default(false),
    resolvedAt: ts("resolved_at"),
    ...stamps,
  },
  (t) => [index("rights_case_queue_idx").on(t.state, t.dueOn)],
);

/* ─────────────────────── moderation and appeals (§17) ─────────────────────── */

export const moderationCase = restricted.table(
  "moderation_case",
  {
    id: id(),
    reviewId: uuid("review_id").references(() => review.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => reviewRevision.id, { onDelete: "set null" }),
    /** `verification` | `editorial` | `report` | `reply`. */
    queue: text("queue").notNull(),
    state: caseState("state").notNull().default("open"),
    assigneeStaffId: uuid("assignee_staff_id"),
    priority: smallint("priority").notNull().default(3),
    slaDueAt: ts("sla_due_at"),
    firstActionAt: ts("first_action_at"),
    version: integer("version").notNull().default(1),
    ...stamps,
  },
  (t) => [
    index("moderation_case_queue_idx").on(t.queue, t.state, t.priority, t.createdAt),
    check("moderation_case_queue", sql`${t.queue} in ('verification','editorial','report','reply')`),
  ],
);

/** Immutable. A new decision is a new row. */
export const decision = restricted.table(
  "decision",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => moderationCase.id, { onDelete: "restrict" }),
    reviewId: uuid("review_id").references(() => review.id, { onDelete: "restrict" }),
    revisionId: uuid("revision_id").references(() => reviewRevision.id, { onDelete: "restrict" }),
    staffId: uuid("staff_id").notNull(),
    role: staffRole("role").notNull(),
    action: text("action").notNull(),
    reasonCode: text("reason_code").notNull(),
    /** Short, actionable, safe to show the patient. */
    patientMessage: text("patient_message"),
    fromState: reviewState("from_state"),
    toState: reviewState("to_state"),
    priorDecisionId: uuid("prior_decision_id"),
    expectedVersion: integer("expected_version").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("decision_review_idx").on(t.reviewId, t.createdAt.desc())],
);

export const appeal = restricted.table(
  "appeal",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decision.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    state: caseState("state").notNull().default("open"),
    /** Must differ from the moderator who made `decision_id`; enforced in the service layer. */
    assigneeStaffId: uuid("assignee_staff_id"),
    outcome: text("outcome"),
    idempotencyKey: text("idempotency_key").notNull(),
    resolvedAt: ts("resolved_at"),
    ...stamps,
  },
  (t) => [
    uniqueIndex("appeal_idempotency_uq").on(t.reviewId, t.idempotencyKey),
    uniqueIndex("appeal_one_open_uq").on(t.reviewId).where(sql`${t.resolvedAt} is null`),
    check("appeal_outcome", sql`${t.outcome} is null or ${t.outcome} in ('upheld','reversed','fresh_upload_offered')`),
  ],
);

/* ─────────────────── staff, claims and hospital membership (§19) ─────────────────── */

export const staffUser = restricted.table("staff_user", {
  id: id(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  mfaEnrolledAt: ts("mfa_enrolled_at"),
  isActive: boolean("is_active").notNull().default(true),
  ...stamps,
});

export const staffRoleGrant = restricted.table(
  "staff_role_grant",
  {
    id: id(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffUser.id, { onDelete: "cascade" }),
    role: staffRole("role").notNull(),
    /** Editors are scoped by state (OPS-07); null = all. */
    stateId: uuid("state_id"),
    grantedBy: uuid("granted_by"),
    expiresAt: ts("expires_at"),
    revokedAt: ts("revoked_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("staff_role_grant_idx").on(t.staffId, t.role)],
);

export const claim = restricted.table(
  "claim",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    branchId: branchRef().notNull(),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    requesterRole: text("requester_role"),
    /** `work_email_domain` | `branch_desk_callback` | `manual`. */
    verificationMethod: text("verification_method"),
    state: caseState("state").notNull().default("open"),
    reviewerStaffId: uuid("reviewer_staff_id"),
    decidedAt: ts("decided_at"),
    ...stamps,
  },
  (t) => [index("claim_queue_idx").on(t.state, t.createdAt)],
);

export const membership = restricted.table(
  "membership",
  {
    id: id(),
    claimId: uuid("claim_id").references(() => claim.id, { onDelete: "set null" }),
    branchId: branchRef().notNull(),
    representativeEmail: text("representative_email").notNull(),
    scope: text("scope").notNull().default("branch"),
    validFrom: ts("valid_from").notNull().defaultNow(),
    expiresAt: ts("expires_at"),
    revokedAt: ts("revoked_at"),
    approvedBy: uuid("approved_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("membership_live_uq").on(t.branchId, t.representativeEmail).where(sql`${t.revokedAt} is null`),
  ],
);

export const publicReply = restricted.table(
  "public_reply",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => membership.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    /** `pending` | `approved` | `rejected`. Published only after moderation (MOD-04). */
    status: text("status").notNull().default("pending"),
    moderatedBy: uuid("moderated_by"),
    ...stamps,
  },
  (t) => [check("public_reply_status", sql`${t.status} in ('pending','approved','rejected')`)],
);

/* ─────────────────── public intake: reports, corrections, suggestions ─────────────────── */

export const report = restricted.table(
  "report",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    /** Opaque public review handle (public_review.review_ref). */
    reviewRef: uuid("review_ref").notNull(),
    reasonCode: text("reason_code").notNull(),
    detail: text("detail"),
    reporterContact: text("reporter_contact"),
    state: caseState("state").notNull().default("open"),
    ...stamps,
  },
  (t) => [index("report_queue_idx").on(t.state, t.createdAt)],
);

export const correction = restricted.table(
  "correction",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    branchId: branchRef().notNull(),
    fieldPath: text("field_path").notNull(),
    reason: text("reason").notNull(),
    proposedValue: text("proposed_value"),
    sourceUrl: text("source_url"),
    requesterContact: text("requester_contact"),
    /** OPS-08: safety-critical phone corrections jump the queue. */
    isSafetyCritical: boolean("is_safety_critical").notNull().default(false),
    state: caseState("state").notNull().default("open"),
    editorStaffId: uuid("editor_staff_id"),
    outcome: text("outcome"),
    resolvedAt: ts("resolved_at"),
    ...stamps,
  },
  (t) => [index("correction_queue_idx").on(t.state, t.isSafetyCritical.desc(), t.createdAt)],
);

export const hospitalSuggestion = restricted.table(
  "hospital_suggestion",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    name: text("name").notNull(),
    townOrPin: text("town_or_pin").notNull(),
    sourceUrl: text("source_url"),
    state: caseState("state").notNull().default("open"),
    ...stamps,
  },
  (t) => [index("hospital_suggestion_queue_idx").on(t.state, t.createdAt)],
);

/* ─────────────────────────── imports (OPS-02) ─────────────────────────── */

export const importBatch = restricted.table(
  "import_batch",
  {
    id: id(),
    sourceRecordId: uuid("source_record_id").notNull(),
    checksum: text("checksum").notNull(),
    partnerId: text("partner_id"),
    collectedOn: date("collected_on"),
    columnMapping: jsonb("column_mapping").notNull().default({}),
    /** `staged` | `dry_run` | `applied` | `reverted`. */
    state: text("state").notNull().default("staged"),
    acceptedRows: integer("accepted_rows").notNull().default(0),
    rejectedRows: integer("rejected_rows").notNull().default(0),
    appliedBy: uuid("applied_by"),
    appliedAt: ts("applied_at"),
    ...stamps,
  },
  (t) => [
    /** Replaying the same file is a no-op (UAT-05). */
    uniqueIndex("import_batch_checksum_uq").on(t.sourceRecordId, t.checksum),
    check("import_batch_state", sql`${t.state} in ('staged','dry_run','applied','reverted')`),
  ],
);

export const importRow = restricted.table(
  "import_row",
  {
    id: id(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatch.id, { onDelete: "cascade" }),
    rowNo: integer("row_no").notNull(),
    payload: jsonb("payload").notNull(),
    /** `accepted` | `rejected` | `duplicate_candidate` | `merged` | `created`. */
    outcome: text("outcome").notNull(),
    reason: text("reason"),
    branchId: branchRef(),
    dedupeDecisionBy: uuid("dedupe_decision_by"),
  },
  (t) => [uniqueIndex("import_row_uq").on(t.batchId, t.rowNo)],
);

/* ─────────────────── audit, outbox, jobs and erasure (§28) ─────────────────── */

export const auditEvent = restricted.table(
  "audit_event",
  {
    id: id(),
    actorId: uuid("actor_id"),
    /** `staff` | `patient` | `representative` | `system`. */
    actorKind: text("actor_kind").notNull(),
    role: text("role"),
    event: text("event").notNull(),
    subjectKind: text("subject_kind").notNull(),
    subjectId: uuid("subject_id"),
    subjectVersion: integer("subject_version"),
    /** Minimal safe metadata only: never document content, numbers or narratives. */
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_event_subject_idx").on(t.subjectKind, t.subjectId, t.createdAt.desc()),
    index("audit_event_actor_idx").on(t.actorId, t.createdAt.desc()),
  ],
);

/** ARC-02: written in the same transaction as the domain change it announces. */
export const outbox = restricted.table(
  "outbox",
  {
    id: id(),
    topic: text("topic").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").notNull(),
    state: jobState("state").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: ts("available_at").notNull().defaultNow(),
    lastErrorClass: text("last_error_class"),
    processedAt: ts("processed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("outbox_idempotency_uq").on(t.topic, t.idempotencyKey),
    index("outbox_due_idx").on(t.state, t.availableAt),
  ],
);

export const jobRun = restricted.table(
  "job_run",
  {
    id: id(),
    job: text("job").notNull(),
    state: jobState("state").notNull().default("running"),
    cursor: jsonb("cursor"),
    processed: integer("processed").notNull().default(0),
    exceptions: integer("exceptions").notNull().default(0),
    /** e.g. deletion reconciliation: count, oldest overdue item (EVD-05). */
    result: jsonb("result"),
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
  },
  (t) => [index("job_run_job_idx").on(t.job, t.startedAt.desc())],
);

/** Replayed after any restore, before public access reopens (NFR-05). */
export const erasureTombstone = restricted.table(
  "erasure_tombstone",
  {
    id: id(),
    subjectKind: text("subject_kind").notNull(),
    subjectId: uuid("subject_id").notNull(),
    reason: text("reason").notNull(),
    rightsCaseId: uuid("rights_case_id").references(() => rightsCase.id, { onDelete: "set null" }),
    erasedAt: ts("erased_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("erasure_tombstone_uq").on(t.subjectKind, t.subjectId)],
);
