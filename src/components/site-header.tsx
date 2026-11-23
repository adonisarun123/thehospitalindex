import Link from "next/link";
import { SITE_NAME } from "@/lib/env";

/** UX-01: the wordmark leads home; search and location stay reachable on every screen. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center text-base font-bold tracking-tight whitespace-nowrap text-ink no-underline sm:text-lg">
          {SITE_NAME}
        </Link>
        <nav aria-label="Primary" className="ml-auto">
          <ul className="flex items-center gap-1 sm:gap-2">
            <li>
              <Link href="/hospitals" className="inline-flex min-h-11 items-center px-2 font-medium text-ink hover:text-teal sm:px-3">
                <span className="sm:hidden">States</span>
                <span className="hidden sm:inline">Browse by state</span>
              </Link>
            </li>
            <li className="hidden sm:block">
              <Link href="/specialties" className="inline-flex min-h-11 items-center px-2 font-medium text-ink hover:text-teal sm:px-3">
                Specialties
              </Link>
            </li>
            <li>
              <Link href="/search" className="btn-quiet px-3 sm:px-4">
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
