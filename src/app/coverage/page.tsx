import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { coverageLedger } from "@/lib/queries/geo";
import { abs } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Directory Coverage by State",
  description: "How many hospital branches The Hospital Index has discovered, checked and published in each state and union territory.",
  alternates: { canonical: abs("/coverage") },
};

/** GEO-01: the coverage ledger. The total hospital universe is unknown, so this is labelled coverage, never completeness. */
export default async function Coverage() {
  const rows = await coverageLedger();
  const total = rows.reduce((a, r) => ({ d: a.d + r.discovered, c: a.c + r.checked, p: a.p + r.published, i: a.i + r.indexable }), { d: 0, c: 0, p: 0, i: 0 });
  return (
    <>
      <PageHeader title="Directory coverage">
        <p className="mt-3 max-w-3xl">
          These numbers describe our directory, not India’s hospitals. We do not yet hold a licensed national inventory to use as a denominator, so
          we do not publish a coverage percentage. A branch is published only after its identity, address and a contact route are checked.
        </p>
      </PageHeader>
      <div className="wrap">
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <caption className="sr-only">Branches discovered, checked and published by state or union territory</caption>
          <thead className="border-b border-line">
            <tr>
              {["State or union territory", "Discovered", "Checked", "Published", "Last checked"].map((h, i) => (
                <th key={h} scope="col" className={`p-3 font-semibold ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-line last:border-0">
                <th scope="row" className="p-3 font-normal">
                  <Link href={urls.state(r.slug)} className="link">
                    {r.name}
                  </Link>
                </th>
                <td className="p-3 text-right">{r.discovered}</td>
                <td className="p-3 text-right">{r.checked}</td>
                <td className="p-3 text-right">{r.published}</td>
                <td className="p-3 text-right">{r.lastChecked ?? "–"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-line font-semibold">
            <tr>
              <th scope="row" className="p-3">
                All India
              </th>
              <td className="p-3 text-right">{total.d}</td>
              <td className="p-3 text-right">{total.c}</td>
              <td className="p-3 text-right">{total.p}</td>
              <td className="p-3" />
            </tr>
          </tfoot>
        </table>
      </div>
      </div>
    </>
  );
}
