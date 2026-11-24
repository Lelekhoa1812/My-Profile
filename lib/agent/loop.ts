const SECTION_TOOLS = ["read_section", "search_sections", "lookup_fact"] as const;
const MISS_TOOLS = ["lookup_fact", "search_sections", "read_section"] as const;

export type ToolStep = {
  toolResults?: readonly { output?: unknown }[];
};

export type StepToolChoice = {
  toolChoice: "required" | "none";
  activeTools?: Array<"lookup_fact" | "list_sections" | "read_section" | "search_sections">;
};

export function stepTools(stepNumber: number, steps: readonly ToolStep[]): StepToolChoice {
  if (stepNumber === 0) return { toolChoice: "required" };
  const outputs = lastOutputs(steps);
  if (stepNumber === 1 && outputs.length > 0 && outputs.every((output) => output.found === false)) {
    return { toolChoice: "required", activeTools: [...MISS_TOOLS] };
  }
  if (stepNumber === 1 && needsSectionText(outputs)) {
    return { toolChoice: "required", activeTools: [...SECTION_TOOLS] };
  }
  return { toolChoice: "none", activeTools: [] };
}

function lastOutputs(steps: readonly ToolStep[]): readonly Record<string, unknown>[] {
  const last = steps[steps.length - 1];
  return (last?.toolResults ?? []).map((result) => result.output).filter(isRecord);
}

function needsSectionText(outputs: readonly Record<string, unknown>[]): boolean {
  if (outputs.length === 0) return false;
  return outputs.every((output) => Array.isArray(output.sections) && output.sections.length > 0 && output.sections.every(hasNoText));
}

function hasNoText(section: unknown): boolean {
  if (typeof section !== "object" || section === null || !("text" in section)) return true;
  return typeof section.text !== "string" || section.text.trim().length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
