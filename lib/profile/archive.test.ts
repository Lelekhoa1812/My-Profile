import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { withArchive } from "./archive";
import { searchSections } from "./store";

describe("withArchive", () => {
  it("finds a repository the resume summary does not name", () => {
    const result = searchSections(withArchive(profile.sections), "path game");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections[0]?.text).toContain("Browser path puzzle");
    expect(result.sections[0]?.text).not.toMatch(/star/i);
  });

  it("keeps the current job title on the Axion role", () => {
    const result = searchSections(withArchive(profile.sections), "current title", "role");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections[0]?.sectionId).toBe("role-axion");
  });
});
