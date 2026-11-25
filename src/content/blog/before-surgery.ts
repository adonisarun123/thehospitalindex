import type { Post } from "@/content/types";

export const post: Post = {
  slug: "questions-to-ask-hospital-before-surgery",
  title: "Questions to ask a hospital before planned surgery in India",
  description:
    "Before a planned operation: questions on the surgeon, the cost estimate, insurance, consent, anaesthesia and recovery, plus your right to a second opinion.",
  excerpt:
    "A planned operation gives you time to ask. These are the questions that settle who operates, what it costs, and what happens if things change.",
  category: "Choosing care",
  keywords: ["questions before surgery", "surgery cost estimate", "second opinion India", "informed consent", "planned surgery hospital", "surgery package price"],
  datePublished: "2026-11-25",
  dateModified: "2026-11-25",
  factsCheckedOn: "2026-11-25",
  summary:
    "For a planned operation, ask who will operate, what the written estimate includes and excludes, how your insurance applies at that branch, what the risks and alternatives are, and what recovery will need. India’s Charter of Patients’ Rights says you can get information on rates, give informed consent, and seek a second opinion with your records.",
  body: [
    {
      type: "callout",
      tone: "info",
      title: "Not medical advice",
      text: "Whether you need an operation, and which one, is a decision for you and your doctors. This page lists practical questions to ask the hospital; it does not judge any treatment.",
    },
    { type: "h2", id: "surgeon", text: "About the surgeon and the team" },
    {
      type: "ul",
      items: [
        "Who will perform the operation, and will that surgeon be present for all of it?",
        "Roughly how often does this surgeon, and this branch, do this procedure?",
        "Who gives the anaesthesia, and when will I meet the anaesthetist before the operation?",
        "Who looks after me after surgery, including at night and at weekends?",
      ],
    },
    { type: "h2", id: "cost", text: "About the cost" },
    {
      type: "p",
      text: "The Charter of Patients’ Rights says patients have the right to information on the rates the hospital charges and to an itemised bill. Ask for the estimate in writing and in the same format as the final bill will be.",
    },
    {
      type: "ul",
      items: [
        "Is this a package price? If so, what exactly does it include, and for how many days and which room category?",
        "What is billed outside the package, for example implants, extra days, ICU, blood, physiotherapy or medicines taken home?",
        "If the implant has options, what does each cost and why is one recommended?",
        "What happens to the price if there is a complication or the stay is longer than planned?",
        "When are deposits due, and how are refunds handled if the bill is lower than the deposit?",
      ],
    },
    { type: "h2", id: "insurance", text: "About insurance or a government scheme" },
    {
      type: "ul",
      items: [
        "Is this exact branch in my insurer’s network, or empanelled under PM-JAY or my state scheme? Lists are kept per branch.",
        "Will the insurance desk send the pre-authorisation request before the admission date?",
        "Which room category does my policy allow here? Choosing a higher one can reduce the whole claim; see [room rent limits](/blog/room-rent-limit-proportionate-deduction).",
        "Does my policy have a waiting period or a sub-limit for this procedure? Check this with your insurer, not only with the hospital.",
      ],
    },
    { type: "h2", id: "consent", text: "About consent, risks and alternatives" },
    {
      type: "p",
      text: "The charter says you have the right to informed consent before any potentially hazardous test or treatment, after being told the main risks in a way you can understand. Ask:",
    },
    {
      type: "ul",
      items: [
        "What are the main risks of this operation, and how common are they?",
        "What are the alternatives, including waiting or treatment without surgery, and their risks?",
        "What is likely to happen if I do not have it?",
        "May I read the consent form a day or more before the operation?",
      ],
    },
    { type: "h2", id: "second", text: "Getting a second opinion" },
    {
      type: "p",
      text: "Under the charter, you have the right to seek a second opinion from a doctor of your choice, and the hospital should give you the records needed for it. For a non-urgent operation, it is reasonable to take that time. Ask for copies of your reports and scans; our guide to [getting your medical records](/blog/how-to-get-your-medical-records-india) explains how.",
    },
    { type: "h2", id: "recovery", text: "About recovery and discharge" },
    {
      type: "ul",
      items: [
        "How many days in hospital, and how long before I can work, drive or climb stairs?",
        "Will I need physiotherapy, dressings or follow-up tests, and can they be done at this branch?",
        "Who do I call if I have a problem after discharge, and is there a number that answers at night?",
        "Will I get a discharge summary with the procedure, implants used and medicines?",
      ],
    },
    { type: "h2", id: "branch", text: "About the branch itself" },
    {
      type: "p",
      text: "Check the branch, not only the brand: accreditation, emergency cover and insurance arrangements are per branch. Our checklist for [choosing a hospital branch](/blog/how-to-choose-a-hospital-branch) covers this, and you can compare branches by specialty in your city, for example [orthopaedics hospitals in Pune](/hospitals/maharashtra/pune/specialty/orthopaedics).",
    },
  ],
  faqs: [
    {
      q: "Do I have a right to a second opinion before surgery in India?",
      a: "Yes. The Charter of Patients’ Rights says patients may seek a second opinion from a doctor of their choice, and the hospital should provide the records needed for it.",
    },
    {
      q: "Is a surgery package price final?",
      a: "Not always. Packages usually cover a set number of days, a room category and listed items. Implants, complications, extra days and ICU are often billed separately. Ask for the inclusions and exclusions in writing.",
    },
    {
      q: "What should a surgery cost estimate include?",
      a: "Room and stay, surgeon and anaesthetist fees, operation theatre charges, implants (listed separately), medicines and consumables, investigations, and what is excluded. Ask how the estimate changes if the stay is longer.",
    },
    {
      q: "When should I sign the consent form?",
      a: "After the surgeon has explained the risks, benefits and alternatives and you have had time to ask questions. You can ask to read the form in advance.",
    },
  ],
  sources: [
    {
      title: "Charter of Patients’ Rights and Responsibilities (updated 23 August 2021)",
      publisher: "National Council for Clinical Establishments, MoHFW",
      url: "https://clinicalestablishments.mohfw.gov.in/sites/default/files/2023-06/3181.pdf",
    },
    {
      title: "Code of Medical Ethics Regulations, 2002 (amended up to 8 October 2016)",
      publisher: "National Medical Commission",
      url: "https://www.nmc.org.in/rules-regulations/code-of-medical-ethics-regulations-2002/",
    },
  ],
  related: ["how-to-choose-a-hospital-branch", "hospital-admission-checklist", "patient-rights-india-charter"],
};
