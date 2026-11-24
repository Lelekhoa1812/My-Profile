import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { withArchive } from "./archive";
import { lookupFacts, readSection, searchSections } from "./store";

describe("retrieval coverage", () => {
  it("returns every public fact by its key", () => {
    for (const fact of profile.facts) {
      const result = lookupFacts(profile.facts, { key: fact.key });
      expect(result.found, fact.key).toBe(true);
      if (result.found) expect(result.facts.some((row) => row.value === fact.value), fact.key).toBe(true);
    }
  });

  it("reads every profile section by its id and its heading", () => {
    for (const section of profile.sections) {
      const byId = readSection(profile.sections, section.sectionId);
      expect(byId.found, section.sectionId).toBe(true);
      if (byId.found) expect(byId.sectionId).toBe(section.sectionId);
      const byHeading = readSection(profile.sections, section.heading);
      expect(byHeading.found, section.heading).toBe(true);
      if (byHeading.found) expect(byHeading.sectionId).toBe(section.sectionId);
      const searched = searchSections(profile.sections, section.heading);
      expect(searched.found, section.heading).toBe(true);
      if (searched.found) expect(searched.sections.some((item) => item.sectionId === section.sectionId), section.heading).toBe(true);
    }
  });

  it("searches every archive title the loader adds", () => {
    const sections = withArchive(profile.sections);
    const added = sections.filter((section) => section.sectionId.startsWith("archive-"));
    const misses: string[] = [];
    for (const section of added) {
      const searched = searchSections(sections, section.heading);
      const hit = searched.found && searched.sections.some((item) => item.sectionId === section.sectionId);
      if (!hit) misses.push(section.heading);
    }
    expect(misses, misses.join(" | ")).toEqual([]);
  });
});
