import { describe, expect, it } from "vitest";
import { stepTools } from "./loop";

describe("stepTools", () => {
  it("plans on the first step", () => {
    expect(stepTools(0, [])).toEqual({ toolChoice: { type: "tool", toolName: "plan_question" }, activeTools: ["plan_question"] });
  });

  it("searches even when the plan names a closed fact", () => {
    const choice = stepTools(1, [{ toolResults: [{ output: { ok: true, queries: ["email"], factKey: "email" } }] }]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "search_sections" }, activeTools: ["search_sections"] });
  });

  it("searches when the plan names no closed fact", () => {
    const choice = stepTools(1, [{ toolResults: [{ output: { ok: true, queries: ["planner agent"] } }] }]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "search_sections" }, activeTools: ["search_sections"] });
  });

  it("stops when the fact lookup returns a value", () => {
    const choice = stepTools(2, [{ toolResults: [{ output: { found: true, facts: [{ label: "Email", value: "liam@example.com" }] } }] }]);
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });

  it("reads when the search returns ids and no text", () => {
    const choice = stepTools(2, [{
      toolResults: [{ output: { found: true, sections: [{ sectionId: "project-cva", heading: "CVA", lead: "A career application agent." }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "read_sections" }, activeTools: ["read_sections"] });
  });

  it("retries the search when the previous step called no tool", () => {
    const choice = stepTools(2, [
      { toolResults: [{ output: { ok: true, queries: ["meter"] } }] },
      { toolResults: [] },
    ]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "search_sections" }, activeTools: ["search_sections"] });
  });

  it("retries the search when a closed fact produced no tool result", () => {
    const choice = stepTools(2, [
      { toolResults: [{ output: { ok: true, factKey: "email", queries: ["email"] } }] },
      { toolResults: [] },
    ]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "search_sections" }, activeTools: ["search_sections"] });
  });

  it("reads on the next step when the search has not been read", () => {
    const choice = stepTools(3, [{
      toolResults: [{ output: { found: true, sections: [{ sectionId: "project-meter", lead: "The meter cut manual reads." }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "read_sections" }, activeTools: ["read_sections"] });
  });

  it("stops when the search misses", () => {
    const choice = stepTools(2, [{ toolResults: [{ output: { found: false } }] }]);
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });

  it("reviews after a section is read", () => {
    const choice = stepTools(3, [{
      toolResults: [{ output: { found: true, sections: [{ sectionId: "project-cva", text: "A planner agent scores role fit." }] } }],
    }]);
    expect(choice).toEqual({ toolChoice: { type: "tool", toolName: "review_evidence" }, activeTools: ["review_evidence"] });
  });

  it("stops tool calls after the review", () => {
    const choice = stepTools(4, [{ toolResults: [{ output: { found: true, text: "A planner agent scores role fit." } }] }]);
    expect(choice).toEqual({ toolChoice: "none", activeTools: [] });
  });
});
