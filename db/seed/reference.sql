-- Reference data: geography master (GEO-01 "load every current state and UT"),
-- starter taxonomy and link-only review providers. Idempotent.
--
-- Deliberately NOT included: LGD/ISO codes (load from the Local Government
-- Directory with its reuse basis recorded), districts, and any hospital.
-- Hospitals enter only through a sourced import (OPS-01/02).

INSERT INTO geography (kind, slug, name) VALUES
  ('state','andhra-pradesh','Andhra Pradesh'),
  ('state','arunachal-pradesh','Arunachal Pradesh'),
  ('state','assam','Assam'),
  ('state','bihar','Bihar'),
  ('state','chhattisgarh','Chhattisgarh'),
  ('state','goa','Goa'),
  ('state','gujarat','Gujarat'),
  ('state','haryana','Haryana'),
  ('state','himachal-pradesh','Himachal Pradesh'),
  ('state','jharkhand','Jharkhand'),
  ('state','karnataka','Karnataka'),
  ('state','kerala','Kerala'),
  ('state','madhya-pradesh','Madhya Pradesh'),
  ('state','maharashtra','Maharashtra'),
  ('state','manipur','Manipur'),
  ('state','meghalaya','Meghalaya'),
  ('state','mizoram','Mizoram'),
  ('state','nagaland','Nagaland'),
  ('state','odisha','Odisha'),
  ('state','punjab','Punjab'),
  ('state','rajasthan','Rajasthan'),
  ('state','sikkim','Sikkim'),
  ('state','tamil-nadu','Tamil Nadu'),
  ('state','telangana','Telangana'),
  ('state','tripura','Tripura'),
  ('state','uttar-pradesh','Uttar Pradesh'),
  ('state','uttarakhand','Uttarakhand'),
  ('state','west-bengal','West Bengal'),
  ('union_territory','andaman-and-nicobar-islands','Andaman and Nicobar Islands'),
  ('union_territory','chandigarh','Chandigarh'),
  ('union_territory','dadra-and-nagar-haveli-and-daman-and-diu','Dadra and Nagar Haveli and Daman and Diu'),
  ('union_territory','delhi','Delhi'),
  ('union_territory','jammu-and-kashmir','Jammu and Kashmir'),
  ('union_territory','ladakh','Ladakh'),
  ('union_territory','lakshadweep','Lakshadweep'),
  ('union_territory','puducherry','Puducherry')
ON CONFLICT (slug) WHERE kind in ('state','union_territory') DO NOTHING;

UPDATE geography SET state_id = id WHERE kind in ('state','union_territory') AND state_id IS NULL;

INSERT INTO geo_alias (geography_id, alias, normalized, kind)
SELECT g.id, v.alias, lower(v.alias), v.kind::alias_kind
FROM (VALUES
  ('odisha','Orissa','former_name'),
  ('puducherry','Pondicherry','former_name'),
  ('uttarakhand','Uttaranchal','former_name'),
  ('delhi','NCT of Delhi','alias'),
  ('jammu-and-kashmir','J&K','alias'),
  ('andaman-and-nicobar-islands','Andaman and Nicobar','alias'),
  ('tamil-nadu','Tamilnadu','common_spelling')
) AS v(slug, alias, kind)
JOIN geography g ON g.slug = v.slug AND g.kind in ('state','union_territory')
ON CONFLICT (geography_id, normalized) DO NOTHING;

-- GEO-02 named examples: Bangalore/Bengaluru and Gurgaon/Gurugram resolve through aliases.
INSERT INTO geography (kind, parent_id, state_id, slug, name)
SELECT 'district', s.id, s.id, v.slug, v.name
FROM (VALUES ('karnataka','bengaluru-urban','Bengaluru Urban'), ('haryana','gurugram','Gurugram')) AS v(state_slug, slug, name)
JOIN geography s ON s.slug = v.state_slug AND s.kind = 'state'
ON CONFLICT (state_id, slug) WHERE kind = 'district' DO NOTHING;

INSERT INTO geography (kind, settlement_kind, parent_id, state_id, district_id, slug, name)
SELECT 'settlement', 'city', d.id, d.state_id, d.id, v.slug, v.name
FROM (VALUES ('bengaluru-urban','bengaluru','Bengaluru'), ('gurugram','gurugram','Gurugram')) AS v(district_slug, slug, name)
JOIN geography d ON d.slug = v.district_slug AND d.kind = 'district'
ON CONFLICT (state_id, slug) WHERE kind = 'settlement' DO NOTHING;

UPDATE geography SET settlement_id = id WHERE kind = 'settlement' AND settlement_id IS NULL;

INSERT INTO geo_alias (geography_id, alias, normalized, kind)
SELECT g.id, v.alias, lower(v.alias), 'former_name'
FROM (VALUES ('bengaluru','settlement','Bangalore'), ('gurugram','settlement','Gurgaon'),
             ('bengaluru-urban','district','Bangalore Urban'), ('gurugram','district','Gurgaon')) AS v(slug, kind, alias)
JOIN geography g ON g.slug = v.slug AND g.kind = v.kind::geo_kind
ON CONFLICT (geography_id, normalized) DO NOTHING;

INSERT INTO specialty (code, slug, name, plain_label, sort_order) VALUES
  ('general-medicine','general-medicine','General Medicine','General physician',10),
  ('general-surgery','general-surgery','General Surgery','Surgery',20),
  ('emergency-medicine','emergency-medicine','Emergency Medicine','Emergency care',30),
  ('obstetrics-gynaecology','obstetrics-and-gynaecology','Obstetrics and Gynaecology','Pregnancy and women''s health',40),
  ('paediatrics','paediatrics','Paediatrics','Children''s health',50),
  ('cardiology','cardiology','Cardiology','Heart',60),
  ('orthopaedics','orthopaedics','Orthopaedics','Bones and joints',70),
  ('oncology','oncology','Oncology','Cancer care',80),
  ('nephrology','nephrology','Nephrology','Kidney',90),
  ('neurology','neurology','Neurology','Brain and nerves',100),
  ('gastroenterology','gastroenterology','Gastroenterology','Digestive system',110),
  ('urology','urology','Urology','Urinary tract',120),
  ('pulmonology','pulmonology','Pulmonology','Lungs and breathing',130),
  ('endocrinology','endocrinology','Endocrinology','Diabetes and hormones',140),
  ('ophthalmology','ophthalmology','Ophthalmology','Eye',150),
  ('ent','ent','ENT','Ear, nose and throat',160),
  ('dermatology','dermatology','Dermatology','Skin',170),
  ('psychiatry','psychiatry','Psychiatry','Mental health',180),
  ('dentistry','dentistry','Dentistry','Dental',190),
  ('physical-medicine-rehabilitation','physical-medicine-and-rehabilitation','Physical Medicine and Rehabilitation','Rehabilitation',200)
ON CONFLICT (code) DO NOTHING;

INSERT INTO service (code, slug, name, plain_label, kind) VALUES
  ('dialysis','dialysis','Dialysis','Kidney dialysis','procedure'),
  ('chemotherapy-day-care','chemotherapy-day-care','Chemotherapy day care',NULL,'procedure'),
  ('cataract-surgery','cataract-surgery','Cataract surgery',NULL,'procedure'),
  ('maternity-care','maternity-care','Maternity care','Delivery and newborn care','programme'),
  ('rehabilitation','rehabilitation','Rehabilitation','Physiotherapy and rehabilitation','programme'),
  ('intensive-care','intensive-care','Intensive care (ICU)','ICU','support'),
  ('neonatal-intensive-care','neonatal-intensive-care','Neonatal intensive care (NICU)','NICU','support'),
  ('ct-scan','ct-scan','CT scan',NULL,'diagnostic'),
  ('mri','mri','MRI',NULL,'diagnostic'),
  ('ultrasound','ultrasound','Ultrasound',NULL,'diagnostic'),
  ('x-ray','x-ray','X-ray',NULL,'diagnostic'),
  ('pathology-lab','pathology-lab','Pathology laboratory','Blood and lab tests','diagnostic'),
  ('blood-centre','blood-centre','Blood centre','Blood bank','support'),
  ('pharmacy','pharmacy','In-house pharmacy',NULL,'support'),
  ('ambulance','ambulance','Ambulance',NULL,'support'),
  ('home-sample-collection','home-sample-collection','Home sample collection',NULL,'support')
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_specialty (service_id, specialty_id)
SELECT v.id, s.id
FROM (VALUES ('dialysis','nephrology'), ('chemotherapy-day-care','oncology'), ('cataract-surgery','ophthalmology'),
             ('maternity-care','obstetrics-gynaecology'), ('neonatal-intensive-care','paediatrics'),
             ('rehabilitation','physical-medicine-rehabilitation'), ('rehabilitation','orthopaedics')) AS m(service_code, specialty_code)
JOIN service v ON v.code = m.service_code
JOIN specialty s ON s.code = m.specialty_code
ON CONFLICT DO NOTHING;

-- Starter patient-language synonyms (SRH-02). Inserted UNREVIEWED: search only
-- uses a synonym once an editor sets reviewed_at.
INSERT INTO taxonomy_synonym (term, normalized, specialty_id, service_id)
SELECT m.term, lower(m.term), s.id, v.id
FROM (VALUES
  ('kidney dialysis', NULL, 'dialysis'),
  ('heart', 'cardiology', NULL),
  ('cancer', 'oncology', NULL),
  ('kidney', 'nephrology', NULL),
  ('child specialist', 'paediatrics', NULL),
  ('pediatrics', 'paediatrics', NULL),
  ('bone', 'orthopaedics', NULL),
  ('orthopedics', 'orthopaedics', NULL),
  ('eye', 'ophthalmology', NULL),
  ('skin', 'dermatology', NULL),
  ('gynecology', 'obstetrics-gynaecology', NULL),
  ('pregnancy', 'obstetrics-gynaecology', NULL),
  ('delivery', NULL, 'maternity-care'),
  ('physiotherapy', NULL, 'rehabilitation'),
  ('blood bank', NULL, 'blood-centre'),
  ('icu', NULL, 'intensive-care')
) AS m(term, specialty_code, service_code)
LEFT JOIN specialty s ON s.code = m.specialty_code
LEFT JOIN service v ON v.code = m.service_code
ON CONFLICT ON CONSTRAINT taxonomy_synonym_uq DO NOTHING;

INSERT INTO external_provider (code, name) VALUES
  ('google_maps','Google'), ('practo','Practo'), ('justdial','Justdial')
ON CONFLICT (code) DO NOTHING;
