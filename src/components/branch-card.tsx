import Link from "next/link";
import { ExternalIcon, PhoneIcon, PinIcon, RouteIcon, StarIcon } from "@/components/icons";
import type { BranchCard as Card } from "@/lib/queries/branches";
import { displayRating } from "@/lib/gates";
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

/**
 * CARD-01 order: linked branch name → locality and city → ownership/type →
 * up to three sourced service chips → native rating or its empty state → View hospital.
 */
export function BranchCard({ branch, headingLevel = "h2" }: { branch: Card; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const href = urls.branch(branch.slug, branch.publicId);
  const rating = displayRating(branch.nativeRatingSum, branch.nativeReviewCount);
  const place = [branch.locality, branch.settlement].filter(Boolean).join(", ");
  const full = branch.branchQualifier ? `${branch.displayName}, ${branch.branchQualifier}` : branch.displayName;
  return (
    <article className="card-link flex h-full flex-col p-4 sm:p-5">
      <div className="flex gap-3.5">
        <InitialsTile name={branch.displayName} />
        <div className="min-w-0">
          <H className="display text-lg leading-snug font-bold [overflow-wrap:anywhere]">
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
        </div>
      </div>

      {branch.serviceChips.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Services at this branch">
          {branch.serviceChips.map((c) => (
            <li key={c.name} className="chip">
              {c.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {rating ? (
          <p className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-ink px-2 py-0.5 font-bold text-white">
              <StarIcon className="size-4" />
              {rating}
              <span className="sr-only"> out of 5</span>
            </span>
            <span className="meta">
              {branch.nativeReviewCount} patient {branch.nativeReviewCount === 1 ? "review" : "reviews"}, visit evidence checked
            </span>
          </p>
        ) : (
          <p className="meta">No patient reviews yet</p>
        )}
        {branch.sourceLinks.map((l) => (
          // CARD-02 / EXT-01: a plain outbound link; no external score is copied on-site.
          <a key={l.code} href={l.url} rel="noopener nofollow" className="link inline-flex min-h-11 items-center gap-1 text-sm">
            Reviews on {l.provider}
            <span className="sr-only"> (external site)</span>
            <ExternalIcon />
          </a>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
        <Link href={href} className="btn-primary flex-1 sm:flex-none">
          View hospital<span className="sr-only">: {full}</span>
        </Link>
        {branch.phone ? (
          <a href={`tel:${branch.phone}`} className="btn-quiet">
            <PhoneIcon className="size-4" />
            Call<span className="sr-only"> hospital</span>
          </a>
        ) : null}
        {branch.directions ? (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${branch.directions.lat},${branch.directions.lng}`} rel="noopener nofollow" className="btn-quiet">
            <RouteIcon className="size-4" />
            Directions<span className="sr-only"> (opens Google Maps)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
