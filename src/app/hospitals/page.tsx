import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SearchBox } from "@/components/search-box";
import { listStates } from "@/lib/queries/geo";
import { abs } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hospitals in India by State and Union Territory",
  description: "Browse hospital branches in every Indian state and union territory, with real published counts and clearly labelled coverage gaps.",
  alternates: { canonical: abs(urls.country()) },
};

export default async function CountryDirectory() {
  const states = await listStates();
  const groups = [
    { title: "States", items: states.filter((s) => s.kind === "state") },
    { title: "Union territories", items: states.filter((s) => s.kind === "union_territory") },
  ];
  return (
    <>
      <Breadcrumbs items={[{ name: "Hospitals in India", href: urls.country() }]} />
      <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">Hospitals in India</h1>
      <div className="mt-4 max-w-4xl">
        <SearchBox />
      </div>
      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`${g.title}-h`} className="mt-8">
          <h2 id={`${g.title}-h`} className="text-2xl font-semibold">
            {g.title}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map((s) => (
              <li key={s.id}>
                <Link href={urls.state(s.slug)} className="card flex min-h-16 items-center justify-between gap-3 p-4 text-ink no-underline hover:border-teal">
                  <span className="font-semibold">{s.name}</span>
                  <span className="meta text-right">{s.published > 0 ? `${s.published} listed` : "No listings yet"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
