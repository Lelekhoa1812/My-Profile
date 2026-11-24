export function tailForModel<T>(messages: readonly T[], limit = 8): T[] {
  if (messages.length <= limit) return [...messages];
  let start = messages.length - limit;
  while (start > 0 && isToolMessage(messages[start])) start -= 1;
  return messages.slice(start);
}

function isToolMessage(message: unknown): boolean {
  return typeof message === "object" && message !== null && "role" in message && message.role === "tool";
}
