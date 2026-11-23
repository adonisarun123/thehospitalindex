import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, ChevronIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SearchBox } from "@/components/search-box";
import { SITE_URL } from "@/lib/env";
import { VISIT_LABEL } from "@/lib/policy";
import { listSpecialties } from "@/lib/queries/branches";
import { listStates, type GeoWithCounts } from "@/lib/queries/geo";
import { publisherLd } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: SITE_URL } };

/** The directory's own device: an A–Z index, the way a printed register is thumbed. */
function byLetter(items: GeoWithCounts[]) {
  const groups = new Map<string, GeoWithCounts[]>();
  for (const s of items) groups.set(s.name[0], [...(groups.get(s.name[0]) ?? []), s]);
  return [...groups.entries()];
}

function PlaceRow({ s }: { s: GeoWithCounts }) {
  return (
    <li>
      <Link href={urls.state(s.slug)} className="group flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-ink hover:bg-teal-tint">
        <span className="font-medium group-hover:text-teal-dark">{s.name}</span>
        <span className={s.published > 0 ? "rounded-full bg-teal-tint px-2 text-sm font-semibold text-teal-dark" : "text-sm text-muted"}>
          {s.published > 0 ? s.published : "Opening soon"}
        </span>
      </Link>
    </li>
  );
}

export default async function Home() {
  const [places, specialties] = await Promise.all([listStates(), listSpecialties()]);
  const states = places.filter((p) => p.kind === "state");
  const uts = places.filter((p) => p.kind === "union_territory");
  const total = places.reduce((n, s) => n + s.published, 0);
  const quick = (specialties.some((s) => s.branches > 0) ? specialties.filter((s) => s.branches > 0) : specialties).slice(0, 6);

  return (
    <>
      <JsonLd data={publisherLd()} />

      <section className="bg-teal-deep text-white">
        <div className="wrap pt-10 pb-28 sm:pt-16 sm:pb-32">
          <h1 className="display max-w-3xl text-[clamp(2.125rem,6vw,3.75rem)] leading-[1.02] font-extrabold">
            Find the right hospital branch, not just the brand
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Search hospitals across India by place and specialty. See what each branch offers, where every fact came from and when it was last
            checked.
          </p>
        </div>
      </section>

      <div className="wrap -mt-20">
        <SearchBox />
        <p className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">Often searched</span>
          {quick.map((s) => (
            <Link key={s.id} href={urls.specialty(s.slug)} className="chip min-h-9 bg-surface no-underline hover:border-teal hover:text-teal-dark">
              {s.name}
            </Link>
          ))}
        </p>
      </div>

      <section aria-labelledby="states-h" className="wrap mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="states-h" className="h-section">
              Browse by state or union territory
            </h2>
            <p className="meta mt-1 max-w-2xl text-base">
              {total > 0
                ? `${total} hospital ${total === 1 ? "branch" : "branches"} published so far. Counts show our coverage, not how many hospitals exist.`
                : "We are verifying our first listings. Every state and union territory is here from day one; counts appear as branches are checked."}
            </p>
          </div>
          <Link href="/coverage" className="link inline-flex min-h-11 items-center gap-1 font-medium">
            See coverage by state <ChevronIcon />
          </Link>
        </div>

        <div className="card mt-5 p-4 sm:p-6">
          <div className="gap-x-8 sm:columns-2 lg:columns-3">
            {byLetter(states).map(([letter, items]) => (
              <div key={letter} className="mb-4 flex break-inside-avoid gap-3">
                <span aria-hidden="true" className="display w-8 shrink-0 pt-1.5 text-2xl leading-none font-extrabold text-teal">
                  {letter}
                </span>
                <ul className="min-w-0 flex-1">
                  {items.map((s) => (
                    <PlaceRow key={s.id} s={s} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <h3 className="mt-2 border-t border-line pt-5 font-semibold">Union territories</h3>
          <ul className="mt-1 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {uts.map((s) => (
              <PlaceRow key={s.id} s={s} />
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="spec-h" className="wrap mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="spec-h" className="h-section">
            Browse by specialty
          </h2>
          <Link href={urls.specialties()} className="link inline-flex min-h-11 items-center gap-1 font-medium">
            All specialties <ChevronIcon />
          </Link>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {specialties.slice(0, 12).map((s) => (
            <li key={s.id}>
              <Link href={urls.specialty(s.slug)} className="card-link flex h-full min-h-20 flex-col justify-center p-4 text-ink no-underline">
                <span className="font-semibold [overflow-wrap:anywhere]">{s.name}</span>
                {s.plainLabel ? <span className="meta">{s.plainLabel}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trust-h" className="mt-16 bg-teal-tint">
        <div className="wrap grid gap-8 py-12 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <h2 id="trust-h" className="h-section">
              You can see who said what
            </h2>
            <p className="mt-3 max-w-md">
              Hospital listings are usually a mix of marketing and guesswork. Here, each important fact carries one of three labels, and anything we
              cannot label is left out.
            </p>
            <Link href="/sources" className="btn-primary mt-5">
              How we source facts
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {[
              { badge: "Hospital supplied", tone: "bg-amber-tint text-amber-ink", glyph: "◦", text: "The hospital told us. Recorded with the date, not yet confirmed independently." },
              { badge: "Checked against source", tone: "bg-teal-tint text-teal-dark", glyph: "✓", text: "An editor compared it with an official register or the branch’s own desk." },
              { badge: VISIT_LABEL, tone: "bg-teal-tint text-teal-dark", glyph: "✓", text: "A review from a patient whose bill or prescription we matched to a visit." },
            ].map((l) => (
              <li key={l.badge} className="card p-5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${l.tone}`}>
                  <span aria-hidden="true">{l.glyph}</span>
                  {l.badge}
                </span>
                <p className="mt-3">{l.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="promise-h" className="wrap mt-14 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 id="promise-h" className="h-section">
            What you will not find here
          </h2>
          <ul className="mt-4 space-y-3">
            {[
              "Paid placement. No hospital can buy a position or remove a review.",
              "Borrowed ratings. Scores from other platforms are linked, never mixed into ours.",
              "One page for a whole chain. Each physical branch has its own services, contacts and reviews.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckIcon className="mt-0.5 shrink-0 text-teal" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card flex flex-col justify-center p-6">
          <h2 className="display text-xl font-bold">Work at a hospital, or spotted a mistake?</h2>
          <p className="mt-2">Tell us what is wrong and point us to a source. An editor reviews every suggestion before anything changes.</p>
          <p className="mt-4">
            <Link href="/corrections" className="btn-quiet">
              Suggest a correction
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
