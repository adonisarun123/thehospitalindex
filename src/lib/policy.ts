/**
 * Numeric thresholds from the SRS. The SRS calls every one of these a
 * "planning default", so they live in one place and are meant to be tuned.
 */
export const POLICY = {
  /** SRH-06 */
  pageSize: 20,
  maxApiPageSize: 50,
  /** SRH-02 */
  typeaheadMinChars: 2,
  /** SRH-05: minimum active native reviews before a branch joins the rating sort. */
  ratingSortMinReviews: 5,
  /** DATA-03 refresh targets, in days. Overdue claims lose affirmative filter eligibility. */
  refreshDays: { emergency: 30, hours: 90, clinicians: 90, payers: 90, coreContact: 90, descriptive: 180 },
  /** SEO-01 index thresholds: editorial defaults, not search-engine rules. */
  index: { geoHubMinBranches: 3, taxonomyHubMinBranches: 5 },
  /** CARD-01 */
  cardServiceChips: 3,
  /** §04 comparison (P1) */
  compareMax: 3,
} as const;

/** Statuses a fact must have before it is shown publicly, and its PRD-03 label. */
export const PUBLIC_FACT_STATUSES = ["hospital_supplied", "checked_against_source"] as const;
export type PublicFactStatus = (typeof PUBLIC_FACT_STATUSES)[number];

export const TRUST_LABEL: Record<PublicFactStatus, string> = {
  hospital_supplied: "Hospital supplied",
  checked_against_source: "Checked against source",
};
export const VISIT_LABEL = "Visit evidence checked";
