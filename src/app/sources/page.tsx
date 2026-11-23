import type { Metadata } from "next";
import Link from "next/link";
import { POLICY } from "@/lib/policy";
import { abs } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: "Sources, Trust Labels and Sorting",
  description: "What each trust label on The Hospital Index means, how hospital facts are sourced and how search results are ordered.",
  alternates: { canonical: abs("/sources") },
};

export default function Sources() {
  return (
    <div className="prose-page mx-auto max-w-3xl">
      <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">Sources, trust labels and sorting</h1>
      <p className="mt-4 text-lg">Every profile describes one physical branch. Each important fact carries a label saying who supplied it and when it was checked.</p>

      <h2>The labels</h2>
      <dl>
        <dt id="hospital-supplied">Hospital supplied</dt>
        <dd>The hospital told us this. We have recorded it and when we received it, but have not confirmed it against an independent source.</dd>
        <dt id="checked-against-source">Checked against source</dt>
        <dd>An editor compared this fact with a source outside our own records, such as an official register or the branch’s own desk, on the date shown.</dd>
        <dt id="visit-evidence-checked">Visit evidence checked</dt>
        <dd>
          Applies to patient reviews only. See <Link href="/how-reviews-work" className="link">how reviews work</Link>.
        </dd>
        <dt>Reviews on another site</dt>
        <dd>A link to the same branch on another platform. Their scores are theirs; we do not copy or count them.</dd>
      </dl>
      <p>Facts we cannot place in one of these categories are not shown. A detail that is missing is unknown, not unavailable.</p>

      <h2>Facts that go stale</h2>
      <p>
        Emergency contacts are rechecked on a {POLICY.refreshDays.emergency}-day target; hours, clinicians, insurance and core contact details every{" "}
        {POLICY.refreshDays.coreContact} days; descriptive facts every {POLICY.refreshDays.descriptive} days. An expired accreditation loses its badge
        at once. An overdue fact stays visible with its date but stops matching filters such as “Emergency department” until it is rechecked.
      </p>

      <h2 id="sorting">How results are ordered</h2>
      <p>Location and any filters you choose are applied first. Then:</p>
      <ul>
        <li>when you type a search, an exact hospital name comes first, then branches with exactly that specialty or service, then the closest text matches;</li>
        <li>when you browse without a search, branches with more complete, sourced listings come first, then alphabetically.</li>
      </ul>
      <p>
        “Highest patient rating” only ranks branches with at least {POLICY.ratingSortMinReviews} published reviews on this site; the rest follow in a
        separate group. Payment never affects ordering, and no hospital can buy a position.
      </p>
      <p>Filters match only confirmed, current facts. A hospital may offer something we have not verified yet, so a filter can under-count.</p>

      <h2>Corrections</h2>
      <p>
        Anyone can <Link href="/corrections" className="link">suggest a correction</Link>. Hospitals can propose changes to their own branch; editors
        decide what is published.
      </p>
    </div>
  );
}
