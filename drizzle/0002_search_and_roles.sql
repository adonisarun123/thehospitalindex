-- Search document maintenance (SRS DB-01, SRH-02).
-- 'simple' configuration on purpose: Indian-script and transliterated names
-- must not be stemmed by an English dictionary. Tokenisation on Indian scripts
-- still needs testing on real fixtures before launch.
CREATE OR REPLACE FUNCTION refresh_branch_search(p_branch uuid) RETURNS void
LANGUAGE sql
AS $fn$
  INSERT INTO branch_search (branch_id, doc, haystack, updated_at)
  SELECT
    b.id,
    setweight(to_tsvector('simple', unaccent(concat_ws(' ', b.display_name, b.legal_name, b.branch_qualifier, al.names))), 'A')
      || setweight(to_tsvector('simple', unaccent(coalesce(tx.names, ''))), 'B')
      || setweight(to_tsvector('simple', unaccent(concat_ws(' ', loc.name, stl.name, dst.name, st.name, b.pincode))), 'C'),
    lower(unaccent(concat_ws(' ', b.display_name, b.branch_qualifier, al.names))),
    now()
  FROM hospital_branch b
  JOIN geography st ON st.id = b.state_id
  JOIN geography stl ON stl.id = b.settlement_id
  LEFT JOIN geography dst ON dst.id = b.district_id
  LEFT JOIN geography loc ON loc.id = b.locality_id
  LEFT JOIN LATERAL (
    SELECT string_agg(a.alias, ' ') AS names FROM branch_alias a WHERE a.branch_id = b.id
  ) al ON true
  LEFT JOIN LATERAL (
    SELECT string_agg(x.term, ' ') AS names
    FROM (
      SELECT concat_ws(' ', s.name, s.plain_label) AS term
      FROM branch_offering o JOIN specialty s ON s.id = o.specialty_id
      WHERE o.branch_id = b.id AND o.ended_at IS NULL AND o.status IN ('hospital_supplied', 'checked_against_source')
      UNION ALL
      SELECT concat_ws(' ', v.name, v.plain_label)
      FROM branch_offering o JOIN service v ON v.id = o.service_id
      WHERE o.branch_id = b.id AND o.ended_at IS NULL AND o.status IN ('hospital_supplied', 'checked_against_source')
      UNION ALL
      SELECT y.term
      FROM branch_offering o
      JOIN taxonomy_synonym y ON (y.specialty_id = o.specialty_id OR y.service_id = o.service_id)
      WHERE o.branch_id = b.id AND o.ended_at IS NULL AND y.reviewed_at IS NOT NULL
        AND o.status IN ('hospital_supplied', 'checked_against_source')
    ) x
  ) tx ON true
  WHERE b.id = p_branch
  ON CONFLICT (branch_id) DO UPDATE
    SET doc = excluded.doc, haystack = excluded.haystack, updated_at = excluded.updated_at;
$fn$;--> statement-breakpoint

-- Role separation (SRS DB-02). These are NOLOGIN group roles; create the
-- login roles for the public renderer and the review service separately and
-- grant them membership. Until then the app connects as the database owner.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'thi_public_reader') THEN
    CREATE ROLE thi_public_reader NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'thi_review_service') THEN
    CREATE ROLE thi_review_service NOLOGIN;
  END IF;
END
$do$;--> statement-breakpoint
REVOKE ALL ON SCHEMA restricted FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO thi_public_reader, thi_review_service;--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA public TO thi_public_reader, thi_review_service;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO thi_public_reader, thi_review_service;--> statement-breakpoint
GRANT USAGE ON SCHEMA restricted TO thi_review_service;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA restricted TO thi_review_service;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA restricted GRANT SELECT, INSERT, UPDATE ON TABLES TO thi_review_service;--> statement-breakpoint
-- Append-only by grant: no UPDATE on audit and consent trails.
REVOKE UPDATE ON restricted.audit_event, restricted.consent_event, restricted.decision FROM thi_review_service;--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON public_review, branch_rating TO thi_review_service;
