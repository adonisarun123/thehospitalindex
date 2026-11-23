import Link from "next/link";
import type { BranchCard as Card } from "@/lib/queries/branches";
import { displayRating } from "@/lib/gates";
import { titleCaseEnum } from "@/lib/text";
import { urls } from "@/lib/urls";

/**
 * CARD-01 order: linked branch name → locality and city → ownership/type →
 * up to three sourced service chips → native rating or its empty state → View hospital.
 */
export function BranchCard({ branch, headingLevel = "h2" }: { branch: Card; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const href = urls.branch(branch.slug, branch.publicId);
  const rating = displayRating(branch.nativeRatingSum, branch.nativeReviewCount);
  const place = [branch.locality, branch.settlement].filter(Boolean).join(", ");
  return (
    <article className="card flex h-full flex-col p-4">
      <H className="text-lg leading-snug font-semibold [overflow-wrap:anywhere]">
        <Link href={href} className="text-ink hover:text-teal">
          {branch.displayName}
          {branch.branchQualifier ? <span className="font-normal">, {branch.branchQualifier}</span> : null}
        </Link>
      </H>
      <p className="mt-1">
        {place}
        <span className="meta">, {branch.state}</span>
      </p>
      <p className="meta mt-0.5">
        {[branch.ownership ? titleCaseEnum(branch.ownership) : null, titleCaseEnum(branch.facilityType)]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {branch.serviceChips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Services at this branch">
          {branch.serviceChips.map((c) => (
            <li key={c.name} className="chip">
              {c.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3">
        {rating ? (
          <p>
            <span className="font-semibold">
              <span aria-hidden="true">★ </span>
              {rating}
            </span>
            <span className="sr-only"> out of 5</span>{" "}
            <span className="meta">
              from {branch.nativeReviewCount} patient {branch.nativeReviewCount === 1 ? "review" : "reviews"} · Visit
              evidence checked
            </span>
          </p>
        ) : (
          <p className="meta">No patient reviews yet</p>
        )}
        {branch.sourceLinks.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-x-4">
            {branch.sourceLinks.map((l) => (
              <li key={l.code}>
                {/* CARD-02 / EXT-01: a plain outbound link; no external score is copied on-site. */}
                <a href={l.url} rel="noopener nofollow" className="link inline-flex min-h-11 items-center text-sm">
                  Reviews on {l.provider}
                  <span className="sr-only"> (external site)</span>
                  <span aria-hidden="true"> ↗</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Link href={href} className="btn-primary">
          View hospital<span className="sr-only">: {branch.displayName}{branch.branchQualifier ? `, ${branch.branchQualifier}` : ""}</span>
        </Link>
        {branch.phone ? (
          <a href={`tel:${branch.phone}`} className="btn-quiet">
            Call hospital
          </a>
        ) : null}
        {branch.directions ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${branch.directions.lat},${branch.directions.lng}`}
            rel="noopener nofollow"
            className="btn-quiet"
          >
            Directions<span className="sr-only"> (opens Google Maps)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
