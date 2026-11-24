import { getDb, markMongoDown, mongoIsQuiet } from "../db/client";
import type { StoredTurn } from "./turns";

export async function loadStoredTurns(threadId: string, visitorId: string): Promise<StoredTurn[]> {
  if (!process.env.MONGODB_URI || mongoIsQuiet()) return [];
  try {
    const doc = await getDb().collection("sessions").findOne(
      { threadId, visitorId },
      { projection: { turns: 1 } },
    );
    if (!doc || !Array.isArray(doc.turns)) return [];
    return doc.turns.flatMap((turn) => {
      if (!turn || typeof turn !== "object") return [];
      const row = turn as Partial<StoredTurn>;
      if ((row.role !== "user" && row.role !== "assistant") || typeof row.text !== "string" || !row.text.trim()) return [];
      return [{ role: row.role, text: row.text, at: typeof row.at === "string" ? row.at : "" }];
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Session read failed: ${name}`);
    markMongoDown();
    return [];
  }
}
