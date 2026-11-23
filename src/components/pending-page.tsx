import Link from "next/link";

/** A trust page whose content needs an owner's sign-off before launch. Served noindex until then. */
export function PendingPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="prose-page mx-auto max-w-3xl">
      <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">{title}</h1>
      <div className="mt-4">{children}</div>
      <p>
        <Link href="/" className="link">
          Back to home
        </Link>
      </p>
    </div>
  );
}
