import Link from "next/link";
import { SearchBox } from "@/components/search-box";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <h1 className="text-3xl font-bold">We could not find that page</h1>
      <p className="mt-3">The address may be mistyped, or the listing may have been removed. Try a search, or browse from a state.</p>
      <div className="mt-6">
        <SearchBox />
      </div>
      <ul className="mt-6 flex flex-wrap gap-x-6">
        <li>
          <Link href="/" className="link inline-flex min-h-11 items-center">
            Home
          </Link>
        </li>
        <li>
          <Link href="/hospitals" className="link inline-flex min-h-11 items-center">
            Browse by state or union territory
          </Link>
        </li>
      </ul>
    </div>
  );
}
