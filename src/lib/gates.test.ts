import { describe, expect, it } from "vitest";
import { completeness, displayRating, hubIsIndexable, indexGate, publicationGate, type BranchFacts } from "./gates";

const core: BranchFacts = {
  displayName: "Sampige Community Hospital",
  facilityType: "general_hospital",
  status: "published",
  hasState: true,
  hasSettlement: true,
  hasAddress: true,
  hasOperatingEvidence: true,
  evidencedAssertions: 1,
  checkedContactRoutes: 1,
  sourcedOfferings: 0,
  hasOverview: false,
  hasHours: false,
  hasPhone: false,
  hasCoords: false,
  amenities: 0,
  payers: 0,
  credentials: 0,
  capacity: 0,
};

describe("publication gate (DATA-06)", () => {
  it("passes with core identity, geography, evidence and a checked contact", () => {
    expect(publicationGate(core)).toEqual({ pass: true, missing: [] });
  });
  it("UAT-04: a branch missing core evidence stays unpublished", () => {
    const r = publicationGate({ ...core, evidencedAssertions: 0 });
    expect(r.pass).toBe(false);
    expect(r.missing).toContain("evidence.authorised_source");
  });
  it("needs current evidence that the branch is operating", () => {
    expect(publicationGate({ ...core, hasOperatingEvidence: false }).missing).toEqual(["identity.operating_status"]);
  });
  it("needs a settlement", () => {
    expect(publicationGate({ ...core, hasSettlement: false }).missing).toEqual(["geography.settlement"]);
  });
  it("needs a checked contact route, not just any contact", () => {
    expect(publicationGate({ ...core, checkedContactRoutes: 0 }).missing).toEqual(["contact.checked_route"]);
  });
});

describe("index gate (SEO-01)", () => {
  it("a published branch with no sourced service is public but not indexable", () => {
    const r = indexGate(core);
    expect(r.pass).toBe(false);
    expect(r.missing).toContain("offering.sourced_service_or_department");
  });
  it("passes with a sourced offering and an overview", () => {
    expect(indexGate({ ...core, sourcedOfferings: 1, hasOverview: true }).pass).toBe(true);
  });
  it("passes with a sourced offering and two enrichment groups", () => {
    expect(indexGate({ ...core, sourcedOfferings: 1, hasHours: true, hasPhone: true }).pass).toBe(true);
    expect(indexGate({ ...core, sourcedOfferings: 1, hasHours: true }).pass).toBe(false);
  });
  it("never indexes a branch that is not published", () => {
    expect(indexGate({ ...core, status: "checked", sourcedOfferings: 2, hasOverview: true }).pass).toBe(false);
  });
});

describe("completeness", () => {
  it("is bounded and monotonic", () => {
    expect(completeness({ ...core, evidencedAssertions: 0 })).toBe(0);
    expect(completeness(core)).toBe(40);
    expect(
      completeness({
        ...core,
        sourcedOfferings: 3,
        hasOverview: true,
        hasHours: true,
        hasPhone: true,
        hasCoords: true,
        amenities: 1,
        payers: 1,
        credentials: 1,
        capacity: 1,
      }),
    ).toBe(100);
  });
});

describe("hub thresholds and ratings", () => {
  it("a hub needs both the branch count and reviewed context", () => {
    expect(hubIsIndexable({ indexableBranches: 3, minBranches: 3, hasReviewedContext: true })).toBe(true);
    expect(hubIsIndexable({ indexableBranches: 3, minBranches: 3, hasReviewedContext: false })).toBe(false);
    expect(hubIsIndexable({ indexableBranches: 2, minBranches: 3, hasReviewedContext: true })).toBe(false);
  });
  it("a data summary unlocks a hub only at its own, higher threshold", () => {
    const base = { minBranches: 3, hasReviewedContext: false, hasDataSummary: true, dataSummaryMinBranches: 5 };
    expect(hubIsIndexable({ ...base, indexableBranches: 5 })).toBe(true);
    expect(hubIsIndexable({ ...base, indexableBranches: 4 })).toBe(false);
    expect(hubIsIndexable({ ...base, indexableBranches: 9, hasDataSummary: false })).toBe(false);
    expect(hubIsIndexable({ ...base, indexableBranches: 9, dataSummaryMinBranches: undefined })).toBe(false);
  });
  it("UAT-07: ratings of 4 and 5 display as 4.5 from two; zero reviews has no score", () => {
    expect(displayRating(9, 2)).toBe("4.5");
    expect(displayRating(0, 0)).toBeNull();
    expect(displayRating(14, 3)).toBe("4.7");
  });
});
