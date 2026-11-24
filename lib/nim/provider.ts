import { createHash } from "node:crypto";
import { loadNimKeys } from "./keys";
import { NIM_MODELS } from "./models";
import { postNimChat, type ChatBody } from "./fetch";
import { NimPool } from "./pool";

const globalForPool = globalThis as unknown as { nimPool?: NimPool; nimStamp?: string };

export function getNimPool(env: Record<string, string | undefined> = process.env): NimPool {
  const keys = loadNimKeys(env);
  const stamp = createHash("sha256").update(keys.join("\0")).digest("hex");
  const existing = globalForPool.nimPool;
  if (existing && globalForPool.nimStamp === stamp) return existing;
  const pool = new NimPool(keys);
  globalForPool.nimPool = pool;
  globalForPool.nimStamp = stamp;
  return pool;
}

export function resetNimPool(): void {
  globalForPool.nimPool = undefined;
  globalForPool.nimStamp = undefined;
}

export function createPoolFetch(pool: NimPool, models: readonly string[] = NIM_MODELS): typeof fetch {
  return async (input, init) => {
    const original: ChatBody = init?.body ? JSON.parse(String(init.body)) as ChatBody : {};
    const preferred = typeof original.model === "string" ? original.model : models[0];
    const order = [preferred, ...models.filter((model) => model !== preferred)];
    const call = await postNimChat({
      pool,
      models: order,
      body: original,
      url: input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url,
      signal: init?.signal ?? undefined,
    });
    if (!call.response.ok) {
      call.release();
      return call.response;
    }
    return releaseWhenDone(call.response, call.release);
  };
}

function releaseWhenDone(response: Response, release: () => void): Response {
  if (!response.body) {
    release();
    return response;
  }
  const reader = response.body.getReader();
  let released = false;
  const finish = () => {
    if (released) return;
    released = true;
    release();
  };
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const step = await reader.read();
        if (step.done) {
          finish();
          controller.close();
          return;
        }
        controller.enqueue(step.value);
      } catch (error) {
        finish();
        controller.error(error);
      }
    },
    cancel() {
      finish();
      return reader.cancel();
    },
  });
  return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
}
