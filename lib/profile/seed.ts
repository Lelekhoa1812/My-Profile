import { createHash } from "node:crypto";
import type { Db } from "mongodb";
import profile from "../../content/profile.json";
import { withArchive } from "./archive";
import { idsToRetire } from "./retire";

export function needsSeed(factCount: number, sectionCount: number): boolean {
  return factCount === 0 || sectionCount === 0;
}

export function recordSections() {
  return withArchive(profile.sections);
}

export function profileHash(): string {
  const sections = recordSections().map((section) => ({ sectionId: section.sectionId, text: section.text }));
  return createHash("sha256").update(JSON.stringify({ facts: profile.facts, sections })).digest("hex");
}

export function needsRefresh(factCount: number, sectionCount: number, storedHash: string | null, currentHash: string): boolean {
  return needsSeed(factCount, sectionCount) || storedHash !== currentHash;
}

export async function seedProfile(db: Db): Promise<void> {
  const facts = db.collection("profile_facts");
  const chunks = db.collection("chunks");
  const sessions = db.collection("sessions");
  const traces = db.collection("tool_traces");
  await facts.createIndex({ key: 1 }, { unique: true });
  await chunks.createIndex({ sectionId: 1 }, { unique: true });
  await sessions.createIndex({ threadId: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await traces.createIndex({ threadId: 1, calledAt: -1 });
  await traces.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const now = new Date();
  for (const fact of profile.facts) {
    await facts.updateOne({ key: fact.key }, { $set: { ...fact, visibility: "public", updatedAt: now } }, { upsert: true });
  }
  const sections = recordSections();
  for (const section of sections) {
    await chunks.updateOne(
      { sectionId: section.sectionId },
      { $set: { ...section, visibility: "public", updatedAt: now } },
      { upsert: true },
    );
  }
  const storedFacts = await facts.distinct("key", { visibility: "public" });
  const retireFacts = idsToRetire(
    storedFacts.filter((key): key is string => typeof key === "string"),
    profile.facts.map((fact) => fact.key),
  );
  if (retireFacts.length > 0) await facts.deleteMany({ key: { $in: retireFacts }, visibility: "public" });
  const storedSections = await chunks.distinct("sectionId", { visibility: "public" });
  const retireSections = idsToRetire(
    storedSections.filter((id): id is string => typeof id === "string"),
    sections.map((section) => section.sectionId),
  );
  if (retireSections.length > 0) await chunks.deleteMany({ sectionId: { $in: retireSections }, visibility: "public" });
  await db.collection("profile_meta").updateOne(
    { key: "content" },
    { $set: { hash: profileHash(), updatedAt: now } },
    { upsert: true },
  );
  try {
    await chunks.createIndex({ heading: "text", text: "text", aliases: "text" }, { name: "chunks_text" });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Profile text index skipped: ${name}`);
  }
}
