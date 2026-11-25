export type ToolStep = {
  toolResults?: readonly { toolName?: string; output?: unknown }[];
};

export type ForcedTool = {
  type: "tool";
  toolName: "plan_question" | "lookup_fact" | "search_sections" | "read_sections" | "review_evidence";
};

export type StepToolChoice = {
  toolChoice: "none" | ForcedTool;
  activeTools?: Array<"lookup_fact" | "list_sections" | "read_section" | "search_sections" | "plan_question" | "read_sections" | "review_evidence">;
};

export function stepTools(stepNumber: number, steps: readonly ToolStep[]): StepToolChoice {
  if (stepNumber <= 0) return force("plan_question");
  const output = lastOutput(steps);
  if (stepNumber === 1) return force("search_sections");
  if (stepNumber === 2) {
    if (hasFacts(output)) return stop();
    if (hasSectionIds(output)) return force("read_sections");
    if (!output) return force("search_sections");
    return stop();
  }
  if (stepNumber === 3) {
    if (hasFacts(output)) return stop();
    if (hasReadText(output)) return force("review_evidence");
    if (hasSectionIds(output)) return force("read_sections");
    return stop();
  }
  return stop();
}

function force(toolName: ForcedTool["toolName"]): StepToolChoice {
  return { toolChoice: { type: "tool", toolName }, activeTools: [toolName] };
}

function stop(): StepToolChoice {
  return { toolChoice: "none", activeTools: [] };
}

function lastOutput(steps: readonly ToolStep[]): Record<string, unknown> | undefined {
  const results = steps[steps.length - 1]?.toolResults ?? [];
  const output = results[results.length - 1]?.output;
  return isRecord(output) ? output : undefined;
}

function hasFacts(output: Record<string, unknown> | undefined): boolean {
  return Array.isArray(output?.facts) && output.facts.length > 0;
}

function hasSectionIds(output: Record<string, unknown> | undefined): boolean {
  return Array.isArray(output?.sections) && output.sections.some((section) => isRecord(section) && typeof section.sectionId === "string" && section.sectionId.length > 0);
}

function hasReadText(output: Record<string, unknown> | undefined): boolean {
  if (typeof output?.text === "string" && output.text.trim().length > 0) return true;
  return Array.isArray(output?.sections) && output.sections.some((section) => isRecord(section) && typeof section.text === "string" && section.text.trim().length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
