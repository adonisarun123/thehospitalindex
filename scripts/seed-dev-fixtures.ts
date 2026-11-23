/**
 * Synthetic acceptance fixtures (SRS §33: "deterministic fictional branches").
 *
 * Every hospital, place marked (fixture), phone number, certificate and
 * review here is invented. This script refuses to run against anything but a
 * local database so fictional records can never reach the public directory.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { recomputeBranchDerived } from "../src/lib/derive";

const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`Refusing to load fictional fixtures into "${host || "unset DATABASE_URL"}". Local databases only.`);
  process.exit(1);
}

const client = new Client({ connectionString: url });
const q = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
  (await client.query(text, params)).rows as T[];
const id = async (text: string, params: unknown[] = []) => (await q<{ id: string }>(text, params))[0].id;

type Branch = {
  publicId: string;
  slug: string;
  name: string;
  qualifier?: string;
  org?: string;
  type: string;
  ownership: string;
  place: "blr" | "halliyur_ka" | "halliyur_tn";
  locality?: "hsr" | "jayanagar";
  address?: string;
  pincode?: string;
  coords?: [number, number];
  emergency?: { has: "yes" | "no"; h24?: "yes" | "no"; checkedDaysAgo: number };
  overview?: string;
  specialties?: string[];
  services?: string[];
  unsourcedOfferings?: boolean;
  phone?: string;
  sharedPhone?: boolean;
  website?: string;
  hours?: boolean;
  amenities?: Record<string, "yes" | "no">;
  payer?: boolean;
  credential?: { expiresInDays: number };
  capacity?: number;
  reviews?: number[];
  links?: ("google_maps" | "practo")[];
  status?: string;
  evidence?: boolean;
};

const OVERVIEW =
  "A fictional hospital used only for acceptance testing. The facts on this page are synthetic and exist to exercise source labels, filters and review states.";

const BRANCHES: Branch[] = [
  {
    publicId: "h7k2m9", slug: "sampige-community-hospital", name: "Sampige Community Hospital", qualifier: "HSR Layout",
    org: "Sampige Health Network", type: "multispecialty_hospital", ownership: "private", place: "blr", locality: "hsr",
    address: "14 Fixture Main Road, HSR Layout", pincode: "560102", coords: [12.9116, 77.6389],
    emergency: { has: "yes", h24: "yes", checkedDaysAgo: 5 }, overview: OVERVIEW,
    specialties: ["cardiology", "nephrology", "general-medicine"], services: ["dialysis", "intensive-care", "pharmacy"],
    phone: "+918000000101", sharedPhone: true, website: "https://sampige.example/hsr", hours: true,
    amenities: { step_free_entrance: "yes", lift: "yes", accessible_toilet: "yes", parking: "yes", interpreter: "no" },
    payer: true, credential: { expiresInDays: 400 }, capacity: 120, reviews: [4, 5], links: ["google_maps", "practo"],
  },
  {
    publicId: "j3n8q4", slug: "sampige-community-hospital", name: "Sampige Community Hospital", qualifier: "Jayanagar",
    org: "Sampige Health Network", type: "multispecialty_hospital", ownership: "private", place: "blr", locality: "jayanagar",
    address: "9 Fixture Cross, Jayanagar", pincode: "560041", emergency: { has: "no", checkedDaysAgo: 5 }, overview: OVERVIEW,
    specialties: ["nephrology", "general-medicine"], phone: "+918000000101", sharedPhone: true, hours: true,
    links: ["google_maps"],
  },
  {
    publicId: "k5r2t7", slug: "kere-charitable-eye-hospital", name: "Kere Charitable Eye Hospital",
    type: "specialty_hospital", ownership: "charitable", place: "blr", locality: "jayanagar",
    address: "3 Fixture Lake Road, Jayanagar", pincode: "560041", coords: [12.9299, 77.5826], overview: OVERVIEW,
    specialties: ["ophthalmology"], services: ["cataract-surgery"], phone: "+918000000103", hours: true,
    amenities: { step_free_entrance: "yes" }, reviews: [5, 5, 4, 4, 5, 3],
  },
  {
    publicId: "n4g6h2", slug: "nandi-government-general-hospital", name: "Nandi Government General Hospital",
    type: "general_hospital", ownership: "government", place: "blr", address: "1 Fixture Fort Road", pincode: "560002",
    emergency: { has: "yes", h24: "yes", checkedDaysAgo: 75 }, overview: OVERVIEW,
    specialties: ["general-medicine", "general-surgery", "emergency-medicine", "paediatrics"], services: ["x-ray", "pathology-lab"],
    phone: "+918000000104", credential: { expiresInDays: -30 }, capacity: 300, hours: true,
  },
  {
    publicId: "m8p3w6", slug: "mallige-institute-of-paediatrics-neonatology-and-advanced-child-health-sciences",
    name: "Mallige Institute of Paediatrics, Neonatology and Advanced Child Health Sciences", qualifier: "HSR Layout",
    type: "specialty_hospital", ownership: "private", place: "blr", locality: "hsr", address: "27 Fixture Sector 2, HSR Layout",
    pincode: "560102", emergency: { has: "yes", checkedDaysAgo: 10 }, overview: OVERVIEW,
    specialties: ["paediatrics"], services: ["neonatal-intensive-care"], phone: "+918000000105", payer: true,
  },
  {
    publicId: "g2v9x5", slug: "honge-nursing-home", name: "Honge Nursing Home", type: "nursing_home", ownership: "private",
    place: "blr", address: "5 Fixture Lane", pincode: "560011", website: "https://honge.example",
    specialties: ["general-medicine"], unsourcedOfferings: true,
  },
  {
    publicId: "t6c4y8", slug: "tunga-heart-centre", name: "Tunga Heart Centre", type: "specialty_hospital", ownership: "private",
    place: "blr", locality: "hsr", address: "40 Fixture Ring Road, HSR Layout", pincode: "560102", coords: [12.9081, 77.6476],
    emergency: { has: "yes", h24: "yes", checkedDaysAgo: 2 }, overview: OVERVIEW,
    specialties: ["cardiology"], services: ["intensive-care", "ct-scan"], phone: "+918000000107", hours: true,
    credential: { expiresInDays: 200 }, reviews: [2],
  },
  {
    publicId: "s9d7f3", slug: "staged-draft-hospital", name: "Staged Draft Hospital", type: "general_hospital", ownership: "private",
    place: "blr", address: "Unverified", status: "staged", evidence: false,
  },
  {
    publicId: "b4z6r9", slug: "old-banyan-hospital", name: "Old Banyan Hospital", type: "general_hospital", ownership: "private",
    place: "blr", address: "88 Fixture Old Road", pincode: "560004", phone: "+918000000109", overview: OVERVIEW,
    specialties: ["general-medicine"], status: "permanently_closed",
  },
  {
    publicId: "p7w5k2", slug: "halliyur-primary-health-centre", name: "Halliyur Primary Health Centre",
    type: "primary_health_centre", ownership: "government", place: "halliyur_ka", address: "Main Road, Halliyur",
    pincode: "571999", overview: OVERVIEW, specialties: ["general-medicine"], services: ["maternity-care"],
    phone: "+918000000110", hours: true,
  },
  {
    publicId: "q3m8n6", slug: "halliyur-rural-hospital", name: "Halliyur Rural Hospital", type: "community_health_centre",
    ownership: "government", place: "halliyur_tn", address: "Bus Stand Road, Halliyur", pincode: "635999",
    overview: OVERVIEW, specialties: ["general-medicine"], phone: "+918000000111",
  },
];

async function main() {
  await client.connect();
  const db = drizzle(client);
  await client.query("begin");

  // wipe previous fixtures (local database only)
  await client.query(`truncate hospital_branch, organisation, source_record, hub_content, geo_pincode cascade`);
  await client.query(`delete from geography where kind = 'locality' or slug in ('halliyur','kaveripura','vaigaipatti')`);
  await client.query(`update taxonomy_synonym set reviewed_at = now()`);

  const st = async (slug: string) => id(`select id from geography where slug = $1 and kind = 'state'`, [slug]);
  const ka = await st("karnataka");
  const tn = await st("tamil-nadu");
  const blr = await id(`select id from geography where slug = 'bengaluru' and kind = 'settlement'`);
  const blrDistrict = await id(`select id from geography where slug = 'bengaluru-urban'`);

  const mkDistrict = (state: string, slug: string, name: string) =>
    id(`insert into geography (kind, parent_id, state_id, slug, name) values ('district', $1, $1, $2, $3) returning id`, [state, slug, name]);
  const mkVillage = async (state: string, district: string, slug: string, name: string) => {
    const v = await id(
      `insert into geography (kind, settlement_kind, parent_id, state_id, district_id, slug, name)
       values ('settlement', 'village', $2, $1, $2, $3, $4) returning id`, [state, district, slug, name]);
    await client.query(`update geography set settlement_id = id where id = $1`, [v]);
    return v;
  };
  const mkLocality = (slug: string, name: string) =>
    id(`insert into geography (kind, parent_id, state_id, district_id, settlement_id, slug, name)
        values ('locality', $1, $2, $3, $1, $4, $5) returning id`, [blr, ka, blrDistrict, slug, name]);

  // Two villages with the same name in different states (UAT-01).
  const kaDistrict = await mkDistrict(ka, "kaveripura", "Kaveripura (fixture)");
  const tnDistrict = await mkDistrict(tn, "vaigaipatti", "Vaigaipatti (fixture)");
  const places = {
    blr: { settlement: blr, state: ka, district: blrDistrict },
    halliyur_ka: { settlement: await mkVillage(ka, kaDistrict, "halliyur", "Halliyur"), state: ka, district: kaDistrict },
    halliyur_tn: { settlement: await mkVillage(tn, tnDistrict, "halliyur", "Halliyur"), state: tn, district: tnDistrict },
  };
  const localities = { hsr: await mkLocality("hsr-layout", "HSR Layout"), jayanagar: await mkLocality("jayanagar", "Jayanagar") };

  // A PIN serving several places (UAT-01).
  for (const g of [localities.hsr, blr]) await client.query(`insert into geo_pincode values ('560102', $1)`, [g]);
  await client.query(`insert into geo_pincode values ('571999', $1)`, [places.halliyur_ka.settlement]);

  await client.query(
    `update geography set local_context = $1, local_context_reviewed_at = now() where id = $2`,
    ["Fixture context: Bengaluru's hospitals cluster along the ring roads; travel times vary sharply by time of day.", blr],
  );

  const src = await id(
    `insert into source_record (kind, name, url, rights_basis) values
     ('editor_verified_public', 'Synthetic fixture register', 'https://fixtures.example/register', 'synthetic test data') returning id`);
  const hospitalSrc = await id(
    `insert into source_record (kind, name, rights_basis, is_public) values
     ('hospital_submission', 'Synthetic hospital submission', 'synthetic test data', false) returning id`);

  const orgs = new Map<string, string>();
  const providers = new Map((await q<{ code: string; id: string }>(`select code, id from external_provider`)).map((p) => [p.code, p.id]));
  const taxon = async (table: "specialty" | "service", code: string) => {
    const rows = await q<{ id: string }>(`select id from ${table} where code = $1 or slug = $1`, [code]);
    if (!rows[0]) throw new Error(`unknown ${table} ${code}`);
    return rows[0].id;
  };

  for (const b of BRANCHES) {
    const place = places[b.place];
    let orgId: string | null = null;
    if (b.org) {
      orgId = orgs.get(b.org) ?? (await id(`insert into organisation (name, slug, kind) values ($1, $2, 'group') returning id`,
        [b.org, b.org.toLowerCase().replace(/\s+/g, "-")]));
      orgs.set(b.org, orgId);
    }
    const branchId = await id(
      `insert into hospital_branch (public_id, org_id, slug, display_name, branch_qualifier, facility_type, ownership,
         state_id, district_id, settlement_id, locality_id, address_line1, pincode, lat, lng, coord_precision,
         has_emergency, emergency_24h, emergency_checked_at, overview, last_checked_at, status_reason)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         case when $19::int is null then null else now() - make_interval(days => $19::int) end, $20, now() - interval '3 days', $21)
       returning id`,
      [b.publicId, orgId, b.slug, b.name, b.qualifier ?? null, b.type, b.ownership, place.state, place.district, place.settlement,
        b.locality ? localities[b.locality] : null, b.address ?? null, b.pincode ?? null, b.coords?.[0] ?? null, b.coords?.[1] ?? null,
        b.coords ? "rooftop" : "unknown", b.emergency?.has ?? "unknown", b.emergency?.h24 ?? "unknown",
        b.emergency?.checkedDaysAgo ?? null, b.overview ?? null,
        b.status === "permanently_closed" ? "Fixture: closed in 2025" : null]);

    if (b.evidence !== false)
      await client.query(
        `insert into field_assertion (branch_id, field_path, value, source_record_id, observed_at, status)
         values ($1, 'identity.operating_status', '"operating"', $2, now(), 'checked_against_source')`, [branchId, src]);
    if (b.phone)
      await client.query(
        `insert into branch_contact (branch_id, role, value, label, is_shared, status, source_record_id, last_checked_at)
         values ($1, 'switchboard', $2, $3, $4, 'checked_against_source', $5, now())`,
        [branchId, b.phone, b.sharedPhone ? "Network switchboard" : null, Boolean(b.sharedPhone), src]);
    if (b.website)
      await client.query(
        `insert into branch_contact (branch_id, role, value, status, source_record_id, last_checked_at)
         values ($1, 'website', $2, 'checked_against_source', $3, now())`, [branchId, b.website, src]);
    if (b.emergency?.has === "yes")
      await client.query(
        `insert into branch_contact (branch_id, role, value, status, source_record_id, last_checked_at)
         values ($1, 'emergency', $2, 'checked_against_source', $3, now() - make_interval(days => $4))`,
        [branchId, b.phone!.replace(/1(\d\d)$/, "9$1"), src, b.emergency.checkedDaysAgo]);

    for (const code of b.specialties ?? [])
      await client.query(
        `insert into branch_offering (branch_id, specialty_id, care_setting, availability, status, source_record_id, last_checked_at)
         values ($1, $2, 'opd', 'onsite', $3, $4, now())`,
        [branchId, await taxon("specialty", code), b.unsourcedOfferings ? "hospital_supplied" : "checked_against_source",
          b.unsourcedOfferings ? null : src]);
    for (const code of b.services ?? [])
      await client.query(
        `insert into branch_offering (branch_id, service_id, care_setting, availability, status, source_record_id, last_checked_at, appointment_note)
         values ($1, $2, 'unspecified', 'onsite', 'hospital_supplied', $3, now(), 'Fixture: call the hospital to book')`,
        [branchId, await taxon("service", code), hospitalSrc]);

    if (b.hours) {
      for (let d = 0; d < 6; d++)
        await client.query(
          `insert into branch_hours (branch_id, purpose, weekday, opens, closes, status, source_record_id, last_checked_at)
           values ($1, 'opd', $2, '09:00', '17:00', 'hospital_supplied', $3, now())`, [branchId, d, hospitalSrc]);
      await client.query(
        `insert into branch_hours (branch_id, purpose, weekday, is_closed, status, source_record_id, last_checked_at)
         values ($1, 'opd', 6, true, 'hospital_supplied', $2, now())`, [branchId, hospitalSrc]);
    }
    for (const [code, state] of Object.entries(b.amenities ?? {}))
      await client.query(
        `insert into branch_amenity (branch_id, code, category, state, status, source_record_id, last_checked_at)
         values ($1, $2, $3, $4, 'hospital_supplied', $5, now())`,
        [branchId, code, code === "parking" ? "facility" : code === "interpreter" ? "patient_support" : "accessibility", state, hospitalSrc]);
    if (b.payer)
      await client.query(
        `insert into branch_payer (branch_id, payer_kind, payer_code, payer_name, mode, status, source_record_id, last_checked_at)
         values ($1, 'government_scheme', 'fixture-scheme', 'Fixture Health Scheme', 'government_empanelment', 'checked_against_source', $2, now())`,
        [branchId, src]);
    if (b.credential)
      await client.query(
        `insert into credential (branch_id, issuer, category, programme, level, certificate_id, scope, starts_on, expires_on, status, source_record_id, last_checked_at)
         values ($1, 'Fixture Accreditation Board', 'hospital_accreditation', 'Hospital accreditation', 'Full', 'FIX-' || $2, 'Whole branch',
           current_date - 700, current_date + $3::int, 'checked_against_source', $4, now())`,
        [branchId, b.publicId, b.credential.expiresInDays, src]);
    if (b.capacity)
      await client.query(
        `insert into branch_capacity (branch_id, metric, value, definition, as_of, status, source_record_id)
         values ($1, 'total_beds', $2, 'Installed beds', current_date - 60, 'hospital_supplied', $3)`,
        [branchId, b.capacity, hospitalSrc]);
    for (const code of b.links ?? [])
      await client.query(
        `insert into branch_source_link (branch_id, provider_id, url, match_status, last_checked_at)
         values ($1, $2, $3, 'confirmed_branch', now())`,
        [branchId, providers.get(code), `https://${code.replace("_", "-")}.example/fixture/${b.publicId}`]);

    const ratings = b.reviews ?? [];
    for (const [i, overall] of ratings.entries())
      await client.query(
        `insert into public_review (branch_id, review_ref, body, overall, visit_type, visit_month, published_at)
         values ($1, gen_random_uuid(), $2, $3, 'OPD', date_trunc('month', now() - interval '2 months')::date, now() - make_interval(days => $4))`,
        [branchId, `Fixture review ${i + 1}: a synthetic firsthand account written to test how patient experiences render.`, overall, i + 1]);
    if (ratings.length) {
      const h = [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r === n).length);
      await client.query(
        `insert into branch_rating (branch_id, review_count, rating_sum, h1, h2, h3, h4, h5) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [branchId, ratings.length, ratings.reduce((a, c) => a + c, 0), ...h]);
    }

    // gate → lifecycle → gate again (the index gate depends on the published status)
    const first = await recomputeBranchDerived(db, branchId);
    const target = b.status ?? "published";
    if (target !== "staged") {
      if (!first.publication.pass) throw new Error(`${b.name}: fixture fails publication gate: ${first.publication.missing}`);
      await client.query(`update hospital_branch set status = $2, published_at = now() where id = $1`, [branchId, target]);
      await recomputeBranchDerived(db, branchId);
    }
  }

  await client.query("commit");
  const summary = await q(`select status, count(*)::int n, count(*) filter (where is_indexable)::int indexable from hospital_branch group by 1 order by 1`);
  console.table(summary);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.query("rollback").catch(() => {});
  await client.end();
  process.exit(1);
});
