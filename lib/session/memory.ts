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

const FOLLOW_UP = /\b(stack|buyer|pilot|uptime|percent|agents?|retrieval)\b/i;
const SPOKEN_EMPLOYER: Record<string, string> = { "hai-au": "Hai Au", "nam-a": "Nam A", "tien-thanh": "Tien Thanh" };

export function groundedQuestion(messages: readonly UIMessage[], index: number): string {
  const message = messages[index];
  const question = message ? messageText(message) : "";
  if (!message || message.role !== "user" || namedEmployer(question) || !FOLLOW_UP.test(question)) return question;
  const prior = messages.slice(0, index).reverse().find((item) => item.role === "user" && namedEmployer(messageText(item)));
  const employer = prior ? namedEmployer(messageText(prior)) : undefined;
  if (!employer) return question;
  const spoken = SPOKEN_EMPLOYER[employer] ?? employer;
  return `${question.replace(/\?$/, "").trim()} at ${spoken}?`;
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
