import { describe, expect, it } from "vitest";
import { keepToolSentences } from "./evidence";

const read = (text: string) => [{ type: "tool-read_sections", state: "output-available", toolName: "read_sections", output: { found: true, sections: [{ sectionId: "project-cva", text }] } }];

describe("keepToolSentences", () => {
  it("keeps a fact value returned by search", () => {
    const parts = [{ type: "tool-search_sections", state: "output-available", toolName: "search_sections", output: { found: true, facts: [{ label: "Location", value: "Melbourne, Australia" }] } }];
    expect(keepToolSentences(parts, "He lives in Melbourne, Australia.")).toMatch(/Melbourne/);
  });

  it("drops a sentence that appears only in a search lead", () => {
    const parts = [{ type: "tool-search_sections", state: "output-available", toolName: "search_sections", output: { found: true, sections: [{ sectionId: "project-cva", lead: "A planner agent scores role fit." }] } }];
    expect(keepToolSentences(parts, "A planner agent scores role fit.")).toBe("I am Liam's portfolio assistant.");
  });

  it("reads a sentence field and keeps the supported prose", () => {
    const answer = keepToolSentences(read("A planner agent scores role fit."), '{"sentence": "A planner agent scores role fit."}');
    expect(answer).toContain("planner agent");
  });

  it("keeps a sentence that the read result contains", () => {
    const answer = keepToolSentences(read("A planner agent scores role fit and drafts a CV."), "A planner agent scores role fit and drafts a CV.");
    expect(answer).toContain("planner agent");
    expect(answer).toContain("drafts a CV");
  });

  it("keeps a paraphrase when the names and most of the words are in one section", () => {
    const answer = keepToolSentences(
      read("The engine uses LangChain and LangGraph. Modular actions assemble the work."),
      "The orchestration engine uses LangChain and LangGraph with modular actions.",
    );
    expect(answer).toContain("LangChain");
    expect(answer).toContain("modular actions");
  });

  it("drops a sentence that names a framework the section does not contain", () => {
    const answer = keepToolSentences(
      read("The engine uses LangChain and LangGraph."),
      "Kafka queues the work beside LangChain.",
    );
    expect(answer).toBe("I am Liam's portfolio assistant.");
  });

  it("keeps a sentence that joins two facts from the same section", () => {
    const answer = keepToolSentences(
      read("A planner agent scores role fit. A reviewer agent critiques the draft."),
      "A planner agent scores role fit, and the reviewer critiques the draft.",
    );
    expect(answer).toContain("planner agent");
    expect(answer).toContain("critiques the draft");
  });

  it("drops a sentence that joins two tool sentences", () => {
    const answer = keepToolSentences(
      read("He led the AI work. Clara was adopted by 175 Hospital."),
      "He led a 40 percent hospital.",
    );
    expect(answer).toBe("I am Liam's portfolio assistant.");
  });

  it("keeps the first sentence when the second adds a number the tool text lacks", () => {
    const answer = keepToolSentences(
      read("A planner agent scores role fit."),
      "A planner agent scores role fit. The score was 99 percent.",
    );
    expect(answer).toBe("A planner agent scores role fit.");
    expect(answer).not.toContain("99");
  });

  it("drops a sentence copied from the identity card when no tool returned it", () => {
    const answer = keepToolSentences([], "Dang Khoa Le is an AI Software Engineer.");
    expect(answer).toBe("I am Liam's portfolio assistant.");
  });

  it("keeps a fact value from lookup_fact", () => {
    const parts = [{ type: "tool-lookup_fact", state: "output-available", toolName: "lookup_fact", output: { found: true, facts: [{ label: "Email", value: "liamkl.work@gmail.com" }] } }];
    expect(keepToolSentences(parts, "His email address is liamkl.work@gmail.com.")).toMatch(/liamkl\.work@gmail\.com/i);
  });
});
