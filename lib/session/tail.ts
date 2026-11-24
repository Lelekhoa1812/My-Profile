export function tailForModel<T>(messages: readonly T[], limit = 8): T[] {
  if (messages.length <= limit) return [...messages];
  return messages.slice(-limit);
}
