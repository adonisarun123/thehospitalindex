import Link from "next/link";

export type Crumb = { name: string; href: string };

/** NAV-01: breadcrumbs follow the primary geographic path. The last crumb is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="meta flex flex-wrap items-center gap-x-1">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-x-1">
              {last ? (
                <span aria-current="page" className="py-2 font-medium text-ink">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.href} className="link py-2">
                    {c.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
