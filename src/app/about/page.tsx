import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { abs, breadcrumbLd, organizationLd, webPageLd } from "@/lib/schema-org";

const TITLE = "About The Hospital Index";
const DESCRIPTION =
  "Why The Hospital Index lists every hospital branch in India separately, how facts are sourced and labelled, and what the directory will and will not do.";

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: abs("/about") },
  openGraph: { title: TITLE, description: DESCRIPTION, url: abs("/about") },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
];

export default function About() {
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={webPageLd({ type: "AboutPage", name: TITLE, description: DESCRIPTION, path: "/about", about: { "@id": organizationLd()["@id"] } })} />
      <JsonLd data={organizationLd()} />
      <PageHeader crumbs={crumbs} title="About The Hospital Index">
        <p className="mt-3 max-w-3xl text-lg">A directory of physical hospital branches across India, built so you can see who said what, and when.</p>
      </PageHeader>
      <div className="wrap py-8">
        <div className="prose-page max-w-3xl">
          <h2>The problem</h2>
          <p>
            Hospital information in India is easy to find and hard to trust. Listings mix marketing with guesswork, merge different branches under
            one brand, and show ratings without saying where they came from. Patients and families end up phoning around to confirm basic facts,
            often at the worst possible moment.
          </p>

          <h2>What we do</h2>
          <ul>
            <li>
              <strong>One profile per physical branch.</strong> Departments, emergency cover, insurance tie-ups, accreditation and reviews belong to
              an address. See <Link href="/blog/why-the-branch-matters-more-than-the-brand" className="link">why the branch matters</Link>.
            </li>
            <li>
              <strong>Every important fact is labelled.</strong> “Hospital supplied” or “Checked against source”, with a date. Facts we cannot label
              are left out. See <Link href="/sources" className="link">sources and trust labels</Link>.
            </li>
            <li>
              <strong>Reviews need visit evidence.</strong> A review is published only after a verifier checks evidence of a visit to that branch.
              See <Link href="/how-reviews-work" className="link">how reviews work</Link>.
            </li>
            <li>
              <strong>Practical guides.</strong> Plain-language help with insurance, schemes, emergencies and patients’ rights, linked to official
              sources. See the <Link href="/blog" className="link">blog</Link>.
            </li>
          </ul>

          <h2>What we do not do</h2>
          <ul>
            <li>We do not give medical advice, diagnose or recommend treatment.</li>
            <li>We do not rank hospitals by clinical outcomes.</li>
            <li>We do not sell positions in search results, and hospitals cannot pay to remove or hide reviews.</li>
            <li>We do not copy ratings from other platforms into our scores.</li>
          </ul>

          <h2>Where we are</h2>
          <p>
            The directory is growing state by state. A branch is published only after its identity, address and a contact route are checked, so
            numbers are small at first. Our <Link href="/coverage" className="link">coverage page</Link> shows exactly how many branches are
            published in each state.
          </p>

          <h2>Get in touch</h2>
          <p>
            To fix a fact, <Link href="/corrections" className="link">suggest a correction</Link>. For complaints, see{" "}
            <Link href="/grievance" className="link">grievances</Link>. Read our <Link href="/editorial-policy" className="link">editorial policy</Link>{" "}
            and <Link href="/privacy" className="link">privacy notice</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
