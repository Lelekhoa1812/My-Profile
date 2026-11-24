import {
  classifyStatus,
  OVERLOAD_BASE_S,
  OVERLOAD_MAX_S,
  OVERLOAD_WINDOW_S,
  type FailureDecision,
} from "./failures";

const PER_MINUTE = 30;
const WINDOW_S = 60;

export type Clock = () => number;

export type AcquireResult =
  | { ok: true; slot: number }
  | { ok: false; reason: "exhausted" | "busy"; retryAfterS: number };

type KeySlot = {
  slot: number;
  secret: string;
  retiredUntil: number;
  coolUntil: Map<string, number>;
  sentAt: number[];
  inflight: number;
};

export class NimPool {
  private readonly slots: KeySlot[];
  private readonly modelDemotedUntil = new Map<string, number>();
  private readonly overload = new Map<string, { count: number; last: number }>();

  constructor(
    secrets: readonly string[],
    private readonly clock: Clock = () => Date.now() / 1000,
    private readonly random: () => number = Math.random,
  ) {
    this.slots = secrets.map((secret, index) => ({
      slot: index + 1,
      secret,
      retiredUntil: 0,
      coolUntil: new Map(),
      sentAt: [],
      inflight: 0,
    }));
  }

  get size(): number {
    return this.slots.length;
  }

  toJSON(): { slots: number; inflight: number[]; demoted: string[] } {
    const now = this.clock();
    return {
      slots: this.slots.length,
      inflight: this.slots.map((slot) => slot.inflight),
      demoted: [...this.modelDemotedUntil.entries()]
        .filter(([, until]) => until > now)
        .map(([model]) => model),
    };
  }

  secretFor(slotNumber: number): string {
    const slot = this.slots.find((item) => item.slot === slotNumber);
    if (!slot) throw new Error(`Unknown key slot ${slotNumber}`);
    return slot.secret;
  }

  isModelDemoted(model: string): boolean {
    return (this.modelDemotedUntil.get(model) ?? 0) > this.clock();
  }

  acquire(model: string): AcquireResult {
    const now = this.clock();
    const usable = this.slots.filter((slot) => slot.retiredUntil <= now);
    if (usable.length === 0) return { ok: false, reason: "exhausted", retryAfterS: this.soonestRetire(now) };
    const pool = shuffle(usable, this.random);
    for (const slot of pool) this.purge(slot, now);
    const ready = pool.filter((slot) => this.readyAt(slot, model, now) <= now);
    if (ready.length === 0) {
      const soonest = Math.min(...pool.map((slot) => this.readyAt(slot, model, now)));
      return { ok: false, reason: "busy", retryAfterS: Math.max(0, soonest - now) };
    }
    ready.sort((left, right) => left.inflight - right.inflight || left.sentAt.length - right.sentAt.length);
    const chosen = ready[0];
    chosen.sentAt.push(now);
    chosen.inflight += 1;
    return { ok: true, slot: chosen.slot };
  }

  release(slotNumber: number): void {
    const slot = this.slots.find((item) => item.slot === slotNumber);
    if (!slot) return;
    slot.inflight = Math.max(0, slot.inflight - 1);
  }

  noteFailure(slotNumber: number, model: string, status: number, retryAfter: string | null): FailureDecision {
    const now = this.clock();
    const decision = classifyStatus(status, retryAfter, now);
    const slot = this.slots.find((item) => item.slot === slotNumber);
    if (!slot) return decision;
    if (decision.kind === "retire") {
      slot.retiredUntil = now + decision.seconds;
      return decision;
    }
    if (decision.kind === "cool") {
      slot.coolUntil.set(model, now + decision.seconds);
      return decision;
    }
    if (decision.kind === "demote") {
      const seconds = status === 503 ? this.overloadSeconds(model, now) : decision.seconds;
      this.modelDemotedUntil.set(model, now + seconds);
      return { kind: "demote", seconds };
    }
    return decision;
  }

  private overloadSeconds(model: string, now: number): number {
    const previous = this.overload.get(model);
    const count = !previous || now - previous.last > OVERLOAD_WINDOW_S ? 1 : previous.count + 1;
    this.overload.set(model, { count, last: now });
    return Math.min(OVERLOAD_MAX_S, OVERLOAD_BASE_S * 2 ** (count - 1));
  }

  private soonestRetire(now: number): number {
    if (this.slots.length === 0) return 0;
    return Math.max(0, Math.min(...this.slots.map((slot) => slot.retiredUntil)) - now);
  }

  private purge(slot: KeySlot, now: number): void {
    while (slot.sentAt.length > 0 && now - slot.sentAt[0] >= WINDOW_S) slot.sentAt.shift();
  }

  private readyAt(slot: KeySlot, model: string, now: number): number {
    const cool = slot.coolUntil.get(model) ?? 0;
    const paced = slot.sentAt.length < PER_MINUTE ? now : slot.sentAt[0] + WINDOW_S;
    return Math.max(cool, paced);
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}
