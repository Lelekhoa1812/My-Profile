import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import profile from "../content/profile.json" with { type: "json" };

function loadEnvFile(path: string): void {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitAt = trimmed.indexOf("=");
    if (splitAt < 1) continue;
    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvFile(new URL("../.env", import.meta.url));
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8_000 });
  await client.connect();
  try {
    const named = process.env.MONGODB_DB?.trim();
    const db = named ? client.db(named) : client.db();
    const facts = db.collection("profile_facts");
    const chunks = db.collection("chunks");
    await facts.createIndex({ key: 1 }, { unique: true });
    await chunks.createIndex({ sectionId: 1 }, { unique: true });
    await chunks.createIndex({ heading: "text", text: "text", aliases: "text" }, { name: "chunks_text" });
    await db.collection("sessions").createIndex({ threadId: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection("tool_traces").createIndex({ threadId: 1, calledAt: -1 });
    await db.collection("tool_traces").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const now = new Date();
    for (const fact of profile.facts) {
      await facts.updateOne(
        { key: fact.key },
        { $set: { ...fact, visibility: "public", updatedAt: now } },
        { upsert: true },
      );
    }
    for (const section of profile.sections) {
      await chunks.updateOne(
        { sectionId: section.sectionId },
        { $set: { ...section, visibility: "public", updatedAt: now } },
        { upsert: true },
      );
    }
    const factCount = await facts.countDocuments({ visibility: "public" });
    const chunkCount = await chunks.countDocuments({ visibility: "public" });
    console.log(`Ingested ${factCount} facts and ${chunkCount} sections`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "Error";
  console.error(`Ingest failed: ${name}`);
  process.exitCode = 1;
});
