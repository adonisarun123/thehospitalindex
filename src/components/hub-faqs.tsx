import { JsonLd } from "@/components/json-ld";
import { Inline } from "@/components/rich-text";
import { plain } from "@/content/blog";
import type { HubPage } from "@/content/types";
import { faqLd } from "@/lib/schema-org";

/** Questions and sources for a hub landing page (src/content/hubs). */
export function HubFaqs({ path, hub }: { path: string; hub: HubPage }) {
  return (
    <section aria-labelledby="hub-faq" className="prose-page mt-10 max-w-3xl">
      <JsonLd data={faqLd(path, hub.faqs.map((f) => ({ q: f.q, a: plain(f.a) })))} />
      <h2 id="hub-faq">Common questions</h2>
      {hub.faqs.map((f) => (
        <details key={f.q} className="card mb-3 p-4">
          <summary className="cursor-pointer font-semibold">{f.q}</summary>
          <p className="mt-2 mb-0">
            <Inline text={f.a} />
          </p>
        </details>
      ))}
      {hub.sources.length ? (
        <>
          <h3>Sources</h3>
          <ol className="list-decimal space-y-1.5 pl-6">
            {hub.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} className="link" rel="noopener" target="_blank">
                  {s.title}
                </a>{" "}
                <span className="meta">({s.publisher})</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <p className="meta mt-4">Facts checked {hub.factsCheckedOn}. General information, not medical advice.</p>
    </section>
  );
}
