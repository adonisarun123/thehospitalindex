import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { listSpecialties } from "@/lib/queries/branches";
import { abs, breadcrumbLd, webPageLd } from "@/lib/schema-org";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const populated = (await listSpecialties()).some((s) => s.branches > 0);
  return {
    title: "Hospital Specialties",
    description: "Browse hospital branches by medical specialty, using department listings that have a recorded source.",
    alternates: { canonical: abs(urls.specialties()) },
    robots: { index: populated, follow: true },
  };
}

export default async function Specialties() {
  const specialties = await listSpecialties();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", href: "/" }, { name: "Specialties", href: urls.specialties() }])} />
      <JsonLd
        data={webPageLd({
          type: "CollectionPage",
          name: "Hospital Specialties",
          description: "Browse hospital branches by medical specialty.",
          path: urls.specialties(),
          extra: {
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: specialties.length,
              itemListElement: specialties.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: abs(urls.specialty(s.slug)) })),
            },
          },
        })}
      />
      <PageHeader crumbs={[{ name: "Specialties", href: urls.specialties() }]} title="Browse by specialty">
        <p className="mt-2 max-w-3xl text-muted">
          A branch appears under a specialty only when that department has been confirmed or supplied by the hospital.
        </p>
      </PageHeader>
      <div className="wrap">
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.map((s) => (
          <li key={s.id}>
            <Link href={urls.specialty(s.slug)} className="card-link flex min-h-20 items-center justify-between gap-3 p-4 text-ink no-underline">
              <span>
                <span className="font-semibold">{s.name}</span>
                {s.plainLabel ? <span className="meta block">{s.plainLabel}</span> : null}
              </span>
              <span className="meta">{s.branches > 0 ? s.branches : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </>
  );
}
