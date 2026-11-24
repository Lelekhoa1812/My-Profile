import { describe, expect, it } from "vitest";
import { stepTools } from "./loop";

describe("stepTools", () => {
  it("requires a tool on the first step", () => {
    expect(stepTools(0, [])).toEqual({ toolChoice: "required", activeTools: ["search_sections"] });
  });

  it("asks for section text when the first lookup misses", () => {
    const choice = stepTools(1, [{ toolResults: [{ output: { found: false } }] }]);
    expect(choice.toolChoice).toBe("required");
    expect(choice.activeTools).toEqual(["lookup_fact", "search_sections", "read_section"]);
  });

  it("asks for section text when the first lookup returns headings only", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, sections: [{ heading: "Axion Solutions" }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: "required", activeTools: ["search_sections"] });
  });

  it("reads the job when the lookup returns only the page title", () => {
    const choice = stepTools(1, [{
      toolResults: [
        { output: { found: true, facts: [{ label: "Current title", value: "AI Software Engineer" }, { label: "Page title", value: "AI Software Engineer" }] } },
        { output: { found: false } },
      ],
    }]);
    expect(choice).toEqual({ toolChoice: "required", activeTools: ["search_sections"] });
  });

  it("searches the record when a skill fact is not the job", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, facts: [{ label: "Languages", value: "English" }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: "required", activeTools: ["search_sections"] });
  });

  it("stops when the lookup returns the email", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, facts: [{ label: "Email", value: "liam@example.com" }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });

  it("stops tool calls after a lookup that returns text", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, sections: [{ text: "Axion Solutions. AI Software Engineer." }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });

  it("searches again when the section names a different employer", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, sections: [{ sectionId: "role-axion", text: "Axion Solutions. Axis shows a preview." }] } }],
    }], "At Harry the Hirer, what did the pilot cut?");
    expect(choice).toEqual({ toolChoice: "required", activeTools: ["search_sections", "read_section"] });
  });

  it("stops when the section names the employer in the question", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, sections: [{ sectionId: "role-harry-senior", text: "Harry the Hirer. About 40 percent less repetitive lookup." }] } }],
    }], "At Harry the Hirer, what did the pilot cut?");
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });

  it("stops tool calls on the write step", () => {
    const choice = stepTools(2, [
      { toolResults: [{ output: { found: false } }] },
      { toolResults: [{ output: { found: true, text: "CVA has a live app." } }] },
    ]);
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });
});
