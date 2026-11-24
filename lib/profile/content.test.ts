import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";

describe("profile content", () => {
  it("keeps unique fact keys and section ids", () => {
    const factKeys = profile.facts.map((fact) => fact.key);
    const sectionIds = profile.sections.map((section) => section.sectionId);
    expect(new Set(factKeys).size).toBe(factKeys.length);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
  });

  it("repeats each heading inside the section text", () => {
    for (const section of profile.sections) {
      expect(section.text.startsWith(section.heading)).toBe(true);
    }
  });
});
