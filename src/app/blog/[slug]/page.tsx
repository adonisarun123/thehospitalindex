import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Blocks, Inline } from "@/components/rich-text";
import { formatDate } from "@/components/trust-label";
import { getPost, plain, posts, readingMinutes, relatedPosts, wordCount } from "@/content/blog";
import { abs, articleLd, breadcrumbLd, faqLd } from "@/lib/schema-org";

/** Editorial pages are static: every slug is known at build time and anything else is a real 404. */
export const dynamicParams = false;
export const generateStaticParams = () => posts.map((p) => ({ slug: p.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  const url = abs(`/blog/${p.slug}`);
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: url, types: { "application/rss+xml": abs("/blog/rss.xml") } },
    openGraph: {
      type: "article",
      url,
      title: p.title,
      description: p.description,
      publishedTime: `${p.datePublished}T00:00:00+05:30`,
      modifiedTime: `${p.dateModified}T00:00:00+05:30`,
      section: p.category,
      tags: p.keywords,
    },
    twitter: { card: "summary_large_image", title: p.title, description: p.description },
  };
}

export default async function BlogPost({ params }: Props) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  const path = `/blog/${p.slug}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: p.title, href: path },
  ];
  const toc = p.body.filter((b) => b.type === "h2");
  // A safety warning that opens a post is shown before the summary, not after it.
  const [first, ...restBody] = p.body;
  const leadWarning = first?.type === "callout" && first.tone === "warning" ? [first] : [];
  const body = leadWarning.length ? restBody : p.body;
  const related = relatedPosts(p);

  return (
    <article>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={articleLd({
          path,
          headline: p.title,
          description: p.description,
          datePublished: p.datePublished,
          dateModified: p.dateModified,
          section: p.category,
          keywords: p.keywords,
          wordCount: wordCount(p),
          image: `${path}/opengraph-image`,
          citations: p.sources,
        })}
      />
      {p.faqs?.length ? <JsonLd data={faqLd(path, p.faqs.map((f) => ({ q: f.q, a: plain(f.a) })))} /> : null}

      <header className="border-b border-line bg-surface">
        <div className="wrap pt-4 pb-8">
          <Breadcrumbs items={crumbs} />
          <p className="chip bg-teal-tint text-teal-dark">{p.category}</p>
          <h1 className="h-page mt-3 max-w-4xl">{p.title}</h1>
          <p className="meta mt-3">
            By The Hospital Index editorial team · Updated <time dateTime={p.dateModified}>{formatDate(p.dateModified)}</time> ·{" "}
            {readingMinutes(p)} min read
          </p>
        </div>
      </header>

      <div className="wrap grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="prose-page max-w-3xl">
          <Blocks blocks={leadWarning} />
          <section aria-label="Summary" className="card mb-8 p-5">
            <p className="mb-1 font-semibold">In short</p>
            <p className="mb-0">
              <Inline text={p.summary} />
            </p>
          </section>

          <Blocks blocks={body} />

          {p.faqs?.length ? (
            <>
              <h2 id="faq">Common questions</h2>
              {p.faqs.map((f) => (
                <details key={f.q} className="card mb-3 p-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 mb-0">
                    <Inline text={f.a} />
                  </p>
                </details>
              ))}
            </>
          ) : null}

          {p.sources.length ? (
            <>
              <h2 id="sources">Sources</h2>
              <ol className="list-decimal space-y-1.5 pl-6">
                {p.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} className="link" rel="noopener" target="_blank">
                      {s.title}
                    </a>
                    <span className="meta">, {s.publisher}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <p className="meta mt-8 border-t border-line pt-4">
            Facts on this page were last checked against their sources on {formatDate(p.factsCheckedOn)}. Rules and schemes change; confirm
            anything important with the official source. This guide is general information, not medical, legal or financial advice. Read our{" "}
            <Link href="/editorial-policy" className="link">editorial policy</Link> or{" "}
            <Link href="/corrections" className="link">report an error</Link>.
          </p>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {toc.length > 2 ? (
            <nav aria-label="On this page" className="card p-4">
              <p className="font-semibold">On this page</p>
              <ul className="mt-2 space-y-1 text-sm">
                {toc.map((h) =>
                  h.type === "h2" ? (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="link">
                        {h.text}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </nav>
          ) : null}
          <div className="card p-4">
            <p className="font-semibold">Find a hospital branch</p>
            <p className="meta mt-1">Browse sourced listings by place or specialty.</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/hospitals" className="btn-primary">
                Browse by state
              </Link>
              <Link href="/specialties" className="btn-quiet">
                Browse by specialty
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section aria-labelledby="related-h" className="wrap">
          <h2 id="related-h" className="h-section">
            Related guides
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/blog/${r.slug}`} className="card-link flex h-full flex-col p-5 text-ink no-underline">
                  <span className="meta">{r.category}</span>
                  <span className="mt-1 font-semibold">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
