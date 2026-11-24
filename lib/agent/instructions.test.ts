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
    expect(text).toContain('Do not use "I" for his work.');
    expect(text).toContain("Do not narrate how a fact is stored.");
    expect(text).toContain("Never write a tool call in the answer.");
    expect(text).not.toContain("proofs from the record");
    expect(text).toContain("Answer only what was asked.");
    expect(text).toContain("The current title is the job.");
    expect(text).toContain("The page title is the short label on the visitor page.");
    expect(text).toContain("Do not say that a sold or acquired product reached production.");
    expect(text).toContain("When the question names another employer, answer with that employer's role.");
  });
});
