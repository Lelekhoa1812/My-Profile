import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { listSections, lookupFacts, readSection, searchSections } from "./store";

describe("profile store", () => {
  it("returns a resume contact fact by key", () => {
    const result = lookupFacts(profile.facts, { key: "email" });
    expect(result.found).toBe(true);
    if (result.found) expect(result.facts[0]?.value).toBe("liamkl.work@gmail.com");
  });

  it("reads a section by its heading as well as its id", () => {
    const result = readSection(profile.sections, "Axion Solutions");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sectionId).toBe("role-axion");
  });

  it("marks an empty section list as a miss", () => {
    expect(listSections(profile.sections, "writing")).toEqual({ found: false, sections: [] });
  });

  it("does not invent an employer that is absent", () => {
    expect(searchSections(profile.sections, "worked at Initech")).toEqual({ found: false });
  });

  it("finds the FoodFlow section from a paraphrase of the ERP", () => {
    const result = searchSections(profile.sections, "food distribution ERP");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("role-axion");
  });

  it("does not treat one shared word as a hit", () => {
    expect(searchSections(profile.sections, "leadership philosophy at the bank")).toEqual({ found: false });
  });

  it("finds the Ericsson digital twin from the resume", () => {
    const result = searchSections(profile.sections, "Ericsson 5G digital twin");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "project-ericsson")).toBe(true);
  });

  it("finds the writing coach sold to Hai Au Group", () => {
    const result = searchSections(profile.sections, "IELTS writing coach sold to Hai Au");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "project-writing")).toBe(true);
  });

  it("finds Kubernetes in the skills section", () => {
    const result = searchSections(profile.sections, "does he use Kubernetes");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "skills")).toBe(true);
  });

  it("finds the skills section from a language question", () => {
    const result = searchSections(profile.sections, "which languages does he speak");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "skills")).toBe(true);
  });
});
