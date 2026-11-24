import { describe, expect, it } from "vitest";
import { postNimChat, wireBody } from "./fetch";
import { NIM_CHAT_URL } from "./models";
import { NimPool } from "./pool";

const KEY_A = "fetch-key-alpha";
const KEY_B = "fetch-key-beta";

function jsonResponse(status: number, retryAfter?: string): Response {
  const headers = new Headers({ "content-type": "application/json" });
  if (retryAfter) headers.set("retry-after", retryAfter);
  return new Response("{}", { status, headers });
}

describe("wireBody", () => {
  it("drops prompt-cache fields and keeps response_format when there are no tools", () => {
    const body = wireBody(
      { messages: [], prompt_cache_key: "thread-1", response_format: { type: "json_object" } },
      "nvidia/nemotron-3-ultra-550b-a55b",
    );
    expect(body.prompt_cache_key).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.stream).toBe(true);
  });

  it("drops response_format when tools are present", () => {
    const body = wireBody(
      { tools: [{ type: "function" }], response_format: { type: "json_object" } },
      "nvidia/nemotron-3-ultra-550b-a55b",
    );
    expect(body.response_format).toBeUndefined();
  });

  it("turns model thinking off unless the caller sets it", () => {
    expect(wireBody({}, "nvidia/nemotron-3-ultra-550b-a55b").chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(wireBody({ chat_template_kwargs: { enable_thinking: true } }, "nvidia/nemotron-3-ultra-550b-a55b").chat_template_kwargs).toEqual({ enable_thinking: true });
  });
});

describe("postNimChat", () => {
  it("rotates to the next key after a rejected credential", async () => {
    const pool = new NimPool([KEY_A, KEY_B], () => 1_000, () => 0.99);
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toBe(NIM_CHAT_URL);
      const header = new Headers(init?.headers).get("authorization") ?? "";
      seen.push(header);
      if (header.includes(KEY_A)) return jsonResponse(401);
      return new Response("data: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
    };
    const call = await postNimChat({
      pool,
      models: ["nvidia/nemotron-3-ultra-550b-a55b"],
      body: { messages: [{ role: "user", content: "Hello" }] },
      fetchImpl,
    });
    expect(call.response.ok).toBe(true);
    expect(seen).toEqual([`Bearer ${KEY_A}`, `Bearer ${KEY_B}`]);
    expect(JSON.stringify({ status: call.response.status })).not.toContain(KEY_A);
    call.release();
  });

  it("does not call a demoted model", async () => {
    const pool = new NimPool([KEY_A], () => 2_000, () => 0);
    const acquired = pool.acquire("nvidia/nemotron-3-ultra-550b-a55b");
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    pool.noteFailure(acquired.slot, "nvidia/nemotron-3-ultra-550b-a55b", 503, null);
    pool.release(acquired.slot);
    let calls = 0;
    const call = await postNimChat({
      pool,
      models: ["nvidia/nemotron-3-ultra-550b-a55b"],
      body: { messages: [] },
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(200);
      },
    });
    expect(calls).toBe(0);
    expect(call.response.ok).toBe(false);
  });
});
