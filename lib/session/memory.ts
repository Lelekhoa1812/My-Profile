import type { UIMessage } from "ai";
import type { StoredTurn } from "./turns";

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
