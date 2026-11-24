import { describe, expect, it } from "vitest";
import { displayAnswer, dropRecordTalk, dropSourceTail, keptSentence, MISSED, shownAnswer, SILENCE, turnToStore, UNREAD } from "./answer";

describe("displayAnswer", () => {
  it("reads the sentence field from a structured answer", () => {
    const text = displayAnswer([], '{"sentence": "His title is Senior AI Software Engineer."}');
    expect(text).toBe("His title is Senior AI Software Engineer.");
  });

  it("reads a sentence field that follows a lead-in", () => {
    const text = displayAnswer([], 'Answer: {"sentence": "CVA is the only named live app."}');
    expect(text).toBe("CVA is the only named live app.");
  });

  it("turns markdown into a plain sentence", () => {
    const text = displayAnswer([], "**Axion Solutions** ships FoodFlow.\n- CVA has a live app.");
    expect(text).toBe("Axion Solutions ships FoodFlow. CVA has a live app.");
    expect(text).not.toContain("**");
    expect(displayAnswer([], "Axis - a separate product.")).toBe("Axis - a separate product.");
  });

  it("hides a tool call that leaked into the sentence", () => {
    const leaked = `<tool_call> <function=search_sections> <parameter=query> Harry the Hirer
</parameter> <parameter=sourceType> role </parameter> </function> </tool_call>`;
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, heading: "Ericsson 5G digital twin" } }],
      leaked,
    );
    expect(text).toBe("");
    expect(shownAnswer(text, true, true)).toBe(MISSED);
    expect(shownAnswer(text, true, true)).not.toContain("tool_call");
  });

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

  it("stores nothing when the visitor stops the answer", () => {
    expect(turnToStore(true, [{ found: true }], "Liam works at Axion Solutions.")).toBeNull();
  });

  it("waits while the answer is still streaming", () => {
    expect(shownAnswer("", false, true)).toBe("");
  });

  it("shows a sentence when the finished answer has no words", () => {
    expect(shownAnswer("   ", true, true)).toBe(MISSED);
  });

  it("stores a plain sentence when the model finishes with no words", () => {
    expect(keptSentence([{ found: true, heading: "Skills" }], "   ")).toBe(MISSED);
  });

  it("keeps the silence sentence for the session when every tool missed", () => {
    expect(keptSentence([{ found: false }], "He led a team of 20.")).toBe(SILENCE);
  });

  it("drops a trailing list of section headings the page already shows", () => {
    const headings = new Set(["axion solutions", "axion workflow engine"]);
    const text = "Axis does not own FoodFlow's database. (Axion Solutions; Axion workflow engine)";
    expect(dropSourceTail(text, headings)).toBe("Axis does not own FoodFlow's database.");
  });

  it("drops the same list when a full stop follows it", () => {
    const headings = new Set(["axion solutions", "axion workflow engine"]);
    const text = "Axis does not own FoodFlow's database. (Axion Solutions; Axion workflow engine).";
    expect(dropSourceTail(text, headings)).toBe("Axis does not own FoodFlow's database.");
  });

  it("drops a trailing Sources line that only names sections", () => {
    const headings = new Set(["axion solutions"]);
    const text = "Axis waits for approval.\nSources: Axion Solutions.";
    expect(dropSourceTail(text, headings)).toBe("Axis waits for approval.");
  });

  it("keeps a real parenthesis that is not a section heading", () => {
    expect(dropSourceTail("He speaks English (fluent).", new Set(["skills"]))).toBe("He speaks English (fluent).");
  });

  it("uses the tool headings when it drops the source tail", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, heading: "Axion Solutions" } }],
      "Axis waits for approval. (Axion Solutions)",
    );
    expect(text).toBe("Axis waits for approval.");
  });

  it("removes a record lead-in and keeps the fact", () => {
    const raw = '{"sentence": "According to the record, CVA has a live app. The record notes that a sale is not a production release."}';
    expect(displayAnswer([], raw)).toBe("CVA has a live app. A sale is not a production release.");
  });

  it("keeps the page archive when the model says the record says it", () => {
    const raw = '{"sentence": "The record says the visitor page lists the full public archive."}';
    expect(displayAnswer([], raw)).toBe("The visitor page lists the full public archive.");
  });

  it("drops a sentence that narrates the record and keeps the answer", () => {
    const text = dropRecordTalk(
      "Liam's job title is Senior AI Software Engineer. The record lists the current title as Senior AI Software Engineer. The page title field reads AI Software Engineer.",
    );
    expect(text).toBe("Liam's job title is Senior AI Software Engineer.");
  });

  it("keeps the silence sentence", () => {
    expect(dropRecordTalk(SILENCE)).toBe(SILENCE);
  });

  it("keeps the model sentence when a tool found a section", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, sectionId: "role-axion" } }],
      "Liam is a Senior AI Software Engineer at Axion Solutions.",
    );
    expect(text).toBe("Liam is a Senior AI Software Engineer at Axion Solutions.");
  });
});
