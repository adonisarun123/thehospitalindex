import { describe, expect, it } from "vitest";
import { glossary } from "../glossary";
import { brokenLinks, posts, wordCount } from "./index";

describe("editorial content", () => {
  it("has unique slugs and valid internal links", () => {
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    expect(brokenLinks()).toEqual([]);
  });

  it("keeps meta descriptions within search snippet length", () => {
    for (const p of posts) {
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(110);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
    }
  });

  it("uses ISO dates with modified ≥ published", () => {
    for (const p of posts) {
      for (const d of [p.datePublished, p.dateModified, p.factsCheckedOn]) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.dateModified >= p.datePublished, p.slug).toBe(true);
    }
  });

  it("gives every post substance and unique heading anchors", () => {
    for (const p of posts) {
      expect(wordCount(p), p.slug).toBeGreaterThan(350);
      const ids = p.body.flatMap((b) => (b.type === "h2" ? [b.id] : []));
      expect(new Set(ids).size, p.slug).toBe(ids.length);
    }
  });

  it("has unique glossary anchors", () => {
    expect(new Set(glossary.map((t) => t.id)).size).toBe(glossary.length);
  });
});
