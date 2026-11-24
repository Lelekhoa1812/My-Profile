import type { UIMessage } from "ai";
import { namedEmployer } from "../profile/store";
import type { StoredTurn } from "./turns";

export { namedEmployer };

export function dropOtherEmployer(messages: readonly UIMessage[]): UIMessage[] {
  const question = [...messages].reverse().find((message) => message.role === "user");
  const employer = namedEmployer(question ? messageText(question) : "") || previousEmployer(messages);
  if (!employer) return [...messages];
  let skip = false;
  const kept: UIMessage[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const laterUser = messages.slice(index + 1).some((item) => item.role === "user");
    if (message.role === "user" && !laterUser) {
      kept.push(message);
      continue;
    }
    if (message.role === "user") {
      const named = namedEmployer(messageText(message));
      skip = Boolean(named && named !== employer);
      if (!skip) kept.push(message);
      continue;
    }
    if (skip) continue;
    const named = namedEmployer(messageText(message));
    if (named && named !== employer) continue;
    kept.push(message);
  }
  return kept;
}

function previousEmployer(messages: readonly UIMessage[]): string | undefined {
  const prior = messages.filter((message) => message.role === "user").slice(0, -1).reverse();
  for (const message of prior) {
    const named = namedEmployer(messageText(message));
    if (named) return named;
  }
  return undefined;
}

function messageText(message: UIMessage): string {
  return message.parts.map((part) => part.type === "text" && "text" in part ? part.text : "").join(" ");
}

const FOLLOW_UP = /\b(stack|buyer|pilot|uptime|percent|agents?|retrieval|ocr|measure|models?|score|database|bought|cut|live|deployed|production app|forecast|queue|authenticat\w*|signals?|show|draft|cloud)\b/i;
const NAMED_PRODUCT = /\b(golf|skyledge|roster|triage|survee|prophet|pedigree|writingjourney|medviet|clara|salle|meter|acnt|cva|medchat|stt-studio|estatefolio|s&p|ericsson|poptech)\b/i;
const SPOKEN_EMPLOYER: Record<string, string> = { "hai-au": "Hai Au", "nam-a": "Nam A", "tien-thanh": "Tien Thanh" };

export function groundedQuestion(messages: readonly UIMessage[], index: number): string {
  const message = messages[index];
  const question = message ? messageText(message) : "";
  if (!message || message.role !== "user" || namedEmployer(question) || NAMED_PRODUCT.test(question) || !FOLLOW_UP.test(question)) return question;
  if (/\bforecast\b/i.test(question)) {
    const product = previousProduct(messages, index);
    const stem = question.replace(/\?$/, "").trim();
    return product && /^(estatefolio|ericsson|poptech|prophet)$/.test(product) ? `${stem} for ${product}?` : question;
  }
  if (/\bqueue\b/i.test(question)) {
    const product = previousProduct(messages, index);
    const stem = question.replace(/\?$/, "").trim();
    return product === "s&p" ? `${stem} for s&p?` : question;
  }
  if (/\b(database|bought|cut|live|deployed clinical|production app)\b/i.test(question)) {
    const named = lastNamed(messages, index);
    const stem = question.replace(/\?$/, "").trim();
    if (/\b(live|deployed clinical|production app)\b/i.test(question)) return named.product ? `${stem} for ${named.product}?` : question;
    if (named.product && named.productAt >= named.employerAt) return `${stem} for ${named.product}?`;
    if (named.employer) return `${stem} at ${SPOKEN_EMPLOYER[named.employer] ?? named.employer}?`;
    return question;
  }
  const named = lastNamed(messages, index);
  const stem = question.replace(/\?$/, "").trim();
  if (named.product && named.productAt >= named.employerAt) return `${stem} for ${named.product}?`;
  if (named.employer) return `${stem} at ${SPOKEN_EMPLOYER[named.employer] ?? named.employer}?`;
  return question;
}

function lastNamed(messages: readonly UIMessage[], index: number): { employer?: string; employerAt: number; product?: string; productAt: number } {
  let employer: string | undefined;
  let product: string | undefined;
  let employerAt = -1;
  let productAt = -1;
  messages.slice(0, index).forEach((item, at) => {
    if (item.role !== "user") return;
    const text = messageText(item);
    const named = namedEmployer(text);
    const found = text.match(NAMED_PRODUCT)?.[1]?.toLowerCase();
    if (named) {
      employer = named;
      employerAt = at;
    }
    if (found) {
      product = found;
      productAt = at;
    }
  });
  return { employer, employerAt, product, productAt };
}

function previousProduct(messages: readonly UIMessage[], index: number): string | undefined {
  const prior = messages.slice(0, index).reverse().find((item) => item.role === "user" && NAMED_PRODUCT.test(messageText(item)));
  return prior ? messageText(prior).match(NAMED_PRODUCT)?.[1]?.toLowerCase() : undefined;
}

function lastUserIndex(messages: readonly UIMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return index;
  }
  return -1;
}

export function groundedUserText(messages: readonly UIMessage[]): string {
  return groundedQuestion(messages, lastUserIndex(messages));
}

export function groundFollowUp(messages: readonly UIMessage[]): UIMessage[] {
  const index = lastUserIndex(messages);
  if (index < 0) return [...messages];
  const grounded = groundedQuestion(messages, index);
  if (grounded === messageText(messages[index] ?? { id: "", role: "user", parts: [] })) return [...messages];
  return messages.map((message, item) => item === index ? { ...message, parts: [{ type: "text", text: grounded }] } : message);
}

export function withMemory(stored: readonly StoredTurn[], incoming: readonly UIMessage[]): UIMessage[] {
  if (stored.length === 0 || incoming.some((message) => message.role === "assistant")) return [...incoming];
  const prior = stored.flatMap((turn, index) => {
    if ((turn.role !== "user" && turn.role !== "assistant") || !turn.text.trim()) return [];
    const message: UIMessage = {
      id: `memory-${index}`,
      role: turn.role,
      parts: [{ type: "text", text: turn.text }],
    };
    return [message];
  });
  return [...prior, ...incoming];
}
