import type { Metadata } from "next";
import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SearchBox } from "@/components/search-box";
import { SpecialtyIcon } from "@/components/specialty-icon";
import { posts } from "@/content/blog";
import { SITE_URL } from "@/lib/env";
import { TRUST_LABEL, VISIT_LABEL } from "@/lib/policy";
import { listSpecialties } from "@/lib/queries/branches";
import { listCoveredCities } from "@/lib/queries/geo";
import { publisherLd } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: SITE_URL } };

/** PRD-03: the three labels open the page, because they are what sets the directory apart. */
const LABELS = [
  { badge: TRUST_LABEL.checked_against_source, tone: "bg-teal-tint text-teal-dark", glyph: "✓", text: "Matched against an official register, such as NABH, or the branch’s own desk." },
  { badge: TRUST_LABEL.hospital_supplied, tone: "bg-amber-tint text-amber-ink", glyph: "◦", text: "The hospital told us or published it on its own website. Recorded with the date, not yet confirmed independently." },
  { badge: VISIT_LABEL, tone: "bg-teal-tint text-teal-dark", glyph: "✓", text: "A review from a patient whose bill or prescription we matched to a visit." },
];

const PROMISES = [
  { title: "No paid placement", text: "No hospital can buy a position or remove a review." },
  { title: "No borrowed ratings", text: "Scores from other platforms are linked, never mixed into ours." },
  { title: "No one-page chains", text: "Each physical branch has its own services, contacts and reviews." },
];

export default async function Home() {
  const [cities, specialties] = await Promise.all([listCoveredCities(8), listSpecialties()]);

  return (
    <>
      <JsonLd data={publisherLd()} />

      <section className="bg-teal-deep text-white">
        <div className="wrap grid gap-10 py-10 sm:py-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h1 className="display max-w-3xl text-[clamp(2.125rem,6vw,3.5rem)] leading-[1.03] font-extrabold">
              Find the right hospital branch, not just the brand
            </h1>
            <p className="mt-4 mb-7 max-w-2xl text-lg text-white/85">
              Two branches of the same hospital group can differ in departments, emergency cover and insurance. See what each one offers, where
              every fact came from and when it was last checked.
            </p>
            <SearchBox />
          </div>
          <div aria-labelledby="trust-h">
            <h2 id="trust-h" className="text-sm font-semibold tracking-wide text-mint uppercase">
              Every fact carries a label
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {LABELS.map((l) => (
                <li key={l.badge} className="rounded-(--radius-card) bg-surface p-4 text-ink">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${l.tone}`}>
                    <span aria-hidden="true">{l.glyph}</span>
                    {l.badge}
                  </span>
                  <p className="mt-2 text-sm">{l.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <Link href="/sources" className="inline-flex min-h-11 items-center gap-1 font-medium text-white underline hover:text-mint">
                How we source facts <ChevronIcon />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="spec-h" className="wrap mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="spec-h" className="h-section">
            What do you need care for?
          </h2>
          <Link href={urls.specialties()} className="link inline-flex min-h-11 items-center gap-1 font-medium">
            All specialties <ChevronIcon />
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {specialties.slice(0, 12).map((s) => (
            <li key={s.id}>
              <Link href={urls.specialty(s.slug)} className="card-link flex h-full min-h-20 items-center gap-3.5 p-4 text-ink no-underline">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-tint text-teal-dark">
                  <SpecialtyIcon slug={s.slug} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold [overflow-wrap:anywhere]">{s.plainLabel ?? s.name}</span>
                  {s.plainLabel ? <span className="meta block">{s.name}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cities-h" className="wrap mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="cities-h" className="h-section">
              {cities.length > 0 ? "Cities we cover so far" : "Where we are starting"}
            </h2>
            <p className="meta mt-1 max-w-2xl text-base">
              {cities.length > 0
                ? "A city appears here once its branches are checked. Counts show our coverage, not how many hospitals exist."
                : "We are verifying our first listings. A city appears here once its branches are checked, so nothing is shown as a placeholder."}
            </p>
          </div>
          <Link href={urls.country()} className="link inline-flex min-h-11 items-center gap-1 font-medium">
            Browse all states and union territories <ChevronIcon />
          </Link>
        </div>
        {cities.length > 0 ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cities.map((c) => (
              <li key={c.id}>
                <Link href={urls.city(c.stateSlug, c.slug)} className="card-link flex h-full flex-col p-5 text-ink no-underline">
                  <span className="display text-xl font-bold">{c.name}</span>
                  <span className="meta">{c.state}</span>
                  <span className="mt-3 text-sm font-semibold text-teal-dark">
                    {c.published} {c.published === 1 ? "branch" : "branches"} listed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 rounded-(--radius-card) bg-teal-tint px-5 py-3">
          <span>{cities.length > 0 ? "Your city is not here yet?" : "Want to know what is coming first?"}</span>
          <Link href="/coverage" className="link inline-flex min-h-11 items-center font-semibold">
            See coverage by state
          </Link>
        </p>
      </section>

      <section aria-labelledby="guides-h" className="wrap mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="guides-h" className="h-section">
            Guides for patients and families
          </h2>
          <Link href="/blog" className="link inline-flex min-h-11 items-center gap-1 font-medium">
            All guides <ChevronIcon />
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {posts.slice(0, 3).map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="card-link flex h-full flex-col p-5 text-ink no-underline">
                <span className="meta">{p.category}</span>
                <span className="mt-1 font-semibold">{p.title}</span>
                <span className="mt-2 text-sm text-muted">{p.excerpt}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="promise-h" className="wrap mt-14">
        <div className="grid gap-8 rounded-(--radius-card) bg-ink-deep p-6 text-white sm:p-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="promise-h" className="h-section">
              What you will not find here
            </h2>
            <p className="mt-3 text-white/85">
              Hospital listings are usually a mix of marketing and guesswork. Anything we cannot label is left out.
            </p>
          </div>
          <ul className="grid gap-6 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <li key={p.title}>
                <h3 className="display text-lg font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-white/85">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="max-w-2xl">
            <h2 className="display text-xl font-bold">Work at a hospital, or spotted a mistake?</h2>
            <p className="mt-1">Tell us what is wrong and point us to a source. An editor reviews every suggestion before anything changes.</p>
          </div>
          <Link href="/corrections" className="btn-quiet">
            Suggest a correction
          </Link>
        </div>
      </section>
    </>
  );
}
