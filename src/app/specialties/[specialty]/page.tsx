import Link from "next/link";
import { POLICY } from "@/lib/policy";
import { citiesForTaxon, getHubStats } from "@/lib/queries/related";
import { countIndexable, getTaxonBySlug, hasApprovedHubContent } from "@/lib/queries/branches";
import { isSlug } from "@/lib/routes/geo";
import { buildListingRoute } from "@/lib/routes/listing-route";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

const route = buildListingRoute<{ specialty: string }>(async ({ specialty: slug }) => {
  if (!isSlug(slug)) return { kind: "missing" };
  const taxon = await getTaxonBySlug("specialty", slug);
  if (!taxon) return { kind: "missing" };
  const [indexable, content, stats, cities] = await Promise.all([
    countIndexable({ specialtyIds: [taxon.id] }),
    hasApprovedHubContent({ specialtyId: taxon.id }),
    getHubStats({ specialtyId: taxon.id }),
    citiesForTaxon("specialty", taxon.id),
  ]);
  const basePath = urls.specialty(taxon.slug);
  return {
    kind: "ok",
    d: {
      basePath,
      heading: `${taxon.name} hospitals in India`,
      title: `${taxon.name} Hospitals in India`,
      description: (total) =>
        `${total} hospital ${total === 1 ? "branch" : "branches"} across India with a published ${taxon.name.toLowerCase()} department.`,
      crumbs: [
        { name: "Specialties", href: urls.specialties() },
        { name: taxon.name, href: basePath },
      ],
      input: { lockedSpecialtyId: taxon.id },
      hub: {
        indexableBranches: indexable,
        minBranches: POLICY.index.taxonomyHubMinBranches,
        context: content ? { text: content.guidance, reviewedAt: content.reviewedAt, owner: content.editorialOwner } : null,
        summary: { stats, place: "India", subject: `${taxon.name.toLowerCase()} hospital branches` },
      },
      showFilters: { specialty: false, locality: false },
      fallbackLinks: [{ href: urls.country(), label: "Browse by state" }],
      extras: cities.length ? (
        <nav aria-labelledby="spec-cities-h" className="mt-10">
          <h2 id="spec-cities-h" className="text-lg font-semibold">
            {taxon.name} hospitals by city
          </h2>
          <ul className="mt-2 columns-1 gap-6 sm:columns-2 lg:columns-3">
            {cities.map((c) => (
              <li key={`${c.stateSlug}-${c.slug}`}>
                <Link href={urls.citySpecialty(c.stateSlug, c.slug, taxon.slug)} className="link inline-flex min-h-11 items-center">
                  {taxon.name} hospitals in {c.name}
                </Link>{" "}
                <span className="meta">({c.published})</span>
              </li>
            ))}
          </ul>
        </nav>
      ) : null,
    },
  };
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
