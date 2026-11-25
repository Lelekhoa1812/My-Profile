import { dropGapSentences, dropRecordTalk, stripMarkdown, stripToolMarkup } from "./answer";

const ALLOWED = ["i am liam's portfolio assistant.", "liam will answer that."];
const FRAMING = new Set([
  "about", "across", "after", "again", "approach", "architecture", "assistant", "based", "because",
  "before", "behind", "business", "design", "during", "layer", "liam", "native", "outcome", "problem",
  "question", "result", "software", "solved", "system", "technical", "their", "there", "these", "those",
  "through", "using", "value", "where", "which", "works", "would",
]);
const READ_TOOLS = new Set(["read_sections", "read_section", "lookup_fact", "search_sections"]);

type EvidencePart = { type: string; state?: string; toolName?: string; output?: unknown };

export function keepToolSentences(parts: readonly EvidencePart[], modelText: string): string {
  const corpus = readSentences(parts);
  const cleaned = dropGapSentences(dropRecordTalk(stripToolMarkup(stripMarkdown(proseFromModel(modelText)))));
  const sentences = cleaned.split(/(?<=[.!])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const complete = sentences.filter((sentence) => /[.!]$/.test(sentence));
  const kept = complete.filter((sentence) => allowed(sentence) || spansOne(sentence, corpus));
  if (kept.length > 0) return kept.join(" ");
  if (complete.length === 0) return "";
  return "I am Liam's portfolio assistant.";
}

function proseFromModel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { sentence?: unknown };
    if (typeof parsed.sentence === "string") return parsed.sentence.trim();
  } catch {
    // A stream can hold a partial sentence object.
  }
  return trimmed;
}

function allowed(sentence: string): boolean {
  return ALLOWED.includes(sentence.toLowerCase().replace(/\s+/g, " ").trim());
}

function readSentences(parts: readonly EvidencePart[]): string[] {
  const texts: string[] = [];
  for (const part of parts) {
    if (part.state && part.state !== "output-available") continue;
    const name = part.toolName ?? part.type.replace(/^tool-/, "");
    if (!READ_TOOLS.has(name)) continue;
    texts.push(...outputTexts(part.output, name));
  }
  return texts.map((text) => text.trim()).filter(Boolean);
}

function outputTexts(output: unknown, name: string): string[] {
  if (!output || typeof output !== "object") return [];
  const record = output as Record<string, unknown>;
  if ((name === "lookup_fact" || name === "search_sections") && Array.isArray(record.facts)) {
    return record.facts.flatMap((fact) => {
      if (!fact || typeof fact !== "object" || !("value" in fact) || typeof fact.value !== "string") return [];
      return [fact.value];
    });
  }
  if (name === "review_evidence" && typeof record.text === "string") return [record.text];
  if (typeof record.text === "string" && name === "read_section") return [record.text];
  if (!Array.isArray(record.sections)) return [];
  return record.sections.flatMap((section) => {
    if (!section || typeof section !== "object" || !("text" in section) || typeof section.text !== "string") return [];
    return [section.text];
  });
}

const SENTENCE_START = new Set(["a", "an", "the", "he", "his", "her", "she", "they", "their", "this", "that", "these", "those", "it"]);

function spansOne(sentence: string, corpus: readonly string[]): boolean {
  const normalized = sentence.toLowerCase().replace(/[^a-z0-9% ]/g, " ").replace(/\s+/g, " ").trim();
  const evidence = normalized.split(" ").filter((word) => word.length >= 5 && !FRAMING.has(word));
  const numbers = sentence.match(/\d[\d,]*/g) ?? [];
  const names = properNames(sentence);
  return corpus.some((section) => {
    const hay = section.toLowerCase();
    if (!names.every((name) => hay.includes(name.toLowerCase()))) return false;
    if (!numbers.every((number) => hay.includes(number) || hay.includes(number.replace(/,/g, "")))) return false;
    if (evidence.length === 0) return hay.includes(normalized);
    const hits = evidence.filter((word) => hay.includes(word)).length;
    return hits >= 2 && hits / evidence.length >= 0.33;
  });
}

function properNames(sentence: string): string[] {
  const names: string[] = [];
  for (const [index, word] of sentence.split(/\s+/).entries()) {
    const parts = word.match(/[A-Za-z][A-Za-z0-9]*/g) ?? [];
    for (const [partIndex, clean] of parts.entries()) {
      if (clean.length < 3 || !/^[A-Z]/.test(clean)) continue;
      if (index === 0 && partIndex === 0 && SENTENCE_START.has(clean.toLowerCase())) continue;
      if (FRAMING.has(clean.toLowerCase())) continue;
      names.push(clean);
    }
  }
  return names;
}
