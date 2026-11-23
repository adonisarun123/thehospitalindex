import "server-only";
import { displayRating } from "@/lib/gates";
import type { BranchCard } from "@/lib/queries/branches";
import { urls } from "@/lib/urls";

/**
 * §28 reference result contract for a hospital card. An explicit allow-list:
 * a new database column never reaches the API unless it is added here.
 * External scores have no field at all on this public DTO.
 */
export function cardDto(b: BranchCard) {
  const rating = displayRating(b.nativeRatingSum, b.nativeReviewCount);
  return {
    publicId: b.publicId,
    displayName: b.displayName,
    branchQualifier: b.branchQualifier,
    facilityType: b.facilityType,
    ownership: b.ownership,
    locality: b.locality,
    settlement: b.settlement,
    state: b.state,
    path: urls.branch(b.slug, b.publicId),
    media: [] as never[],
    serviceChips: b.serviceChips,
    nativeRating: rating === null ? null : Number(rating),
    nativeReviewCount: b.nativeReviewCount,
    sourceLinks: b.sourceLinks.map((l) => ({ kind: "external_link" as const, provider: l.provider, url: l.url })),
    availableActions: {
      call: b.phone ? { tel: b.phone } : null,
      directions: b.directions,
    },
  };
}
