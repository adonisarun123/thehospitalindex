import type { Post } from "@/content/types";

export const post: Post = {
  slug: "cashless-hospitalisation-health-insurance-india",
  title: "Cashless hospitalisation in India: how it works and the time limits insurers must meet",
  description:
    "How cashless treatment works with health insurance in India: network hospitals, pre-authorisation, the IRDAI one-hour and three-hour limits, and discharge.",
  excerpt:
    "Cashless treatment depends on the specific branch being in your insurer’s network. Here is the process, step by step, and the time limits set by IRDAI in 2024.",
  category: "Insurance and costs",
  keywords: ["cashless hospitalisation", "cashless claim", "pre-authorisation", "IRDAI master circular", "network hospital", "TPA"],
  datePublished: "2026-11-23",
  dateModified: "2026-11-23",
  factsCheckedOn: "2026-11-23",
  summary:
    "In a cashless claim the insurer pays the hospital directly, but only at a hospital in its network and only after it authorises the treatment. Under IRDAI’s Master Circular on health insurance (May 2024), insurers must decide on a cashless request within one hour and give final authorisation within three hours of the hospital’s discharge request. Your policy wording decides what is covered.",
  body: [
    {
      type: "callout",
      tone: "info",
      title: "Not financial or legal advice",
      text: "This is a general explanation. Your policy document, your insurer and the regulator’s current circulars are the authority on what applies to you. Rules can change; check the date this page was last reviewed.",
    },
    { type: "h2", id: "what", text: "What “cashless” means" },
    {
      type: "p",
      text: "In a cashless claim, the hospital sends your treatment details to your insurer (or the insurer’s third-party administrator, the TPA) and the insurer settles the approved amount with the hospital. You pay only what the policy does not cover, such as non-payable items, deductibles, co-payment or amounts above your sum insured. In a reimbursement claim you pay the hospital first and claim the money back later.",
    },
    { type: "h2", id: "network", text: "Step 1: confirm the branch is in the network" },
    {
      type: "p",
      text: "Insurers publish lists of network hospitals. These lists are kept per branch, so one branch of a hospital group can be in the network while another is not. Before a planned admission, check the exact branch on your insurer’s list or ask the branch’s insurance desk. The regulator has also asked insurers to work towards 100 per cent cashless settlement, but in practice whether cashless is available still depends on the arrangement with that hospital.",
    },
    { type: "h2", id: "pre-auth", text: "Step 2: pre-authorisation" },
    {
      type: "ol",
      items: [
        "At admission (or a few days before a planned one), give the hospital’s insurance desk your policy number or health card and a photo ID.",
        "The hospital fills in the pre-authorisation request with the treating doctor’s diagnosis, planned treatment and estimated cost, and sends it to the insurer or TPA.",
        "The insurer approves an amount, asks for more information, or declines. A decline of cashless is not always a rejection of the claim: you may still be able to claim reimbursement.",
      ],
    },
    {
      type: "p",
      text: "Under the IRDAI Master Circular on Health Insurance Business issued on 29 May 2024, insurers must decide on a cashless authorisation request immediately and within one hour of receiving it. For emergencies the circular asks for a decision immediately.",
    },
    { type: "h2", id: "during", text: "Step 3: during the stay" },
    {
      type: "p",
      text: "If treatment changes or the stay is longer than planned, the hospital sends an enhancement request for a higher approved amount. Keep an eye on room category: many policies cap room rent, and choosing a room above the cap can reduce what is paid on other charges too. Ask the insurance desk before upgrading.",
    },
    { type: "h2", id: "discharge", text: "Step 4: discharge and the three-hour limit" },
    {
      type: "p",
      text: "When you are ready to leave, the hospital sends the final bill and discharge summary to the insurer for final authorisation. The same 2024 circular requires the insurer to give final authorisation within three hours of receiving the hospital’s discharge request, and says the policyholder should not be made to wait for discharge. If there is a delay beyond three hours, the circular says any extra amount charged by the hospital for the delay is to be borne by the insurer.",
    },
    { type: "h2", id: "pay", text: "What you may still pay" },
    {
      type: "ul",
      items: [
        "Items your policy lists as non-payable or excluded.",
        "Co-payment or deductibles written into your policy.",
        "Amounts above your remaining sum insured or above sub-limits (for example on room rent or specific procedures).",
        "Charges for anything not related to the treatment that was authorised.",
      ],
    },
    { type: "h2", id: "problems", text: "If something goes wrong" },
    {
      type: "ul",
      items: [
        "Ask the hospital insurance desk for the insurer’s written reason for any decline or partial approval.",
        "Raise a complaint with the insurer’s grievance officer; details are in your policy document.",
        "If the insurer does not resolve it, IRDAI runs a grievance system (Bima Bharosa), and the Insurance Ombudsman handles complaints within its rules.",
      ],
    },
    { type: "h2", id: "checklist", text: "Before a planned admission" },
    {
      type: "ul",
      items: [
        "Confirm this branch is a network hospital for your insurer and policy.",
        "Check sub-limits, room-rent caps, waiting periods and co-payment in your policy wording.",
        "Ask the hospital for a written estimate and share it with the insurer or TPA.",
        "Carry the health card or policy number, photo ID and previous medical records. See the [admission checklist](/blog/hospital-admission-checklist).",
      ],
    },
  ],
  faqs: [
    {
      q: "How long does an insurer have to approve a cashless request?",
      a: "Under IRDAI’s Master Circular of 29 May 2024, an insurer must decide on a cashless authorisation request within one hour of receiving it, and immediately in an emergency. Final authorisation at discharge must be given within three hours of the hospital’s request.",
    },
    {
      q: "Can I get cashless treatment at any hospital?",
      a: "Cashless treatment depends on the hospital branch’s arrangement with your insurer. Check your insurer’s network list for the exact branch, or ask the hospital’s insurance desk.",
    },
    {
      q: "What if my cashless request is declined?",
      a: "Ask for the reason in writing. A declined cashless request does not necessarily mean the claim is rejected; you may be able to pay and claim reimbursement. If you disagree, use the insurer’s grievance process and then IRDAI’s grievance channels or the Insurance Ombudsman.",
    },
  ],
  sources: [
    {
      title: "Master Circular on Health Insurance Business (IRDAI/HLT/CIR/PRO/84/5/2024)",
      publisher: "Insurance Regulatory and Development Authority of India",
      url: "https://irdai.gov.in/",
    },
    {
      title: "Insurance regulator releases new guidelines (summary of the 2024 Master Circular)",
      publisher: "Deloitte India",
      url: "https://www2.deloitte.com/content/dam/Deloitte/in/Documents/tax/in-tax-gbt-insurance-regulator-releases-new-guidelines-noexp.pdf",
    },
  ],
  related: ["ayushman-bharat-pm-jay-find-empanelled-hospital", "hospital-admission-checklist", "how-to-choose-a-hospital-branch"],
};
