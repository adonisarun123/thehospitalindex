import { POLICY } from "@/lib/policy";
import { countsFor } from "@/lib/queries/geo";
import { resolveChild, resolveState } from "@/lib/routes/geo";
import { buildListingRoute } from "@/lib/routes/listing-route";
import { urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

/** GEO-04: district browse is how rural branches are discovered. Cards keep each branch's true settlement. */
const route = buildListingRoute<{ state: string; district: string }>(async ({ state: stateSlug, district: slug }) => {
  const s = await resolveState(stateSlug);
  if (!s) return { kind: "missing" };
  if ("redirectStateSlug" in s) return { kind: "redirect", to: urls.district(s.redirectStateSlug, slug) };
  const d = await resolveChild("district", s.state.id, slug);
  if (!d) return { kind: "missing" };
  if ("redirectSlug" in d) return { kind: "redirect", to: urls.district(s.state.slug, d.redirectSlug) };

  const district = d.geo;
  const counts = await countsFor(district);
  const basePath = urls.district(s.state.slug, district.slug);
  return {
    kind: "ok",
    d: {
      basePath,
      heading: `Hospitals in ${district.name} district`,
      title: `Hospitals in ${district.name} District, ${s.state.name}`,
      description: (total) =>
        `${total} hospital ${total === 1 ? "branch" : "branches"} across the towns and villages of ${district.name} district, ${s.state.name}, each shown with its actual location.`,
      crumbs: [
        { name: "Hospitals in India", href: urls.country() },
        { name: s.state.name, href: urls.state(s.state.slug) },
        { name: `${district.name} district`, href: basePath },
      ],
      input: { scope: { districtId: district.id } },
      hub: {
        indexableBranches: counts.indexable,
        minBranches: POLICY.index.geoHubMinBranches,
        context: district.hasReviewedContext ? { text: district.localContext! } : null,
      },
      fallbackLinks: [{ href: urls.state(s.state.slug), label: `All of ${s.state.name}` }],
    },
  };
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
