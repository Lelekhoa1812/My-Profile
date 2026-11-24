import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, isStepCount, ToolLoopAgent, type UIMessage } from "ai";
import { instructionPrefix } from "../../../lib/agent/instructions";
import { createProfileTools } from "../../../lib/agent/tools";
import { loadNimKeys } from "../../../lib/nim/keys";
import { NIM_MODELS } from "../../../lib/nim/models";
import { createPoolFetch, getNimPool } from "../../../lib/nim/provider";
import { tailForModel } from "../../../lib/session/tail";

export const runtime = "nodejs";
export const maxDuration = 60;

const nim = () => createOpenAICompatible({
  name: "nvidia-nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: "pool",
  includeUsage: true,
  supportsStructuredOutputs: true,
  fetch: createPoolFetch(getNimPool()),
});

export async function POST(request: Request): Promise<Response> {
  let payload: { messages?: UIMessage[]; threadId?: string };
  try {
    payload = await request.json() as { messages?: UIMessage[]; threadId?: string };
  } catch {
    return Response.json({ error: "Send the question as JSON." }, { status: 400 });
  }
  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Ask a question to start." }, { status: 400 });
  }
  if (loadNimKeys(process.env).length === 0) {
    return Response.json({ error: "The model keys are not configured." }, { status: 503 });
  }

  const visitor = readVisitor(request);
  const threadId = cleanId(payload.threadId) ?? visitor.id;
  const agent = new ToolLoopAgent({
    model: nim().chatModel(NIM_MODELS[0]),
    instructions: instructionPrefix(),
    tools: createProfileTools(),
    stopWhen: isStepCount(5),
    maxRetries: 0,
    toolOrder: ["lookup_fact", "list_sections", "read_section", "search_sections"],
  });
  const result = await agent.stream({
    messages: tailForModel(await convertToModelMessages(messages)),
    abortSignal: request.signal,
  });
  const response = result.toUIMessageStreamResponse({
    headers: visitor.setCookie ? { "set-cookie": visitorCookie(visitor.id) } : undefined,
  });
  void remember(threadId, visitor.id, messages).catch((error: unknown) => {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Session save failed: ${name}`);
  });
  return response;
}

function readVisitor(request: Request): { id: string; setCookie: boolean } {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)visitor=([A-Za-z0-9_-]{16,80})/);
  if (match) return { id: match[1], setCookie: false };
  return { id: crypto.randomUUID().replaceAll("-", ""), setCookie: true };
}

function visitorCookie(id: string): string {
  return `visitor=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}

function cleanId(value: string | undefined): string | undefined {
  if (!value || !/^[A-Za-z0-9_-]{8,80}$/.test(value)) return undefined;
  return value;
}

async function remember(threadId: string, visitorId: string, messages: UIMessage[]): Promise<void> {
  if (!process.env.MONGODB_URI) return;
  const { getDb, markMongoDown, mongoIsQuiet } = await import("../../../lib/db/client");
  if (mongoIsQuiet()) return;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  try {
    await getDb().collection("sessions").updateOne(
      { threadId },
      {
        $set: { visitorId, messages: tailForModel(messages, 40), updatedAt: new Date(), expiresAt },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  } catch (error) {
    markMongoDown();
    throw error;
  }
}
