export const COOL_DEFAULT_S = 10;
export const COOL_KEY_S = 30;
export const COOL_402_S = 120;
export const COOL_429_S = 30;
export const RETRY_AFTER_CAP_S = 120;
export const RETIRE_S = 600;
export const DEMOTE_S = 120;
export const OVERLOAD_BASE_S = 30;
export const OVERLOAD_MAX_S = 300;
export const OVERLOAD_WINDOW_S = 600;

export type FailureKind = "retire" | "cool" | "demote" | "reject";

export type FailureDecision = {
  kind: FailureKind;
  seconds: number;
};

export function retryAfterSeconds(header: string | null, nowS: number): number {
  if (!header) return COOL_429_S;
  const trimmed = header.trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.min(RETRY_AFTER_CAP_S, asNumber);
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return COOL_429_S;
  return Math.min(RETRY_AFTER_CAP_S, Math.max(0, parsed / 1000 - nowS));
}

export function classifyStatus(status: number, retryAfter: string | null, nowS: number): FailureDecision {
  if (status === 401 || status === 403) return { kind: "retire", seconds: RETIRE_S };
  if (status === 503) return { kind: "demote", seconds: 0 };
  if (status === 404 || status === 410) return { kind: "demote", seconds: DEMOTE_S };
  if (status === 413 || status === 400 || status === 422) return { kind: "reject", seconds: 0 };
  if (status === 429) return { kind: "cool", seconds: retryAfterSeconds(retryAfter, nowS) };
  if (status === 408 || status === 425) return { kind: "cool", seconds: COOL_KEY_S };
  if (status === 402) return { kind: "cool", seconds: COOL_402_S };
  return { kind: "cool", seconds: COOL_DEFAULT_S };
}
