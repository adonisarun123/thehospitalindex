import type { Metadata, Viewport } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { Mark } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME, SITE_URL } from "@/lib/env";

/** Google Tag Manager container. GA4 and any other tags are configured inside GTM. */
const GTM_ID = "GTM-WKD9K9PC";

/** SRS §06: Inter is served locally (OFL licence in src/fonts). */
const inter = localFont({
  src: [
    { path: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/inter-latin-ext-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const display = localFont({
  src: [{ path: "../fonts/bricolage-grotesque-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-display-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Find a hospital branch in India`, template: `%s | ${SITE_NAME}` },
  description:
    "A directory of physical hospital branches across India. Check the services a branch offers, see where each fact came from, and read patient experiences.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: `${SITE_NAME} Blog` }] } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#075f59", width: "device-width", initialScale: 1 };

const FOOTER = [
  {
    title: "Find care",
    links: [
      ["/hospitals", "Browse by state"],
      ["/specialties", "Specialties"],
      ["/search", "Search hospitals"],
      ["/blog", "Patient guides"],
      ["/glossary", "Glossary"],
    ],
  },
  {
    title: "How it works",
    links: [
      ["/how-reviews-work", "How reviews work"],
      ["/sources", "Sources and sorting"],
      ["/coverage", "Directory coverage"],
      ["/about", "About us"],
      ["/editorial-policy", "Editorial policy"],
    ],
  },
  {
    title: "Help",
    links: [
      ["/faq", "FAQ"],
      ["/corrections", "Suggest a correction"],
      ["/privacy", "Privacy"],
      ["/grievance", "Grievances"],
      ["/medical-disclaimer", "Medical disclaimer"],
    ],
  },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <GoogleTagManager gtmId={GTM_ID} />
      <body className="flex min-h-full flex-col font-sans">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="mt-16 bg-ink-deep text-white">
          <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <p className="flex items-center gap-2">
                <Mark className="text-mint" />
                <span className="display text-lg font-bold">{SITE_NAME}</span>
              </p>
              <p className="mt-3 max-w-sm text-sm text-white/80">
                Facts about hospital branches and the experiences of patients. No medical advice, no outcome rankings and no insurance
                decisions. In an emergency, call your local emergency number.
              </p>
            </div>
            {FOOTER.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="font-semibold">{col.title}</h2>
                <ul className="mt-2">
                  {col.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="inline-flex min-h-11 items-center text-white/85 underline-offset-4 hover:text-white hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </footer>
      </body>
    </html>
  );
}
