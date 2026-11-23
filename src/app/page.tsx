import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SearchBox } from "@/components/search-box";
import { SITE_URL } from "@/lib/env";
import { listSpecialties } from "@/lib/queries/branches";
import { listStates } from "@/lib/queries/geo";
import { publisherLd } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: SITE_URL } };

export default async function Home() {
  const [states, specialties] = await Promise.all([listStates(), listSpecialties()]);
  const populated = specialties.filter((s) => s.branches > 0);
  const total = states.reduce((n, s) => n + s.published, 0);
  return (
    <>
      <JsonLd data={publisherLd()} />
      <section className="py-4 sm:py-8">
        <h1 className="max-w-3xl text-[clamp(1.75rem,5vw,2.75rem)] leading-tight font-bold">Find a hospital branch, and see what it actually offers</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          Search by location and specialty. Every important fact shows where it came from and when it was last checked.
        </p>
        <div className="mt-6 max-w-4xl">
          <SearchBox />
        </div>
      </section>

      <section aria-labelledby="states-h" className="mt-6">
        <h2 id="states-h" className="text-2xl font-semibold">
          Browse by state or union territory
        </h2>
        <p className="meta mt-1">
          {total > 0
            ? `${total} published hospital ${total === 1 ? "branch" : "branches"} so far. Counts are directory coverage, not the number of hospitals that exist.`
            : "The directory is being populated. Every state and union territory is listed; counts appear as branches are verified."}{" "}
          <Link href="/coverage" className="link">
            About coverage
          </Link>
        </p>
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {states.map((s) => (
            <li key={s.id} className="border-b border-line">
              <Link href={urls.state(s.slug)} className="flex min-h-11 items-center justify-between gap-3 py-2 text-ink hover:text-teal">
                <span className="font-medium">{s.name}</span>
                <span className="meta">{s.published > 0 ? s.published : "No listings yet"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {populated.length > 0 ? (
        <section aria-labelledby="spec-h" className="mt-10">
          <h2 id="spec-h" className="text-2xl font-semibold">
            Commonly sought specialties
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {populated.map((s) => (
              <li key={s.id}>
                <Link href={urls.specialty(s.slug)} className="chip min-h-11 no-underline hover:border-teal">
                  {s.name}
                  <span className="meta ml-1">({s.branches})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
