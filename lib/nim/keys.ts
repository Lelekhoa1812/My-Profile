const NUMBERED_KEY_COUNT = 9;

export function loadNimKeys(env: Record<string, string | undefined>): string[] {
  const fromList = (env.NVIDIA_NIM_API_KEYS ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const numbered: string[] = [];
  for (let index = 1; index <= NUMBERED_KEY_COUNT; index += 1) {
    const value = env[`NVIDIA_NIM_API_KEY_${index}`]?.trim();
    if (value) numbered.push(value);
  }
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const key of [...fromList, ...numbered]) {
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function emptyNimSlots(env: Record<string, string | undefined>): number[] {
  const empty: number[] = [];
  for (let index = 1; index <= NUMBERED_KEY_COUNT; index += 1) {
    if (!env[`NVIDIA_NIM_API_KEY_${index}`]?.trim()) empty.push(index);
  }
  return empty;
}
