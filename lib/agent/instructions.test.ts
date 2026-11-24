import { describe, expect, it } from "vitest";
import { instructionPrefix } from "./instructions";

describe("instructionPrefix", () => {
  it("keeps a stable refusal contract", () => {
    const text = instructionPrefix();
    expect(text).toBe(instructionPrefix());
    expect(text).toContain("The record does not include that.");
    expect(text).not.toContain("Great question");
    expect(text).not.toContain("capital-markets");
  });
});
