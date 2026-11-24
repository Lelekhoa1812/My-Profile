import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { lookupFacts, searchSections } from "./store";

describe("profile store", () => {
  it("returns a resume contact fact by key", () => {
    const result = lookupFacts(profile.facts, { key: "email" });
    expect(result.found).toBe(true);
    if (result.found) expect(result.facts[0]?.value).toBe("liamkl.work@gmail.com");
  });

  it("does not invent an employer that is absent", () => {
    expect(searchSections(profile.sections, "worked at Initech")).toEqual({ found: false });
  });

  it("finds the FoodFlow section from a paraphrase of the ERP", () => {
    const result = searchSections(profile.sections, "food distribution ERP");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("role-axion");
  });
});
