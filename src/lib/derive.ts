import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { completeness, indexGate, publicationGate, type BranchFacts } from "./gates";

/**
 * Recomputes the derived columns of one branch (gate results, completeness,
 * search document). Call after any change to a branch or its facts, inside
 * the same transaction as that change.
 */
export async function recomputeBranchDerived(db: Pick<Db, "execute">, branchId: string) {
  const { rows } = await db.execute<Record<string, unknown>>(sql`
    select
      b.display_name, b.facility_type, b.status,
      (b.address_line1 is not null or b.postal_address is not null) as has_address,
      (b.overview is not null and length(trim(b.overview)) >= 80) as has_overview,
      (b.lat is not null) as has_coords,
      (select count(*) from field_assertion fa join source_record sr on sr.id = fa.source_record_id
        where fa.branch_id = b.id and fa.status in ('hospital_supplied','checked_against_source')
          and (sr.rights_expire_at is null or sr.rights_expire_at > now()))::int as evidenced_assertions,
      (select count(*) from branch_contact c
        where c.branch_id = b.id and c.status = 'checked_against_source' and not c.is_suppressed)::int as checked_contact_routes,
      (select count(*) from branch_contact c
        where c.branch_id = b.id and c.status = 'checked_against_source' and not c.is_suppressed
          and c.role not in ('website','contact_page','appointment_url','email'))::int as phones,
      (select count(*) from branch_offering o
        where o.branch_id = b.id and o.ended_at is null and o.source_record_id is not null
          and o.status in ('hospital_supplied','checked_against_source'))::int as sourced_offerings,
      (select count(*) from branch_hours h
        where h.branch_id = b.id and h.status in ('hospital_supplied','checked_against_source'))::int as hours,
      (select count(*) from branch_amenity a
        where a.branch_id = b.id and a.state <> 'unknown' and a.status in ('hospital_supplied','checked_against_source'))::int as amenities,
      (select count(*) from branch_payer p
        where p.branch_id = b.id and p.status in ('hospital_supplied','checked_against_source')
          and (p.expires_on is null or p.expires_on >= current_date))::int as payers,
      (select count(*) from credential cr
        where cr.branch_id = b.id and cr.status = 'checked_against_source'
          and (cr.expires_on is null or cr.expires_on >= current_date))::int as credentials,
      (select count(*) from branch_capacity bc
        where bc.branch_id = b.id and bc.status in ('hospital_supplied','checked_against_source'))::int as capacity
    from hospital_branch b where b.id = ${branchId}
  `);
  const r = rows[0];
  if (!r) throw new Error(`branch ${branchId} not found`);

  const facts: BranchFacts = {
    displayName: r.display_name as string,
    facilityType: r.facility_type as string,
    status: r.status as string,
    hasState: true, // NOT NULL in the schema
    hasSettlement: true,
    hasAddress: Boolean(r.has_address),
    evidencedAssertions: Number(r.evidenced_assertions),
    checkedContactRoutes: Number(r.checked_contact_routes),
    sourcedOfferings: Number(r.sourced_offerings),
    hasOverview: Boolean(r.has_overview),
    hasHours: Number(r.hours) > 0,
    hasPhone: Number(r.phones) > 0,
    hasCoords: Boolean(r.has_coords),
    amenities: Number(r.amenities),
    payers: Number(r.payers),
    credentials: Number(r.credentials),
    capacity: Number(r.capacity),
  };
  const pub = publicationGate(facts);
  const idx = indexGate(facts);

  await db.execute(sql`
    update hospital_branch
       set passes_publication_gate = ${pub.pass},
           is_indexable = ${idx.pass},
           completeness = ${completeness(facts)},
           updated_at = now()
     where id = ${branchId}
  `);
  await db.execute(sql`select refresh_branch_search(${branchId}::uuid)`);
  return { facts, publication: pub, index: idx };
}
