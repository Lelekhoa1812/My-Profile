export function idsToRetire(stored: readonly string[], kept: readonly string[]): string[] {
  const keep = new Set(kept);
  return stored.filter((id) => !keep.has(id));
}
