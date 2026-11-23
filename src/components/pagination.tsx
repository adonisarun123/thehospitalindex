import Link from "next/link";
import { withPage } from "@/lib/urls";

/** SRH-06 / §22: numbered, crawlable anchors; page 1 is the base URL. */
export function Pagination({ base, query, page, pageCount }: { base: string; query: URLSearchParams; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const ordered = [...pages].sort((a, b) => a - b);
  return (
    <nav aria-label="Result pages" className="mt-6">
      <ul className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <li>
            <Link href={withPage(base, query, page - 1)} rel="prev" className="btn-quiet">
              Previous
            </Link>
          </li>
        ) : null}
        {ordered.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - ordered[i - 1] > 1 ? <span aria-hidden="true">…</span> : null}
            {p === page ? (
              <span aria-current="page" className="btn bg-ink text-white">
                <span className="sr-only">Page </span>
                {p}
              </span>
            ) : (
              <Link href={withPage(base, query, p)} className="btn-quiet">
                <span className="sr-only">Page </span>
                {p}
              </Link>
            )}
          </li>
        ))}
        {page < pageCount ? (
          <li>
            <Link href={withPage(base, query, page + 1)} rel="next" className="btn-quiet">
              Next
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
