import type { Post } from "@/content/types";

export const post: Post = {
  slug: "nabh-accreditation-explained",
  title: "NABH accreditation explained: what it means for patients and how to check it",
  description:
    "What NABH hospital accreditation is, what it does and does not tell you, and how to check whether a specific hospital branch is currently accredited.",
  excerpt:
    "NABH accreditation is the main quality accreditation for Indian hospitals. It is granted to a specific facility for a fixed period, so always check the branch and the date.",
  category: "Choosing care",
  keywords: ["NABH", "NABH accreditation", "NABH accredited hospital", "hospital accreditation India", "Quality Council of India", "JCI"],
  datePublished: "2026-11-23",
  dateModified: "2026-11-23",
  factsCheckedOn: "2026-11-23",
  summary:
    "NABH, the National Accreditation Board for Hospitals and Healthcare Providers, is a constituent board of the Quality Council of India. Accreditation means an organisation has been assessed against NABH’s standards for patient safety and quality systems. It applies to a specific facility for a set period, so check the branch you will visit and that the accreditation is current.",
  body: [
    { type: "h2", id: "what", text: "What NABH is" },
    {
      type: "p",
      text: "NABH was set up in 2005–06 as a constituent board of the Quality Council of India to run accreditation programmes for healthcare organisations. Its hospital standards are themselves accredited by the International Society for Quality in Health Care (ISQua). The current hospital standards are the 6th edition, effective from 1 January 2025.",
    },
    { type: "h2", id: "means", text: "What accreditation tells you" },
    {
      type: "ul",
      items: [
        "The organisation applied voluntarily and was assessed against published standards covering areas such as patient rights, infection control, medication safety, care processes and continuous quality improvement.",
        "It has systems in place for patient safety and quality, and is reassessed to keep its status.",
      ],
    },
    { type: "h2", id: "not", text: "What it does not tell you" },
    {
      type: "ul",
      items: [
        "It is not a ranking. Accredited hospitals are not scored against each other.",
        "It does not measure the outcome of a particular doctor or procedure.",
        "Accreditation of one branch does not extend to other branches of the same group unless each is accredited.",
        "A hospital without NABH accreditation is not necessarily unsafe. Many smaller and public hospitals are not accredited for reasons of cost or capacity; NABH also runs entry-level certification for smaller organisations.",
      ],
    },
    { type: "h2", id: "check", text: "How to check a branch’s status" },
    {
      type: "ol",
      items: [
        "Look up the organisation on NABH’s portal (portal.nabh.co), which lists accredited and certified organisations.",
        "Match the exact name and address. Group hospitals often have several entries.",
        "Check the validity dates. An expired accreditation is not current, even if the logo is still on a website or signboard.",
      ],
    },
    {
      type: "p",
      text: "On The Hospital Index, accreditation appears on a branch page only with a source and a date. An expired accreditation loses its badge immediately. See [how we source and label facts](/sources).",
    },
    { type: "h2", id: "other", text: "Other credentials you may see" },
    {
      type: "ul",
      items: [
        "**JCI**: Joint Commission International, a US-based international accreditation held by some Indian hospitals.",
        "**NABL**: the National Accreditation Board for Testing and Calibration Laboratories accredits medical laboratories, including hospital labs. It covers the lab, not the whole hospital.",
        "**Registration** under your state’s clinical establishments law is a legal requirement where it applies; it is not a quality accreditation.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is a NABH-accredited hospital always better?",
      a: "Accreditation shows that a hospital has quality and safety systems that met NABH’s standards when assessed. It is a useful signal, but it does not rank hospitals or measure individual treatment outcomes.",
    },
    {
      q: "How do I know if a hospital’s NABH accreditation is valid?",
      a: "Search for the exact facility on NABH’s official portal and check the validity dates. Accreditation applies to a specific facility for a fixed period.",
    },
  ],
  sources: [
    { title: "Who we are", publisher: "National Accreditation Board for Hospitals & Healthcare Providers", url: "https://nabh.co/?p=107" },
    { title: "NABH frequently asked questions", publisher: "NABH", url: "https://portal.nabh.co/faq.aspx" },
    {
      title: "NABH Accreditation Standards for Hospitals, 6th edition (effective 1 January 2025)",
      publisher: "NABH",
      url: "https://portal.nabh.co/images/Standards/NABH%20Hospital%20Accreditation%20Standard%206th%20Edition%20January%202025.pdf",
    },
  ],
  related: ["how-to-choose-a-hospital-branch", "how-to-read-hospital-reviews", "why-the-branch-matters-more-than-the-brand"],
};
