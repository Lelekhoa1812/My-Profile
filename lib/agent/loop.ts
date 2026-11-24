const MISS_TOOLS = ["lookup_fact", "search_sections", "read_section"] as const;
const CLOSED_LABELS = new Set(["Email", "Phone", "Location", "Name", "Also called", "Degree", "Experience", "LinkedIn", "GitHub", "Hugging Face"]);

export type ToolStep = {
  toolResults?: readonly { output?: unknown }[];
};

export type StepToolChoice = {
  toolChoice: "required" | "none";
  activeTools?: Array<"lookup_fact" | "list_sections" | "read_section" | "search_sections">;
};

export function stepTools(stepNumber: number, steps: readonly ToolStep[]): StepToolChoice {
  if (stepNumber === 0) return { toolChoice: "required", activeTools: ["search_sections"] };
  const outputs = lastOutputs(steps);
  if (stepNumber !== 1) return { toolChoice: "none", activeTools: [] };
  if (hasSectionText(outputs) && !unreadHeadings(outputs)) return { toolChoice: "none", activeTools: [] };
  if (closedFacts(outputs) && !unreadHeadings(outputs)) return { toolChoice: "none", activeTools: [] };
  if (outputs.length === 0 || outputs.every((output) => output.found === false)) {
    return { toolChoice: "required", activeTools: [...MISS_TOOLS] };
  }
  return { toolChoice: "required", activeTools: ["search_sections"] };
}

function lastOutputs(steps: readonly ToolStep[]): readonly Record<string, unknown>[] {
  const last = steps[steps.length - 1];
  return (last?.toolResults ?? []).map((result) => result.output).filter(isRecord);
}

function hasSectionText(outputs: readonly Record<string, unknown>[]): boolean {
  return outputs.some((output) => Array.isArray(output.sections) && output.sections.some((section) => !hasNoText(section)));
}

function unreadHeadings(outputs: readonly Record<string, unknown>[]): boolean {
  return outputs.some((output) => output.found !== false && Array.isArray(output.sections) && output.sections.length > 0 && output.sections.every(hasNoText));
}

function closedFacts(outputs: readonly Record<string, unknown>[]): boolean {
  const facts = outputs.flatMap((output) => Array.isArray(output.facts) ? output.facts : []);
  return facts.length > 0 && facts.every((fact) => isRecord(fact) && typeof fact.label === "string" && CLOSED_LABELS.has(fact.label));
}

function hasNoText(section: unknown): boolean {
  if (typeof section !== "object" || section === null || !("text" in section)) return true;
  return typeof section.text !== "string" || section.text.trim().length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
