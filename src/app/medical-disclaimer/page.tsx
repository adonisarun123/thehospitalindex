import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { abs, breadcrumbLd, webPageLd } from "@/lib/schema-org";

const TITLE = "Medical Disclaimer";
const DESCRIPTION =
  "The Hospital Index provides information about hospital branches and patient experiences. It is not medical advice and does not replace a doctor. In an emergency call 112.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: abs("/medical-disclaimer") },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "Medical disclaimer", href: "/medical-disclaimer" },
];

export default function MedicalDisclaimer() {
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: "/medical-disclaimer" })} />
      <PageHeader crumbs={crumbs} title="Medical disclaimer" />
      <div className="wrap py-8">
        <div className="prose-page max-w-3xl">
          <p role="note" className="rounded-xl border border-amber-ink/40 bg-amber-tint p-4 font-semibold text-amber-ink">
            In a medical emergency, call 112 or 108 and go to the nearest hospital with an emergency department.
          </p>
          <h2>Information, not advice</h2>
          <p>
            The Hospital Index publishes information about hospital branches (such as departments, services, hours and contact details), patient
            experiences, and general guides about using hospitals in India. It does not provide medical advice, diagnosis or treatment, and it does
            not replace a consultation with a qualified doctor.
          </p>
          <h2>Facts can change</h2>
          <p>
            Each fact on a branch profile shows its source and the date it was last checked. Hospitals change services, hours, staff and insurance
            arrangements. Confirm anything important, especially emergency services, directly with the branch before you travel.
          </p>
          <h2>Reviews are experiences</h2>
          <p>
            A review describes one patient’s experience. The “Visit evidence checked” label confirms a visit, not the quality or outcome of care.
          </p>
          <h2>No ranking or endorsement</h2>
          <p>
            Listing a branch is not an endorsement. We do not rank hospitals by clinical outcomes. Accreditation and other credentials are shown as
            reported by their source, with a date.
          </p>
          <h2>Insurance, legal and financial matters</h2>
          <p>
            Guides about insurance, government schemes and patients’ rights explain rules in general terms. Your policy, the scheme’s official
            documents and qualified professionals are the authority for your situation.
          </p>
          <p className="meta mt-8">
            See also our <Link href="/editorial-policy" className="link">editorial policy</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
