import { describe, expect, it } from "vitest";
import { instructionPrefix } from "./instructions";

describe("instructionPrefix", () => {
  it("keeps a stable refusal contract", () => {
    const text = instructionPrefix();
    expect(text).toBe(instructionPrefix());
    expect(text).toContain("The record does not include that.");
    expect(text).toContain("The record could not be read.");
    expect(text).toContain("I am Liam's portfolio assistant.");
    expect(text).not.toContain("Great question");
    expect(text).not.toContain("capital-markets");
    expect(text).not.toContain("FoodFlow");
    expect(text).toContain("answer only from the Axion sections in the record");
  });
});
