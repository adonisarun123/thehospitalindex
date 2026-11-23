import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { POLICY } from "@/lib/policy";
import { abs, breadcrumbLd, webPageLd } from "@/lib/schema-org";

const TITLE = "Editorial Policy";
const DESCRIPTION =
  "How The Hospital Index sources, checks, labels and corrects hospital facts and guides; independence from hospitals; and how health information is written and reviewed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: abs("/editorial-policy") },
  openGraph: { title: TITLE, description: DESCRIPTION, url: abs("/editorial-policy") },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "Editorial policy", href: "/editorial-policy" },
];

export default function EditorialPolicy() {
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: "/editorial-policy" })} />
      <PageHeader crumbs={crumbs} title="Editorial policy">
        <p className="mt-3 max-w-3xl text-lg">The standards behind every hospital profile and every guide on this site.</p>
      </PageHeader>
      <div className="wrap py-8">
        <div className="prose-page max-w-3xl">
          <h2 id="facts">Hospital facts</h2>
          <ul>
            <li>Each fact on a branch profile carries its source category and the date it was received or checked.</li>
            <li>We publish only facts we can label as “Hospital supplied” or “Checked against source”. Anything else is left out.</li>
            <li>
              Facts are rechecked on a schedule: emergency contacts every {POLICY.refreshDays.emergency} days, hours and core contacts every{" "}
              {POLICY.refreshDays.coreContact} days, descriptive facts every {POLICY.refreshDays.descriptive} days. Overdue facts stay visible with
              their date but stop matching filters.
            </li>
            <li>Hospitals can propose changes to their own branch. Editors decide what is published.</li>
          </ul>

          <h2 id="guides">Guides and blog posts</h2>
          <ul>
            <li>Guides are practical and non-clinical. They do not tell you what treatment to have.</li>
            <li>Every claim about a law, regulation, scheme, time limit or amount links to an official or primary source listed on the page.</li>
            <li>Each guide shows the date its facts were last checked. We review guides when the underlying rules change.</li>
            <li>We do not publish statistics we cannot source, and we do not attribute quotes we cannot verify.</li>
            <li>Guides are written in plain English for patients and families, not for search engines.</li>
          </ul>

          <h2 id="independence">Independence</h2>
          <ul>
            <li>No hospital can pay for a listing, a position in results, a label or the removal of a review.</li>
            <li>Ordering rules are public: see <Link href="/sources#sorting" className="link">how results are ordered</Link>.</li>
            <li>Guides do not name or promote specific hospitals.</li>
          </ul>

          <h2 id="reviews">Patient reviews</h2>
          <p>
            Positive and negative reviews are moderated by the same rules. The full process is on{" "}
            <Link href="/how-reviews-work" className="link">how reviews work</Link>.
          </p>

          <h2 id="corrections">Corrections</h2>
          <p>
            If you find an error in a profile or a guide, <Link href="/corrections" className="link">tell us</Link>. Confirmed corrections are made as
            soon as possible, and a guide’s “updated” date changes when its content changes materially.
          </p>

          <h2 id="medical">Medical information</h2>
          <p>
            Nothing on this site is medical advice. See our <Link href="/medical-disclaimer" className="link">medical disclaimer</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
