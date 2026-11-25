import { describe, expect, it } from "vitest";
import { hubPages, hubPath, hubWordCount } from "./index";

describe("hub pages", () => {
  it("has one module per hub path", () => {
    const paths = hubPages.map(hubPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("keeps the shape the sync script and page expect", () => {
    for (const h of hubPages) {
      const p = hubPath(h);
      if (h.kind === "city") expect(h.taxon, p).toBeUndefined();
      else expect(h.taxon, p).toMatch(/^[a-z0-9-]+$/);
      for (const s of [h.state, h.city]) expect(s, p).toMatch(/^[a-z0-9-]+$/);
      expect(hubWordCount(h), p).toBeGreaterThanOrEqual(90);
      expect(hubWordCount(h), p).toBeLessThanOrEqual(220);
      expect(h.guidance, `${p}: guidance is plain text`).not.toMatch(/\*\*|\]\(|\n/);
      expect(h.faqs.length, p).toBeGreaterThanOrEqual(3);
      expect(h.faqs.length, p).toBeLessThanOrEqual(6);
      expect(new Set(h.faqs.map((f) => f.q)).size, p).toBe(h.faqs.length);
      for (const d of [h.datePublished, h.factsCheckedOn]) expect(d, p).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
