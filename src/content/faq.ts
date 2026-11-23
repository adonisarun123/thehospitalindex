import type { Faq } from "@/content/types";

/** Site-level questions. Answers may use [link](/path) marks; the JSON-LD gets plain text. */
export const faqGroups: { title: string; items: Faq[] }[] = [
  {
    title: "About the directory",
    items: [
      {
        q: "What is The Hospital Index?",
        a: "A directory of physical hospital branches across India. Each profile describes one branch at one address, with labels showing who supplied each important fact and when it was last checked.",
      },
      {
        q: "Why do you list branches rather than hospital brands?",
        a: "Departments, equipment, emergency cover, insurance tie-ups, accreditation and reviews belong to a specific branch. See [why the branch matters](/blog/why-the-branch-matters-more-than-the-brand).",
      },
      {
        q: "Why is my city showing few or no hospitals?",
        a: "A branch is published only after its identity, address and a contact route are checked, so the directory grows gradually. Counts show our coverage, not how many hospitals exist. See [directory coverage](/coverage).",
      },
      {
        q: "Do you rank hospitals?",
        a: "No. We do not rank hospitals by clinical outcomes, and payment never affects the order of results. See [how results are ordered](/sources#sorting).",
      },
    ],
  },
  {
    title: "Facts and accuracy",
    items: [
      {
        q: "Where does the information come from?",
        a: "From the hospital itself or from independent sources such as official registers, each labelled “Hospital supplied” or “Checked against source” with a date. Facts we cannot label are not shown. See [sources and trust labels](/sources).",
      },
      {
        q: "A detail is wrong or missing. What can I do?",
        a: "Use [suggest a correction](/corrections). Editors check the change before it is published.",
      },
      {
        q: "Is this medical advice?",
        a: "No. The Hospital Index gives information about hospital branches and patient experiences. It does not diagnose, recommend treatment or replace your doctor. In an emergency, call 112 or 108. See our [medical disclaimer](/medical-disclaimer).",
      },
    ],
  },
  {
    title: "Patient reviews",
    items: [
      {
        q: "How are reviews checked?",
        a: "A verifier checks visit evidence, such as a bill or prescription from that branch, before a review is published. The evidence itself is never published. See [how reviews work](/how-reviews-work).",
      },
      {
        q: "Can a hospital remove a negative review?",
        a: "No. A hospital cannot pay to remove or hide a review. A confirmed hospital representative can post a moderated reply.",
      },
      {
        q: "Do you show Google or Practo ratings?",
        a: "No. Our score is the average of reviews published on this site only. Where another platform has reviews for the same branch we may link to it, labelled as such.",
      },
    ],
  },
  {
    title: "Insurance and costs",
    items: [
      {
        q: "How do I know if a hospital accepts my insurance?",
        a: "Network status is set per branch. Check your insurer’s network list and confirm with the branch’s insurance desk. See [cashless hospitalisation](/blog/cashless-hospitalisation-health-insurance-india).",
      },
      {
        q: "How do I find a PM-JAY (Ayushman Bharat) hospital?",
        a: "Use the National Health Authority’s hospital finder and confirm with the hospital’s Ayushman Mitra desk. See our [PM-JAY guide](/blog/ayushman-bharat-pm-jay-find-empanelled-hospital).",
      },
    ],
  },
];
