import type { HubPage, Source } from "@/content/types";

const NABH: Source = { title: "Frequently asked questions on accreditation", publisher: "NABH", url: "https://portal.nabh.co/faq.aspx" };
const PMJAY: Source = { title: "Find an empanelled hospital (PM-JAY)", publisher: "National Health Authority", url: "https://hospitals.pmjay.gov.in/Search" };
const ERSS: Source = { title: "Emergency Response Support System (112)", publisher: "Ministry of Home Affairs", url: "https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss" };

export const hubs: HubPage[] = [
  {
    kind: "city-specialty",
    state: "maharashtra",
    city: "pune",
    taxon: "orthopaedics",
    datePublished: "2026-11-25",
    factsCheckedOn: "2026-11-25",
    guidance:
      "This page lists hospital branches in Pune that publish an orthopaedics department, the specialty that treats bones, joints, ligaments and the spine, from fractures and sports injuries to arthritis. On 25 November 2026 the directory listed 40 such branches in Pune, and each had an active NABH accreditation listing, because current operating evidence is a condition for showing a branch here. NABH accredits a hospital as a whole, so the listing tells you about the branch's systems and safety processes, not about a particular orthopaedic surgeon. Before a planned procedure such as a joint replacement or an arthroscopy, ask the branch for a written estimate with implant charges shown separately, the name of the surgeon who will operate, and whether physiotherapy after discharge is available at the same branch. Emergency hours for these branches are not yet confirmed in our data, so for a suspected fracture or a spine injury call 112, or call the branch, before travelling. Insurer and TPA lists are published for only some branches here; check the exact branch against your own insurer's network list.",
    faqs: [
      {
        q: "How many hospitals in Pune have an orthopaedics department?",
        a: "On 25 November 2026 this directory listed 40 hospital branches in Pune that publish an orthopaedics department. The list above is live, so the count can change as branches are added, rechecked or removed.",
      },
      {
        q: "Which is the best orthopaedic hospital in Pune?",
        a: "We do not rank hospitals. What matters for you is usually the specific surgeon, how often the branch does your procedure, the total cost in writing, and whether your insurer covers that branch. Our [checklist for choosing a branch](/blog/how-to-choose-a-hospital-branch) covers the questions to ask.",
      },
      {
        q: "Are these hospitals NABH accredited?",
        a: "Yes. Every branch on this page had an active NABH listing when it was last checked. You can confirm the current status on the NABH portal; our guide explains [what NABH accreditation means](/blog/nabh-accreditation-explained).",
      },
      {
        q: "Can I get cashless treatment for orthopaedic surgery here?",
        a: "Only at branches in your insurer's network, and only after pre-authorisation. Network lists are kept per branch, so check the exact branch. See [how cashless hospitalisation works](/blog/cashless-hospitalisation-health-insurance-india).",
      },
      {
        q: "Can I use Ayushman Bharat PM-JAY at these hospitals?",
        a: "Only at branches empanelled under PM-JAY. Search the National Health Authority's hospital finder for the branch before you go; our [PM-JAY guide](/blog/ayushman-bharat-pm-jay-find-empanelled-hospital) explains eligibility.",
      },
    ],
    sources: [NABH, PMJAY, ERSS],
  },
  {
    kind: "city-specialty",
    state: "tamil-nadu",
    city: "chennai",
    taxon: "paediatrics",
    datePublished: "2026-11-25",
    factsCheckedOn: "2026-11-25",
    guidance:
      "This page lists hospital branches in Chennai that publish a paediatrics department, the specialty for the medical care of babies, children and adolescents. On 25 November 2026 the directory listed 40 such branches in Chennai, and each had an active NABH accreditation listing, because current operating evidence is a condition for showing a branch here. A paediatrics department is not the same thing as a neonatal intensive care unit (NICU) or a paediatric intensive care unit (PICU). If a newborn or a child with a serious illness may need intensive care, ask the branch directly whether it has a NICU or PICU on site and whether a paediatrician is present at all hours. Emergency hours for these branches are not yet confirmed in our data, so if a child seems seriously unwell, go to the nearest emergency department or call 112 rather than comparing listings. Only some branches publish the insurers and TPAs they work with, so confirm with your insurer that the exact branch is in its network before a planned admission.",
    faqs: [
      {
        q: "How many children's hospitals are there in Chennai?",
        a: "On 25 November 2026 this directory listed 40 hospital branches in Chennai with a paediatrics department. Most are general or multispecialty hospitals with a paediatrics department rather than stand-alone children's hospitals.",
      },
      {
        q: "Does every hospital with a paediatrics department have a NICU?",
        a: "No. A NICU is a separate intensive care unit for newborns. Ask the branch whether it has one on site, especially before a planned delivery or if your baby is expected to need special care.",
      },
      {
        q: "Which is the best paediatric hospital in Chennai?",
        a: "We do not rank hospitals. For a child, the practical questions are distance, whether the branch has round-the-clock paediatric cover and intensive care if needed, and whether your insurance or scheme covers that branch. Our [checklist for choosing a branch](/blog/how-to-choose-a-hospital-branch) can help.",
      },
      {
        q: "What should I do in a paediatric emergency?",
        a: "Go to the nearest hospital with an emergency department or call 112. Do not wait to compare hospitals. Our guide to [medical emergencies in India](/blog/medical-emergency-india-what-to-do) covers your right to immediate treatment.",
      },
    ],
    sources: [NABH, ERSS, PMJAY],
  },
  {
    kind: "city-specialty",
    state: "karnataka",
    city: "bengaluru",
    taxon: "obstetrics-and-gynaecology",
    datePublished: "2026-11-25",
    factsCheckedOn: "2026-11-25",
    guidance:
      "This page lists hospital branches in Bengaluru that publish an obstetrics and gynaecology department, which covers pregnancy care, childbirth and conditions of the female reproductive system. On 25 November 2026 the directory listed 36 such branches in Bengaluru, and each had an active NABH accreditation listing, because current operating evidence is a condition for showing a branch here. If you are choosing a branch for a planned delivery, useful questions are whether it has a neonatal intensive care unit (NICU) on site in case the baby needs it, whether an anaesthetist and a blood bank are available at all hours, what the delivery package includes for a normal and a caesarean birth and what is billed separately, and whether your health insurance covers maternity at this branch, since maternity cover often comes with a waiting period. Sex determination of a foetus is illegal in India under the PCPNDT Act, 1994. Emergency hours for these branches are not yet confirmed in our data, so in labour or a pregnancy emergency go to the nearest hospital or call 112.",
    faqs: [
      {
        q: "How many maternity hospitals are there in Bengaluru?",
        a: "On 25 November 2026 this directory listed 36 hospital branches in Bengaluru with an obstetrics and gynaecology department. Many are general or multispecialty hospitals rather than stand-alone maternity homes.",
      },
      {
        q: "What should a delivery package include?",
        a: "Ask for it in writing. Check the room category, the number of days, doctor and anaesthetist fees, newborn care, medicines and consumables, and what happens to the price if a planned normal delivery becomes a caesarean or the baby needs the NICU.",
      },
      {
        q: "Does health insurance cover delivery?",
        a: "Only if your policy includes maternity cover, and many policies apply a waiting period before it starts. Check your policy wording and confirm the branch is in your insurer's network; see [how cashless hospitalisation works](/blog/cashless-hospitalisation-health-insurance-india).",
      },
      {
        q: "Which is the best maternity hospital in Bengaluru?",
        a: "We do not rank hospitals. Your obstetrician, round-the-clock cover, a NICU on site, distance from home and the written package price usually matter most. Our [admission checklist](/blog/hospital-admission-checklist) helps you prepare.",
      },
    ],
    sources: [
      NABH,
      ERSS,
      {
        title: "The Pre-conception and Pre-natal Diagnostic Techniques (Prohibition of Sex Selection) Act, 1994",
        publisher: "India Code",
        url: "https://www.indiacode.nic.in/handle/123456789/1937",
      },
    ],
  },
];
