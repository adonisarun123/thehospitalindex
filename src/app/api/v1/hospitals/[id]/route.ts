import { handler, notFound, ok } from "@/lib/api/respond";
import { displayRating } from "@/lib/gates";
import { getBranchCore, getBranchProfile } from "@/lib/queries/profile";
import { urls } from "@/lib/urls";

/** §27 GET /hospitals/{id}: the public branch projection, addressed by its stable public id. */
export const GET = handler(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{6,12}$/.test(id)) return notFound(req, "Unknown hospital.");
  const b = await getBranchCore(id);
  if (!b) return notFound(req, "Unknown hospital.");
  const p = await getBranchProfile(b.id);
  const rating = displayRating(b.ratingSum, b.reviewCount);
  return ok(req, {
    publicId: b.publicId,
    path: urls.branch(b.slug, b.publicId),
    displayName: b.displayName,
    branchQualifier: b.branchQualifier,
    facilityType: b.facilityType,
    ownership: b.ownership,
    status: b.status,
    network: b.orgName,
    location: {
      state: b.state.name,
      district: b.district?.name ?? null,
      settlement: b.settlement.name,
      locality: b.locality?.name ?? null,
      addressLine1: b.addressLine1,
      addressLine2: b.addressLine2,
      landmark: b.landmark,
      pincode: b.pincode,
      coordinates: b.lat !== null && b.lng !== null ? { lat: b.lat, lng: b.lng, precision: b.coordPrecision } : null,
    },
    emergency: { hasEmergencyDepartment: b.hasEmergency, open24Hours: b.emergency24h, lastConfirmedAt: b.emergencyCheckedAt, isCurrent: b.emergencyIsCurrent },
    overview: b.overview,
    lastCheckedAt: b.lastCheckedAt,
    offerings: p.offerings,
    contacts: b.status === "published" ? p.contacts : [],
    hours: p.hours,
    capacity: p.capacity,
    amenities: p.amenities,
    payers: p.payers,
    credentials: p.credentials,
    nativeReviews: { kind: "native" as const, rating: rating === null ? null : Number(rating), count: b.reviewCount, histogram: b.histogram },
    externalSources: p.sourceLinks.map((l) => ({ kind: "external_link" as const, provider: l.provider, url: l.url })),
    sources: p.sources,
  });
});
