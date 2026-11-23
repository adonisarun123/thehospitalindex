import Link from "next/link";

/** A trust page whose content needs an owner's sign-off before launch. Served noindex until then. */
export function PendingPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap py-8"><div className="prose-page max-w-3xl">
      <h1 className="h-page">{title}</h1>
      <div className="mt-4">{children}</div>
      <p>
        <Link href="/" className="link">
          Back to home
        </Link>
      </p>
    </div></div>
  );
}
