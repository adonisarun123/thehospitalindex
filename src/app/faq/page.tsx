import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Inline } from "@/components/rich-text";
import { plain } from "@/content/blog";
import { faqGroups } from "@/content/faq";
import { abs, breadcrumbLd, faqEntities, webPageLd } from "@/lib/schema-org";

const TITLE = "Frequently Asked Questions";
const DESCRIPTION =
  "Answers about The Hospital Index: how hospital facts are sourced, how reviews are checked, why we list branches, insurance and PM-JAY, and corrections.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: abs("/faq") },
  openGraph: { title: TITLE, description: DESCRIPTION, url: abs("/faq") },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "FAQ", href: "/faq" },
];

export default function Faq() {
  const all = faqGroups.flatMap((g) => g.items).map((f) => ({ q: f.q, a: plain(f.a) }));
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={webPageLd({ type: "FAQPage", name: TITLE, description: DESCRIPTION, path: "/faq", extra: { mainEntity: faqEntities(all) } })} />
      <PageHeader crumbs={crumbs} title="Frequently asked questions" />
      <div className="wrap py-8">
        <div className="max-w-3xl">
          {faqGroups.map((g) => (
            <section key={g.title} className="mb-10">
              <h2 className="h-section mb-4">{g.title}</h2>
              {g.items.map((f) => (
                <details key={f.q} className="card mb-3 p-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2">
                    <Inline text={f.a} />
                  </p>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
