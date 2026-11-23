import "server-only";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import type { BranchCard } from "@/lib/queries/branches";
import type { BranchCore, BranchProfile } from "@/lib/queries/profile";
import type { Crumb } from "@/components/breadcrumbs";
import { titleCaseEnum } from "@/lib/text";
import { urls } from "@/lib/urls";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * General hours (else OPD hours) as shown on the profile. 0 = Monday, matching
 * the page. A day recorded as closed is emitted as 00:00–00:00, schema.org's
 * convention for "closed"; a 24-hour day as 00:00–23:59.
 */
function openingHours(p: BranchProfile) {
  const pick = (purpose: string) => p.hours.filter((h) => h.purpose === purpose && h.weekday >= 0 && h.weekday <= 6);
  const rows = pick("general").length ? pick("general") : pick("opd");
  return rows.flatMap((h) => {
    const day = `https://schema.org/${DAYS[h.weekday]}`;
    if (h.isClosed) return [{ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: "00:00", closes: "00:00" }];
    if (h.is24h) return [{ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: "00:00", closes: "23:59" }];
    if (!h.opens || !h.closes) return [];
    return [{ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: h.opens.slice(0, 5), closes: h.closes.slice(0, 5) }];
  });
}

export const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;

export function breadcrumbLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const LANG = "en-IN";

/** A self-contained publisher node, for pages where crawlers may not resolve an @id defined elsewhere. */
export function publisherRef() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: abs("/apple-icon.png"), width: 180, height: 180 },
  };
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    ...publisherRef(),
    description:
      "A directory of physical hospital branches across India, with sourced, dated facts and patient reviews checked against visit evidence.",
    areaServed: { "@type": "Country", name: "India" },
    knowsAbout: ["Hospitals in India", "Hospital accreditation", "Health insurance claims", "Patients' rights"],
    publishingPrinciples: abs("/editorial-policy"),
    ethicsPolicy: abs("/editorial-policy"),
    correctionsPolicy: abs("/editorial-policy#corrections"),
    actionableFeedbackPolicy: abs("/corrections"),
  };
}

/** SearchAction mirrors the site's own GET search form, so the template is a real, working URL. */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: LANG,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function publisherLd() {
  return [organizationLd(), websiteLd()];
}

type PageType = "WebPage" | "AboutPage" | "FAQPage" | "CollectionPage" | "ContactPage";

/** The page node for static and editorial pages. `extra` carries type-specific properties such as FAQ mainEntity. */
export function webPageLd(opts: {
  type?: PageType;
  name: string;
  description: string;
  path: string;
  dateModified?: string;
  about?: unknown;
  extra?: Record<string, unknown>;
}) {
  const url = abs(opts.path);
  return {
    "@context": "https://schema.org",
    "@type": opts.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    inLanguage: LANG,
    isPartOf: { "@type": "WebSite", "@id": SITE_ID, name: SITE_NAME, url: SITE_URL },
    publisher: publisherRef(),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    ...(opts.about ? { about: opts.about } : {}),
    ...(opts.extra ?? {}),
  };
}

export const faqEntities = (items: { q: string; a: string }[]) =>
  items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }));

/** A standalone FAQPage node: used where the page's visible content is a question-and-answer list. */
export function faqLd(path: string, items: { q: string; a: string }[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", "@id": `${abs(path)}#faq`, url: abs(path), mainEntity: faqEntities(items) };
}

export function articleLd(opts: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  section: string;
  keywords: string[];
  wordCount: number;
  image: string;
  citations: { title: string; publisher: string; url: string }[];
}) {
  const url = abs(opts.path);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: opts.headline,
    description: opts.description,
    image: [abs(opts.image)],
    datePublished: `${opts.datePublished}T00:00:00+05:30`,
    dateModified: `${opts.dateModified}T00:00:00+05:30`,
    inLanguage: LANG,
    articleSection: opts.section,
    keywords: opts.keywords.join(", "),
    wordCount: opts.wordCount,
    isAccessibleForFree: true,
    isPartOf: { "@type": "Blog", "@id": `${SITE_URL}/blog#blog`, name: `${SITE_NAME} Blog`, url: abs("/blog") },
    author: { "@type": "Organization", "@id": ORG_ID, name: `${SITE_NAME} editorial team`, url: abs("/about") },
    publisher: publisherRef(),
    ...(opts.citations.length
      ? {
          citation: opts.citations.map((c) => ({
            "@type": "CreativeWork",
            name: c.title,
            url: c.url,
            publisher: { "@type": "Organization", name: c.publisher },
          })),
        }
      : {}),
  };
}

export function blogLd(items: { path: string; headline: string; datePublished: string; dateModified: string; description: string }[]) {
  const url = abs("/blog");
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    url,
    name: `${SITE_NAME} Blog`,
    description: "Practical, sourced guides for patients and families using hospitals in India.",
    inLanguage: LANG,
    publisher: publisherRef(),
    blogPost: items.map((p) => ({
      "@type": "BlogPosting",
      "@id": `${abs(p.path)}#article`,
      url: abs(p.path),
      headline: p.headline,
      description: p.description,
      datePublished: `${p.datePublished}T00:00:00+05:30`,
      dateModified: `${p.dateModified}T00:00:00+05:30`,
    })),
  };
}

export function definedTermSetLd(path: string, name: string, terms: { id: string; term: string; alt?: string; definition: string }[]) {
  const url = abs(path);
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${url}#terms`,
    url,
    name,
    inLanguage: LANG,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${url}#${t.id}`,
      url: `${url}#${t.id}`,
      name: t.term,
      ...(t.alt ? { alternateName: t.alt } : {}),
      description: t.definition,
      inDefinedTermSet: `${url}#terms`,
    })),
  };
}

/** SCH-02: an ItemList that mirrors the visible order. No page-wide AggregateRating on listings. */
export function collectionLd(opts: { name: string; url: string; items: BranchCard[]; offset: number }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    url: abs(opts.url),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((b, i) => ({
        "@type": "ListItem",
        position: opts.offset + i + 1,
        url: abs(urls.branch(b.slug, b.publicId)),
        name: b.branchQualifier ? `${b.displayName}, ${b.branchQualifier}` : b.displayName,
      })),
    },
  };
}

/**
 * SCH-01 / SCH-03. Emits only properties that are accurate and visible on
 * the page. aggregateRating comes solely from native, published reviews of
 * this exact branch and is omitted entirely when there are none.
 */
export function hospitalLd(b: BranchCore, p: BranchProfile) {
  const url = abs(urls.branch(b.slug, b.publicId));
  const phone = p.contacts.find((c) => c.status === "checked_against_source" && ["switchboard", "opd", "admissions"].includes(c.role));
  const website = p.contacts.find((c) => c.status === "checked_against_source" && c.role === "website");
  const street = [b.addressLine1, b.addressLine2].filter(Boolean).join(", ");
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Hospital",
    "@id": `${url}#hospital`,
    name: b.branchQualifier ? `${b.displayName}, ${b.branchQualifier}` : b.displayName,
    url,
    address: {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      addressLocality: b.settlement.name,
      addressRegion: b.state.name,
      ...(b.pincode ? { postalCode: b.pincode } : {}),
      addressCountry: "IN",
    },
  };
  ld.mainEntityOfPage = url;
  ld.isAccessibleForFree = true;
  if (b.legalName && b.legalName !== b.displayName) ld.alternateName = b.legalName;
  if (b.overview) ld.description = b.overview;
  if (b.orgName) ld.parentOrganization = { "@type": "Organization", name: b.orgName };
  if (phone) ld.telephone = phone.value;
  const email = p.contacts.find((c) => c.status === "checked_against_source" && c.role === "email");
  if (email) ld.email = email.value;
  if (website) ld.sameAs = [website.value];
  if (b.lat !== null && b.lng !== null && ["rooftop", "street"].includes(b.coordPrecision)) {
    ld.geo = { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng };
    ld.hasMap = `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`;
  }
  const hours = openingHours(p);
  if (hours.length) ld.openingHoursSpecification = hours;
  const features = p.amenities
    .filter((a) => a.state === "yes" || a.state === "no")
    .map((a) => ({ "@type": "LocationFeatureSpecification", name: titleCaseEnum(a.code), value: a.state === "yes" }));
  if (features.length) ld.amenityFeature = features;
  const specialties = p.offerings.filter((o) => o.kind === "specialty").map((o) => o.name);
  if (specialties.length) ld.medicalSpecialty = [...new Set(specialties)];
  if (b.reviewCount > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round((b.ratingSum / b.reviewCount) * 10) / 10,
      reviewCount: b.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return ld;
}
