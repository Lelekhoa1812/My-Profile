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
  return dropSourceTail(dropRecordTalk(stripMarkdown(sentenceFromModel(stripToolMarkup(modelText)))), sourceHeadings(outputs));
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/^\s*\*\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sentenceFromModel(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { sentence?: unknown };
      if (typeof parsed.sentence === "string") return parsed.sentence.trim();
    } catch {
      // A stream can hold a partial sentence object.
    }
  }
  const closed = trimmed.match(/\{\s*"sentence"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (closed) return decodeSentence(closed[1]);
  const open = trimmed.match(/\{\s*"sentence"\s*:\s*"((?:\\.|[^"\\])*)/);
  if (open) return decodeSentence(open[1]);
  if (trimmed.startsWith('{"sentence"')) return "";
  return trimmed;
}

function decodeSentence(value: string): string {
  try {
    return (JSON.parse(`"${value}"`) as string).trim();
  } catch {
    return value.trim();
  }
}

export function stripToolMarkup(text: string): string {
  const withoutBlocks = text
    .replace(/<\s*tool_call\b[^>]*>[\s\S]*?(?:<\s*\/\s*tool_call\s*>|$)/gi, " ")
    .replace(/&lt;\s*tool_call\b[\s\S]*?(?:&lt;\s*\/\s*tool_call\s*&gt;|$)/gi, " ")
    .replace(/<\s*function\s*=[\s\S]*?(?:<\s*\/\s*function\s*>|$)/gi, " ")
    .replace(/<\s*\/?\s*(?:function|parameter)\b[^>]*>/gi, " ");
  return withoutBlocks
    .split("\n")
    .filter((line) => !/tool_call|function\s*=|parameter\s*=/i.test(line))
    .join("\n")
    .trim();
}

export function dropRecordTalk(text: string): string {
  const sentences = text.trim().split(/(?<=[.!])\s+/).map(stripRecordLead).filter(Boolean);
  const kept = sentences.filter((sentence) => !narratesRecord(sentence));
  const next = kept.join(" ").trim();
  return next || text.trim();
}

function stripRecordLead(sentence: string): string {
  const stripped = sentence
    .replace(/^(according to|based on) the record,\s*/i, "")
    .replace(/^the record notes that\s*/i, "")
    .trim();
  return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : "";
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
