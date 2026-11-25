/**
 * Publication and indexability gates (SRS DATA-06, SEO-01).
 * Pure functions: the inputs are assembled by lib/derive.ts.
 */

export type BranchFacts = {
  displayName: string | null;
  facilityType: string | null;
  status: string;
  hasState: boolean;
  hasSettlement: boolean;
  /** A locatable address: at least an address line or a postal address string. */
  hasAddress: boolean;
  /** A current-source assertion (`identity.operating_status`) that the branch is operating. */
  hasOperatingEvidence: boolean;
  /** Field assertions backed by a source whose rights are current. */
  evidencedAssertions: number;
  /** Public, unsuppressed contact routes with status `checked_against_source`. */
  checkedContactRoutes: number;
  /** Current offerings with a public status AND a recorded source. */
  sourcedOfferings: number;
  hasOverview: boolean;
  hasHours: boolean;
  hasPhone: boolean;
  hasCoords: boolean;
  amenities: number;
  payers: number;
  credentials: number;
  capacity: number;
};

export type GateResult = { pass: boolean; missing: string[] };

/** DATA-06: core identity, geography, operating status, an evidence source and one checked contact route. */
export function publicationGate(f: BranchFacts): GateResult {
  const missing: string[] = [];
  if (!f.displayName?.trim()) missing.push("identity.display_name");
  if (!f.facilityType) missing.push("identity.facility_type");
  if (!f.hasState) missing.push("geography.state");
  if (!f.hasSettlement) missing.push("geography.settlement");
  if (!f.hasAddress) missing.push("geography.address");
  if (!f.hasOperatingEvidence) missing.push("identity.operating_status");
  if (f.evidencedAssertions < 1) missing.push("evidence.authorised_source");
  if (f.checkedContactRoutes < 1) missing.push("contact.checked_route");
  return { pass: missing.length === 0, missing };
}

const enrichmentGroups = (f: BranchFacts) =>
  [f.hasHours, f.hasPhone, f.amenities > 0, f.payers > 0, f.credentials > 0, f.capacity > 0].filter(Boolean).length;

/**
 * SEO-01: the publication gate, plus a substantiated department/service,
 * plus "useful original facts" — read here as an overview or at least two
 * enrichment groups. That reading is an editorial default, not an SRS number.
 */
export function indexGate(f: BranchFacts): GateResult {
  const pub = publicationGate(f);
  const missing = [...pub.missing];
  if (f.status !== "published") missing.push("lifecycle.published");
  if (f.sourcedOfferings < 1) missing.push("offering.sourced_service_or_department");
  if (!f.hasOverview && enrichmentGroups(f) < 2) missing.push("content.useful_original_facts");
  return { pass: missing.length === 0, missing };
}

/** 0–100. Drives the default browse order (SRH-04); never shown as a quality score. */
export function completeness(f: BranchFacts): number {
  let score = 0;
  if (publicationGate(f).pass) score += 40;
  if (f.sourcedOfferings > 0) score += 10;
  if (f.sourcedOfferings >= 3) score += 5;
  if (f.hasHours) score += 10;
  if (f.hasPhone) score += 5;
  if (f.hasCoords) score += 5;
  if (f.hasOverview) score += 5;
  if (f.amenities > 0) score += 5;
  if (f.payers > 0) score += 5;
  if (f.credentials > 0) score += 5;
  if (f.capacity > 0) score += 5;
  return score;
}

/** SEO-01 hub thresholds. */
export function hubIsIndexable(opts: { indexableBranches: number; minBranches: number; hasReviewedContext: boolean }) {
  return opts.indexableBranches >= opts.minBranches && opts.hasReviewedContext;
}

/** MOD-03: average of integer ratings, rounded only for display. */
export function displayRating(sum: number, count: number): string | null {
  if (count <= 0) return null;
  return (Math.round((sum / count) * 10) / 10).toFixed(1);
}
