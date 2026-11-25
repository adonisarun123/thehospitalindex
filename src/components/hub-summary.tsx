import Link from "next/link";
import { formatDate } from "@/components/trust-label";
import { POLICY } from "@/lib/policy";
import type { HubStats } from "@/lib/queries/related";
import { titleCaseEnum } from "@/lib/text";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

/**
 * A data-derived "at a glance" block for hubs (SEO-01). Every sentence is a
 * count over published branches using the same predicates as the filters,
 * so it is original, checkable and never a claim we cannot back.
 */
export function HubSummary({
  stats,
  place,
  subject = "hospital branches",
  specialtyHref,
}: {
  stats: HubStats;
  /** "Bengaluru", "Karnataka", "Mysuru district" */
  place: string;
  /** "cardiology hospital branches" on taxonomy hubs. */
  subject?: string;
  /** Where a department name should link inside this place; omit to render plain text. */
  specialtyHref?: (slug: string) => string | null;
}) {
  if (stats.published === 0) return null;
  const ownership = [
    stats.privateOwned ? `${stats.privateOwned.toLocaleString("en-IN")} private` : null,
    stats.government ? `${stats.government.toLocaleString("en-IN")} government` : null,
    stats.charitable ? `${stats.charitable.toLocaleString("en-IN")} charitable` : null,
  ].filter(Boolean);
  const topType = stats.facilityTypes[0];

  return (
    <section aria-labelledby="glance-h" className="mt-4 max-w-3xl rounded-(--radius-card) bg-teal-tint px-4 py-3">
      <h2 id="glance-h" className="font-semibold">
        {place} at a glance
      </h2>
      <p className="mt-1">
        We list {plural(stats.published, subject.replace(/branches$/, "branch"), subject)} in {place}
        {stats.settlements > 1 ? `, across ${stats.settlements.toLocaleString("en-IN")} towns and cities` : ""}.{" "}
        {stats.accredited
          ? `${plural(stats.accredited, "holds", "hold")} a current hospital accreditation that we matched against the issuing register. `
          : ""}
        {stats.emergency
          ? `${plural(stats.emergency, "has", "have")} an emergency department confirmed in the last ${POLICY.refreshDays.emergency} days. `
          : ""}
        {ownership.length ? `Where ownership is recorded: ${ownership.join(", ")}. ` : ""}
        {topType && stats.published > 1
          ? `The most common type is ${titleCaseEnum(topType.value).toLowerCase()} (${topType.count.toLocaleString("en-IN")}). `
          : ""}
        {stats.lastChecked ? `Most recent check: ${formatDate(stats.lastChecked)}.` : ""}
      </p>
      {stats.topSpecialties.length ? (
        <p className="mt-2">
          <span className="font-medium">Departments listed most often: </span>
          {stats.topSpecialties.map((s, i) => {
            const href = specialtyHref?.(s.slug) ?? null;
            return (
              <span key={s.slug}>
                {i ? ", " : ""}
                {href ? (
                  <Link href={href} className="link">
                    {s.name}
                  </Link>
                ) : (
                  s.name
                )}{" "}
                <span className="meta">({s.count})</span>
              </span>
            );
          })}
        </p>
      ) : null}
      <p className="meta mt-2">
        This describes our published coverage, not every hospital in {place}.{" "}
        <Link href="/coverage" className="link">
          About coverage
        </Link>
      </p>
    </section>
  );
}
