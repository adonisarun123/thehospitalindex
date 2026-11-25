import Link from "next/link";
import { ExternalIcon, PhoneIcon, PinIcon, RouteIcon, StarIcon } from "@/components/icons";
import type { BranchCard as Card } from "@/lib/queries/branches";
import { formatDate } from "@/components/trust-label";
import { displayRating } from "@/lib/gates";
import { TRUST_LABEL, type PublicFactStatus } from "@/lib/policy";
import { titleCaseEnum } from "@/lib/text";
import { urls } from "@/lib/urls";

/** §06: a plain initials tile stands in until licensed branch photography exists. */
export function InitialsTile({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !["of", "and", "the", "for"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`display flex shrink-0 items-center justify-center rounded-xl bg-teal-tint font-extrabold text-teal-dark ${
        size === "lg" ? "size-16 text-2xl sm:size-20 sm:text-3xl" : "size-12 text-lg"
      }`}
    >
      {initials}
    </span>
  );
}

/** PRD-03 on a card: the same two tones as TrustLabel, with the status in words for screen readers. */
function FactChip({ text, status }: { text: string; status: string }) {
  const checked = status === "checked_against_source";
  return (
    <li
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${
        checked ? "bg-teal-tint text-teal-dark" : "bg-amber-tint text-amber-ink"
      }`}
    >
      <span aria-hidden="true">{checked ? "✓" : "◦"}</span>
      {text}
      <span className="sr-only"> ({TRUST_LABEL[status as PublicFactStatus] ?? "source not labelled"})</span>
    </li>
  );
}

/**
 * CARD-01 order: linked branch name → locality and city → ownership/type →
 * sourced fact chips → native rating or its empty state → View hospital.
 * On wide screens the rating and actions sit in their own column so cards scan like a table.
 */
export function BranchCard({ branch, headingLevel = "h2" }: { branch: Card; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const href = urls.branch(branch.slug, branch.publicId);
  const rating = displayRating(branch.nativeRatingSum, branch.nativeReviewCount);
  const place = [branch.locality, branch.settlement].filter(Boolean).join(", ");
  const full = branch.branchQualifier ? `${branch.displayName}, ${branch.branchQualifier}` : branch.displayName;
  const facts = [
    ...(branch.emergency === "yes" ? [{ name: "Emergency department", status: "checked_against_source" }] : []),
    ...(branch.emergency === "no" ? [{ name: "No emergency department", status: "checked_against_source" }] : []),
    ...(branch.accredited ? [{ name: "Current accreditation", status: "checked_against_source" }] : []),
    ...branch.serviceChips,
  ];
  return (
    <article className="card-link flex h-full flex-col gap-5 p-4 sm:p-5 lg:flex-row">
      <div className="flex min-w-0 flex-1 gap-4">
        <InitialsTile name={branch.displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <H className="display text-xl leading-snug font-bold [overflow-wrap:anywhere]">
            <Link href={href} className="text-ink no-underline hover:text-teal">
              {branch.displayName}
            </Link>
          </H>
          {branch.branchQualifier ? <p className="font-semibold text-teal-dark">{branch.branchQualifier} branch</p> : null}
          <p className="mt-1 flex items-start gap-1.5">
            <PinIcon className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>
              {place}
              <span className="text-muted">, {branch.state}</span>
            </span>
          </p>
          <p className="meta mt-0.5">
            {[branch.ownership ? titleCaseEnum(branch.ownership) : null, titleCaseEnum(branch.facilityType)].filter(Boolean).join(", ")}
          </p>

          {facts.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Sourced facts about this branch">
              {facts.map((c) => (
                <FactChip key={`${c.name}-${c.status}`} text={c.name} status={c.status} />
              ))}
            </ul>
          ) : null}
          {branch.lastCheckedAt ? <p className="meta mt-3">Facts last checked {formatDate(branch.lastCheckedAt)}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4 lg:w-64 lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        <div>
          {rating ? (
            <>
              <p className="flex items-baseline gap-1.5">
                <span className="display flex items-center gap-1 text-3xl leading-none font-extrabold">
                  <StarIcon className="size-5 text-star" />
                  {rating}
                </span>
                <span className="meta">out of 5</span>
              </p>
              <p className="meta mt-1">
                {branch.nativeReviewCount} patient {branch.nativeReviewCount === 1 ? "review" : "reviews"}, visit evidence checked
              </p>
            </>
          ) : (
            <p className="meta">No patient reviews yet. Ratings from other sites are never mixed in.</p>
          )}
          {branch.sourceLinks.map((l) => (
            // CARD-02 / EXT-01: a plain outbound link; no external score is copied on-site.
            <a key={l.code} href={l.url} rel="noopener nofollow" className="link mr-4 inline-flex min-h-11 items-center gap-1 text-sm">
              Reviews on {l.provider}
              <span className="sr-only"> (external site)</span>
              <ExternalIcon />
            </a>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 lg:flex-col">
          <Link href={href} className="btn-primary flex-1 lg:flex-none">
            View hospital<span className="sr-only">: {full}</span>
          </Link>
          <div className="flex flex-1 gap-2 lg:flex-none">
            {branch.phone ? (
              <a href={`tel:${branch.phone}`} className="btn-quiet flex-1 px-3">
                <PhoneIcon className="size-4" />
                Call<span className="sr-only"> hospital</span>
              </a>
            ) : null}
            {branch.directions ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${branch.directions.lat},${branch.directions.lng}`}
                rel="noopener nofollow"
                className="btn-quiet flex-1 px-3"
              >
                <RouteIcon className="size-4" />
                Directions<span className="sr-only"> (opens Google Maps)</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
