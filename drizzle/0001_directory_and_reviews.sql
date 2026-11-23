CREATE SCHEMA "restricted";
--> statement-breakpoint
CREATE TYPE "public"."alias_kind" AS ENUM('alias', 'former_name', 'transliteration', 'local_script', 'common_spelling');--> statement-breakpoint
CREATE TYPE "public"."offering_availability" AS ENUM('onsite', 'partner', 'referral', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."branch_status" AS ENUM('staged', 'checked', 'published', 'disputed', 'temporarily_closed', 'permanently_closed', 'duplicate', 'retired');--> statement-breakpoint
CREATE TYPE "public"."capacity_metric" AS ENUM('total_beds', 'operational_beds', 'icu_beds', 'nicu_beds', 'picu_beds', 'operating_theatres', 'dialysis_stations', 'isolation_rooms');--> statement-breakpoint
CREATE TYPE "public"."care_setting" AS ENUM('opd', 'inpatient', 'day_care', 'emergency', 'home', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."contact_role" AS ENUM('switchboard', 'opd', 'admissions', 'emergency', 'ambulance', 'tpa_desk', 'patient_relations', 'email', 'website', 'contact_page', 'appointment_url');--> statement-breakpoint
CREATE TYPE "public"."coord_precision" AS ENUM('rooftop', 'street', 'locality_centroid', 'settlement_centroid', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."facility_type" AS ENUM('general_hospital', 'multispecialty_hospital', 'specialty_hospital', 'teaching_hospital', 'nursing_home', 'community_health_centre', 'primary_health_centre', 'day_care_centre', 'clinic', 'diagnostic_centre', 'other');--> statement-breakpoint
CREATE TYPE "public"."geo_kind" AS ENUM('state', 'union_territory', 'district', 'subdistrict', 'settlement', 'locality');--> statement-breakpoint
CREATE TYPE "public"."hours_purpose" AS ENUM('general', 'opd', 'emergency', 'pharmacy', 'visiting', 'diagnostics');--> statement-breakpoint
CREATE TYPE "public"."link_match_status" AS ENUM('proposed', 'confirmed_branch', 'network_level', 'ambiguous', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ownership" AS ENUM('government', 'private', 'charitable', 'ppp', 'other');--> statement-breakpoint
CREATE TYPE "public"."payer_kind" AS ENUM('insurer', 'tpa', 'government_scheme');--> statement-breakpoint
CREATE TYPE "public"."payer_mode" AS ENUM('cashless', 'reimbursement_assistance', 'government_empanelment');--> statement-breakpoint
CREATE TYPE "public"."redirect_kind" AS ENUM('rename', 'merge', 'geography_rename', 'removed');--> statement-breakpoint
CREATE TYPE "public"."service_kind" AS ENUM('department', 'procedure', 'programme', 'diagnostic', 'support');--> statement-breakpoint
CREATE TYPE "public"."settlement_kind" AS ENUM('city', 'town', 'village');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('authority_register', 'hospital_submission', 'editor_verified_public', 'licensed_dataset', 'open_dataset');--> statement-breakpoint
CREATE TYPE "public"."tri_state" AS ENUM('yes', 'no', 'unknown', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'hospital_supplied', 'checked_against_source', 'conflicting', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "restricted"."case_state" AS ENUM('open', 'assigned', 'awaiting_requester', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "restricted"."job_state" AS ENUM('pending', 'running', 'succeeded', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "restricted"."otp_purpose" AS ENUM('login', 'account_deletion', 'evidence_reconsent', 'number_change');--> statement-breakpoint
CREATE TYPE "restricted"."review_state" AS ENUM('draft', 'submitted', 'checking', 'needs_clarification', 'visit_matched', 'editorial_review', 'published', 'declined', 'suspended', 'removed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "restricted"."scan_state" AS ENUM('pending', 'clean', 'infected', 'unsupported', 'failed');--> statement-breakpoint
CREATE TYPE "restricted"."staff_role" AS ENUM('geographic_editor', 'evidence_verifier', 'content_moderator', 'appeals_lead', 'privacy_lead', 'platform_admin');--> statement-breakpoint
CREATE TABLE "affiliation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinician_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"specialty_id" uuid,
	"designation" text,
	"schedule" jsonb,
	"active_from" date,
	"active_to" date,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"normalized" text NOT NULL,
	"kind" "alias_kind" DEFAULT 'alias' NOT NULL,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_amenity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"state" "tri_state" DEFAULT 'unknown' NOT NULL,
	"note" text,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_amenity_category" CHECK ("branch_amenity"."category" in ('accessibility','patient_support','facility'))
);
--> statement-breakpoint
CREATE TABLE "branch_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"metric" "capacity_metric" NOT NULL,
	"value" integer NOT NULL,
	"definition" text,
	"as_of" date NOT NULL,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_capacity_nonnegative" CHECK ("branch_capacity"."value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "branch_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"role" "contact_role" NOT NULL,
	"value" text NOT NULL,
	"label" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"is_suppressed" boolean DEFAULT false NOT NULL,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_contact_value_shape" CHECK (case
            when "branch_contact"."role" in ('website','contact_page','appointment_url') then "branch_contact"."value" ~ '^https://'
            when "branch_contact"."role" = 'email' then "branch_contact"."value" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
            else "branch_contact"."value" ~ '^\+[1-9][0-9]{7,14}$'
          end)
);
--> statement-breakpoint
CREATE TABLE "branch_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"purpose" "hours_purpose" NOT NULL,
	"weekday" smallint NOT NULL,
	"opens" time,
	"closes" time,
	"crosses_midnight" boolean DEFAULT false NOT NULL,
	"is_24h" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"note" text,
	"effective_from" date,
	"effective_to" date,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_hours_weekday" CHECK ("branch_hours"."weekday" between 0 and 6),
	CONSTRAINT "branch_hours_shape" CHECK (("branch_hours"."is_24h" or "branch_hours"."is_closed") = ("branch_hours"."opens" is null and "branch_hours"."closes" is null)),
	CONSTRAINT "branch_hours_order" CHECK ("branch_hours"."opens" is null or "branch_hours"."crosses_midnight" = ("branch_hours"."closes" <= "branch_hours"."opens")),
	CONSTRAINT "branch_hours_effective" CHECK ("branch_hours"."effective_to" is null or "branch_hours"."effective_from" is null or "branch_hours"."effective_to" >= "branch_hours"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "branch_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"namespace" text NOT NULL,
	"value" text NOT NULL,
	"source_record_id" uuid NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_offering" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"specialty_id" uuid,
	"service_id" uuid,
	"care_setting" "care_setting" DEFAULT 'unspecified' NOT NULL,
	"availability" "offering_availability" DEFAULT 'unknown' NOT NULL,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"appointment_note" text,
	"evidence_url" text,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_offering_one_target" CHECK (num_nonnulls("branch_offering"."specialty_id", "branch_offering"."service_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "branch_payer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"payer_kind" "payer_kind" NOT NULL,
	"payer_code" text NOT NULL,
	"payer_name" text NOT NULL,
	"plan" text,
	"mode" "payer_mode" NOT NULL,
	"empanelment_no" text,
	"effective_from" date,
	"expires_on" date,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_payer_dates" CHECK ("branch_payer"."expires_on" is null or "branch_payer"."effective_from" is null or "branch_payer"."expires_on" > "branch_payer"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "branch_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"label" text NOT NULL,
	"context" text,
	"service_id" uuid,
	"min_paise" bigint,
	"max_paise" bigint,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"inclusions" text,
	"exclusions" text,
	"source_date" date NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_price_some_value" CHECK (num_nonnulls("branch_price"."min_paise", "branch_price"."max_paise") >= 1),
	CONSTRAINT "branch_price_nonnegative" CHECK (coalesce("branch_price"."min_paise", 0) >= 0 and coalesce("branch_price"."max_paise", 0) >= 0),
	CONSTRAINT "branch_price_range" CHECK ("branch_price"."min_paise" is null or "branch_price"."max_paise" is null or "branch_price"."max_paise" >= "branch_price"."min_paise"),
	CONSTRAINT "branch_price_effective" CHECK ("branch_price"."effective_to" is null or "branch_price"."effective_from" is null or "branch_price"."effective_to" > "branch_price"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "branch_rating" (
	"branch_id" uuid PRIMARY KEY NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"h1" integer DEFAULT 0 NOT NULL,
	"h2" integer DEFAULT 0 NOT NULL,
	"h3" integer DEFAULT 0 NOT NULL,
	"h4" integer DEFAULT 0 NOT NULL,
	"h5" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_rating_nonnegative" CHECK ("branch_rating"."review_count" >= 0 and "branch_rating"."rating_sum" >= 0),
	CONSTRAINT "branch_rating_histogram" CHECK ("branch_rating"."h1" + "branch_rating"."h2" + "branch_rating"."h3" + "branch_rating"."h4" + "branch_rating"."h5" = "branch_rating"."review_count"),
	CONSTRAINT "branch_rating_sum" CHECK ("branch_rating"."h1" + 2 * "branch_rating"."h2" + 3 * "branch_rating"."h3" + 4 * "branch_rating"."h4" + 5 * "branch_rating"."h5" = "branch_rating"."rating_sum")
);
--> statement-breakpoint
CREATE TABLE "branch_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"editor_id" uuid,
	"reason" text,
	"reverts_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_search" (
	"branch_id" uuid PRIMARY KEY NOT NULL,
	"doc" "tsvector" NOT NULL,
	"haystack" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_source_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"url" text NOT NULL,
	"external_id" text,
	"match_status" "link_match_status" DEFAULT 'proposed' NOT NULL,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"confirmed_by" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_source_link_https" CHECK ("branch_source_link"."url" ~ '^https://')
);
--> statement-breakpoint
CREATE TABLE "clinician" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_name" text NOT NULL,
	"slug" text NOT NULL,
	"doctor_index_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinician_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"issuer" text NOT NULL,
	"category" text NOT NULL,
	"programme" text NOT NULL,
	"level" text,
	"certificate_id" text,
	"scope" text,
	"starts_on" date,
	"expires_on" date,
	"register_url" text,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"source_record_id" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_category" CHECK ("credential"."category" in ('hospital_accreditation','laboratory_accreditation','certification','registration','licence')),
	CONSTRAINT "credential_dates" CHECK ("credential"."expires_on" is null or "credential"."starts_on" is null or "credential"."expires_on" > "credential"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "external_provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_provider_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "field_assertion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"value" jsonb,
	"source_record_id" uuid NOT NULL,
	"evidence_url" text,
	"observed_at" timestamp with time zone NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"status" "verification_status" NOT NULL,
	"confidence" smallint,
	"editor_id" uuid,
	"decision" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_assertion_confidence" CHECK ("field_assertion"."confidence" is null or "field_assertion"."confidence" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "geo_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geography_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"normalized" text NOT NULL,
	"kind" "alias_kind" DEFAULT 'alias' NOT NULL,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_catchment" (
	"hub_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"note" text,
	CONSTRAINT "geo_catchment_hub_id_member_id_pk" PRIMARY KEY("hub_id","member_id"),
	CONSTRAINT "geo_catchment_distinct" CHECK ("geo_catchment"."hub_id" <> "geo_catchment"."member_id")
);
--> statement-breakpoint
CREATE TABLE "geo_pincode" (
	"pincode" char(6) NOT NULL,
	"geography_id" uuid NOT NULL,
	"source_record_id" uuid,
	CONSTRAINT "geo_pincode_pincode_geography_id_pk" PRIMARY KEY("pincode","geography_id"),
	CONSTRAINT "geo_pincode_format" CHECK ("geo_pincode"."pincode" ~ '^[1-9][0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "geography" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "geo_kind" NOT NULL,
	"settlement_kind" "settlement_kind",
	"parent_id" uuid,
	"state_id" uuid,
	"district_id" uuid,
	"settlement_id" uuid,
	"code_namespace" text,
	"external_code" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"names" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"hierarchy_revision" integer DEFAULT 1 NOT NULL,
	"local_context" text,
	"local_context_reviewed_at" timestamp with time zone,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geography_slug_format" CHECK ("geography"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "geography_reserved_slug" CHECK ("geography"."slug" not in ('district','specialty','locality','service','search','compare')),
	CONSTRAINT "geography_state_has_no_parent" CHECK (("geography"."kind" in ('state','union_territory')) = ("geography"."parent_id" is null)),
	CONSTRAINT "geography_settlement_kind" CHECK (("geography"."kind" = 'settlement') = ("geography"."settlement_kind" is not null)),
	CONSTRAINT "geography_validity" CHECK ("geography"."valid_to" is null or "geography"."valid_from" is null or "geography"."valid_to" >= "geography"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "hospital_branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"org_id" uuid,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"legal_name" text,
	"branch_qualifier" text,
	"facility_type" "facility_type" DEFAULT 'other' NOT NULL,
	"ownership" "ownership",
	"is_teaching" "tri_state" DEFAULT 'unknown' NOT NULL,
	"system_of_medicine" text,
	"status" "branch_status" DEFAULT 'staged' NOT NULL,
	"status_reason" text,
	"status_effective_on" date,
	"state_id" uuid NOT NULL,
	"district_id" uuid,
	"settlement_id" uuid NOT NULL,
	"locality_id" uuid,
	"address_line1" text,
	"address_line2" text,
	"landmark" text,
	"pincode" char(6),
	"postal_address" text,
	"lat" double precision,
	"lng" double precision,
	"coord_precision" "coord_precision" DEFAULT 'unknown' NOT NULL,
	"coord_source_id" uuid,
	"has_emergency" "tri_state" DEFAULT 'unknown' NOT NULL,
	"emergency_24h" "tri_state" DEFAULT 'unknown' NOT NULL,
	"emergency_checked_at" timestamp with time zone,
	"overview" text,
	"last_checked_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"published_revision_id" uuid,
	"completeness" smallint DEFAULT 0 NOT NULL,
	"passes_publication_gate" boolean DEFAULT false NOT NULL,
	"is_indexable" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hospital_branch_public_id_format" CHECK ("hospital_branch"."public_id" ~ '^[a-z0-9]{6,12}$'),
	CONSTRAINT "hospital_branch_slug_format" CHECK ("hospital_branch"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "hospital_branch_pincode_format" CHECK ("hospital_branch"."pincode" is null or "hospital_branch"."pincode" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "hospital_branch_coords" CHECK (("hospital_branch"."lat" is null and "hospital_branch"."lng" is null) or ("hospital_branch"."lat" between 6 and 38 and "hospital_branch"."lng" between 68 and 98)),
	CONSTRAINT "hospital_branch_completeness" CHECK ("hospital_branch"."completeness" between 0 and 100),
	CONSTRAINT "hospital_branch_published_needs_gate" CHECK ("hospital_branch"."status" <> 'published' or "hospital_branch"."passes_publication_gate"),
	CONSTRAINT "hospital_branch_index_needs_publish" CHECK (not "hospital_branch"."is_indexable" or "hospital_branch"."status" = 'published')
);
--> statement-breakpoint
CREATE TABLE "hub_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geography_id" uuid,
	"specialty_id" uuid,
	"service_id" uuid,
	"locale" text DEFAULT 'en' NOT NULL,
	"guidance" text NOT NULL,
	"editorial_owner" text,
	"reviewed_at" timestamp with time zone,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hub_content_uq" UNIQUE NULLS NOT DISTINCT("geography_id","specialty_id","service_id","locale"),
	CONSTRAINT "hub_content_one_taxon" CHECK (num_nonnulls("hub_content"."specialty_id", "hub_content"."service_id") <= 1),
	CONSTRAINT "hub_content_some_key" CHECK (num_nonnulls("hub_content"."geography_id", "hub_content"."specialty_id", "hub_content"."service_id") >= 1)
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text,
	"credit" text,
	"rights_basis" text NOT NULL,
	"rights_expire_at" timestamp with time zone,
	"focal_x" double precision,
	"focal_y" double precision,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_asset_kind" CHECK ("media_asset"."kind" in ('photo','logo'))
);
--> statement-breakpoint
CREATE TABLE "organisation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'operator' NOT NULL,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organisation_kind" CHECK ("organisation"."kind" in ('operator','trust','group','government_body'))
);
--> statement-breakpoint
CREATE TABLE "provider_rights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"signed_basis" text NOT NULL,
	"approved_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_surfaces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"territory" text,
	"attribution" text,
	"retention_rule" text,
	"sync_cadence" text,
	"quota" text,
	"owner" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"review_ref" uuid NOT NULL,
	"pseudonym" text DEFAULT 'Patient' NOT NULL,
	"body" text NOT NULL,
	"overall" smallint NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visit_type" text,
	"visit_month" date,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_review_overall" CHECK ("public_review"."overall" between 1 and 5),
	CONSTRAINT "public_review_body_len" CHECK (char_length("public_review"."body") between 30 and 3000),
	CONSTRAINT "public_review_month" CHECK ("public_review"."visit_month" is null or extract(day from "public_review"."visit_month") = 1)
);
--> statement-breakpoint
CREATE TABLE "redirect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"target_path" text,
	"http_status" smallint DEFAULT 308 NOT NULL,
	"kind" "redirect_kind" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirect_status" CHECK ("redirect"."http_status" in (301, 308, 410)),
	CONSTRAINT "redirect_target_matches_status" CHECK (("redirect"."http_status" = 410) = ("redirect"."target_path" is null)),
	CONSTRAINT "redirect_no_self_loop" CHECK ("redirect"."target_path" is null or "redirect"."target_path" <> "redirect"."source_path"),
	CONSTRAINT "redirect_path_format" CHECK ("redirect"."source_path" like '/%')
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"plain_label" text,
	"kind" "service_kind" NOT NULL,
	"labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_code_unique" UNIQUE("code"),
	CONSTRAINT "service_slug_unique" UNIQUE("slug"),
	CONSTRAINT "service_slug_format" CHECK ("service"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "service_specialty" (
	"service_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	CONSTRAINT "service_specialty_service_id_specialty_id_pk" PRIMARY KEY("service_id","specialty_id")
);
--> statement-breakpoint
CREATE TABLE "source_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "source_kind" NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"rights_basis" text NOT NULL,
	"licence" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rights_expire_at" timestamp with time zone,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"plain_label" text,
	"labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "specialty_code_unique" UNIQUE("code"),
	CONSTRAINT "specialty_slug_unique" UNIQUE("slug"),
	CONSTRAINT "specialty_slug_format" CHECK ("specialty"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "taxonomy_synonym" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"normalized" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"specialty_id" uuid,
	"service_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_synonym_uq" UNIQUE NULLS NOT DISTINCT("normalized","locale","specialty_id","service_id"),
	CONSTRAINT "taxonomy_synonym_one_target" CHECK (num_nonnulls("taxonomy_synonym"."specialty_id", "taxonomy_synonym"."service_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "restricted"."account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"adult_attested_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."appeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"assignee_staff_id" uuid,
	"outcome" text,
	"idempotency_key" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appeal_outcome" CHECK ("restricted"."appeal"."outcome" is null or "restricted"."appeal"."outcome" in ('upheld','reversed','fresh_upload_offered'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_kind" text NOT NULL,
	"role" text,
	"event" text NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_id" uuid,
	"subject_version" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"requester_name" text NOT NULL,
	"requester_email" text NOT NULL,
	"requester_role" text,
	"verification_method" text,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"reviewer_staff_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "restricted"."consent_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"review_id" uuid,
	"purpose" text NOT NULL,
	"policy_version" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_event_action" CHECK ("restricted"."consent_event"."action" in ('granted','withdrawn')),
	CONSTRAINT "consent_event_purpose" CHECK ("restricted"."consent_event"."purpose" in ('review_terms','evidence_processing','hospital_confirmation','public_publication','marketing'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."correction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"reason" text NOT NULL,
	"proposed_value" text,
	"source_url" text,
	"requester_contact" text,
	"is_safety_critical" boolean DEFAULT false NOT NULL,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"editor_staff_id" uuid,
	"outcome" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "correction_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "restricted"."decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"review_id" uuid,
	"revision_id" uuid,
	"staff_id" uuid NOT NULL,
	"role" "restricted"."staff_role" NOT NULL,
	"action" text NOT NULL,
	"reason_code" text NOT NULL,
	"patient_message" text,
	"from_state" "restricted"."review_state",
	"to_state" "restricted"."review_state",
	"prior_decision_id" uuid,
	"expected_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."encounter_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"document_kind_ok" boolean DEFAULT false NOT NULL,
	"branch_and_date_ok" boolean DEFAULT false NOT NULL,
	"patient_name_ok" boolean DEFAULT false NOT NULL,
	"account_link_ok" boolean DEFAULT false NOT NULL,
	"link_method" text,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"reason_code" text,
	"verifier_id" uuid,
	"second_verifier_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounter_check_outcome" CHECK ("restricted"."encounter_check"."outcome" in ('pending','matched','needs_clarification','declined','held')),
	CONSTRAINT "encounter_check_matched_needs_all_four" CHECK ("restricted"."encounter_check"."outcome" <> 'matched' or ("restricted"."encounter_check"."document_kind_ok" and "restricted"."encounter_check"."branch_and_date_ok" and "restricted"."encounter_check"."patient_name_ok" and "restricted"."encounter_check"."account_link_ok" and "restricted"."encounter_check"."link_method" is not null)),
	CONSTRAINT "encounter_check_link_method" CHECK ("restricted"."encounter_check"."link_method" is null or "restricted"."encounter_check"."link_method" in ('otp_mobile_on_document','hospital_confirmation'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."erasure_tombstone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"rights_case_id" uuid,
	"erased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."evidence_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_object_id" uuid NOT NULL,
	"encounter_check_id" uuid,
	"matched_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"encounter_signature" "bytea",
	"signature_key_version" smallint,
	"signature_expires_at" timestamp with time zone,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."evidence_object" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"object_version" text NOT NULL,
	"preview_key" text,
	"content_type" text NOT NULL,
	"byte_count" integer NOT NULL,
	"page_count" smallint,
	"scan_state" "restricted"."scan_state" DEFAULT 'pending' NOT NULL,
	"upload_completed_at" timestamp with time zone,
	"retention_deadline" timestamp with time zone,
	"hold_id" uuid,
	"purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_object_type" CHECK ("restricted"."evidence_object"."content_type" in ('application/pdf','image/jpeg','image/png')),
	CONSTRAINT "evidence_object_size" CHECK ("restricted"."evidence_object"."byte_count" > 0 and "restricted"."evidence_object"."byte_count" <= 10485760),
	CONSTRAINT "evidence_object_pages" CHECK ("restricted"."evidence_object"."page_count" is null or "restricted"."evidence_object"."page_count" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "restricted"."hospital_suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"town_or_pin" text NOT NULL,
	"source_url" text,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hospital_suggestion_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "restricted"."identity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"mobile_ciphertext" "bytea" NOT NULL,
	"mobile_key_version" smallint NOT NULL,
	"mobile_lookup" "bytea" NOT NULL,
	"lookup_key_version" smallint NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"last_verified_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_record_id" uuid NOT NULL,
	"checksum" text NOT NULL,
	"partner_id" text,
	"collected_on" date,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state" text DEFAULT 'staged' NOT NULL,
	"accepted_rows" integer DEFAULT 0 NOT NULL,
	"rejected_rows" integer DEFAULT 0 NOT NULL,
	"applied_by" uuid,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batch_state" CHECK ("restricted"."import_batch"."state" in ('staged','dry_run','applied','reverted'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."import_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_no" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	"branch_id" uuid,
	"dedupe_decision_by" uuid
);
--> statement-breakpoint
CREATE TABLE "restricted"."job_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"state" "restricted"."job_state" DEFAULT 'running' NOT NULL,
	"cursor" jsonb,
	"processed" integer DEFAULT 0 NOT NULL,
	"exceptions" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "restricted"."legal_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_staff_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"review_on" date NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid,
	"branch_id" uuid NOT NULL,
	"representative_email" text NOT NULL,
	"scope" text DEFAULT 'branch' NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"approved_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."moderation_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid,
	"revision_id" uuid,
	"queue" text NOT NULL,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"assignee_staff_id" uuid,
	"priority" smallint DEFAULT 3 NOT NULL,
	"sla_due_at" timestamp with time zone,
	"first_action_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_case_queue" CHECK ("restricted"."moderation_case"."queue" in ('verification','editorial','report','reply'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."otp_challenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile_lookup" "bytea" NOT NULL,
	"purpose" "restricted"."otp_purpose" NOT NULL,
	"code_digest" "bytea",
	"provider_ref" text,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"max_attempts" smallint DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_after" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"delivery_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otp_attempts" CHECK ("restricted"."otp_challenge"."attempts" >= 0 and "restricted"."otp_challenge"."attempts" <= "restricted"."otp_challenge"."max_attempts"),
	CONSTRAINT "otp_has_verifier" CHECK (num_nonnulls("restricted"."otp_challenge"."code_digest", "restricted"."otp_challenge"."provider_ref") >= 1)
);
--> statement-breakpoint
CREATE TABLE "restricted"."outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"state" "restricted"."job_state" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error_class" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."public_reply" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_reply_status" CHECK ("restricted"."public_reply"."status" in ('pending','approved','rejected'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"review_ref" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"detail" text,
	"reporter_contact" text,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "restricted"."review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"state" "restricted"."review_state" DEFAULT 'draft' NOT NULL,
	"case_reference" text NOT NULL,
	"published_revision_id" uuid,
	"is_quarantined" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_published_has_revision" CHECK ("restricted"."review"."state" <> 'published' or "restricted"."review"."published_revision_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "restricted"."review_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"overall" smallint NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body" text NOT NULL,
	"visit_type" text,
	"department_specialty_id" uuid,
	"private_patient_name" text,
	"private_visit_date" date,
	"private_fields_purged_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_revision_overall" CHECK ("restricted"."review_revision"."overall" between 1 and 5),
	CONSTRAINT "review_revision_body_len" CHECK (char_length("restricted"."review_revision"."body") between 30 and 3000),
	CONSTRAINT "review_revision_status" CHECK ("restricted"."review_revision"."status" in ('pending','approved','rejected','superseded'))
);
--> statement-breakpoint
CREATE TABLE "restricted"."rights_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"account_id" uuid,
	"kind" text NOT NULL,
	"state" "restricted"."case_state" DEFAULT 'open' NOT NULL,
	"owner_staff_id" uuid,
	"due_on" date,
	"resolution" text,
	"downstream_complete" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rights_case_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "restricted"."session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"rotated_from_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."staff_role_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"role" "restricted"."staff_role" NOT NULL,
	"state_id" uuid,
	"granted_by" uuid,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricted"."staff_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"mfa_enrolled_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_clinician_id_clinician_id_fk" FOREIGN KEY ("clinician_id") REFERENCES "public"."clinician"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_alias" ADD CONSTRAINT "branch_alias_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_amenity" ADD CONSTRAINT "branch_amenity_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_amenity" ADD CONSTRAINT "branch_amenity_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_capacity" ADD CONSTRAINT "branch_capacity_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_capacity" ADD CONSTRAINT "branch_capacity_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_contact" ADD CONSTRAINT "branch_contact_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_contact" ADD CONSTRAINT "branch_contact_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_identifier" ADD CONSTRAINT "branch_identifier_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_identifier" ADD CONSTRAINT "branch_identifier_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_offering" ADD CONSTRAINT "branch_offering_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_offering" ADD CONSTRAINT "branch_offering_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialty"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_offering" ADD CONSTRAINT "branch_offering_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_offering" ADD CONSTRAINT "branch_offering_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_payer" ADD CONSTRAINT "branch_payer_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_payer" ADD CONSTRAINT "branch_payer_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_price" ADD CONSTRAINT "branch_price_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_price" ADD CONSTRAINT "branch_price_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_price" ADD CONSTRAINT "branch_price_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_rating" ADD CONSTRAINT "branch_rating_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_revision" ADD CONSTRAINT "branch_revision_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_search" ADD CONSTRAINT "branch_search_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_source_link" ADD CONSTRAINT "branch_source_link_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_source_link" ADD CONSTRAINT "branch_source_link_provider_id_external_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."external_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_assertion" ADD CONSTRAINT "field_assertion_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_assertion" ADD CONSTRAINT "field_assertion_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_alias" ADD CONSTRAINT "geo_alias_geography_id_geography_id_fk" FOREIGN KEY ("geography_id") REFERENCES "public"."geography"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_catchment" ADD CONSTRAINT "geo_catchment_hub_id_geography_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."geography"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_catchment" ADD CONSTRAINT "geo_catchment_member_id_geography_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."geography"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_pincode" ADD CONSTRAINT "geo_pincode_geography_id_geography_id_fk" FOREIGN KEY ("geography_id") REFERENCES "public"."geography"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_pincode" ADD CONSTRAINT "geo_pincode_source_record_id_source_record_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geography" ADD CONSTRAINT "geography_parent_id_geography_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geography" ADD CONSTRAINT "geography_state_id_geography_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geography" ADD CONSTRAINT "geography_district_id_geography_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geography" ADD CONSTRAINT "geography_settlement_id_geography_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_org_id_organisation_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_state_id_geography_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_district_id_geography_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_settlement_id_geography_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_locality_id_geography_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."geography"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_coord_source_id_source_record_id_fk" FOREIGN KEY ("coord_source_id") REFERENCES "public"."source_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_content" ADD CONSTRAINT "hub_content_geography_id_geography_id_fk" FOREIGN KEY ("geography_id") REFERENCES "public"."geography"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_content" ADD CONSTRAINT "hub_content_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_content" ADD CONSTRAINT "hub_content_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_rights" ADD CONSTRAINT "provider_rights_provider_id_external_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."external_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_review" ADD CONSTRAINT "public_review_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_specialty" ADD CONSTRAINT "service_specialty_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_specialty" ADD CONSTRAINT "service_specialty_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_synonym" ADD CONSTRAINT "taxonomy_synonym_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_synonym" ADD CONSTRAINT "taxonomy_synonym_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."appeal" ADD CONSTRAINT "appeal_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."appeal" ADD CONSTRAINT "appeal_decision_id_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "restricted"."decision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."consent_event" ADD CONSTRAINT "consent_event_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "restricted"."account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."consent_event" ADD CONSTRAINT "consent_event_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."decision" ADD CONSTRAINT "decision_case_id_moderation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "restricted"."moderation_case"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."decision" ADD CONSTRAINT "decision_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."decision" ADD CONSTRAINT "decision_revision_id_review_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "restricted"."review_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."encounter_check" ADD CONSTRAINT "encounter_check_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."encounter_check" ADD CONSTRAINT "encounter_check_revision_id_review_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "restricted"."review_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."erasure_tombstone" ADD CONSTRAINT "erasure_tombstone_rights_case_id_rights_case_id_fk" FOREIGN KEY ("rights_case_id") REFERENCES "restricted"."rights_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."evidence_match" ADD CONSTRAINT "evidence_match_evidence_object_id_evidence_object_id_fk" FOREIGN KEY ("evidence_object_id") REFERENCES "restricted"."evidence_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."evidence_match" ADD CONSTRAINT "evidence_match_encounter_check_id_encounter_check_id_fk" FOREIGN KEY ("encounter_check_id") REFERENCES "restricted"."encounter_check"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."evidence_object" ADD CONSTRAINT "evidence_object_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."evidence_object" ADD CONSTRAINT "evidence_object_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "restricted"."account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."evidence_object" ADD CONSTRAINT "evidence_object_hold_id_legal_hold_id_fk" FOREIGN KEY ("hold_id") REFERENCES "restricted"."legal_hold"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."identity" ADD CONSTRAINT "identity_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "restricted"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."import_row" ADD CONSTRAINT "import_row_batch_id_import_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "restricted"."import_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."membership" ADD CONSTRAINT "membership_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "restricted"."claim"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."moderation_case" ADD CONSTRAINT "moderation_case_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."moderation_case" ADD CONSTRAINT "moderation_case_revision_id_review_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "restricted"."review_revision"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."public_reply" ADD CONSTRAINT "public_reply_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."public_reply" ADD CONSTRAINT "public_reply_membership_id_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "restricted"."membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."review" ADD CONSTRAINT "review_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "restricted"."account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."review_revision" ADD CONSTRAINT "review_revision_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "restricted"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."rights_case" ADD CONSTRAINT "rights_case_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "restricted"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."session" ADD CONSTRAINT "session_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "restricted"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted"."staff_role_grant" ADD CONSTRAINT "staff_role_grant_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "restricted"."staff_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliation_branch_idx" ON "affiliation" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "affiliation_clinician_idx" ON "affiliation" USING btree ("clinician_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_alias_uq" ON "branch_alias" USING btree ("branch_id","normalized");--> statement-breakpoint
CREATE INDEX "branch_alias_trgm_idx" ON "branch_alias" USING gin ("normalized" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "branch_amenity_uq" ON "branch_amenity" USING btree ("branch_id","code");--> statement-breakpoint
CREATE INDEX "branch_amenity_filter_idx" ON "branch_amenity" USING btree ("code","state");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_capacity_uq" ON "branch_capacity" USING btree ("branch_id","metric","as_of");--> statement-breakpoint
CREATE INDEX "branch_contact_branch_idx" ON "branch_contact" USING btree ("branch_id","role");--> statement-breakpoint
CREATE INDEX "branch_hours_branch_idx" ON "branch_hours" USING btree ("branch_id","purpose","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_identifier_live_uq" ON "branch_identifier" USING btree ("namespace","value") WHERE "branch_identifier"."valid_to" is null;--> statement-breakpoint
CREATE INDEX "branch_identifier_branch_idx" ON "branch_identifier" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_offering_specialty_uq" ON "branch_offering" USING btree ("branch_id","specialty_id","care_setting") WHERE "branch_offering"."specialty_id" is not null and "branch_offering"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_offering_service_uq" ON "branch_offering" USING btree ("branch_id","service_id","care_setting") WHERE "branch_offering"."service_id" is not null and "branch_offering"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "branch_offering_by_specialty_idx" ON "branch_offering" USING btree ("specialty_id","branch_id") WHERE "branch_offering"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "branch_offering_by_service_idx" ON "branch_offering" USING btree ("service_id","branch_id") WHERE "branch_offering"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "branch_payer_branch_idx" ON "branch_payer" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_payer_filter_idx" ON "branch_payer" USING btree ("payer_code","branch_id");--> statement-breakpoint
CREATE INDEX "branch_price_branch_idx" ON "branch_price" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_revision_uq" ON "branch_revision" USING btree ("branch_id","revision_no");--> statement-breakpoint
CREATE INDEX "branch_search_doc_idx" ON "branch_search" USING gin ("doc");--> statement-breakpoint
CREATE INDEX "branch_search_trgm_idx" ON "branch_search" USING gin ("haystack" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "branch_source_link_uq" ON "branch_source_link" USING btree ("provider_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_source_link_external_uq" ON "branch_source_link" USING btree ("provider_id","external_id") WHERE "branch_source_link"."external_id" is not null and "branch_source_link"."match_status" = 'confirmed_branch';--> statement-breakpoint
CREATE INDEX "credential_branch_idx" ON "credential" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "credential_expiry_idx" ON "credential" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "field_assertion_branch_idx" ON "field_assertion" USING btree ("branch_id","field_path","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "geo_alias_uq" ON "geo_alias" USING btree ("geography_id","normalized");--> statement-breakpoint
CREATE INDEX "geo_alias_norm_idx" ON "geo_alias" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX "geo_alias_trgm_idx" ON "geo_alias" USING gin ("normalized" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "geo_pincode_geo_idx" ON "geo_pincode" USING btree ("geography_id");--> statement-breakpoint
CREATE UNIQUE INDEX "geography_state_slug_uq" ON "geography" USING btree ("slug") WHERE "geography"."kind" in ('state','union_territory');--> statement-breakpoint
CREATE UNIQUE INDEX "geography_district_slug_uq" ON "geography" USING btree ("state_id","slug") WHERE "geography"."kind" = 'district';--> statement-breakpoint
CREATE UNIQUE INDEX "geography_settlement_slug_uq" ON "geography" USING btree ("state_id","slug") WHERE "geography"."kind" = 'settlement';--> statement-breakpoint
CREATE UNIQUE INDEX "geography_locality_slug_uq" ON "geography" USING btree ("parent_id","slug") WHERE "geography"."kind" = 'locality';--> statement-breakpoint
CREATE UNIQUE INDEX "geography_subdistrict_slug_uq" ON "geography" USING btree ("parent_id","slug") WHERE "geography"."kind" = 'subdistrict';--> statement-breakpoint
CREATE UNIQUE INDEX "geography_code_uq" ON "geography" USING btree ("code_namespace","external_code") WHERE "geography"."external_code" is not null and "geography"."valid_to" is null;--> statement-breakpoint
CREATE INDEX "geography_parent_idx" ON "geography" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "geography_state_kind_idx" ON "geography" USING btree ("state_id","kind");--> statement-breakpoint
CREATE INDEX "geography_name_trgm_idx" ON "geography" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "hospital_branch_public_id_uq" ON "hospital_branch" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "hospital_branch_listing_idx" ON "hospital_branch" USING btree ("status","state_id","settlement_id");--> statement-breakpoint
CREATE INDEX "hospital_branch_district_idx" ON "hospital_branch" USING btree ("status","district_id");--> statement-breakpoint
CREATE INDEX "hospital_branch_locality_idx" ON "hospital_branch" USING btree ("status","locality_id");--> statement-breakpoint
CREATE INDEX "hospital_branch_org_idx" ON "hospital_branch" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "hospital_branch_pincode_idx" ON "hospital_branch" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "hospital_branch_name_trgm_idx" ON "hospital_branch" USING gin (lower("display_name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "hospital_branch_browse_idx" ON "hospital_branch" USING btree ("settlement_id","completeness" DESC NULLS LAST,"display_name","id");--> statement-breakpoint
CREATE INDEX "media_asset_branch_idx" ON "media_asset" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "provider_rights_provider_idx" ON "provider_rights" USING btree ("provider_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "public_review_ref_uq" ON "public_review" USING btree ("review_ref");--> statement-breakpoint
CREATE INDEX "public_review_branch_idx" ON "public_review" USING btree ("branch_id","published_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "redirect_live_source_uq" ON "redirect" USING btree ("source_path") WHERE "redirect"."is_active";--> statement-breakpoint
CREATE INDEX "redirect_target_idx" ON "redirect" USING btree ("target_path");--> statement-breakpoint
CREATE INDEX "service_specialty_rev_idx" ON "service_specialty" USING btree ("specialty_id");--> statement-breakpoint
CREATE INDEX "source_record_kind_idx" ON "source_record" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "source_record_rights_expiry_idx" ON "source_record" USING btree ("rights_expire_at");--> statement-breakpoint
CREATE INDEX "taxonomy_synonym_trgm_idx" ON "taxonomy_synonym" USING gin ("normalized" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "appeal_idempotency_uq" ON "restricted"."appeal" USING btree ("review_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "appeal_one_open_uq" ON "restricted"."appeal" USING btree ("review_id") WHERE "restricted"."appeal"."resolved_at" is null;--> statement-breakpoint
CREATE INDEX "audit_event_subject_idx" ON "restricted"."audit_event" USING btree ("subject_kind","subject_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_event_actor_idx" ON "restricted"."audit_event" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "claim_queue_idx" ON "restricted"."claim" USING btree ("state","created_at");--> statement-breakpoint
CREATE INDEX "consent_event_account_idx" ON "restricted"."consent_event" USING btree ("account_id","purpose","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "correction_queue_idx" ON "restricted"."correction" USING btree ("state","is_safety_critical" DESC NULLS LAST,"created_at");--> statement-breakpoint
CREATE INDEX "decision_review_idx" ON "restricted"."decision" USING btree ("review_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "encounter_check_review_idx" ON "restricted"."encounter_check" USING btree ("review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "erasure_tombstone_uq" ON "restricted"."erasure_tombstone" USING btree ("subject_kind","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_match_signature_uq" ON "restricted"."evidence_match" USING btree ("encounter_signature","signature_key_version") WHERE "restricted"."evidence_match"."is_approved" and "restricted"."evidence_match"."encounter_signature" is not null;--> statement-breakpoint
CREATE INDEX "evidence_match_signature_expiry_idx" ON "restricted"."evidence_match" USING btree ("signature_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_object_key_uq" ON "restricted"."evidence_object" USING btree ("storage_key","object_version");--> statement-breakpoint
CREATE INDEX "evidence_object_review_idx" ON "restricted"."evidence_object" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "evidence_object_expiry_idx" ON "restricted"."evidence_object" USING btree ("retention_deadline") WHERE "restricted"."evidence_object"."purged_at" is null;--> statement-breakpoint
CREATE INDEX "hospital_suggestion_queue_idx" ON "restricted"."hospital_suggestion" USING btree ("state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_current_account_uq" ON "restricted"."identity" USING btree ("account_id") WHERE "restricted"."identity"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_current_mobile_uq" ON "restricted"."identity" USING btree ("mobile_lookup","lookup_key_version") WHERE "restricted"."identity"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "import_batch_checksum_uq" ON "restricted"."import_batch" USING btree ("source_record_id","checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "import_row_uq" ON "restricted"."import_row" USING btree ("batch_id","row_no");--> statement-breakpoint
CREATE INDEX "job_run_job_idx" ON "restricted"."job_run" USING btree ("job","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "legal_hold_open_idx" ON "restricted"."legal_hold" USING btree ("review_on") WHERE "restricted"."legal_hold"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_live_uq" ON "restricted"."membership" USING btree ("branch_id","representative_email") WHERE "restricted"."membership"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "moderation_case_queue_idx" ON "restricted"."moderation_case" USING btree ("queue","state","priority","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "otp_one_active_uq" ON "restricted"."otp_challenge" USING btree ("mobile_lookup","purpose") WHERE "restricted"."otp_challenge"."consumed_at" is null and "restricted"."otp_challenge"."superseded_at" is null;--> statement-breakpoint
CREATE INDEX "otp_expiry_idx" ON "restricted"."otp_challenge" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idempotency_uq" ON "restricted"."outbox" USING btree ("topic","idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "restricted"."outbox" USING btree ("state","available_at");--> statement-breakpoint
CREATE INDEX "report_queue_idx" ON "restricted"."report" USING btree ("state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "review_account_branch_uq" ON "restricted"."review" USING btree ("account_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_case_reference_uq" ON "restricted"."review" USING btree ("case_reference");--> statement-breakpoint
CREATE INDEX "review_queue_idx" ON "restricted"."review" USING btree ("state","submitted_at");--> statement-breakpoint
CREATE INDEX "review_branch_idx" ON "restricted"."review" USING btree ("branch_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "review_revision_no_uq" ON "restricted"."review_revision" USING btree ("review_id","revision_no");--> statement-breakpoint
CREATE INDEX "rights_case_queue_idx" ON "restricted"."rights_case" USING btree ("state","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_uq" ON "restricted"."session" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "session_account_idx" ON "restricted"."session" USING btree ("account_id","expires_at");--> statement-breakpoint
CREATE INDEX "staff_role_grant_idx" ON "restricted"."staff_role_grant" USING btree ("staff_id","role");