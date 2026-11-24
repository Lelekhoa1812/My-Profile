import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { recordCard } from "./card";

describe("recordCard", () => {
  it("places the public record in one block and leaves out an absent employer", () => {
    const card = recordCard(profile.facts, profile.sections);
    expect(card).toContain("full_name: Dang Khoa Le");
    expect(card).toContain("## Axion Solutions");
    expect(card).toContain("FoodFlow");
    expect(card).toContain("## Public repositories");
    expect(card).toContain("## Hugging Face models");
    expect(card).not.toContain("Initech");
  });
});
