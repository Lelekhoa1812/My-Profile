import { describe, expect, it } from "vitest";
import { displayAnswer, keptSentence, SILENCE, UNREAD } from "./answer";

describe("displayAnswer", () => {
  it("replaces a boast when every tool missed", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }, { type: "text" }],
      "He led a team of 20 and cut review by 40%.",
    );
    expect(text).toBe(SILENCE);
  });

  it("uses the unread sentence when the store could not be read", () => {
    const text = displayAnswer(
      [{ type: "tool-lookup_fact", state: "output-available", output: { found: false, reason: "unavailable" } }],
      "His email is on the resume.",
    );
    expect(text).toBe(UNREAD);
  });

  it("keeps the silence sentence for the session when every tool missed", () => {
    expect(keptSentence([{ found: false }], "He led a team of 20.")).toBe(SILENCE);
  });

  it("keeps the model sentence when a tool found a section", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, sectionId: "role-axion" } }],
      "Liam is a Senior AI Software Engineer at Axion Solutions.",
    );
    expect(text).toBe("Liam is a Senior AI Software Engineer at Axion Solutions.");
  });
});
