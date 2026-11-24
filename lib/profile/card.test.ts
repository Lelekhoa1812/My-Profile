import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { withArchive } from "./archive";
import { recordCard } from "./card";

describe("recordCard", () => {
  it("places the public record in one block and leaves out an absent employer", () => {
    const card = recordCard(profile.facts, profile.sections);
    expect(card).toContain("Name: Dang Khoa Le");
    expect(card).toContain("Current title: Senior AI Software Engineer");
    expect(card).toContain("Page title: AI Software Engineer");
    expect(card).toContain("Experience: The resume summary says 4 years");
    expect(card).not.toContain("public_title");
    expect(card).toContain("## Axion Solutions");
    expect(card).toContain("FoodFlow");
    expect(card).toContain("## Public repositories");
    expect(card).toContain("## Hugging Face models");
    expect(card).not.toContain("Initech");
    expect(card).not.toContain("Headings:");
  });

  it("leaves the full archive out of the prompt", () => {
    const card = recordCard(profile.facts, withArchive(profile.sections));
    expect(card).toContain("## Public repositories");
    expect(card).not.toContain("Browser path puzzle");
  });
});
