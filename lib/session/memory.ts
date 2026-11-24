import type { UIMessage } from "ai";
import type { StoredTurn } from "./turns";

export function namedEmployer(text: string): "axion" | "harry" | "medswin" | "mizco" | undefined {
  const value = text.toLowerCase();
  if (/\b(axion|axis|foodflow)\b/.test(value)) return "axion";
  if (/\bharry\b/.test(value) || value.includes("black caviar")) return "harry";
  if (/\bmedswin\b/.test(value) || value.includes("bertscore")) return "medswin";
  if (/\bmizco\b/.test(value)) return "mizco";
  return undefined;
}

export function dropOtherEmployer(messages: readonly UIMessage[]): UIMessage[] {
  const question = [...messages].reverse().find((message) => message.role === "user");
  const employer = namedEmployer(question ? messageText(question) : "");
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

function messageText(message: UIMessage): string {
  return message.parts.map((part) => part.type === "text" && "text" in part ? part.text : "").join(" ");
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
