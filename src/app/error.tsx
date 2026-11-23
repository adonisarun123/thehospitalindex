"use client";

import Link from "next/link";

/** SRH-07: a failed request is not "no matches". Offer retry and keep a route home (UX-07). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-3xl py-10">
      <h1 className="text-3xl font-bold">The directory could not load this page</h1>
      <p className="mt-3">This is a problem on our side, not a sign that there are no hospitals here. Your filters are still in the address bar.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-quiet">
          Go to home
        </Link>
      </div>
    </div>
  );
}
