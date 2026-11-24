const RETRIEVAL_TOOLS = ["search_sections", "read_section"] as const;

export type ToolStep = {
  toolResults?: readonly { output?: unknown }[];
};

export type StepToolChoice = {
  toolChoice: "required" | "none";
  activeTools?: Array<"lookup_fact" | "list_sections" | "read_section" | "search_sections">;
};

export function stepTools(stepNumber: number, steps: readonly ToolStep[]): StepToolChoice {
  if (stepNumber === 0) return { toolChoice: "required" };
  if (stepNumber === 1 && needsAnotherLookup(lastOutputs(steps))) {
    return { toolChoice: "required", activeTools: [...RETRIEVAL_TOOLS] };
  }
  return { toolChoice: "none", activeTools: [] };
}

function lastOutputs(steps: readonly ToolStep[]): readonly Record<string, unknown>[] {
  const last = steps[steps.length - 1];
  return (last?.toolResults ?? []).map((result) => result.output).filter(isRecord);
}

function needsAnotherLookup(outputs: readonly Record<string, unknown>[]): boolean {
  if (outputs.length === 0) return false;
  if (outputs.every((output) => output.found === false)) return true;
  return outputs.every((output) => Array.isArray(output.sections) && output.sections.length > 0 && output.sections.every(hasNoText));
}

function hasNoText(section: unknown): boolean {
  if (typeof section !== "object" || section === null || !("text" in section)) return true;
  return typeof section.text !== "string" || section.text.trim().length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
