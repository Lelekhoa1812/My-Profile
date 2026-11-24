import { describe, expect, it } from "vitest";
import { anchorSegments, monthLabel, sourcesFromParts } from "./sources";

describe("sourcesFromParts", () => {
  it("prefers sections the agent read, then search hits, without duplicates", () => {
    const sources = sourcesFromParts([
      { type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ sectionId: "role-mizco", heading: "Mizco", sourceType: "role" }, { sectionId: "role-axion", heading: "Axion Solutions", sourceType: "role" }] } },
      { type: "tool-read_section", state: "output-available", output: { found: true, sectionId: "role-axion", heading: "Axion Solutions", sourceType: "role" } },
      { type: "tool-read_section", state: "input-available" },
      { type: "text" },
    ]);
    expect(sources.map((source) => source.sectionId)).toEqual(["role-axion", "role-mizco"]);
    expect(sources[0]).toMatchObject({ label: "Axion Solutions", href: "#role-axion" });
    expect(sources[0].meta).toBe("Senior AI Software Engineer · Jul 2026 – now");
  });

  it("ignores lookups that found nothing", () => {
    expect(sourcesFromParts([{ type: "tool-read_section", state: "output-available", output: { found: false } }])).toEqual([]);
  });
});

describe("anchorSegments", () => {
  it("marks the first mention of each source once", () => {
    const sources = sourcesFromParts([
      { type: "tool-read_section", state: "output-available", output: { found: true, sectionId: "role-mizco", heading: "Mizco", sourceType: "role" } },
    ]);
    const segments = anchorSegments("At Mizco he led RFQ work. Mizco again.", sources);
    expect(segments).toEqual([{ text: "At " }, { text: "Mizco", ref: 0 }, { text: " he led RFQ work. Mizco again." }]);
  });
});

describe("monthLabel", () => {
  it("formats a month and an open end", () => {
    expect(monthLabel("2025-08")).toBe("Aug 2025");
    expect(monthLabel(null)).toBe("now");
  });
});
