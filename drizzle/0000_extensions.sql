-- Extensions the directory relies on (SRS DB-01). Verify availability on the
-- target Neon plan/region before applying; all three were available on the
-- the-hospital-index project (Postgres 18) on 2026-11-23.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
