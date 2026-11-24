import { describe, expect, it } from "vitest";
import { emptyNimSlots, loadNimKeys } from "./keys";
import { NimPool } from "./pool";

const SECRET_A = "test-key-alpha";
const SECRET_B = "test-key-beta";

describe("loadNimKeys", () => {
  it("reads the list first, then slots 1 to 9, and drops duplicates", () => {
    const keys = loadNimKeys({
      NVIDIA_NIM_API_KEYS: `${SECRET_A}, ${SECRET_B}`,
      NVIDIA_NIM_API_KEY_1: SECRET_A,
      NVIDIA_NIM_API_KEY_2: "test-key-gamma",
      NVIDIA_NIM_API_KEY_3: "  ",
    });
    expect(keys).toEqual([SECRET_A, SECRET_B, "test-key-gamma"]);
    expect(emptyNimSlots({ NVIDIA_NIM_API_KEY_1: SECRET_A, NVIDIA_NIM_API_KEY_7: "  " })).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("NimPool", () => {
  it("does not put a key value in its status JSON", () => {
    const pool = new NimPool([SECRET_A]);
    expect(JSON.stringify(pool)).not.toContain(SECRET_A);
  });

  it("sends the next call to the less busy key", () => {
    let now = 1_700_000_000;
    const pool = new NimPool([SECRET_A, SECRET_B], () => now, () => 0);
    const first = pool.acquire("model-a");
    const second = pool.acquire("model-a");
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.slot).not.toBe(second.slot);
  });

  it("retires a rejected key for 10 minutes", () => {
    let now = 1_700_000_000;
    const pool = new NimPool([SECRET_A, SECRET_B], () => now, () => 0.99);
    const first = pool.acquire("model-a");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    pool.release(first.slot);
    const decision = pool.noteFailure(first.slot, "model-a", 401, null);
    expect(decision).toEqual({ kind: "retire", seconds: 600 });
    const during = pool.acquire("model-a");
    expect(during.ok && during.slot).not.toBe(first.slot);
    now += 601;
    const after = pool.acquire("model-a");
    expect(after.ok && after.slot).toBe(first.slot);
  });

  it("cools only the limited key", () => {
    let now = 1_700_000_000;
    const pool = new NimPool([SECRET_A, SECRET_B], () => now, () => 0.99);
    const first = pool.acquire("model-a");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    pool.release(first.slot);
    pool.noteFailure(first.slot, "model-a", 429, "15");
    const next = pool.acquire("model-a");
    expect(next.ok && next.slot).not.toBe(first.slot);
    now += 16;
    const cooled = pool.acquire("model-a");
    expect(cooled.ok && cooled.slot).toBe(first.slot);
  });

  it("reports exhaustion when every key is retired", () => {
    const pool = new NimPool([SECRET_A], () => 10, () => 0);
    const acquired = pool.acquire("model-a");
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    pool.noteFailure(acquired.slot, "model-a", 403, null);
    pool.release(acquired.slot);
    expect(pool.acquire("model-a")).toMatchObject({ ok: false, reason: "exhausted" });
  });

  it("demotes an overloaded model for longer on each repeat", () => {
    let now = 5_000;
    const pool = new NimPool([SECRET_A], () => now, () => 0);
    const acquired = pool.acquire("model-a");
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    expect(pool.noteFailure(acquired.slot, "model-a", 503, null).seconds).toBe(30);
    expect(pool.isModelDemoted("model-a")).toBe(true);
    now += 31;
    expect(pool.isModelDemoted("model-a")).toBe(false);
    expect(pool.noteFailure(acquired.slot, "model-a", 503, null).seconds).toBe(60);
  });
});
