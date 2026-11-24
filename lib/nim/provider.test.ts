import { describe, expect, it } from "vitest";
import { NIM_MAX_UPSTREAM_CALLS } from "./fetch";
import { createPoolFetch, getNimPool, resetNimPool } from "./provider";
import { NimPool } from "./pool";

const KEY_A = "provider-key-alpha";
const KEY_B = "provider-key-beta";

describe("getNimPool", () => {
  it("rebuilds the pool when the key list changes", () => {
    resetNimPool();
    try {
      const first = getNimPool({ NVIDIA_NIM_API_KEY_1: "pool-key-one" });
      const same = getNimPool({ NVIDIA_NIM_API_KEY_1: "pool-key-one" });
      const second = getNimPool({ NVIDIA_NIM_API_KEY_1: "pool-key-one", NVIDIA_NIM_API_KEY_2: "pool-key-two" });
      expect(first.size).toBe(1);
      expect(same).toBe(first);
      expect(second.size).toBe(2);
      expect(second).not.toBe(first);
    } finally {
      resetNimPool();
    }
  });
});

describe("createPoolFetch", () => {
  it("replaces the caller key and rotates after a rejection", async () => {
    const pool = new NimPool([KEY_A, KEY_B], () => 3_000, () => 0.99);
    const seen: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      const header = new Headers(init?.headers).get("authorization") ?? "";
      seen.push(header);
      const body = JSON.parse(String(init?.body)) as { prompt_cache_key?: string; stream?: boolean };
      expect(body.prompt_cache_key).toBe("secret-thread");
      expect(body.stream).toBe(true);
      if (header.includes(KEY_A)) return new Response("{}", { status: 401 });
      return new Response("data: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;
    try {
      const response = await createPoolFetch(pool)("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer pool" },
        body: JSON.stringify({ model: "nvidia/nemotron-3-ultra-550b-a55b", prompt_cache_key: "secret-thread", messages: [] }),
      });
      expect(response.status).toBe(200);
      expect(seen[0]).toBe(`Bearer ${KEY_A}`);
      expect(seen[1]).toBe(`Bearer ${KEY_B}`);
      await response.body?.cancel();
    } finally {
      globalThis.fetch = original;
    }
  });

  it("does not cool a key when the caller aborts", async () => {
    const pool = new NimPool([KEY_A], () => 0, () => 0);
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new DOMException("The operation was aborted.", "AbortError");
    }) as typeof fetch;
    try {
      await expect(createPoolFetch(pool)("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ messages: [] }),
      })).rejects.toThrow(/abort/i);
      expect(calls).toBe(1);
      expect(pool.acquire("nvidia/nemotron-3-ultra-550b-a55b").ok).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("stops after three upstream calls when every key is rate limited", async () => {
    const pool = new NimPool(["k1", "k2", "k3", "k4"], () => 0, () => 0);
    let calls = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("{}", { status: 429, headers: { "retry-after": "1" } });
    }) as typeof fetch;
    try {
      const response = await createPoolFetch(pool, ["model-a", "model-b"])("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      });
      expect(response.status).toBe(429);
      expect(calls).toBe(NIM_MAX_UPSTREAM_CALLS);
      expect(JSON.stringify({ calls })).not.toContain("k1");
    } finally {
      globalThis.fetch = original;
    }
  });
});
