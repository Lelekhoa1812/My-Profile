import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { UpdateFilter } from "mongodb";
import { convertToModelMessages, isStepCount, ToolLoopAgent, type UIMessage } from "ai";
import { keptSentence } from "../../../lib/chat/answer";
import { visitorCookie } from "../../../lib/session/cookie";
import { instructionPrefix } from "../../../lib/agent/instructions";
import { createProfileTools } from "../../../lib/agent/tools";
import { loadNimKeys } from "../../../lib/nim/keys";
import { NIM_MODELS } from "../../../lib/nim/models";
import { createPoolFetch, getNimPool } from "../../../lib/nim/provider";
import { recordCard } from "../../../lib/profile/card";
import { loadProfile } from "../../../lib/profile/load";
import { tailForModel } from "../../../lib/session/tail";
import { appendTurns } from "../../../lib/session/turns";

export const runtime = "nodejs";
export const maxDuration = 60;

const nim = () => createOpenAICompatible({
  name: "nvidia-nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: "pool",
  includeUsage: true,
  supportsStructuredOutputs: false,
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
  const record = await loadProfile();
  const question = lastUserText(messages);
  const agent = new ToolLoopAgent({
    model: nim().chatModel(NIM_MODELS[0]),
    instructions: `${instructionPrefix()}\n\n<record>\n${recordCard(record.facts, record.sections)}\n</record>`,
    tools: createProfileTools(record),
    stopWhen: isStepCount(5),
    maxRetries: 0,
    maxOutputTokens: 1024,
    toolOrder: ["lookup_fact", "list_sections", "read_section", "search_sections"],
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) return { toolChoice: "required" as const };
      if (stepNumber >= 3) return { toolChoice: "none" as const, activeTools: [] };
      return {};
    },
  });
  const result = await agent.stream({
    messages: tailForModel(await convertToModelMessages(messages)),
    abortSignal: request.signal,
    timeout: { firstChunkMs: 20_000, chunkMs: 30_000, toolMs: 8_000, stepMs: 45_000, totalMs: 55_000 },
    onEnd: (event) => {
      const outputs = event.toolResults.map((result) => result.output);
      void saveTurn(threadId, visitor.id, question, keptSentence(outputs, event.text ?? "")).catch((error: unknown) => {
        const name = error instanceof Error ? error.name : "Error";
        console.error(`Session save failed: ${name}`);
      });
    },
  });
  return result.toUIMessageStreamResponse({
    headers: visitor.setCookie ? { "set-cookie": visitorCookie(visitor.id, new URL(request.url).protocol === "https:") } : undefined,
  });
}

function readVisitor(request: Request): { id: string; setCookie: boolean } {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)visitor=([A-Za-z0-9_-]{16,80})/);
  if (match) return { id: match[1], setCookie: false };
  return { id: crypto.randomUUID().replaceAll("-", ""), setCookie: true };
}

function cleanId(value: string | undefined): string | undefined {
  if (!value || !/^[A-Za-z0-9_-]{8,80}$/.test(value)) return undefined;
  return value;
}

function lastUserText(messages: readonly UIMessage[]): string {
  const user = [...messages].reverse().find((message) => message.role === "user");
  if (!user) return "";
  return user.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

async function saveTurn(threadId: string, visitorId: string, userText: string, assistantText: string): Promise<void> {
  if (!process.env.MONGODB_URI) return;
  const { getDb, markMongoDown, mongoIsQuiet } = await import("../../../lib/db/client");
  if (mongoIsQuiet()) return;
  const turns = appendTurns(userText, assistantText, new Date().toISOString());
  if (turns.length === 0) return;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  try {
    type SessionDoc = {
      threadId: string;
      visitorId: string;
      turns: typeof turns;
      createdAt: Date;
      updatedAt: Date;
      expiresAt: Date;
    };
    const collection = getDb().collection<SessionDoc>("sessions");
    const update: UpdateFilter<SessionDoc> = {
      $set: { updatedAt: now, expiresAt },
      $push: { turns: { $each: turns, $slice: -16 } },
      $unset: { messages: "" },
    };
    const owned = await collection.updateOne({ threadId, visitorId }, update);
    if (owned.matchedCount > 0) return;
    await collection.insertOne({ threadId, visitorId, turns, createdAt: now, updatedAt: now, expiresAt });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === 11000) return;
    markMongoDown();
    throw error;
  }
}
