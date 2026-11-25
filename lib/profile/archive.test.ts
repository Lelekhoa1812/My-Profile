import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { withArchive } from "./archive";
import { listSections, searchSections } from "./store";

describe("withArchive", () => {
  it("does not answer a year question with an archive title that lacks that year", () => {
    const result = searchSections(withArchive(profile.sections), "What did he do in 2026?");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections.some((section) => section.sectionId.startsWith("archive-"))).toBe(false);
    expect(result.sections.some((section) => section.text.includes("2026"))).toBe(true);
  });

  it("keeps a production question on the shipped-work section", () => {
    const result = searchSections(withArchive(profile.sections), "What does he ship to production?");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections[0]?.sectionId).toBe("project-shipped");
    expect(result.sections.some((section) => section.sectionId.startsWith("archive-"))).toBe(false);
  });

  it("finds a coined name that appears only in a repository readme", () => {
    const result = searchSections(withArchive(profile.sections), "What is FreeRouter?");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections[0]?.sectionId).toBe("archive-gh-free-router");
    expect(result.sections[0]?.text).toContain("OpenAI-compatible");
    const plain = searchSections(withArchive(profile.sections), "What is existing?");
    expect(plain.found && plain.sections[0]?.sectionId).not.toBe("archive-gh-survee");
  });

  it("finds a repository the resume summary does not name", () => {
    const result = searchSections(withArchive(profile.sections), "path game");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections[0]?.text).toContain("Browser path puzzle");
    expect(result.sections[0]?.text).toContain("Repository language: HTML");
    expect(result.sections[0]?.text).not.toMatch(/star/i);
    expect(result.sections.some((section) => section.heading === "Chess Game")).toBe(false);
  });

  it("tells a full-list question that the page holds the archive", () => {
    const section = profile.sections.find((item) => item.sectionId === "project-public-code");
    expect(section?.text).toContain("The visitor page lists the full public archive.");
  });

  it("does not dump the archive when the record is listed", () => {
    const listed = listSections(withArchive(profile.sections));
    expect(listed.found).toBe(true);
    if (!listed.found) return;
    expect(listed.sections.some((section) => section.sectionId.startsWith("archive-"))).toBe(false);
    expect(listed.sections.some((section) => section.sectionId === "role-axion")).toBe(true);
  });
  it("keeps the current job title on the Axion role", () => {
    const result = searchSections(withArchive(profile.sections), "current title", "role");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.sections[0]?.sectionId).toBe("role-axion");
  });
});
