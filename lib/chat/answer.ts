import profile from "../../content/profile.json";
import { employerMentioned, namedEmployer } from "../profile/store";

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

export function turnToStore(aborted: boolean, outputs: readonly unknown[], modelText: string, question = ""): string | null {
  if (aborted) return null;
  const text = displayAnswer(
    outputs.map((output) => ({ type: "tool-output", state: "output-available", output })),
    modelText,
    question,
  );
  return text.trim() ? text : holdAnswer();
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

export function displayAnswer(parts: readonly AnswerPart[], modelText: string, question = ""): string {
  const outputs = parts
    .filter((part) => part.type.startsWith("tool-") && part.state === "output-available")
    .map((part) => part.output)
    .filter((output): output is Record<string, unknown> => typeof output === "object" && output !== null);
  if (outputs.some((output) => output.reason === "unavailable")) return holdAnswer();
  const primary = primaryOutputs(outputs);
  let text = dropGapSentences(dropSourceTail(
    dropRecordTalk(stripMarkdown(sentenceFromModel(stripToolMarkup(modelText)))),
    sourceHeadings(outputs),
  ));
  const cleaned = text;
  if (primary.length > 0 && cleaned.trim()) text = certifySentences(separateAxis(cleaned), evidenceCorpus(primary), evidenceBlocks(primary));
  if (!text.trim() && primary.length > 0) {
    const outcome = recordedOutcome(primary);
    const focused = question.trim() ? focusOnQuestion(outcome, primary, question) : outcome;
    return focused || (cleaned.trim() ? holdAnswer() : "");
  }
  if (question.trim() && primary.length > 0 && text.trim()) return focusOnQuestion(text, primary, question);
  if (text.trim() && primary.length > 0 && (text.split(/\s+/).length < 22 || lacksMeasuredFigure(text, primary) || lacksApproval(text, primary))) text = withSectionProof(text, primary);
  return text;
}

const ASK_STOP = new Set(["what", "does", "did", "does", "do", "the", "his", "her", "for", "and", "with", "from", "that", "this", "into", "about", "when", "where", "which", "who", "how", "was", "were", "are", "you", "your", "him", "she", "they", "their", "have", "has", "had", "not", "any", "can", "will", "just", "than", "then", "also", "only", "before", "after"]);

function focusOnQuestion(text: string, outputs: readonly Record<string, unknown>[], question: string): string {
  const block = matchingBlock(outputs, question);
  if (!block.trim()) return text;
  const words = askWords(question);
  const blockSentences = plainSentences(block);
  const shown = plainSentences(text);
  const ranked = blockSentences
    .map((sentence) => ({ sentence, score: askScore(question, sentence, words) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  const decision = blockSentences.find((sentence) => isDecision(question, sentence));
  const unique = blockSentences.find((sentence) => words.some((word) => word.length >= 5 && mentions(sentence, word) && blockSentences.filter((item) => mentions(item, word)).length === 1));
  const chosen: string[] = [];
  const push = (sentence?: string) => {
    const named = sentence ? namedSubject(sentence, blockSentences) : "";
    if (!named || chosen.includes(named) || chosen.length >= 2) return;
    if (named.split(/\s+/).length < 4 && !isDecision(question, named)) return;
    chosen.push(named);
  };
  push(unique);
  push(decision);
  if (/\b(do|did|build|built|work|role)\b/i.test(question)) {
    push(blockSentences.find((sentence) => isToolList(sentence)));
    if (!chosen.some((sentence) => /\b(led|built|uses|owned|owns|covers|percent|python)\b/i.test(sentence))) {
      push(blockSentences.find((sentence) => /\b(led|built|owned|owns|covers|trains)\b/i.test(sentence)));
    }
  }
  push(blockSentences.find((sentence) => /black caviar/i.test(sentence) && /\b(mate|pedigree|engine)\b/i.test(question)));
  for (const item of ranked) push(item.sentence);
  const body = chosen.length > 0
    ? chosen
    : blockSentences.filter((sentence) => !isLabel(sentence) && !dateOnly(sentence) && !exposesGap(sentence)).slice(0, 2);
  return keptOffer(question, shown, withIdentity(question, withPeriod(body, blockSentences), blockSentences));
}

function titledInQuestion(question: string, block: string): boolean {
  const title = (plainSentences(block)[0] ?? "").split(/[,.]/)[0] ?? "";
  return title.split(/\s+/).some((word) => /^[A-Z]/.test(word) && word.length >= 4 && new RegExp(`\\b${word}\\b`, "i").test(question));
}

function matchingBlock(outputs: readonly Record<string, unknown>[], question: string): string {
  const blocks = sectionBlocks(outputs);
  const words = askWords(question);
  const employer = namedEmployer(question);
  let best = blocks[0] ?? "";
  let bestScore = -1;
  for (const block of blocks) {
    const sentences = plainSentences(block);
    const chronological = /\b(before|after)\b/.test(question.toLowerCase());
    let score = sentences.reduce((best, sentence) => Math.max(best, askScore(question, sentence, words)), 0);
    if (employer && !chronological && employerMentioned(employer, block)) score += 8;
    if (!chronological && titledInQuestion(question, block)) score += 8;
    if (score > bestScore) {
      best = block;
      bestScore = score;
    }
  }
  return best;
}

function keptOffer(question: string, shown: readonly string[], proof: string): string {
  if (!proof.trim() || namedEmployer(question) || specificQuestion(question)) return proof;
  const offer = shown.find((sentence) => /\b(go deeper|would you like)\b/i.test(sentence));
  if (!offer || proof.toLowerCase().includes(offer.toLowerCase())) return proof;
  return `${proof} ${offer}`.trim();
}

function specificQuestion(question: string): boolean {
  return /\b(write|show|preview|approv|cut|pilot|percent|measure|bert|score|sell|sold|buyer|purchas|acquir)\b/i.test(question);
}

function withIdentity(question: string, proof: string, blockSentences: readonly string[]): string {
  const opening = blockSentences[0];
  if (!opening || !proof.trim()) return proof;
  const chronological = /\b(before|after)\b/i.test(question);
  if (!chronological && opening.split(/\s+/).length > 2) return proof;
  if (/\bpreview\b/i.test(proof) && /\bapprov/i.test(proof)) return proof;
  const token = opening.split(",")[0].replace(/[.]+$/, "").trim();
  if (token.length < 4 || proof.toLowerCase().includes(token.toLowerCase())) return proof;
  const sentence = /[.!]$/.test(opening) ? opening : `${opening}.`;
  return `${sentence} ${proof}`.trim();
}

function withPeriod(sentences: readonly string[], blockSentences: readonly string[]): string {
  const joined = sentences.join(" ");
  if (/\b20\d{2}\b/.test(joined) || sentences.length >= 3) return joined;
  const period = blockSentences.find((sentence) => /\b20\d{2}\b/.test(sentence) && sentence.split(/\s+/).length <= 18);
  return period ? `${joined} ${period}` : joined;
}

function mentions(sentence: string, word: string): boolean {
  if (new RegExp(`\\b${word}(?:s|es|ed|ing)?\\b`, "i").test(sentence)) return true;
  if (word === "ocr" && /\b\w*ocr\b/i.test(sentence)) return true;
  if (word.endsWith("s") && word.length > 5 && new RegExp(`\\b${word.slice(0, -1)}\\b`, "i").test(sentence)) return true;
  if (word.length >= 6 && new RegExp(`\\b${word}ion\\b`, "i").test(sentence)) return true;
  return word.length >= 8 && new RegExp(`\\b${word.slice(0, word.length - 3)}`, "i").test(sentence);
}

function askWords(question: string): string[] {
  return [...new Set(question.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !ASK_STOP.has(word)))];
}

function askScore(question: string, sentence: string, words: readonly string[]): number {
  if (exposesGap(sentence)) return 0;
  if (isLabel(sentence) && !isDecision(question, sentence) && !words.some((word) => mentions(sentence, word))) return 0;
  const hits = words.filter((word) => mentions(sentence, word)).length;
  const boundary = (/\baxis\b/i.test(question) || /\b(write|preview|approv)/i.test(question)) && /\bseparate\b/i.test(sentence) && /\baxis\b/i.test(sentence) ? 3 : 0;
  return hits + boundary + (isDecision(question, sentence) ? 4 : 0);
}

function namedSubject(sentence: string, blockSentences: readonly string[]): string {
  const namesAxis = blockSentences.some((item) => /\baxis is a separate\b/i.test(item));
  if (namesAxis && /^it\b/i.test(sentence) && /\bpreview\b/i.test(sentence)) return sentence.replace(/^It\b/, "Axis");
  return sentence;
}

function isDecision(question: string, sentence: string): boolean {
  if (/\bocr\b/i.test(question)) return /\b\w*ocr\b/i.test(sentence);
  if (/\b(write|show|preview|approv)\b/i.test(question) && /\bpreview\b/i.test(sentence) && /\bapprov/i.test(sentence)) return true;
  if (/\b(sell|sold|buyer|purchas|acquir|bought)\b/i.test(question) && /\b(sold|acquired)\b/i.test(sentence)) return true;
  if (/\b(store|stored|stores|stay|stays)\b/i.test(question) && /\bmongodb\b/i.test(sentence)) return true;
  if (/\bstack\b/i.test(question) && /\bpython\b/i.test(sentence)) return true;
  if (/\b(run|running|deploy)\b/i.test(question) && /\b(raspberry|jetson|aws|docker|fastapi)\b/i.test(sentence)) return true;
  if (/\bbertscore\b/i.test(question) && /\bbertscore\b/i.test(sentence)) return true;
  if (/\bembeddings?\b/i.test(question) && /\bembeddings?\b/i.test(sentence)) return true;
  if (/\b(poptech|electricity)\b/i.test(question) && /\btft\b/i.test(sentence)) return true;
  if (/\b(use|used|operate|operates)\b/i.test(question) && (/\bthe stack is\b/i.test(sentence) || isToolList(sentence))) return true;
  if (/\brepositor(?:y|ies)\b/i.test(question) && /\brepositor(?:y|ies)\b/i.test(sentence)) return true;
  if (/\btraces?\b/i.test(question) && /\btraces?\b/i.test(sentence)) return true;
  if (/\b(reduce|reduced|reduction|less)\b/i.test(question) && /\bpercent\b/i.test(sentence)) return true;
  if (/\b(refuse|send)\b/i.test(question) && /\bdoes not send\b/i.test(sentence)) {
    if (/\bexport\b/i.test(question)) return /\bexport\b/i.test(sentence);
    if (/\bdraft\b/i.test(question)) return /\bdraft\b/i.test(sentence);
    return true;
  }
  return /\b(cut|pilot|percent|measure|bert|score|metric)\b/i.test(question) && /\bpercent\b/i.test(sentence);
}

function plainSentences(text: string): string[] {
  return text.split(/(?<=[.!])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence && !exposesGap(sentence)).map(plainSentence).filter(Boolean);
}

function separateAxis(text: string): string {
  return text.replace(/\bthe Axion system called Axis\b/gi, "Axis").replace(/\bAxion system\b/gi, "Axis");
}

function withSectionProof(answer: string, outputs: readonly Record<string, unknown>[]): string {
  const block = sectionBlocks(outputs)[0];
  if (!block) return answer;
  const candidates = block.split(/(?<=[.!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !exposesGap(sentence))
    .map(plainSentence)
    .filter((sentence) => sentence.split(/\s+/).length > 3 && !isLabel(sentence));
  const approval = candidates.filter((sentence) => missingApproval(answer, sentence));
  const measured = candidates.filter((sentence) => missingMeasured(answer, sentence));
  const technical = candidates.filter((sentence) => technicalProof(answer, sentence) && !otherProduct(answer, sentence));
  const extras = [...approval, ...measured, ...(technical.length > 0 ? technical : candidates.filter((sentence) => newProof(answer, sentence)))]
    .filter((sentence, index, list) => list.indexOf(sentence) === index)
    .slice(0, 3);
  const period = periodSentence(answer, block);
  const chosen = period && !extras.some((sentence) => /\b20\d{2}\b/.test(sentence)) ? [...extras, period] : extras;
  return [answer, ...chosen].filter(Boolean).join(" ");
}

function lacksApproval(answer: string, outputs: readonly Record<string, unknown>[]): boolean {
  if (/\b(preview|approv)/i.test(answer)) return false;
  const block = sectionBlocks(outputs)[0] ?? "";
  return /\bpreview\b/i.test(block) && /\bapprov/i.test(block);
}

function missingApproval(answer: string, sentence: string): boolean {
  if (/\b(preview|approv)/i.test(answer)) return false;
  return /\bpreview\b/i.test(sentence) && /\bapprov/i.test(sentence);
}

function lacksMeasuredFigure(answer: string, outputs: readonly Record<string, unknown>[]): boolean {
  if (/\b(percent|million)\b/i.test(answer)) return false;
  return sectionBlocks(outputs).some((block) => /\b(percent|million)\b/i.test(block));
}

function missingMeasured(answer: string, sentence: string): boolean {
  if (otherProduct(answer, sentence)) return false;
  if (/\bpercent\b/i.test(sentence) && !/\bpercent\b/i.test(answer)) return true;
  return /\bmillion\b/i.test(sentence) && !/\bmillion\b/i.test(answer);
}

function periodSentence(answer: string, block: string): string {
  if (/\b20\d{2}\b/.test(answer)) return "";
  return block.split(/(?<=[.!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !exposesGap(sentence))
    .map(plainSentence)
    .find((sentence) => /\b20\d{2}\b/.test(sentence)) ?? "";
}

function isLabel(sentence: string): boolean {
  if (isToolList(sentence)) return false;
  return sentence.replace(/[.]+$/, "").split(/\s+/).filter((word) => /^[a-z]{4,}/.test(word)).length === 0;
}

function isToolList(sentence: string): boolean {
  const parts = sentence.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 && parts.every((part) => /^(?:and\s+)?[A-Z0-9][A-Za-z0-9.+#/-]{1,24}$/.test(part.replace(/\.$/, "")));
}

function dateOnly(sentence: string): boolean {
  return /^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(sentence) && sentence.split(/\s+/).length <= 8;
}

function technicalProof(answer: string, sentence: string): boolean {
  const hay = answer.toLowerCase();
  const names = sentence.match(/\b[A-Z][A-Za-z0-9.+&-]{2,}\b/g) ?? [];
  const fresh = names.filter((name) => !LEAD_WORDS.has(name.toLowerCase()) && !hay.includes(name.toLowerCase()));
  return fresh.length >= 2;
}

function otherProduct(answer: string, sentence: string): boolean {
  const left = namedProduct(answer);
  const right = namedProduct(sentence);
  return Boolean(left && right && left !== right);
}

function namedProduct(text: string): "axis" | "foodflow" | "harry" | "medswin" | undefined {
  const value = text.toLowerCase();
  if (value.includes("foodflow")) return "foodflow";
  if (/\baxis\b/.test(value)) return "axis";
  if (value.includes("harry") || value.includes("black caviar")) return "harry";
  if (value.includes("medswin") || value.includes("bertscore")) return "medswin";
  return undefined;
}

function newProof(answer: string, sentence: string): boolean {
  const hay = answer.toLowerCase().replace(/,/g, "");
  const numbers = sentence.match(/\d[\d,]*/g) ?? [];
  if (numbers.some((value) => !hay.includes(value.replace(/,/g, "")))) return true;
  const names = sentence.match(/\b[A-Z][A-Za-z0-9.+&-]{2,}\b/g) ?? [];
  return names.some((name) => !LEAD_WORDS.has(name.toLowerCase()) && !hay.includes(name.toLowerCase()));
}

function recordedOutcome(outputs: readonly Record<string, unknown>[]): string {
  for (const block of sectionBlocks(outputs)) {
    const sentences = block.split(/(?<=[.!])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence && !exposesGap(sentence)).map(plainSentence).filter(Boolean);
    const lead = sentences.slice(0, 6);
    const measured = sentences.filter((sentence) => !lead.includes(sentence) && /\b(percent|million)\b/i.test(sentence));
    const plain = [...lead, ...measured];
    if (plain.length > 0) return plain.join(" ");
  }
  return "";
}

function hasSectionText(output: Record<string, unknown>): boolean {
  return Array.isArray(output.sections) && output.sections.some((section) => typeof section === "object" && section !== null && "text" in section && typeof section.text === "string" && section.text.trim().length > 0);
}

function primaryOutputs(outputs: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  const withText = outputs.filter(hasSectionText);
  if (withText.length > 0) return [withText[0]];
  const facts = outputs.filter((output) => Array.isArray(output.facts) && output.facts.length > 0);
  return facts.length > 0 ? facts : [...outputs];
}

function evidenceBlocks(outputs: readonly Record<string, unknown>[]): string[] {
  const blocks = sectionBlocks(outputs);
  for (const output of outputs) {
    if (!Array.isArray(output.facts)) continue;
    for (const fact of output.facts) {
      if (typeof fact === "object" && fact !== null && "value" in fact && typeof fact.value === "string") blocks.push(fact.value);
    }
  }
  return blocks;
}

function sectionBlocks(outputs: readonly Record<string, unknown>[]): string[] {
  const blocks: string[] = [];
  for (const output of outputs) {
    if (typeof output.text === "string") blocks.push(output.text);
    if (!Array.isArray(output.sections)) continue;
    for (const section of output.sections) {
      if (typeof section === "object" && section !== null && "text" in section && typeof section.text === "string") blocks.push(section.text);
    }
  }
  return blocks;
}

function plainSentence(sentence: string): string {
  const plain = sentence.replace(/^The resume (?:records|says) (?:that )?/i, "").trim();
  return plain ? plain[0].toUpperCase() + plain.slice(1) : "";
}

function sectionSentences(outputs: readonly Record<string, unknown>[]): string[] {
  const texts: string[] = [];
  for (const output of outputs) {
    if (typeof output.text === "string") texts.push(output.text);
    if (!Array.isArray(output.sections)) continue;
    for (const section of output.sections) {
      if (typeof section === "object" && section !== null && "text" in section && typeof section.text === "string") texts.push(section.text);
    }
  }
  return texts.flatMap((text) => text.split(/(?<=[.!])\s+/).map((sentence) => sentence.trim()).filter(Boolean));
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
  return kept.join(" ").trim();
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
    || /does not specify/i.test(sentence)
    || /does not list/i.test(sentence);
}

export function dropGapSentences(text: string): string {
  return text.trim().split(/(?<=[.!])\s+/).filter((sentence) => sentence && !exposesGap(sentence)).join(" ").trim();
}

const LEAD_WORDS = new Set(["the", "a", "an", "he", "his", "her", "this", "that", "ask", "liam", "dang"]);
const SENTENCE_STARTS = new Set(["about", "after", "also", "because", "before", "both", "could", "during", "each", "if", "let", "once", "only", "please", "should", "since", "some", "then", "there", "these", "those", "when", "while", "would"]);
const CONTENT_STOP = new Set(["that", "this", "with", "from", "have", "what", "when", "where", "which", "about", "their", "there", "would", "like"]);

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

const IDENTITY_NAMES = new Set(["dang", "khoa"]);

export function certifySentences(text: string, evidence: string, blocks: readonly string[] = []): string {
  const hay = evidence.toLowerCase();
  const pools = blocks.length > 0 ? blocks : [evidence];
  return text.trim().split(/(?<=[.!])\s+/).map((sentence) => keptSentenceForm(sentence, hay, pools)).filter(Boolean).join(" ").trim();
}

function keptSentenceForm(sentence: string, hay: string, pools: readonly string[]): string {
  if (/liam will answer/i.test(sentence) || /i am liam's portfolio assistant/i.test(sentence)) return sentence;
  if (!quantitiesInEvidence(sentence, hay) || !numbersShareOneBlock(sentence, pools) || !numbersShareOneClause(sentence, pools) || !percentStaysInClause(sentence, pools) || deniesMeasuredFigure(sentence, hay)) return "";
  const named = namesInEvidence(sentence, hay) ? sentence : sentenceWithoutUnknownNames(sentence, hay);
  const grounded = withoutJoinedModifier(named, hay);
  if (!grounded || !namesInEvidence(grounded, hay)) return "";
  const words = contentWords(grounded);
  if (words.length === 0) return named;
  const hits = words.filter((word) => hay.includes(word)).length;
  return hits / words.length >= 0.5 ? grounded : "";
}

function withoutJoinedModifier(sentence: string, hay: string): string {
  return sentence.split(/\s+/).filter((word) => {
    const token = cleanToken(word).toLowerCase();
    if (token.length < 4 || CONTENT_STOP.has(token)) return true;
    if (new RegExp(`\\b${token}\\b`).test(hay)) return true;
    return !new RegExp(`\\b${token}[a-z]+\\b`).test(hay);
  }).join(" ").replace(/\s+/g, " ").trim();
}

function sentenceWithoutUnknownNames(sentence: string, hay: string): string {
  return sentence.split(/\s+/).filter((word, index) => {
    const raw = cleanToken(word);
    if (!/^[A-Z][A-Za-z0-9.+&-]{2,}$/.test(raw)) return true;
    if (index === 0 && (LEAD_WORDS.has(raw.toLowerCase()) || SENTENCE_STARTS.has(raw.toLowerCase()))) return true;
    return hay.includes(raw.toLowerCase());
  }).join(" ").replace(/\s+/g, " ").trim();
}

function numbersShareOneClause(sentence: string, pools: readonly string[]): boolean {
  const numbers = sentence.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  if (numbers.length < 2) return true;
  return pools.some((block) => block.split(/, and |;|(?<=[.!])\s+/).some((clause) => {
    const hay = clause.toLowerCase().replace(/,/g, "");
    return numbers.every((number) => new RegExp(`(?<![\\d])${number.replace(/,/g, "")}(?![\\d])`).test(hay));
  }));
}

function percentStaysInClause(sentence: string, pools: readonly string[]): boolean {
  const numbers = sentence.match(/\d[\d,]*(?:\.\d+)?(?=\s*percent\b)/gi) ?? [];
  if (numbers.length === 0) return true;
  const words = contentWords(sentence).filter((word) => word !== "percent");
  if (words.length === 0) return true;
  return pools.some((block) => numbers.every((number) => {
    const raw = number.replace(/,/g, "");
    return block.split(/, and |;|(?<=[.!])\s+/).some((clause) => {
      const hay = clause.toLowerCase().replace(/,/g, "");
      if (!new RegExp(`(?<![\\d])${raw}(?![\\d])`).test(hay)) return false;
      return words.some((word) => hay.includes(word));
    });
  }));
}

function deniesMeasuredFigure(sentence: string, evidence: string): boolean {
  if (!/\b(percent|million)\b/i.test(evidence)) return false;
  return /\b(no|not|nothing|without)\b/i.test(sentence) && /\b(metric|figure|percent|pilot|recorded|record)\b/i.test(sentence);
}

function numbersShareOneBlock(sentence: string, pools: readonly string[]): boolean {
  const numbers = sentence.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  if (numbers.length === 0) return true;
  const names = (sentence.match(/\b[A-Z][A-Za-z0-9.+&-]{2,}\b/g) ?? [])
    .map((name) => name.toLowerCase())
    .filter((name) => !LEAD_WORDS.has(name) && !IDENTITY_NAMES.has(name));
  return pools.some((block) => {
    const digits = block.toLowerCase().replace(/,/g, "");
    if (!numbers.every((raw) => new RegExp(`(?<![\\d])${raw.replace(/,/g, "")}(?![\\d])`).test(digits))) return false;
    return names.every((name) => block.toLowerCase().includes(name));
  });
}

function quantitiesInEvidence(sentence: string, hay: string): boolean {
  const numbers = sentence.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const digits = hay.replace(/,/g, "");
  return numbers.every((raw) => new RegExp(`(?<![\\d])${raw.replace(/,/g, "")}(?![\\d])`).test(digits));
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
    if (index === 0 && (LEAD_WORDS.has(raw.toLowerCase()) || SENTENCE_STARTS.has(raw.toLowerCase()))) continue;
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
