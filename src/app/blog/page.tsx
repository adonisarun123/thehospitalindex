import type { Metadata } from "next";
import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { posts, readingMinutes } from "@/content/blog";
import type { Category } from "@/content/types";
import { abs, blogLd, breadcrumbLd } from "@/lib/schema-org";
import { formatDate } from "@/components/trust-label";

const TITLE = "Hospital Guides for Patients in India";
const DESCRIPTION =
  "Practical, sourced guides for patients and families in India: choosing a hospital branch, cashless insurance, PM-JAY, emergencies, medical records and your rights.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: abs("/blog"), types: { "application/rss+xml": abs("/blog/rss.xml") } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: abs("/blog"), type: "website" },
};

const ORDER: Category[] = ["Choosing care", "Insurance and costs", "Emergencies", "Patient rights", "Using this directory"];
const crumbs = [
  { name: "Home", href: "/" },
  { name: "Blog", href: "/blog" },
];

export default function BlogIndex() {
  const groups = ORDER.map((c) => ({ c, items: posts.filter((p) => p.category === c) })).filter((g) => g.items.length);
  const lead = posts[0];
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={blogLd(
          posts.map((p) => ({
            path: `/blog/${p.slug}`,
            headline: p.title,
            datePublished: p.datePublished,
            dateModified: p.dateModified,
            description: p.description,
          })),
        )}
      />
      <PageHeader crumbs={crumbs} title="Guides for patients and families">
        <p className="mt-3 max-w-3xl text-lg">
          Practical, non-clinical help with using hospitals in India. Claims about rules and schemes link to the official source, and every guide shows
          when its facts were last checked. Nothing here is medical advice.
        </p>
      </PageHeader>

      <div className="wrap mt-8">
        <Link href={`/blog/${lead.slug}`} className="card-link block p-6 text-ink no-underline sm:p-8">
          <span className="chip bg-teal-tint text-teal-dark">{lead.category}</span>
          <h2 className="h-section mt-3 max-w-3xl">{lead.title}</h2>
          <p className="mt-2 max-w-3xl text-muted">{lead.excerpt}</p>
          <p className="meta mt-3">
            {formatDate(lead.dateModified)} · {readingMinutes(lead)} min read
          </p>
        </Link>

        {groups.map(({ c, items }) => {
          const list = items.filter((p) => p !== lead);
          if (!list.length) return null;
          const id = c.toLowerCase().replace(/[^a-z]+/g, "-");
          return (
            <section key={c} aria-labelledby={id} className="mt-12">
              <h2 id={id} className="h-section">
                {c}
              </h2>
              <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} className="card-link flex h-full flex-col p-5 text-ink no-underline">
                      <span className="font-semibold">{p.title}</span>
                      <span className="mt-2 flex-1 text-sm text-muted">{p.excerpt}</span>
                      <span className="meta mt-3 inline-flex items-center gap-1">
                        {readingMinutes(p)} min read <ChevronIcon />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="meta mt-12">
          Looking for a term? See the <Link href="/glossary" className="link">glossary</Link>. Subscribe with the{" "}
          <a href="/blog/rss.xml" className="link">RSS feed</a>.
        </p>
      </div>
    </>
  );
}
