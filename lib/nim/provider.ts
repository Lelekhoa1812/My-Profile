import { loadNimKeys } from "./keys";
import { NIM_MODELS } from "./models";
import { wireBody, type ChatBody } from "./fetch";
import { NimPool } from "./pool";

const globalForPool = globalThis as unknown as { nimPool?: NimPool };

export function getNimPool(env: Record<string, string | undefined> = process.env): NimPool {
  if (!globalForPool.nimPool || globalForPool.nimPool.size === 0) {
    const keys = loadNimKeys(env);
    if (keys.length === 0) return new NimPool([]);
    globalForPool.nimPool = new NimPool(keys);
  }
  return globalForPool.nimPool;
}

export function resetNimPool(): void {
  globalForPool.nimPool = undefined;
}

export function createPoolFetch(pool: NimPool, models: readonly string[] = NIM_MODELS): typeof fetch {
  return async (input, init) => {
    const original: ChatBody = init?.body ? JSON.parse(String(init.body)) as ChatBody : {};
    const preferred = typeof original.model === "string" ? original.model : models[0];
    const order = [preferred, ...models.filter((model) => model !== preferred)];
    let lastStatus = 503;
    for (const model of order) {
      if (pool.isModelDemoted(model)) continue;
      for (let attempt = 0; attempt < Math.max(1, pool.size); attempt += 1) {
        const acquired = pool.acquire(model);
        if (!acquired.ok) break;
        const headers = new Headers(init?.headers);
        headers.set("authorization", `Bearer ${pool.secretFor(acquired.slot)}`);
        try {
          const response = await fetch(input, {
            ...init,
            headers,
            body: JSON.stringify(wireBody(original, model)),
          });
          if (response.ok) return releaseWhenDone(response, () => pool.release(acquired.slot));
          lastStatus = response.status;
          const decision = pool.noteFailure(acquired.slot, model, response.status, response.headers.get("retry-after"));
          await response.body?.cancel().catch(() => undefined);
          pool.release(acquired.slot);
          if (decision.kind === "demote" || decision.kind === "reject") break;
        } catch {
          pool.noteFailure(acquired.slot, model, 408, null);
          pool.release(acquired.slot);
        }
      }
    }
    return Response.json(
      { error: { message: "No NVIDIA NIM key could complete the request", code: "upstream_unavailable" } },
      { status: lastStatus },
    );
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
