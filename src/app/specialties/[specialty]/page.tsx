import { POLICY } from "@/lib/policy";
import { countIndexable, getTaxonBySlug, hasApprovedHubContent } from "@/lib/queries/branches";
import { isSlug } from "@/lib/routes/geo";
import { buildListingRoute } from "@/lib/routes/listing-route";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

const route = buildListingRoute<{ specialty: string }>(async ({ specialty: slug }) => {
  if (!isSlug(slug)) return { kind: "missing" };
  const taxon = await getTaxonBySlug("specialty", slug);
  if (!taxon) return { kind: "missing" };
  const [indexable, content] = await Promise.all([
    countIndexable({ specialtyIds: [taxon.id] }),
    hasApprovedHubContent({ specialtyId: taxon.id }),
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
      },
      showFilters: { specialty: false, locality: false },
      fallbackLinks: [{ href: urls.country(), label: "Browse by state" }],
    },
  };
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
