import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME, SITE_URL } from "@/lib/env";

/** SRS §06: Inter is served locally (OFL licence in src/fonts). */
const inter = localFont({
  src: [
    { path: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/inter-latin-ext-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Find a hospital branch in India`, template: `%s | ${SITE_NAME}` },
  description:
    "A directory of physical hospital branches across India. Check the services a branch offers, see where each fact came from, and read patient experiences.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_IN" },
};

export const viewport: Viewport = { themeColor: "#075f59", width: "device-width", initialScale: 1 };

const FOOTER_LINKS = [
  ["/how-reviews-work", "How reviews work"],
  ["/sources", "Sources and sorting"],
  ["/coverage", "Directory coverage"],
  ["/corrections", "Suggest a correction"],
  ["/privacy", "Privacy"],
  ["/grievance", "Grievances"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mt-12 border-t border-line bg-surface">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <nav aria-label="About this directory">
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {FOOTER_LINKS.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="link inline-flex min-h-11 items-center">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="meta mt-4 max-w-3xl">
              {SITE_NAME} lists facts about hospital branches and the experiences of patients. It does not give
              medical advice, rank clinical outcomes or decide insurance eligibility. In an emergency, call your local
              emergency number.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
