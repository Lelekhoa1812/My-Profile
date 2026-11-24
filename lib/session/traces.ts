import { getDb, markMongoDown, mongoIsQuiet } from "../db/client";

const CLIP = 400;
const KEEP_MS = 48 * 60 * 60 * 1000;

export type TraceCall = {
  toolName: string;
  input: unknown;
  output: unknown;
};

export type TraceDoc = {
  threadId: string;
  toolName: string;
  input: string;
  output: string;
  calledAt: Date;
  expiresAt: Date;
};

export function traceDocs(threadId: string, calls: readonly TraceCall[], now = new Date()): TraceDoc[] {
  return calls.slice(0, 8).map((call) => ({
    threadId,
    toolName: call.toolName.slice(0, 80),
    input: clip(call.input),
    output: clip(call.output),
    calledAt: now,
    expiresAt: new Date(now.getTime() + KEEP_MS),
  }));
}

export async function saveTraces(threadId: string, calls: readonly TraceCall[]): Promise<void> {
  if (!process.env.MONGODB_URI || mongoIsQuiet() || calls.length === 0) return;
  const docs = traceDocs(threadId, calls);
  try {
    await getDb().collection<TraceDoc>("tool_traces").insertMany(docs);
  } catch (error) {
    markMongoDown();
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Tool trace save failed: ${name}`);
  }
}

function clip(value: unknown): string {
  let text = "";
  try {
    text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  } catch {
    text = "";
  }
  return text.slice(0, CLIP);
}
