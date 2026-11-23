import type { Post } from "@/content/types";

export const post: Post = {
  slug: "how-to-get-your-medical-records-india",
  title: "How to get your medical records from a hospital in India",
  description:
    "How to request medical records, reports and the discharge summary from an Indian hospital, the 72-hour rule, retention periods, and what to do if refused.",
  excerpt:
    "Doctors must keep in-patient records for at least three years and supply copies within 72 hours of a request. Here is how to ask, and what to do if you are refused.",
  category: "Patient rights",
  keywords: ["medical records India", "discharge summary", "72 hours medical records", "hospital records request", "case sheet copy"],
  datePublished: "2026-11-23",
  dateModified: "2026-11-23",
  factsCheckedOn: "2026-11-23",
  summary:
    "Under the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, 2002, records of in-patients must be kept for three years from the start of treatment, and a request from the patient, an authorised attendant or a legal authority must be acknowledged and the documents issued within 72 hours. Ask in writing, keep a copy of your request, and expect a reasonable copying fee.",
  body: [
    { type: "h2", id: "what", text: "What you can ask for" },
    {
      type: "ul",
      items: [
        "The discharge summary, which every in-patient should receive at discharge.",
        "Investigation reports: blood tests, imaging reports and, on request, the images themselves.",
        "The case sheet or in-patient file, including doctors’ and nurses’ notes and the operation notes.",
        "An itemised bill and receipts for every payment.",
      ],
    },
    { type: "h2", id: "rules", text: "What the rules say" },
    {
      type: "p",
      text: "Regulation 1.3.1 of the 2002 medical ethics regulations requires every physician to keep the medical records of in-patients for three years from the date treatment began, in a standard format. Regulation 1.3.2 says that if the patient, an authorised attendant or a legal authority asks for medical records, the request must be acknowledged and the documents issued within 72 hours. The regulations treat failure to maintain records, or refusal to provide them within 72 hours, as professional misconduct.",
    },
    {
      type: "p",
      text: "The Charter of Patients’ Rights also lists the right to copies of case papers, patient records, investigation reports and an itemised bill. Its detailed version suggests access within 24 hours during an admission and within 72 hours after discharge. Hospitals often keep records longer than three years, especially for medico-legal cases, but do not rely on that: ask soon after treatment.",
    },
    { type: "h2", id: "how", text: "How to ask" },
    {
      type: "ol",
      items: [
        "Find the medical records department (MRD) or ask the front desk who handles record requests at that branch.",
        "Make the request in writing, by email or a signed letter. Give the patient’s name, the hospital’s registration (UHID or IP) number, admission and discharge dates, and list the documents you need.",
        "If you are not the patient, include an authorisation letter signed by the patient, or proof that you are the legal heir or guardian, with ID.",
        "Keep a copy of your request with the date and, if you hand it in, ask for an acknowledgement.",
        "Pay any copying fee against a receipt. A reasonable charge for photocopies is normal.",
      ],
    },
    { type: "h2", id: "refused", text: "If the hospital does not respond" },
    {
      type: "ul",
      items: [
        "Send a reminder to the hospital’s medical superintendent or grievance officer, quoting regulation 1.3.2 and the date of your first request.",
        "Complain to the State Medical Council about the professional obligation, or to the state authority that registers hospitals.",
        "For a government hospital, you can also file an application under the Right to Information Act, 2005.",
        "If records are needed for a claim or dispute, a consumer commission can direct the hospital to produce them.",
      ],
    },
    { type: "h2", id: "keep", text: "Keep your own file" },
    {
      type: "p",
      text: "Keep paper copies in one folder and scanned copies in a safe place. You can also link records to an Ayushman Bharat Health Account (ABHA) if your hospital supports it. A complete personal file makes [second opinions](/blog/patient-rights-india-charter), insurance claims and future admissions much easier.",
    },
  ],
  faqs: [
    {
      q: "How long does a hospital have to give me my medical records?",
      a: "Under regulation 1.3.2 of the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, 2002, a request must be acknowledged and the documents issued within 72 hours.",
    },
    {
      q: "How long are medical records kept in India?",
      a: "Physicians must keep in-patient records for at least three years from the start of treatment under regulation 1.3.1. Many hospitals keep them longer, but ask early rather than rely on that.",
    },
    {
      q: "Can a family member collect my records?",
      a: "Yes, if they are authorised. The regulations allow requests by the patient or an authorised attendant; hospitals usually ask for a signed authorisation and ID.",
    },
  ],
  sources: [
    {
      title: "Code of Medical Ethics Regulations, 2002 (amended up to 8 October 2016)",
      publisher: "National Medical Commission",
      url: "https://www.nmc.org.in/rules-regulations/code-of-medical-ethics-regulations-2002/",
    },
    {
      title: "Charter of Patients’ Rights and Responsibilities (updated 23 August 2021)",
      publisher: "National Council for Clinical Establishments, MoHFW",
      url: "https://clinicalestablishments.mohfw.gov.in/sites/default/files/2023-06/3181.pdf",
    },
  ],
  related: ["patient-rights-india-charter", "hospital-admission-checklist", "cashless-hospitalisation-health-insurance-india"],
};
