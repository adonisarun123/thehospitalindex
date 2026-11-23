import Link from "next/link";
import { Mark, MenuIcon, SearchIcon } from "@/components/icons";
import { SITE_NAME } from "@/lib/env";

const NAV = [
  ["/hospitals", "Browse by state"],
  ["/specialties", "Specialties"],
  ["/how-reviews-work", "How reviews work"],
] as const;

/** UX-01: the wordmark leads home; search stays reachable on every screen. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="wrap flex h-16 items-center gap-2 sm:gap-3">
        <Link href="/" className="flex min-h-11 items-center gap-1.5 text-ink no-underline sm:gap-2">
          <Mark className="size-7 shrink-0 text-teal sm:size-8" />
          <span className="display text-base font-bold whitespace-nowrap sm:text-lg">{SITE_NAME}</span>
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-ink hover:bg-teal-tint hover:text-teal-dark">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* A plain GET form: works without JavaScript and lands on the full search page. */}
        <form action="/search" method="get" role="search" aria-label="Quick search" className="ml-auto hidden w-full max-w-xs md:block">
          <label htmlFor="header-q" className="sr-only">
            Search hospitals, specialties or services
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input id="header-q" name="q" type="search" placeholder="Search hospitals or services" className="min-h-11 w-full rounded-full border border-line bg-canvas pr-4 pl-10 text-base placeholder:text-muted" />
          </div>
        </form>

        <Link href="/search" className="btn-quiet ml-auto px-3 md:hidden" aria-label="Search">
          <SearchIcon />
        </Link>
        <details className="group relative lg:hidden">
          <summary className="btn-quiet cursor-pointer list-none px-3 [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <MenuIcon />
          </summary>
          <nav aria-label="Menu" className="card absolute top-full right-0 mt-2 w-64 p-2 shadow-(--shadow-lift)">
            <ul>
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-11 items-center rounded-lg px-3 font-medium text-ink hover:bg-teal-tint">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
