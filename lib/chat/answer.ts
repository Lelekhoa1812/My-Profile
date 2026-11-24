import profile from "../../content/profile.json";

type AnswerPart = { type: string; state?: string; output?: unknown };

export function holdAnswer(): string {
  const name = factValue("full_name");
  const known = factValue("also_known_as");
  const title = factValue("public_title");
  if (!name || !title) return "I am Liam's portfolio assistant.";
  const article = /^[aeiou]/i.test(title) ? "an" : "a";
  const who = known ? `${name}, also called ${known},` : name;
  return `${who} is ${article} ${title}. Ask about a role, a product, or a skill to go deeper.`;
}

function factValue(key: string): string {
  const fact = profile.facts.find((item) => item.key === key);
  return typeof fact?.value === "string" ? fact.value.trim() : "";
}

export function turnToStore(aborted: boolean, outputs: readonly unknown[], modelText: string): string | null {
  if (aborted) return null;
  return keptSentence(outputs, modelText);
}

export function shownAnswer(draft: string, done: boolean, hasReply: boolean): string {
  return done && hasReply && !draft.trim() ? holdAnswer() : draft;
}

export function keptSentence(outputs: readonly unknown[], modelText: string): string {
  const text = displayAnswer(
    outputs.map((output) => ({ type: "tool-output", state: "output-available", output })),
    modelText,
  );
  return text.trim() ? text : holdAnswer();
}

export function displayAnswer(parts: readonly AnswerPart[], modelText: string): string {
  const outputs = parts
    .filter((part) => part.type.startsWith("tool-") && part.state === "output-available")
    .map((part) => part.output)
    .filter((output): output is Record<string, unknown> => typeof output === "object" && output !== null);
  if (outputs.some((output) => output.reason === "unavailable")) return holdAnswer();
  let text = dropGapSentences(dropSourceTail(
    dropRecordTalk(stripMarkdown(sentenceFromModel(stripToolMarkup(modelText)))),
    sourceHeadings(outputs),
  ));
  const cleaned = text;
  if (outputs.length > 0 && cleaned.trim()) text = certifySentences(cleaned, evidenceCorpus(outputs));
  if (outputs.length > 0 && cleaned.trim() && !text.trim()) return holdAnswer();
  return text;
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
    .replace(/^the record says (?:that )?/i, "")
    .trim();
  return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : "";
}

function exposesGap(sentence: string): boolean {
  return /the record does not/i.test(sentence)
    || /the record could not be read/i.test(sentence)
    || /the record did not answer/i.test(sentence)
    || /there is no record/i.test(sentence)
    || /i do not have/i.test(sentence)
    || /not in the record/i.test(sentence)
    || /\bunnamed\b/i.test(sentence)
    || /does not specify/i.test(sentence);
}

export function dropGapSentences(text: string): string {
  return text.trim().split(/(?<=[.!])\s+/).filter((sentence) => sentence && !exposesGap(sentence)).join(" ").trim();
}

const LEAD_WORDS = new Set(["the", "a", "an", "he", "his", "her", "this", "that", "ask", "liam", "dang"]);
const CONTENT_STOP = new Set(["that", "this", "with", "from", "have", "what", "when", "where", "which", "about", "their", "there"]);

export function evidenceCorpus(outputs: readonly Record<string, unknown>[]): string {
  const identity = ["full_name", "also_known_as", "public_title", "page_title"].map(factValue).filter(Boolean);
  return [...identity, collectStrings(outputs)].filter(Boolean).join("\n");
}

function collectStrings(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(collectStrings).filter(Boolean).join("\n");
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .filter(([key]) => !["sectionId", "sourceType", "kind", "match", "found", "reason"].includes(key))
      .map(([, child]) => collectStrings(child))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function certifySentences(text: string, evidence: string): string {
  const hay = evidence.toLowerCase();
  return text.trim().split(/(?<=[.!])\s+/).map((sentence) => keptSentenceForm(sentence, hay)).filter(Boolean).join(" ").trim();
}

function keptSentenceForm(sentence: string, hay: string): string {
  if (/liam will answer/i.test(sentence) || /i am liam's portfolio assistant/i.test(sentence)) return sentence;
  if (!quantitiesInEvidence(sentence, hay)) return "";
  const named = namesInEvidence(sentence, hay) ? sentence : sentenceWithoutUnknownNames(sentence, hay);
  if (!named || !namesInEvidence(named, hay)) return "";
  const words = contentWords(named);
  if (words.length === 0) return named;
  const hits = words.filter((word) => hay.includes(word)).length;
  return hits / words.length >= 0.5 ? named : "";
}

function sentenceWithoutUnknownNames(sentence: string, hay: string): string {
  return sentence.split(/\s+/).filter((word, index) => {
    const raw = cleanToken(word);
    if (!/^[A-Z][A-Za-z0-9.+&-]{2,}$/.test(raw)) return true;
    if (index === 0 && LEAD_WORDS.has(raw.toLowerCase())) return true;
    return hay.includes(raw.toLowerCase());
  }).join(" ").replace(/\s+/g, " ").trim();
}

function quantitiesInEvidence(sentence: string, hay: string): boolean {
  const numbers = sentence.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return numbers.every((raw) => new RegExp(`(?<![\\d])${raw.replace(/,/g, "")}(?![\\d])`).test(hay));
}

function namesInEvidence(sentence: string, hay: string): boolean {
  const phrases = sentence.match(/[A-Z][A-Za-z0-9.+&-]*(?:\s+(?:the|of|and|a|an|&)\s+[A-Z][A-Za-z0-9.+&-]*|\s+[A-Z][A-Za-z0-9.+&-]*)+/g) ?? [];
  if (phrases.some((name) => !hay.includes(cleanToken(name).toLowerCase()))) return false;
  const acronyms = sentence.match(/\b[A-Z]{2,}\b/g) ?? [];
  if (acronyms.some((name) => !hay.includes(cleanToken(name).toLowerCase()))) return false;
  const words = sentence.split(/\s+/);
  for (let index = 0; index < words.length; index += 1) {
    const raw = cleanToken(words[index]);
    if (!/^[A-Z][A-Za-z0-9.+&-]{2,}$/.test(raw)) continue;
    if (index === 0 && LEAD_WORDS.has(raw.toLowerCase())) continue;
    if (phrases.some((name) => name.includes(raw))) continue;
    if (!hay.includes(raw.toLowerCase())) return false;
  }
  return true;
}

function cleanToken(value: string): string {
  return value.replace(/^[("']+|[).,!;:"']+$/g, "").trim();
}

function contentWords(sentence: string): string[] {
  return sentence.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !CONTENT_STOP.has(word));
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
