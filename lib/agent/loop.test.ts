import { describe, expect, it } from "vitest";
import { stepTools } from "./loop";

describe("stepTools", () => {
  it("requires a tool on the first step", () => {
    expect(stepTools(0, [])).toEqual({ toolChoice: "required" });
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
    expect(choice).toEqual({ toolChoice: "required", activeTools: ["read_section", "search_sections", "lookup_fact"] });
  });

  it("stops tool calls after a lookup that returns text", () => {
    const choice = stepTools(1, [{
      toolResults: [{ output: { found: true, sections: [{ text: "Axion Solutions. AI Software Engineer." }] } }],
    }]);
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
