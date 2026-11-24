import { describe, expect, it } from "vitest";
import { displayAnswer, dropGapSentences, dropRecordTalk, dropSourceTail, holdAnswer, keptSentence, shownAnswer, turnToStore } from "./answer";

describe("displayAnswer", () => {
  it("reads the sentence field from a structured answer", () => {
    const text = displayAnswer([], '{"sentence": "His title is AI Software Engineer."}');
    expect(text).toBe("His title is AI Software Engineer.");
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
    expect(shownAnswer(text, true, true)).toBe(holdAnswer());
    expect(shownAnswer(text, true, true)).not.toContain("tool_call");
  });

  it("replaces a boast when every tool missed", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }, { type: "text" }],
      "He led a team of 20 and cut review by 40%.",
    );
    expect(text).toBe(holdAnswer());
    expect(text).not.toContain("20");
    expect(text).not.toContain("40%");
    expect(text).not.toContain("record");
  });

  it("keeps a supported sentence when the lookup misses", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }],
      "Liam is an AI Software Engineer. The record does not include that.",
    );
    expect(text).toBe("Liam is an AI Software Engineer.");
  });

  it("drops an ungrounded quantity when the lookup misses", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }],
      "The resume summary says 4 years of software engineering experience. He cut review by 40%.",
    );
    expect(text).toBe(holdAnswer());
    expect(text).not.toContain("4");
    expect(text).not.toContain("40%");
  });

  it("keeps a figure the tool returned and drops a figure it did not", () => {
    const text = displayAnswer(
      [{
        type: "tool-lookup_fact",
        state: "output-available",
        output: {
          found: true,
          facts: [{ label: "Experience", value: "The resume summary says 4 years of software engineering experience and 3 years of AI and machine-learning delivery." }],
        },
      }],
      "The resume summary says 4 years of software engineering experience. He cut review by 40%.",
    );
    expect(text).toBe("The resume summary says 4 years of software engineering experience.");
    expect(text).not.toContain("40%");
  });

  it("drops an employer the tool text does not name", () => {
    const text = displayAnswer(
      [{
        type: "tool-read_section",
        state: "output-available",
        output: { found: true, heading: "Axion Solutions", text: "Axion Solutions. AI Software Engineer. FoodFlow is the system of record." },
      }],
      "FoodFlow is the system of record. He worked at Initech.",
    );
    expect(text).toBe("FoodFlow is the system of record.");
    expect(text).not.toContain("Initech");
  });

  it("uses the hold sentence when the store could not be read", () => {
    const text = displayAnswer(
      [{ type: "tool-lookup_fact", state: "output-available", output: { found: false, reason: "unavailable" } }],
      "His email is on the resume.",
    );
    expect(text).toBe(holdAnswer());
    expect(text).not.toContain("email");
  });

  it("stores nothing when the visitor stops the answer", () => {
    expect(turnToStore(true, [{ found: true }], "Liam works at Axion Solutions.")).toBeNull();
  });

  it("waits while the answer is still streaming", () => {
    expect(shownAnswer("", false, true)).toBe("");
  });

  it("shows a sentence when the finished answer has no words", () => {
    expect(shownAnswer("   ", true, true)).toBe(holdAnswer());
  });

  it("stores a hold sentence when the model finishes with no words", () => {
    expect(keptSentence([{ found: true, heading: "Skills" }], "   ")).toBe(holdAnswer());
  });

  it("stores the hold sentence when every tool missed and the model added a quantity", () => {
    expect(keptSentence([{ found: false }], "He led a team of 20.")).toBe(holdAnswer());
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
      [{ type: "tool-read_section", state: "output-available", output: { found: true, heading: "Axion Solutions", text: "Axis waits for approval." } }],
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
      "Liam's job title is AI Software Engineer. The record lists the current title as AI Software Engineer. The page title field reads AI Software Engineer.",
    );
    expect(text).toBe("Liam's job title is AI Software Engineer.");
  });

  it("drops a sentence that names a missing fact", () => {
    expect(dropGapSentences("Liam builds CVA. The record does not include that.")).toBe("Liam builds CVA.");
    expect(dropGapSentences("CVA is the live app. The record does not say FoodFlow is in production.")).toBe("CVA is the live app.");
    expect(dropGapSentences("The record does not specify a live metric. Manual processing fell about 35 percent.")).toBe("Manual processing fell about 35 percent.");
    expect(dropGapSentences("The project does not list post-deployment metrics.")).toBe("");
  });

  it("uses the recorded percent when the model only names a gap", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Water-meter scanner. The resume records about 35 percent less manual meter processing, on more than 10,000 samples." }] } }],
      "The project does not list post-deployment metrics.",
    );
    expect(text).toBe("Water-meter scanner. About 35 percent less manual meter processing, on more than 10,000 samples.");
    const narrated = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "The resume records about 35 percent less manual meter processing, on more than 10,000 samples." }] } }],
      "The record shows a 35 percent reduction across more than ten thousand samples.",
    );
    expect(narrated).toBe("About 35 percent less manual meter processing, on more than 10,000 samples.");
    const withApproval = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [
        { text: "The resume records about 35 percent less manual meter processing, on more than 10,000 samples." },
        { text: "A reviewer agent critiques the draft, and a person approves it." },
      ] } }],
      "The record shows a reduction.",
    );
    expect(withApproval).toBe("About 35 percent less manual meter processing, on more than 10,000 samples.");
    const detailed = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [
        { text: "Water-meter scanner. ML work for VietDan JSC, December 2024 to February 2025. The resume records about 35 percent less manual meter processing, on more than 10,000 samples. The resume says the scanner was productionized. Deployment used Jetson and AWS." },
        { text: "A reviewer agent critiques the draft, and a person approves it." },
      ] } }],
      "The record shows a reduction.",
    );
    expect(detailed).toContain("VietDan JSC");
    expect(detailed).toContain("35 percent");
    expect(detailed).toContain("10,000 samples");
    expect(detailed).toContain("Jetson");
    expect(detailed).not.toContain("person approves");
  });

  it("replaces a denied research answer with the research role", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Swinburne research. Researcher at Swinburne University of Technology, Melbourne, August 2025 to July 2026. Clinical AI lab of five people. The resume records more than 500,000 curated cases and 86 percent BERTScore on MedMCQA, PubMedQA, and MedQuAD." }] } }],
      "The record shows a Bachelor of Software Engineering at Swinburne University of Technology from 2022 to 2025, but it does not list any research projects. Let me know if you want me to check his Capstone Project at RMIT or his AI capstone at Axon instead.",
    );
    expect(text).toContain("500,000");
    expect(text).toContain("BERTScore");
    expect(text).not.toContain("RMIT");
    expect(text).not.toContain("does not list");
    expect(text).not.toContain("Bachelor");
  });

  it("keeps Axis separate from the employer and adds the meter deployment", () => {
    const write = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Axion Solutions. Axis is a separate AI product. It shows a preview, and waits for a person to approve a write." }] } }],
      "In the Axion system called Axis, a model shows a preview of the proposed write and waits for a person to approve it before the write lands.",
    );
    expect(write).toContain("Axis");
    expect(write).toContain("preview");
    expect(write).not.toContain("Axion system");
    const meter = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Water-meter scanner. ML work for VietDan JSC, December 2024 to February 2025. The resume records about 35 percent less manual meter processing, on more than 10,000 samples. Deployment used Jetson and AWS." }] } }],
      "The resume records about 35 percent less manual meter processing on more than 10,000 samples.",
    );
    expect(meter).toContain("35 percent");
    expect(meter).toContain("VietDan");
    expect(meter).toContain("Jetson");
  });

  it("drops a modifier that only exists inside a longer record word", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, text: "The resume records about 35 percent less manual meter processing, on more than 10,000 samples. The resume says the scanner was productionized." } }],
      "The scanner cut manual meter processing by about 35 percent on more than 10,000 production samples.",
    );
    expect(text).toContain("10,000 samples");
    expect(text).toContain("35 percent");
    expect(text).not.toContain("production samples");
  });

  it("keeps the model sentence when a tool found a section", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, sectionId: "role-axion", text: "Axion Solutions. AI Software Engineer." } }],
      "Liam is a AI Software Engineer at Axion Solutions.",
    );
    expect(text).toBe("Liam is a AI Software Engineer at Axion Solutions.");
  });
});
