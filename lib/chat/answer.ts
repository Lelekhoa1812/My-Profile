export const SILENCE = "The record does not include that.";
export const UNREAD = "The record could not be read.";

type AnswerPart = { type: string; state?: string; output?: unknown };

export function turnToStore(aborted: boolean, outputs: readonly unknown[], modelText: string): string | null {
  if (aborted) return null;
  return keptSentence(outputs, modelText);
}

export function keptSentence(outputs: readonly unknown[], modelText: string): string {
  return displayAnswer(
    outputs.map((output) => ({ type: "tool-output", state: "output-available", output })),
    modelText,
  );
}

export function displayAnswer(parts: readonly AnswerPart[], modelText: string): string {
  const outputs = parts
    .filter((part) => part.type.startsWith("tool-") && part.state === "output-available")
    .map((part) => part.output)
    .filter((output): output is Record<string, unknown> => typeof output === "object" && output !== null);
  if (outputs.some((output) => output.reason === "unavailable")) return UNREAD;
  if (outputs.length > 0 && outputs.every((output) => output.found === false)) return SILENCE;
  return dropSourceTail(modelText, sourceHeadings(outputs));
}

function sourceHeadings(outputs: readonly Record<string, unknown>[]): Set<string> {
  const names = new Set<string>();
  for (const output of outputs) {
    if (typeof output.heading === "string") names.add(output.heading.trim().toLowerCase());
    if (!Array.isArray(output.sections)) continue;
    for (const section of output.sections) {
      if (typeof section === "object" && section !== null && "heading" in section && typeof section.heading === "string") {
        names.add(section.heading.trim().toLowerCase());
      }
    }
  }
  return names;
}

function citesHeadings(raw: string, headings: ReadonlySet<string>): boolean {
  const parts = raw.split(/[;,]/).map((part) => part.trim().toLowerCase().replace(/[.!]+$/, "")).filter(Boolean);
  return parts.length > 0 && parts.every((part) => headings.has(part));
}

export function dropSourceTail(text: string, headings: ReadonlySet<string>): string {
  let trimmed = text.trim();
  if (headings.size === 0) return trimmed;
  const sourcesLine = trimmed.match(/\n+sources:\s*(.+)\s*$/i);
  if (sourcesLine && sourcesLine.index !== undefined && citesHeadings(sourcesLine[1], headings)) {
    trimmed = trimmed.slice(0, sourcesLine.index).trim();
  }
  const match = trimmed.match(/\s+\(([^)]+)\)[.!]?\s*$/);
  if (!match || match.index === undefined || !citesHeadings(match[1], headings)) return trimmed;
  return trimmed.slice(0, match.index).trim();
}
