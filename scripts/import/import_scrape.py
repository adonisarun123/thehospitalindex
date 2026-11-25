#!/usr/bin/env python3
"""
Load a hospital scrape (Hospital Profile Field Dictionary, core profile) into
the directory database.

    DATABASE_URL_UNPOOLED=... python3 scripts/import/import_scrape.py data/import/2026-11-25 [--replace] [--dry-run]

What it does, in ONE transaction:
  * creates a source_record per distinct (source kind, source URL);
  * creates the districts and towns the scrape names (GEO-01: from the data,
    never guessed), reusing existing places and their aliases;
  * loads every branch as `staged`, with its address, contacts, credentials,
    departments/services, capacity, emergency flag, insurers and provenance;
  * maps each fact's verification to the site's trust statuses (see STATUS).

It does NOT publish anything. Run `npx tsx scripts/recompute-derived.ts --publish`
afterwards: the TypeScript publication gate (src/lib/gates.ts) decides which
staged branches go live, so the gate has one implementation.

Rows the schema cannot hold honestly are skipped and counted, never forced:
no state, a malformed phone, a department with no taxonomy match, HDU beds
(no capacity metric), and so on. The summary printed at the end lists them.

Requires: psycopg 3 (`pip3 install "psycopg[binary]"`).
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import uuid
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

NS = uuid.UUID("6f1c3a52-6b0e-4d8f-9a44-2f7d3c1e9b10")  # namespace for derived, repeatable ids


def uid(*parts: str) -> str:
    return str(uuid.uuid5(NS, "|".join(parts)))


# ───────────────────────── mappings ─────────────────────────

FACILITY = {
    "general": "general_hospital", "district": "general_hospital", "subdistrict": "general_hospital",
    "multispecialty": "multispecialty_hospital", "teaching": "teaching_hospital",
    "community_health_centre": "community_health_centre",
    "single_specialty": "specialty_hospital", "maternity": "specialty_hospital", "childrens": "specialty_hospital",
    "mental_health": "specialty_hospital", "rehabilitation": "specialty_hospital",
    "ayush": "other",
}
OWNERSHIP = {"private": "private", "government": "government", "state_government": "government",
             "central_government": "government", "local_body": "government"}

# scrape source_kind -> (source_record.kind, display name, licence)
SOURCE = {
    "accrediting_body_register": ("authority_register", "NABH register (nabh.co)", None),
    "government_register": ("open_dataset", "NIN health facility register (data.gov.in)", "Government Open Data License - India"),
    "government_directory": ("open_dataset", "National Hospital Directory (data.gov.in, 2023)", "Government Open Data License - India"),
    "official_branch_website": ("hospital_website", "Hospital website", None),
    "official_network_website": ("hospital_website", "Hospital group website", None),
}
TRUSTED_REGISTERS = {"accrediting_body_register", "government_register"}
RANK = {"unverified": 0, "hospital_supplied": 1, "checked_against_source": 2}


def status_of(source_kind: str, verification: str) -> str:
    """Scrape verification -> site trust status (PRD-03).

    corroborated              -> checked_against_source (two sources agree)
    supplied, from a register -> checked_against_source (read from the register itself)
    supplied, from a website  -> hospital_supplied      (the hospital published it)
    unconfirmed / other       -> unverified             (stored, never shown)
    """
    if verification == "corroborated":
        return "checked_against_source"
    if verification == "supplied":
        if source_kind in TRUSTED_REGISTERS:
            return "checked_against_source"
        if source_kind in ("official_branch_website", "official_network_website"):
            return "hospital_supplied"
    return "unverified"


SPECIALTY = {
    "general_medicine": "general-medicine", "general_surgery": "general-surgery", "emergency_medicine": "emergency-medicine",
    "obstetrics": "obstetrics-gynaecology", "gynaecology": "obstetrics-gynaecology", "paediatrics": "paediatrics",
    "cardiology": "cardiology", "orthopaedics": "orthopaedics", "medical_oncology": "oncology", "nephrology": "nephrology",
    "neurology": "neurology", "gastroenterology": "gastroenterology", "urology": "urology", "pulmonology": "pulmonology",
    "endocrinology": "endocrinology", "ophthalmology": "ophthalmology", "ent": "ent", "dermatology": "dermatology",
    "psychiatry": "psychiatry", "dental": "dentistry", "rehabilitation": "physical-medicine-rehabilitation",
    "radiology": "radiology", "neurosurgery": "neurosurgery", "anaesthesiology": "anaesthesiology",
    "intensive_care": "critical-care", "pathology": "pathology", "plastic_surgery": "plastic-surgery",
    "neonatology": "neonatology", "reproductive_medicine": "reproductive-medicine",
    "cardiothoracic_surgery": "cardiothoracic-surgery", "surgical_oncology": "surgical-oncology",
    "radiation_oncology": "radiation-oncology", "rheumatology": "rheumatology", "paediatric_surgery": "paediatric-surgery",
    "vascular_surgery": "vascular-surgery", "oral_maxillofacial_surgery": "oral-maxillofacial-surgery",
    "haematology": "haematology", "geriatrics": "geriatrics", "infectious_diseases": "infectious-diseases",
    "paediatric_cardiology": "paediatric-cardiology", "hepatology": "hepatology", "palliative_care": "palliative-care",
    "pain_medicine": "pain-medicine", "ayurveda": "ayurveda", "homoeopathy": "homoeopathy", "unani": "unani",
    "yoga_naturopathy": "yoga-naturopathy",
}
SERVICE = {
    "physiotherapy": "rehabilitation", "pharmacy": "pharmacy", "icu": "intensive-care", "ambulance": "ambulance",
    "haemodialysis": "dialysis", "ultrasound": "ultrasound", "operation_theatre": "operation-theatre", "xray": "x-ray",
    "ct": "ct-scan", "endoscopy": "endoscopy", "cataract_surgery": "cataract-surgery", "blood_centre": "blood-centre",
    "organ_transplant": "organ-transplant", "nicu": "neonatal-intensive-care", "pathology_lab": "pathology-lab",
    "cardiac_catheterisation": "cardiac-catheterisation", "echocardiography": "echocardiography", "mri": "mri",
    "ecg": "ecg", "ventilator": "ventilator", "chemotherapy_day_care": "chemotherapy-day-care",
    "colonoscopy": "colonoscopy", "angioplasty": "angioplasty", "stress_test": "stress-test",
    "picu": "paediatric-intensive-care", "cornea_transplant": "cornea-transplant", "eeg": "eeg",
    "mammography": "mammography", "doppler": "doppler", "obstetric_delivery": "maternity-care",
    "hair_transplant": "hair-transplant", "pulmonary_function_test": "pulmonary-function-test",
    "radiotherapy": "radiotherapy", "pet_ct": "pet-ct", "hdu": "high-dependency-unit", "dietetics": "dietetics",
    "joint_replacement": "joint-replacement",
    # "emergency_department" is not a service: it sets the branch's emergency flag instead.
}
CAPACITY = {"total_beds": "total_beds", "icu": "icu_beds", "nicu": "nicu_beds", "picu": "picu_beds",
            "dialysis_station": "dialysis_stations"}
CREDENTIAL_CATEGORY = {"accreditation": "hospital_accreditation", "certification": "certification",
                       "empanelment": "registration"}
IDENT_NS = {"nabh": "nabh", "nhp": "national-hospital-directory", "nin": "nin"}
FIELD_PREFIX = {"hospital_branch": "identity", "branch_address": "geography", "branch_contact": "contact",
                "branch_credential": "credential", "branch_department": "offering.department",
                "branch_service": "offering.service", "branch_capacity": "capacity",
                "branch_emergency": "emergency", "branch_payer": "payer"}
# Address fragments and district labels that sources put in the town field.
NOT_A_PLACE = re.compile(r"\b(street|road|lane|marg|floor|near|opp|opposite|hospital|medical|centre|center|clinic|"
                         r"district|taluk|taluka|tehsil|mandal|block|sector|phase|colony)\b", re.I)
NOT_A_PLACE_EXACT = {"nagar", "pur", "dk", "cg", "ntr", "north", "south", "east", "west", "north east", "north west",
                     "south east", "south west", "north-east", "north-west", "south-east", "south-west", "central"}
RESERVED = {"district", "specialty", "locality", "service", "search", "compare"}

PHONE = re.compile(r"^\+[1-9][0-9]{7,14}$")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PIN = re.compile(r"^[1-9][0-9]{5}$")
PUBLIC_ID = re.compile(r"^[a-z0-9]{6,12}$")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def slugify(s: str) -> str:
    s = re.sub(r"&", " and ", s.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-{2,}", "-", s)


def clean_place(raw: str) -> str | None:
    """A town or district name, or None when the value is not a place name."""
    s = re.sub(r"\s+", " ", (raw or "").strip())
    s = re.sub(r"\s*-\s*\d+$", "", s)  # "Nagpur - 17" -> "Nagpur"
    if not s or re.search(r"[\d/,;:@#]", s) or len(s) > 40:
        return None
    if NOT_A_PLACE.search(s) or s.lower() in NOT_A_PLACE_EXACT:
        return None
    if s.isupper() or s.islower():
        s = s.title()
    return s


def display_name(raw: str) -> str:
    """Fix SHOUTING or all-lower names; short all-caps tokens (SGK, ENT, ICU) are kept as acronyms."""
    s = re.sub(r"\s+", " ", raw.strip())
    if s.islower():
        return s.title()
    if s.isupper():
        return " ".join(w if len(w) <= 4 and w.isalpha() else w.title() for w in s.split(" "))
    return s


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def https(url: str) -> str | None:
    url = (url or "").strip()
    if not url:
        return None
    url = re.sub(r"^https?://", "https://", url, flags=re.I)
    if not url.startswith("https://") or " " in url:
        return None
    return url


def read(path: Path, name: str):
    matches = sorted(path.glob(f"*{name}.csv"))
    if not matches:
        sys.exit(f"missing {name}.csv in {path}")
    with open(matches[0], encoding="utf-8-sig", newline="") as fh:
        yield from csv.DictReader(fh)


# ───────────────────────── main ─────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", type=Path)
    ap.add_argument("--replace", action="store_true", help="delete and reload branches from this scrape that already exist (none may be published)")
    ap.add_argument("--dry-run", action="store_true", help="run everything, then roll back")
    args = ap.parse_args()

    import psycopg  # imported late so --help works without it
    from psycopg.types.json import Jsonb

    url = os.environ.get("DATABASE_URL_UNPOOLED") or os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("Set DATABASE_URL_UNPOOLED.")

    skipped: Counter[str] = Counter()
    counts: Counter[str] = Counter()

    # ── read the scrape ──
    branches = list(read(args.dir, "hospital_branch"))
    addresses = {r["branch_id"]: r for r in read(args.dir, "branch_address") if r["is_primary"] == "true"}
    assertions: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for a in read(args.dir, "field_assertion"):
        assertions[(a["target_table"], a["target_record_id"])].append(a)

    def best(table: str, rid: str) -> tuple[str, dict | None]:
        """Best trust status among the assertions for one record, and that assertion."""
        top, top_a = "unverified", None
        for a in assertions.get((table, rid), []):
            s = status_of(a["source_kind"], a["verification_status"])
            if top_a is None or RANK[s] > RANK[top] or (RANK[s] == RANK[top] and a["checked_on"] > top_a["checked_on"]):
                top, top_a = s, a
        return top, top_a

    with psycopg.connect(url, autocommit=False) as conn, conn.cursor() as cur:
        cur.execute("set local statement_timeout = 0")
        cur.execute("select count(*) from hospital_branch where status = 'published' and id = any(%s::uuid[])",
                    ([b["branch_id"] for b in branches],))
        if cur.fetchone()[0]:
            sys.exit("Some branches from this scrape are already published. Re-imports of published branches need the editorial path.")
        cur.execute("select count(*) from hospital_branch where id = any(%s::uuid[])", ([b["branch_id"] for b in branches],))
        existing = cur.fetchone()[0]
        if existing and not args.replace:
            sys.exit(f"{existing} branches from this scrape already exist. Re-run with --replace to reload them.")
        if existing:
            cur.execute("delete from field_assertion where branch_id = any(%s::uuid[])", ([b["branch_id"] for b in branches],))
            cur.execute("delete from hospital_branch where id = any(%s::uuid[])", ([b["branch_id"] for b in branches],))
            counts["replaced_branches"] = existing

        # ── reference lookups ──
        cur.execute("select id, name, slug from geography where kind in ('state','union_territory')")
        states = {norm(n): (i, s) for i, n, s in cur.fetchall()}
        cur.execute("select a.normalized, g.id from geo_alias a join geography g on g.id = a.geography_id where g.kind in ('state','union_territory')")
        for n, i in cur.fetchall():
            states.setdefault(n, (i, None))
        cur.execute("select code, id from specialty")
        spec_ids = dict(cur.fetchall())
        cur.execute("select code, id from service")
        svc_ids = dict(cur.fetchall())
        missing_tax = {c for c in SPECIALTY.values() if c not in spec_ids} | {c for c in SERVICE.values() if c not in svc_ids}
        if missing_tax:
            sys.exit(f"Taxonomy missing {sorted(missing_tax)}: run the reference seed first.")

        # existing districts / settlements, by (state_id, normalized name or alias)
        geo: dict[tuple[str, str, str], str] = {}  # (kind, state_id, norm name) -> id
        cur.execute("select id, kind, state_id, name, slug from geography where kind in ('district','settlement')")
        geo_slugs: set[tuple[str, str, str]] = set()
        for i, k, st, n, s in cur.fetchall():
            geo[(k, str(st), norm(n))] = str(i)
            geo_slugs.add((k, str(st), s))
        cur.execute("""select g.kind, g.state_id, a.normalized, g.id from geo_alias a join geography g on g.id = a.geography_id
                       where g.kind in ('district','settlement')""")
        for k, st, n, i in cur.fetchall():
            geo.setdefault((k, str(st), n), str(i))

        new_geo: list[tuple] = []

        def place(kind: str, state_id: str, name: str | None, parent: str | None = None) -> str | None:
            if not name:
                return None
            key = (kind, state_id, norm(name))
            if key in geo:
                return geo[key]
            slug = slugify(name)
            if not slug or slug in RESERVED or not SLUG.match(slug):
                skipped[f"{kind}_name_unusable"] += 1
                return None
            base, n = slug, 2
            while (kind, state_id, slug) in geo_slugs:
                slug, n = f"{base}-{n}", n + 1
            gid = uid("geo", kind, state_id, norm(name))
            geo[key] = gid
            geo_slugs.add((kind, state_id, slug))
            new_geo.append((gid, kind, state_id, slug, name, parent))
            return gid

        # ── branches: resolve geography first ──
        resolved: dict[str, dict] = {}
        settlement_districts: dict[str, Counter] = defaultdict(Counter)
        for b in branches:
            a = addresses.get(b["branch_id"], {})
            st = states.get(norm(a.get("state_ut", "")))
            if not st:
                skipped["branch_no_state"] += 1
                continue
            state_id = str(st[0])
            dist = place("district", state_id, clean_place(a.get("district", "")), state_id)
            stl = place("settlement", state_id, clean_place(a.get("settlement", "")))
            if stl and dist:
                settlement_districts[stl][dist] += 1
            resolved[b["branch_id"]] = {"state": state_id, "district": dist, "settlement": stl}

        # A new town hangs under a district only when every branch that names both agrees.
        geo_rows = []
        for gid, kind, state_id, slug, name, parent in new_geo:
            district_id = None
            if kind == "settlement":
                ds = settlement_districts.get(gid)
                if ds and len(ds) == 1:
                    district_id = next(iter(ds))
                parent = district_id or state_id
            geo_rows.append((gid, kind, "town" if kind == "settlement" else None, parent, state_id, district_id,
                             gid if kind == "settlement" else None, slug, name))
        # districts first (towns reference them)
        geo_rows.sort(key=lambda r: r[1] != "district")
        with cur.copy("copy geography (id, kind, settlement_kind, parent_id, state_id, district_id, settlement_id, slug, name) from stdin") as cp:
            for r in geo_rows:
                cp.write_row(r)
        counts["new_districts"] = sum(1 for r in geo_rows if r[1] == "district")
        counts["new_towns"] = sum(1 for r in geo_rows if r[1] == "settlement")
        town_district = {r[0]: r[5] for r in geo_rows if r[1] == "settlement"}
        cur.execute("select id, district_id from geography where kind = 'settlement'")
        for i, d in cur.fetchall():
            town_district.setdefault(str(i), str(d) if d else None)

        # ── source records ──
        src_ids: dict[tuple[str, str], str] = {}
        src_rows = []
        latest: dict[tuple[str, str], str] = {}
        for lst in assertions.values():
            for a in lst:
                k = (a["source_kind"], a["source_url"])
                if a["checked_on"] > latest.get(k, ""):
                    latest[k] = a["checked_on"]
                if k not in src_ids:
                    kind, name, licence = SOURCE[a["source_kind"]]
                    if kind == "hospital_website":
                        host = re.sub(r"^https?://(www\.)?", "", a["source_url"]).split("/")[0]
                        name = f"{name}: {host}" if host else name
                    src_ids[k] = uid("src", *k)
                    src_rows.append([src_ids[k], kind, name, a["source_url"] or None, a["reuse_basis"], licence])
        id_to_key = {i: k for k, i in src_ids.items()}
        cur.execute("create temp table _src (like source_record including defaults) on commit drop")
        with cur.copy("copy _src (id, kind, name, url, rights_basis, licence, observed_at) from stdin") as cp:
            for r in src_rows:
                cp.write_row(r + [latest[id_to_key[r[0]]]])  # observed_at = newest check of that source
        cur.execute("""insert into source_record (id, kind, name, url, rights_basis, licence, observed_at)
                       select id, kind, name, url, rights_basis, licence, observed_at from _src
                       on conflict (id) do update set observed_at = greatest(source_record.observed_at, excluded.observed_at)""")
        counts["source_records"] = len(src_rows)

        def src(a: dict | None) -> str | None:
            return src_ids[(a["source_kind"], a["source_url"])] if a else None

        # ── organisations ──
        org_ids: dict[str, str] = {}
        org_rows = []
        cur.execute("select id, name, slug from organisation")
        org_slugs = set()
        for i, n, s in cur.fetchall():
            org_ids[norm(n)] = str(i)
            org_slugs.add(s)
        for b in branches:
            name = (b["operator_name"] or "").strip()
            if name and b["branch_id"] in resolved and norm(name) not in org_ids:
                slug, base, n = slugify(name), slugify(name), 2
                if not slug:
                    continue
                while slug in org_slugs:
                    slug, n = f"{base}-{n}", n + 1
                org_slugs.add(slug)
                org_ids[norm(name)] = uid("org", norm(name))
                org_rows.append((org_ids[norm(name)], name, slug, "operator"))
        with cur.copy("copy organisation (id, name, slug, kind) from stdin") as cp:
            for r in org_rows:
                cp.write_row(r)
        counts["organisations"] = len(org_rows)

        # ── emergency (folded into the branch row) ──
        emergency: dict[str, tuple[str, str]] = {}
        for e in read(args.dir, "branch_emergency"):
            s, a = best("branch_emergency", e["emergency_id"])
            if e["has_emergency_department"] == "confirmed_available" and s != "unverified" and a:
                emergency[e["branch_id"]] = ("yes", a["checked_on"])

        # last checked: newest public assertion per branch (any table), computed after facts load
        branch_rows = []
        for b in branches:
            r = resolved.get(b["branch_id"])
            if not r:
                continue
            a = addresses.get(b["branch_id"], {})
            pid = b["public_id"]
            if not PUBLIC_ID.match(pid):
                skipped["branch_bad_public_id"] += 1
                continue
            slug = b["canonical_slug"]
            if slug.endswith("-" + pid):
                slug = slug[: -len(pid) - 1]
            if not SLUG.match(slug):
                slug = slugify(b["official_name"]) or "hospital"
            lat = lng = None
            try:
                la, ln = float(a.get("latitude") or "x"), float(a.get("longitude") or "x")
                if 6 <= la <= 38 and 68 <= ln <= 98:
                    lat, lng = la, ln
            except ValueError:
                pass
            pin = a.get("postal_pin", "")
            district = r["district"] or (town_district.get(r["settlement"]) if r["settlement"] else None)
            em = emergency.get(b["branch_id"])
            branch_rows.append((
                b["branch_id"], pid, org_ids.get(norm(b["operator_name"] or "")), slug, display_name(b["official_name"]),
                b["branch_qualifier"].strip() or None, FACILITY.get(b["facility_type"], "other"),
                OWNERSHIP.get(b["ownership_type"]), "yes" if b["is_teaching_hospital"] == "true" else "unknown",
                (b["system_of_medicine"].replace(";", ",") or None), "staged",
                r["state"], district, r["settlement"],
                a.get("address_line_1") or None, a.get("address_line_2") or None, a.get("landmark") or None,
                pin if PIN.match(pin) else None, lat, lng, "unknown",
                em[0] if em else "unknown", em[1] if em else None,
            ))
        with cur.copy("""copy hospital_branch (id, public_id, org_id, slug, display_name, branch_qualifier, facility_type,
                           ownership, is_teaching, system_of_medicine, status, state_id, district_id, settlement_id,
                           address_line1, address_line2, landmark, pincode, lat, lng, coord_precision,
                           has_emergency, emergency_checked_at) from stdin""") as cp:
            for row in branch_rows:
                cp.write_row(row)
        loaded = {row[0] for row in branch_rows}
        counts["branches"] = len(loaded)
        counts["branches_with_town"] = sum(1 for row in branch_rows if row[13])

        # ── contacts ──
        rows = []
        for c in read(args.dir, "branch_contact"):
            if c["branch_id"] not in loaded:
                continue
            s, a = best("branch_contact", c["contact_id"])
            v, label = c["contact_value"].strip(), None
            if c["channel"] == "official_website":
                role, v = "website", https(v)
            elif c["channel"] == "email":
                role = "email"
                v = v if EMAIL.match(v) else None
            else:
                role = {"emergency": "emergency", "ambulance": "ambulance"}.get(c["purpose"], "switchboard")
                if c["purpose"] == "blood_centre":
                    label = "Blood centre"
                v = v if PHONE.match(v) else None
            if not v:
                skipped["contact_malformed"] += 1
                continue
            rows.append((c["contact_id"], c["branch_id"], role, v, label, False, s, src(a), a["checked_on"] if a else None))
        with cur.copy("copy branch_contact (id, branch_id, role, value, label, is_shared, status, source_record_id, last_checked_at) from stdin") as cp:
            for r in rows:
                cp.write_row(r)
        counts["contacts"] = len(rows)

        # ── credentials ──
        rows = []
        for c in read(args.dir, "branch_credential"):
            if c["branch_id"] not in loaded:
                continue
            s, a = best("branch_credential", c["credential_id"])
            if c["credential_status"] != "active":
                s = "expired"
            rows.append((c["credential_id"], c["branch_id"], c["issuing_authority"] or "NABH",
                         CREDENTIAL_CATEGORY.get(c["credential_kind"], "certification"),
                         c["programme_name"] or c["credential_kind"].capitalize(), c["award_level"] or None,
                         c["credential_number"] or None, c["covered_site"] or None, c["registry_url"] or None,
                         s, src(a), a["checked_on"] if a else None))
        with cur.copy("""copy credential (id, branch_id, issuer, category, programme, level, certificate_id, scope, register_url,
                           status, source_record_id, last_checked_at) from stdin""") as cp:
            for r in rows:
                cp.write_row(r)
        counts["credentials"] = len(rows)

        # ── offerings ──
        rows, seen = [], set()
        for d in read(args.dir, "branch_department"):
            if d["branch_id"] not in loaded:
                continue
            code = SPECIALTY.get(d["specialty_code"])
            if not code:
                skipped[f"department_{d['specialty_code']}"] += 1
                continue
            if (d["branch_id"], code) in seen:
                continue
            seen.add((d["branch_id"], code))
            s, a = best("branch_department", d["department_id"])
            rows.append((d["department_id"], d["branch_id"], spec_ids[code], None, "unspecified", "onsite", s, src(a),
                         a["source_url"] if a else None, a["checked_on"] if a else None))
        for v in read(args.dir, "branch_service"):
            if v["branch_id"] not in loaded:
                continue
            code = SERVICE.get(v["service_code"])
            if not code:
                skipped[f"service_{v['service_code']}"] += 1
                continue
            if (v["branch_id"], code) in seen:
                continue
            seen.add((v["branch_id"], code))
            s, a = best("branch_service", v["service_id"])
            rows.append((v["service_id"], v["branch_id"], None, svc_ids[code], "unspecified", "onsite", s, src(a),
                         a["source_url"] if a else None, a["checked_on"] if a else None))
        with cur.copy("""copy branch_offering (id, branch_id, specialty_id, service_id, care_setting, availability, status,
                           source_record_id, evidence_url, last_checked_at) from stdin""") as cp:
            for r in rows:
                cp.write_row(r)
        counts["offerings"] = len(rows)

        # ── capacity ──
        rows, seen = [], set()
        for c in read(args.dir, "branch_capacity"):
            if c["branch_id"] not in loaded:
                continue
            metric = CAPACITY.get(c["unit_code"])
            s, a = best("branch_capacity", c["capacity_id"])
            as_of = c["as_of_date"] or (a["checked_on"] if a else None)
            if not metric or not as_of or not c["quantity"].isdigit():
                skipped[f"capacity_{c['unit_code']}"] += 1
                continue
            if not 0 < int(c["quantity"]) <= (10000 if metric == "total_beds" else 2000):
                skipped["capacity_implausible"] += 1  # e.g. a phone number read as a bed count
                continue
            if (c["branch_id"], metric, as_of) in seen:
                continue
            seen.add((c["branch_id"], metric, as_of))
            definition = "As stated on the hospital's website" if c["measure_basis"] == "stated_on_website" else None
            rows.append((c["capacity_id"], c["branch_id"], metric, int(c["quantity"]), definition, as_of, s, src(a)))
        with cur.copy("copy branch_capacity (id, branch_id, metric, value, definition, as_of, status, source_record_id) from stdin") as cp:
            for r in rows:
                cp.write_row(r)
        counts["capacity"] = len(rows)

        # ── payers ──
        rows, seen = [], set()
        for p in read(args.dir, "branch_payer"):
            if p["branch_id"] not in loaded:
                continue
            code = slugify(p["payer_name"])
            if not code or (p["branch_id"], code) in seen:
                continue
            seen.add((p["branch_id"], code))
            s, a = best("branch_payer", p["payer_id"])
            rows.append((p["payer_id"], p["branch_id"], p["payer_kind"], code, p["payer_name"], p["plan_or_scheme_variant"] or None,
                         "listed_by_hospital", s, src(a), p["last_confirmed_on"] or (a["checked_on"] if a else None)))
        with cur.copy("""copy branch_payer (id, branch_id, payer_kind, payer_code, payer_name, plan, mode, status,
                           source_record_id, last_checked_at) from stdin""") as cp:
            for r in rows:
                cp.write_row(r)
        counts["payers"] = len(rows)

        # ── identifiers (NABH no., directory keys) ──
        rows, seen = [], set()
        cur.execute("select namespace, value from branch_identifier where valid_to is null")
        seen |= set(cur.fetchall())
        first_src = {}
        for (tbl, rid), lst in assertions.items():
            if tbl == "hospital_branch":
                for a in lst:
                    first_src.setdefault(rid, src(a))
        for l in read(args.dir, "branch_source_link"):
            ns = IDENT_NS.get(l["source"])
            if not ns or l["branch_id"] not in loaded or not l["source_key"]:
                continue
            if (ns, l["source_key"]) in seen:
                skipped["identifier_duplicate"] += 1
                continue
            seen.add((ns, l["source_key"]))
            sid = first_src.get(l["branch_id"])
            if not sid:
                continue
            rows.append((uid("ident", ns, l["source_key"]), l["branch_id"], ns, l["source_key"], sid))
        with cur.copy("copy branch_identifier (id, branch_id, namespace, value, source_record_id) from stdin") as cp:
            for r in rows:
                cp.write_row(r)
        counts["identifiers"] = len(rows)

        # ── provenance: every scrape assertion for a loaded record ──
        record_branch: dict[tuple[str, str], str] = {("hospital_branch", b): b for b in loaded}
        for table, idcol in [("branch_address", "address_id"), ("branch_contact", "contact_id"), ("branch_credential", "credential_id"),
                             ("branch_department", "department_id"), ("branch_service", "service_id"),
                             ("branch_capacity", "capacity_id"), ("branch_emergency", "emergency_id"), ("branch_payer", "payer_id")]:
            for r in read(args.dir, table):
                if r["branch_id"] in loaded:
                    record_branch[(table, r[idcol])] = r["branch_id"]
        n_fa = 0
        seen_fa: set[str] = set()
        operating = {b["branch_id"] for b in branches if b["operational_status"] == "operating"}
        op_evidence: dict[str, dict] = {}
        with cur.copy("""copy field_assertion (id, branch_id, field_path, value, source_record_id, evidence_url,
                           observed_at, status) from stdin""") as cp:
            for (table, rid), lst in assertions.items():
                bid = record_branch.get((table, rid))
                if not bid:
                    continue
                for a in lst:
                    if a["assertion_id"] in seen_fa:
                        skipped["assertion_duplicate_id"] += 1
                        continue
                    seen_fa.add(a["assertion_id"])
                    s = status_of(a["source_kind"], a["verification_status"])
                    field = "record" if a["field_key"] == "*" else a["field_key"]
                    ref = a["source_reference"]
                    cp.write_row((a["assertion_id"], bid, f"{FIELD_PREFIX[table]}.{field}",
                                  Jsonb({"reference": ref}) if ref else None,
                                  src(a), a["source_url"] or None, a["checked_on"], s))
                    n_fa += 1
                    # Current operating evidence: an active NABH listing read from the register.
                    if (bid in operating and a["source_kind"] == "accrediting_body_register" and s == "checked_against_source"
                            and a["checked_on"] > op_evidence.get(bid, {}).get("checked_on", "")):
                        op_evidence[bid] = a
            for bid, a in op_evidence.items():
                cp.write_row((uid("operating", bid), bid, "identity.operating_status", Jsonb("operating"),
                              src(a), a["source_url"] or None, a["checked_on"], "checked_against_source"))
        counts["field_assertions"] = n_fa
        counts["operating_evidence"] = len(op_evidence)

        cur.execute("create temp table _loaded (id uuid primary key) on commit drop")
        with cur.copy("copy _loaded from stdin") as cp:
            for i in loaded:
                cp.write_row((i,))
        cur.execute("""
            update hospital_branch b set last_checked_at = x.at
            from (select fa.branch_id, max(fa.observed_at) as at
                  from field_assertion fa join _loaded l on l.id = fa.branch_id
                  where fa.status in ('hospital_supplied','checked_against_source')
                  group by 1) x
            where x.branch_id = b.id""")

        print("\nLoaded:")
        for k, v in counts.items():
            print(f"  {k:24} {v:>8,}")
        print("Skipped:")
        for k, v in sorted(skipped.items(), key=lambda kv: -kv[1]):
            print(f"  {k:40} {v:>8,}")

        if args.dry_run:
            conn.rollback()
            print("\nDry run: rolled back.")
        else:
            conn.commit()
            print(f"\nCommitted on {date.today()}. Next: npx tsx scripts/recompute-derived.ts --publish")


if __name__ == "__main__":
    main()
