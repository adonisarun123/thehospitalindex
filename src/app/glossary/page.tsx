import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { glossary } from "@/content/glossary";
import { abs, breadcrumbLd, definedTermSetLd, webPageLd } from "@/lib/schema-org";

const TITLE = "Glossary of Hospital and Health Insurance Terms";
const DESCRIPTION =
  "Plain-language meanings of hospital and health insurance terms used in India: OPD, IPD, ICU, HDU, TPA, UHID, cashless, empanelled, NABH, PM-JAY and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: abs("/glossary") },
  openGraph: { title: TITLE, description: DESCRIPTION, url: abs("/glossary") },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "Glossary", href: "/glossary" },
];

export default function Glossary() {
  const terms = [...glossary].sort((a, b) => a.term.localeCompare(b.term, "en-IN"));
  const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))];
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: "/glossary", extra: { mainEntity: { "@id": `${abs("/glossary")}#terms` } } })} />
      <JsonLd data={definedTermSetLd("/glossary", TITLE, terms)} />
      <PageHeader crumbs={crumbs} title="Glossary">
        <p className="mt-3 max-w-3xl text-lg">Hospital and health insurance terms you will meet in India, in plain language.</p>
      </PageHeader>
      <div className="wrap py-8">
        <nav aria-label="Jump to letter" className="mb-6 flex flex-wrap gap-2">
          {letters.map((l) => (
            <a key={l} href={`#letter-${l}`} className="chip min-h-9 no-underline hover:border-teal">
              {l}
            </a>
          ))}
        </nav>
        <dl className="card max-w-3xl divide-y divide-line">
          {terms.map((t, i) => {
            const first = i === 0 || terms[i - 1].term[0].toUpperCase() !== t.term[0].toUpperCase();
            return (
              <div key={t.id} id={t.id} className="scroll-mt-24 p-5">
                {first ? <span id={`letter-${t.term[0].toUpperCase()}`} className="block scroll-mt-24" /> : null}
                <dt className="font-semibold">
                  {t.term}
                  {t.alt ? <span className="font-normal text-muted"> ({t.alt})</span> : null}
                </dt>
                <dd className="mt-1">
                  {t.definition}
                  {t.seeAlso ? (
                    <>
                      {" "}
                      <Link href={t.seeAlso} className="link">
                        Read more
                      </Link>
                    </>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </>
  );
}
