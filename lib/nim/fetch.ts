import { NIM_CHAT_URL } from "./models";
import type { NimPool } from "./pool";

export const NIM_MAX_UPSTREAM_CALLS = 3;

export type ChatBody = Record<string, unknown>;

export type NimCall = {
  response: Response;
  release: () => void;
};

const SENTENCE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "answer",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { sentence: { type: "string" } },
      required: ["sentence"],
    },
  },
};

export function wireBody(body: ChatBody, model: string): ChatBody {
  const next: ChatBody = {
    ...body,
    model,
    stream: true,
    stream_options: { include_usage: true },
    chat_template_kwargs: { enable_thinking: false, ...(body.chat_template_kwargs as object | undefined) },
  };
  const toolCount = Array.isArray(next.tools) ? next.tools.length : 0;
  if (toolCount > 0) delete next.response_format;
  else if (!next.response_format) next.response_format = SENTENCE_FORMAT;
  if (typeof next.prompt_cache_key !== "string" || next.prompt_cache_key.length === 0) {
    next.prompt_cache_key = "profile-record";
  }
  delete next.prompt_cache_options;
  delete next.prompt_cache_breakpoint;
  return next;
}

export async function postNimChat(options: {
  pool: NimPool;
  models: readonly string[];
  body: ChatBody;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<NimCall> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let lastStatus = 503;
  let calls = 0;
  for (const [index, model] of options.models.entries()) {
    if (calls >= NIM_MAX_UPSTREAM_CALLS || options.pool.isModelDemoted(model)) continue;
    const keyCap = index === 0 ? 2 : 1;
    for (let attempt = 0; attempt < keyCap && calls < NIM_MAX_UPSTREAM_CALLS; attempt += 1) {
      const acquired = options.pool.acquire(model);
      if (!acquired.ok) break;
      calls += 1;
      try {
        const response = await fetchImpl(NIM_CHAT_URL, {
          method: "POST",
          signal: options.signal,
          headers: {
            authorization: `Bearer ${options.pool.secretFor(acquired.slot)}`,
            accept: "text/event-stream",
            "content-type": "application/json",
          },
          body: JSON.stringify(wireBody(options.body, model)),
        });
        if (response.ok) {
          return {
            response,
            release: () => options.pool.release(acquired.slot),
          };
        }
        lastStatus = response.status;
        const retryAfter = response.headers.get("retry-after");
        await response.body?.cancel().catch(() => undefined);
        const decision = options.pool.noteFailure(acquired.slot, model, response.status, retryAfter);
        options.pool.release(acquired.slot);
        if (decision.kind === "demote" || decision.kind === "reject") break;
      } catch {
        options.pool.noteFailure(acquired.slot, model, 408, null);
        options.pool.release(acquired.slot);
      }
    }
  }
  return {
    response: Response.json(
      { error: { message: "No NVIDIA NIM key could complete the request", code: "upstream_unavailable" } },
      { status: lastStatus },
    ),
    release: () => undefined,
  };
}
