export const SILENCE = "The record does not include that.";
export const UNREAD = "The record could not be read.";
export const MISSED = "The record did not answer this time.";

type AnswerPart = { type: string; state?: string; output?: unknown };

export function turnToStore(aborted: boolean, outputs: readonly unknown[], modelText: string): string | null {
  if (aborted) return null;
  return keptSentence(outputs, modelText);
}

export function shownAnswer(draft: string, done: boolean, hasReply: boolean): string {
  return done && hasReply && !draft.trim() ? MISSED : draft;
}

export function keptSentence(outputs: readonly unknown[], modelText: string): string {
  const text = displayAnswer(
    outputs.map((output) => ({ type: "tool-output", state: "output-available", output })),
    modelText,
  );
  return text.trim() ? text : MISSED;
}

export function displayAnswer(parts: readonly AnswerPart[], modelText: string): string {
  const outputs = parts
    .filter((part) => part.type.startsWith("tool-") && part.state === "output-available")
    .map((part) => part.output)
    .filter((output): output is Record<string, unknown> => typeof output === "object" && output !== null);
  if (outputs.some((output) => output.reason === "unavailable")) return UNREAD;
  if (outputs.length > 0 && outputs.every((output) => output.found === false)) return SILENCE;
  return dropSourceTail(dropRecordTalk(sentenceFromModel(stripToolMarkup(modelText))), sourceHeadings(outputs));
}

export function sentenceFromModel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { sentence?: unknown };
    if (typeof parsed.sentence === "string") return parsed.sentence.trim();
  } catch {
    const match = trimmed.match(/^\{\s*"sentence"\s*:\s*"((?:\\.|[^"\\])*)/);
    if (!match) return trimmed.startsWith('{"sentence"') ? "" : trimmed;
    try {
      return JSON.parse(`"${match[1]}"`) as string;
    } catch {
      return match[1];
    }
  }
  return trimmed;
}

function stripToolMarkup(text: string): string {
  const stripped = text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, " ")
    .replace(/<\/?(?:function|parameter)(?:=[^>\n]*)?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped;
}

export function dropRecordTalk(text: string): string {
  const sentences = text.trim().split(/(?<=[.!])\s+/);
  const kept = sentences.filter((sentence) => !narratesRecord(sentence));
  const next = kept.join(" ").trim();
  return next || text.trim();
}

function narratesRecord(sentence: string): boolean {
  return /\bthe record (lists|says|shows|states|reads|notes|gives)\b/i.test(sentence)
    || /\bfield reads\b/i.test(sentence)
    || /\b(title|page) field\b/i.test(sentence);
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
