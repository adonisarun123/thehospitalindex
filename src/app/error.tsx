"use client";

import Link from "next/link";

/** SRH-07: a failed request is not "no matches". Offer retry and keep a route home (UX-07). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap py-10"><div role="alert" className="max-w-3xl">
      <h1 className="h-page">The directory could not load this page</h1>
      <p className="mt-3">This is a problem on our side, not a sign that there are no hospitals here. Your filters are still in the address bar.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-quiet">
          Go to home
        </Link>
      </div>
    </div></div>
  );
}
