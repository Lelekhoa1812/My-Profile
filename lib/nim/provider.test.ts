import { describe, expect, it } from "vitest";
import { createPoolFetch } from "./provider";
import { NimPool } from "./pool";

const KEY_A = "provider-key-alpha";
const KEY_B = "provider-key-beta";

describe("createPoolFetch", () => {
  it("replaces the caller key and rotates after a rejection", async () => {
    const pool = new NimPool([KEY_A, KEY_B], () => 3_000, () => 0.99);
    const seen: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      const header = new Headers(init?.headers).get("authorization") ?? "";
      seen.push(header);
      const body = JSON.parse(String(init?.body)) as { prompt_cache_key?: string; stream?: boolean };
      expect(body.prompt_cache_key).toBeUndefined();
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
});
