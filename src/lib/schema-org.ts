import "server-only";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import type { BranchCard } from "@/lib/queries/branches";
import type { BranchCore, BranchProfile } from "@/lib/queries/profile";
import type { Crumb } from "@/components/breadcrumbs";
import { urls } from "@/lib/urls";

export const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;

export function breadcrumbLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

export function publisherLd() {
  return [
    { "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];
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
  if (phone) ld.telephone = phone.value;
  if (website) ld.sameAs = [website.value];
  if (b.lat !== null && b.lng !== null && ["rooftop", "street"].includes(b.coordPrecision))
    ld.geo = { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng };
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
