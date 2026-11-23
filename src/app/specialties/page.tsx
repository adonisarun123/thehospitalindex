import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { listSpecialties } from "@/lib/queries/branches";
import { abs } from "@/lib/schema-org";
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
      <Breadcrumbs items={[{ name: "Specialties", href: urls.specialties() }]} />
      <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">Specialties</h1>
      <p className="meta mt-2 max-w-3xl">
        A branch appears under a specialty only when that department has been confirmed or supplied by the hospital. Counts are directory coverage.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.map((s) => (
          <li key={s.id}>
            <Link href={urls.specialty(s.slug)} className="card flex min-h-16 items-center justify-between gap-3 p-4 text-ink no-underline hover:border-teal">
              <span>
                <span className="font-semibold">{s.name}</span>
                {s.plainLabel ? <span className="meta block">{s.plainLabel}</span> : null}
              </span>
              <span className="meta">{s.branches > 0 ? s.branches : "None yet"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
