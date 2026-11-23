import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { abs, breadcrumbLd, webPageLd } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: "How Patient Reviews Work",
  description: "How The Hospital Index checks visit evidence before a patient review is published, what the label means and what it does not.",
  alternates: { canonical: abs("/how-reviews-work") },
};

export default function HowReviewsWork() {
  return (
    <div className="wrap py-8"><div className="prose-page max-w-3xl">
      <JsonLd data={breadcrumbLd([{ name: "Home", href: "/" }, { name: "How reviews work", href: "/how-reviews-work" }])} />
      <JsonLd data={webPageLd({ name: "How Patient Reviews Work", description: "How The Hospital Index checks visit evidence before a patient review is published, what the label means and what it does not.", path: "/how-reviews-work" })} />
      <h1 className="h-page">How patient reviews work</h1>
      <p className="mt-4 text-lg">
        A review on this site is a firsthand account from a patient whose visit evidence our team has checked. Reading reviews never needs an account.
      </p>

      <h2>What “Visit evidence checked” means</h2>
      <p>Before a review is published, a trained verifier confirms four things:</p>
      <ul>
        <li>the document is a bill or prescription issued by a hospital;</li>
        <li>it names the branch being reviewed and a visit date that matches;</li>
        <li>the patient name on it matches the name the reviewer gave us privately;</li>
        <li>
          something independent links the reviewer’s account to that visit: the mobile number they verified by SMS appears on the document, or the
          hospital confirms the match with the patient’s consent.
        </li>
      </ul>
      <p>
        The label records that check and nothing more. A review describes one patient’s experience. It is not a certification of clinical quality, and
        we do not rank hospitals by outcomes.
      </p>

      <h2>What we keep private</h2>
      <p>
        The bill or prescription, the patient’s name, the exact visit date and the mobile number are never published. Patients can mask diagnoses,
        medicines, amounts and other people’s details on the copy they upload. Reviews appear under “Patient” unless the author chooses otherwise.
      </p>

      <h2>Moderation</h2>
      <p>
        Positive and negative experiences are moderated by the same rules. We ask for edits that remove other patients’ names, medical identifiers or
        staff members’ personal contact details. A hospital cannot pay to remove or hide a review. A confirmed hospital representative can post a
        moderated reply, and anyone can report a review.
      </p>

      <h2>Ratings</h2>
      <p>
        A branch’s score is the plain average of the 1–5 overall ratings of its published reviews on this site, rounded to one decimal for display.
        Scores from Google, Practo, Justdial or any other platform are never mixed in. Where another platform has reviews for the same branch we link
        to it and label the link.
      </p>

      <h2>Appeals and withdrawal</h2>
      <p>A patient can appeal a decision, and a different moderator reviews it. A patient can withdraw their review at any time.</p>

      <p className="meta mt-8">
        Review submission is not open yet. See also <Link href="/sources" className="link">how we source and label facts</Link>.
      </p>
    </div></div>
  );
}
