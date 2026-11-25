#!/usr/bin/env python3
"""
Data-quality audit of the hospital directory, for the data team to verify.

    DATABASE_URL_UNPOOLED=... python3 scripts/qa/data_issues.py data/qa/<date> [--scrape data/import/<date>]

Writes one CSV per check into the output folder plus summary.csv. Checks the
PUBLISHED (live) branches first; staged branches get a gap list, because they
need enrichment rather than verification. --scrape adds checks that need the
raw scrape (original http:// websites, rows the import skipped).

Every check is a heuristic: a flagged row is "please verify", not "wrong".
"""
from __future__ import annotations

import csv
import math
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import psycopg

SITE = "https://thehospitalindex.vercel.app/hospital/"
out = Path(sys.argv[1])
scrape = Path(sys.argv[sys.argv.index("--scrape") + 1]) if "--scrape" in sys.argv else None
out.mkdir(parents=True, exist_ok=True)
summary: list[dict] = []


def write(name: str, title: str, severity: str, what: str, action: str, rows: list[dict]):
    path = out / f"{name}.csv"
    cols = list(rows[0].keys()) if rows else ["public_id"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    summary.append({"sheet": name, "issue": title, "severity": severity, "rows": len(rows), "what_we_found": what, "what_to_do": action})
    print(f"{name:32} {len(rows):>7}")


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


conn = psycopg.connect(os.environ["DATABASE_URL_UNPOOLED"])
cur = conn.cursor()


def rows(sql, *params):
    cur.execute(sql, params)
    names = [d.name for d in cur.description]
    return [dict(zip(names, r)) for r in cur.fetchall()]


B = rows("""
  select b.id, b.public_id, b.slug || '-' || b.public_id as path, b.display_name as name, b.status::text,
         b.facility_type::text, coalesce(stl.name,'') as town, st.name as state, coalesce(d.name,'') as district,
         concat_ws(', ', b.address_line1, b.address_line2) as address, coalesce(b.pincode,'') as pincode, b.lat, b.lng,
         b.settlement_id, b.state_id, b.org_id,
         (select c.value from branch_contact c where c.branch_id = b.id and c.role = 'switchboard'
            and c.status = 'checked_against_source' order by c.value limit 1) as phone,
         (select c.value from branch_contact c where c.branch_id = b.id and c.role = 'website' order by c.value limit 1) as website
  from hospital_branch b
  join geography st on st.id = b.state_id
  left join geography stl on stl.id = b.settlement_id
  left join geography d on d.id = b.district_id""")
pub = [b for b in B if b["status"] == "published"]
PUB = {b["public_id"]: b for b in pub}
for b in B:
    b["url"] = SITE + b["path"] if b["status"] == "published" else ""
print(f"branches {len(B)}, published {len(pub)}")


def base(b):
    return {"public_id": b["public_id"], "hospital": b["name"], "town": b["town"], "state": b["state"], "pincode": b["pincode"],
            "address": b["address"], "live_url": b["url"]}


VERIFY = {"verified_correct (Y/N)": "", "correct_value": "", "notes": ""}

# ── 1. PIN does not belong to the town ──
pin3_by_town: dict[str, Counter] = defaultdict(Counter)
pin2_by_state: dict[str, Counter] = defaultdict(Counter)
for b in B:
    if b["pincode"]:
        pin2_by_state[b["state_id"]][b["pincode"][:2]] += 1
        if b["settlement_id"]:
            pin3_by_town[b["settlement_id"]][b["pincode"][:3]] += 1
out_rows = []
for b in pub:
    p = b["pincode"]
    if not p:
        continue
    st = pin2_by_state[b["state_id"]]
    st_total = sum(st.values())
    wrong_state = st[p[:2]] / st_total < 0.01
    town = pin3_by_town[b["settlement_id"]]
    usual = [k for k, v in town.most_common() if v / sum(town.values()) >= 0.15]
    wrong_town = sum(town.values()) >= 3 and p[:3] not in usual
    if wrong_state or wrong_town:
        out_rows.append({**base(b), "problem": "PIN belongs to another state" if wrong_state else "PIN is unusual for this town",
                         "usual_pin_prefixes_for_town": " / ".join(u + "xxx" for u in usual), **VERIFY})
out_rows.sort(key=lambda r: r["problem"] != "PIN belongs to another state")
write("01_pin_vs_town", "PIN code does not match the town or state", "High",
      "The branch's PIN code is rare for its state, or differs from the PIN area used by the other hospitals in its town. "
      "Usually means the listing is filed under the wrong town, or the PIN is mistyped.",
      "Check the address against the hospital's own site or Google Maps. Give the correct town and PIN.", out_rows)

# ── 2. Address names a different big city ──
cities = Counter(b["town"] for b in pub if b["town"])
big = [c for c, n in cities.items() if n >= 15 and len(c) >= 5]
aliases = {"Bengaluru": ["Bangalore"], "Gurugram": ["Gurgaon"], "Mumbai": ["Bombay"], "Chennai": ["Madras"], "Kolkata": ["Calcutta"],
           "Delhi": ["New Delhi"], "New Delhi": ["Delhi"], "Thane": [], "Navi Mumbai": ["Mumbai"]}
out_rows = []
for b in pub:
    addr = b["address"].lower()
    own = [b["town"].lower()] + [a.lower() for a in aliases.get(b["town"], [])]
    if any(o and o in addr for o in own):
        continue
    hits = [c for c in big if c != b["town"]
            and re.search(r"\b" + re.escape(c.lower()) + r"\b(?!\s*(road|rd|bypass|highway|marg|chowk|gate|bus))", addr)]
    hits = [h for h in hits if not any(h.lower() in o or o in h.lower() for o in own)]
    if hits:
        out_rows.append({**base(b), "address_mentions": ", ".join(hits), **VERIFY})
write("02_address_names_other_city", "Address names a different city from the listed town", "High",
      "The street address mentions another city (e.g. an Indore street address on a Jaipur listing) and never mentions the listed town.",
      "Confirm which city the branch is really in. Give the correct town, address and PIN.", out_rows)

# ── 3. Map pin far from its town ──
centre: dict[str, tuple[float, float]] = {}
pts = defaultdict(list)
for b in pub:
    if b["lat"] is not None and b["settlement_id"]:
        pts[b["settlement_id"]].append((b["lat"], b["lng"]))
for t, p in pts.items():
    if len(p) >= 3:
        la = sorted(x[0] for x in p)[len(p) // 2]
        lo = sorted(x[1] for x in p)[len(p) // 2]
        centre[t] = (la, lo)
out_rows = []
for b in pub:
    c = centre.get(b["settlement_id"])
    if b["lat"] is None or not c:
        continue
    d = km((b["lat"], b["lng"]), c)
    if d > 40:
        out_rows.append({**base(b), "latitude": b["lat"], "longitude": b["lng"], "km_from_town_centre": round(d),
                         "map_link": f"https://www.google.com/maps?q={b['lat']},{b['lng']}", **VERIFY})
out_rows.sort(key=lambda r: -r["km_from_town_centre"])
write("03_map_pin_far_from_town", "Map coordinates are far from the listed town", "Medium",
      "The coordinates are more than 40 km from the middle of the other hospitals in the same town; half are over 400 km out. "
      "Coordinates are not shown to patients yet (no Directions button), so this blocks maps rather than misleading anyone today.",
      "Open the map link. Give correct coordinates, or the correct town if the pin is right.", out_rows)

no_coords = [{**base(b), **VERIFY} for b in pub if b["lat"] is None]
write("04_no_coordinates", "Live branch has no map coordinates", "Low",
      "No latitude/longitude, so the branch cannot appear on a map. (Coordinates that do exist are marked 'approximate' by the source, "
      "so the site shows no Directions button for any branch yet.)",
      "Supply rooftop coordinates where possible.", no_coords)

# ── 5. Facility type vs name ──
KW = [(r"\b(heart|cardiac|cardio)", "specialty_hospital", "heart"), (r"\b(eye|netralaya|nethralaya|vision|ophthal)", "specialty_hospital", "eye"),
      (r"\b(cancer|onco)", "specialty_hospital", "cancer"), (r"\b(ortho|bone|joint|spine)", "specialty_hospital", "orthopaedic"),
      (r"\b(kidney|nephro|uro)", "specialty_hospital", "kidney/urology"), (r"\b(maternity|mother|women|nursing home)", None, "maternity/women"),
      (r"\b(child|children|kids|paediatric|pediatric|shishu)", "specialty_hospital", "children"),
      (r"\b(ivf|fertility)", "specialty_hospital", "fertility"), (r"\b(dental|dentist)", "specialty_hospital", "dental"),
      (r"\b(neuro|brain)", "specialty_hospital", "neuro"), (r"\b(ent)\b", "specialty_hospital", "ENT"),
      (r"\b(psychiatr|mental|de-?addiction|rehab)", "specialty_hospital", "mental health / rehab"),
      (r"\b(multi ?speciality|multi ?specialty|super ?speciality|super ?specialty)", "multispecialty_hospital", "multispecialty")]
out_rows = []
for b in pub:
    n = b["name"].lower()
    for pat, expected, label in KW:
        if re.search(pat, n):
            if expected and b["facility_type"] != expected and not (expected == "specialty_hospital" and b["facility_type"] in ("teaching_hospital", "multispecialty_hospital") and label != "multispecialty"):
                if b["facility_type"] == "general_hospital" or (label == "multispecialty" and b["facility_type"] != "teaching_hospital"):
                    out_rows.append({**base(b), "listed_type": b["facility_type"].replace("_", " "), "name_suggests": label,
                                     "suggested_type": expected.replace("_", " "), **VERIFY})
            break
write("05_facility_type", "Facility type looks wrong for the hospital's name", "Medium",
      "The type came from a name/programme rule in the scrape. The name suggests a specialty or multispecialty hospital, but it is listed as something else.",
      "Confirm the type: general, multispecialty, specialty (which one), teaching, maternity, etc.", out_rows)

# ── 6. Names that need cleaning ──
out_rows = []
for b in pub:
    n = b["name"]
    probs = []
    if re.search(r"\d", n):
        probs.append("contains numbers")
    if re.search(r"\b(street|road|marg|sector|near|opp|plot|no\.)", n, re.I):
        probs.append("contains part of an address")
    if re.search(r"\b(pvt|private|ltd|limited|llp)\b", n, re.I):
        probs.append("legal company name, not the hospital's public name")
    if len(n) <= 6:
        probs.append("very short")
    if re.search(r"a unit of|earlier certificate|previously known|formerly|\(earlier", n, re.I):
        probs.append("contains certificate text ('A unit of…', 'Earlier certificate…')")
    if probs:
        out_rows.append({**base(b), "problems": "; ".join(probs), **VERIFY})
write("06_names", "Hospital name needs cleaning", "Medium",
      "Names with address fragments, numbers, 'Pvt Ltd' company names or odd capitals. These show as the page title.",
      "Give the name patients would recognise, as on the hospital's signboard or website.", out_rows)

# ── 7. Possible duplicates ──
def nkey(s):
    s = re.sub(r"\b(pvt|private|ltd|limited|llp|the|and|hospital|hospitals|&)\b", " ", s.lower())
    return re.sub(r"[^a-z0-9]", "", s)

groups = defaultdict(list)
for b in B:
    if b["settlement_id"] and nkey(b["name"]):
        groups[(b["settlement_id"], nkey(b["name"]))].append(b)
out_rows, gid = [], 0
for g in groups.values():
    if len(g) > 1 and any(x["status"] == "published" for x in g):
        gid += 1
        for b in g:
            out_rows.append({"group": gid, "status": b["status"], **base(b), "phone": b["phone"] or "", **VERIFY})
write("07_possible_duplicates", "Possible duplicate listings in the same town", "High",
      "Two or more records with the same name in the same town, at least one of them live. Can be a real second branch, or the same hospital from two sources.",
      "For each group, say whether these are the same branch (and which record to keep) or different branches (and how they differ).", out_rows)

# ── 8. Same phone on unrelated hospitals ──
by_phone = defaultdict(list)
for b in pub:
    if b["phone"]:
        by_phone[b["phone"]].append(b)
out_rows, gid = [], 0
for ph, g in by_phone.items():
    names = {nkey(x["name"]) for x in g}
    orgs = {x["org_id"] for x in g}
    brands = {re.sub(r"[^a-z]", "", x["name"].lower().split(" ")[0]) for x in g}
    if len(g) > 1 and len(names) > 1 and len(brands) > 1 and not (len(orgs) == 1 and None not in orgs):
        gid += 1
        for b in g:
            out_rows.append({"group": gid, "phone": ph, **base(b), **VERIFY})
write("08_shared_phone", "Same phone number on different hospitals", "High",
      "One switchboard number is listed for hospitals with different names that are not in the same group. Patients may call the wrong place.",
      "Confirm each hospital's own switchboard number.", out_rows)

# ── 9. Phone format ──
out_rows = []
for c in rows("""select b.public_id, c.role::text as role, c.value from branch_contact c join hospital_branch b on b.id = c.branch_id
                 where b.status = 'published' and c.role not in ('website','email','contact_page','appointment_url')"""):
    v, prob = c["value"], None
    digits = v[3:] if v.startswith("+91") else None
    if digits is None:
        prob = "not an Indian number"
    elif len(digits) != 10:
        prob = f"{len(digits)} digits after +91 (expected 10)"
    elif re.match(r"^(\d)\1{5,}", digits) or digits in ("1234567890", "9876543210"):
        prob = "looks like a placeholder"
    elif digits[0] == "0":
        prob = "extra leading 0 after +91"
    if prob:
        b = PUB[c["public_id"]]
        out_rows.append({**base(b), "contact_type": c["role"], "number": v, "problem": prob, **VERIFY})
write("09_phone_format", "Phone number format looks wrong", "Medium",
      "Numbers that do not have 10 digits after +91, look like placeholders, or start with an unusual digit.",
      "Give the working number, with STD code for landlines.", out_rows)

# ── 10. Websites ──
orig_http = set()
if scrape:
    with open(scrape / "branch_contact.csv", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if r["channel"] == "official_website" and r["contact_value"].lower().startswith("http://"):
                orig_http.add((r["branch_id"], re.sub(r"^http://", "https://", r["contact_value"].strip(), flags=re.I)))
BAD_HOSTS = r"(facebook|instagram|justdial|practo|google|sites\.google|blogspot|wordpress\.com|wixsite|linkedin|youtube|\.bank\.|indiamart|sulekha|lybrate)"
out_rows = []
for c in rows("""select b.id, b.public_id, c.value, c.status::text from branch_contact c join hospital_branch b on b.id = c.branch_id
                 where b.status = 'published' and c.role = 'website'"""):
    b = PUB[c["public_id"]]
    probs = []
    if (str(c["id"]), c["value"]) in orig_http:
        probs.append("source gave http://; site shows https:// — check it loads")
    if re.search(BAD_HOSTS, c["value"], re.I):
        probs.append("not the hospital's own website (social, directory or unrelated domain)")
    if c["status"] == "unverified":
        continue
    if probs:
        out_rows.append({**base(b), "website": c["value"], "problems": "; ".join(probs), **VERIFY})
write("10_websites", "Website may not load or is not the hospital's own", "Low",
      "About half the source websites were http://; the site requires https://, so they were upgraded and some may not load. Some 'websites' are social pages, directories or unrelated domains.",
      "Open each link. Give the hospital's own working https address, or mark 'no website'.", out_rows)

# ── 11. Bed counts ──
out_rows = []
caps = rows("""select b.public_id, bc.metric::text, bc.value from branch_capacity bc join hospital_branch b on b.id = bc.branch_id
               where b.status = 'published'""")
per = defaultdict(dict)
for c in caps:
    per[c["public_id"]][c["metric"]] = c["value"]
for pidv, m in per.items():
    b = PUB[pidv]
    probs = []
    t = m.get("total_beds")
    if t is not None and (t < 10 or t > 2500):
        probs.append(f"{t} total beds is unusual")
    for k in ("icu_beds", "nicu_beds", "picu_beds"):
        if t is not None and m.get(k) is not None and m[k] >= t:
            probs.append(f"{k.split('_')[0].upper()} beds ({m[k]}) not fewer than total ({t})")
    if probs:
        out_rows.append({**base(b), **{k: m.get(k, "") for k in ("total_beds", "icu_beds", "nicu_beds", "picu_beds", "dialysis_stations")},
                         "problems": "; ".join(probs), **VERIFY})
write("11_bed_counts", "Bed counts look implausible", "Low",
      "Bed counts are the hospital's own website claim. These are very small, very large, or have more ICU beds than total beds.",
      "Confirm installed beds with the hospital.", out_rows)

# ── 12. Town names ──
towns = rows("""select g.id, g.name, st.name as state, count(b.id) filter (where b.status = 'published') as live,
                count(b.id) as all_branches,
                exists (select 1 from geography d where d.kind = 'district' and d.state_id = g.state_id and lower(d.name) = lower(g.name)) as same_as_district
                from geography g join geography st on st.id = g.state_id left join hospital_branch b on b.settlement_id = g.id
                where g.kind = 'settlement' group by g.id, st.name""")
def tkey(s):
    s = re.sub(r"\b(nagar|city|district|urban|rural)\b", "", s.lower())
    return re.sub(r"[^a-z]", "", s.replace("buddha", "buddh"))
tg = defaultdict(list)
for t in towns:
    tg[(t["state"], tkey(t["name"]))].append(t)
out_rows, gid = [], 0
for g in tg.values():
    if len(g) > 1 and any(t["live"] for t in g):
        gid += 1
        for t in g:
            out_rows.append({"group": gid, "town_on_site": t["name"], "state": t["state"], "live_branches": t["live"],
                             "all_branches": t["all_branches"], "should_be_merged_into": "", "notes": ""})
DISTRICT_ONLY = re.compile(r"^(north|south|east|west|central)\b|\b(nagar)$", re.I)
for t in towns:
    if t["live"] and re.match(r"^(north|south|east|west)\b", t["name"], re.I):
        gid += 1
        out_rows.append({"group": gid, "town_on_site": t["name"], "state": t["state"], "live_branches": t["live"],
                         "all_branches": t["all_branches"], "should_be_merged_into": "", "notes": "looks like a district, not a town"})
write("12_town_names", "Town names that are spelling variants or districts", "Medium",
      "The same place under two names (Gautam Buddh / Gautam Buddha Nagar, Kanpur / Kanpur Nagar), or a district name used as a town. "
      "Each name gets its own city page, so variants split the listings.",
      "For each group, give the one town name to keep. The other names become aliases.", out_rows)

# ── 13. Credentials without expiry ──
cr = rows("""select b.public_id, cr.category, cr.programme, cr.level, cr.certificate_id, cr.register_url
             from credential cr join hospital_branch b on b.id = cr.branch_id where b.status = 'published' and cr.expires_on is null""")
out_rows = []
for c in cr:
    b = PUB[c["public_id"]]
    out_rows.append({**base(b), "credential_type": c["category"].replace("_", " "), "programme": c["programme"], "level": c["level"] or "",
                     "certificate_no": c["certificate_id"] or "", "register_link": c["register_url"] or "",
                     "valid_from (dd-mm-yyyy)": "", "valid_until (dd-mm-yyyy)": "", "notes": ""})
write("13_accreditation_dates", "NABH accreditations have no expiry date", "High",
      "The register entries were loaded without start or expiry dates, so the site shows every NABH status as current. "
      "An expired accreditation would still show the badge.",
      "Fill valid-from and valid-until from the NABH certificate (register link given).", out_rows)

# ── 14. Staged: what blocks publishing ──
gaps = rows("""
  select b.public_id, b.display_name as hospital, st.name as state, coalesce(stl.name,'') as town, coalesce(d.name,'') as district,
         concat_ws(', ', b.address_line1, b.address_line2) as address, coalesce(b.pincode,'') as pincode,
         (b.settlement_id is null) as missing_town,
         (b.address_line1 is null and b.postal_address is null) as missing_address,
         not exists (select 1 from field_assertion fa where fa.branch_id = b.id and fa.field_path = 'identity.operating_status'
                     and fa.status in ('hospital_supplied','checked_against_source')) as missing_operating_proof,
         not exists (select 1 from branch_contact c where c.branch_id = b.id and c.status = 'checked_against_source') as missing_checked_contact,
         coalesce((select string_agg(distinct i.namespace, ', ') from branch_identifier i where i.branch_id = b.id), '') as found_in
  from hospital_branch b join geography st on st.id = b.state_id
  left join geography stl on stl.id = b.settlement_id left join geography d on d.id = b.district_id
  where b.status = 'staged' order by st.name, stl.name nulls last, b.display_name""")
for g in gaps:
    for k in ("missing_town", "missing_address", "missing_operating_proof", "missing_checked_contact"):
        g[k] = "Yes" if g[k] else ""
    g.update({"town_found": "", "phone_found": "", "operating (Y/N/closed)": "", "notes": ""})
write("14_staged_gaps", "Not live yet: what each branch is missing", "Enrichment",
      "Loaded but hidden. A branch goes live once it has a town, an address, proof it is operating, and a contact checked against a source.",
      "Fill the gaps you can (town, working phone, whether it is operating). Closed hospitals: mark 'closed'.", gaps)

# ── 15/16. Rows the import skipped ──
if scrape:
    states = {norm for (norm,) in cur.execute("select lower(name) from geography where kind in ('state','union_territory')").fetchall()}
    addr = {}
    with open(scrape / "branch_address.csv", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            addr[r["branch_id"]] = r
    out_rows = []
    with open(scrape / "hospital_branch.csv", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            a = addr.get(r["branch_id"], {})
            if (a.get("state_ut") or "").lower() not in states:
                out_rows.append({"scrape_branch_id": r["branch_id"], "hospital": r["official_name"], "address": a.get("address_line_1", ""),
                                 "district": a.get("district", ""), "pincode": a.get("postal_pin", ""), "sources": r["sources"],
                                 "state (fill in)": "", "town (fill in)": "", "notes": ""})
    write("15_not_loaded_no_state", "Not loaded: no state in the source", "Enrichment",
          "These records had no state, so they could not be placed and were left out entirely.",
          "Give the state and town; they will load on the next import.", out_rows)

    unm = Counter()
    for f, code, label in (("branch_department.csv", "specialty_code", "department_name"), ("branch_service.csv", "service_code", "patient_facing_name")):
        with open(scrape / f, encoding="utf-8-sig") as fh:
            for r in csv.DictReader(fh):
                if r[code] == "unmapped":
                    unm[("department" if "depart" in f else "service", r[label].strip())] += 1
    out_rows = [{"kind": k, "name_on_hospital_site": n, "hospitals": c, "map_to_specialty_or_service": "", "notes": ""}
                for (k, n), c in unm.most_common()]
    write("16_unmapped_departments", "Departments and services the scrape could not classify", "Enrichment",
          "Names read from hospital websites that matched no specialty or service, so they are not shown.",
          "Map each name to an existing specialty or service, or say 'new' with a name, or 'ignore'.", out_rows)

with open(out / "summary.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(summary[0].keys()))
    w.writeheader()
    w.writerows(summary)
print("done", out)
