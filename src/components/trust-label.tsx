import Link from "next/link";
import { TRUST_LABEL, type PublicFactStatus } from "@/lib/policy";

/**
 * PRD-03: the trust labels stay visually and textually distinct, each with a
 * plain-language explanation one tap away. Status is carried by text and a
 * glyph, never by colour alone (§06).
 */
export function TrustLabel({ status, checkedAt }: { status: string; checkedAt?: string | Date | null }) {
  const label = TRUST_LABEL[status as PublicFactStatus];
  if (!label) return null;
  const checked = status === "checked_against_source";
  return (
    <span className="meta inline-flex flex-wrap items-center gap-x-1.5">
      <Link
        href={checked ? "/sources#checked-against-source" : "/sources#hospital-supplied"}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium no-underline ${
          checked ? "bg-teal-tint text-teal-dark" : "bg-amber-tint text-amber-ink"
        }`}
      >
        <span aria-hidden="true">{checked ? "✓" : "◦"}</span>
        {label}
      </Link>
      {checkedAt ? <span>· {checked ? "checked" : "received"} {formatDate(checkedAt)}</span> : null}
    </span>
  );
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}
