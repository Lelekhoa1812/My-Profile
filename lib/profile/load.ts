import profile from "../../content/profile.json";
import { getDb, markMongoDown, mongoIsQuiet } from "../db/client";
import type { ProfileFact, ProfileSection } from "./store";

export type ProfileRecord = {
  facts: ProfileFact[];
  sections: ProfileSection[];
  source: "database" | "file";
};

export async function loadProfile(): Promise<ProfileRecord> {
  if (!process.env.MONGODB_URI || mongoIsQuiet()) return fileRecord();
  try {
    const db = getDb();
    const facts = await db.collection<ProfileFact>("profile_facts").find({ visibility: "public" }).toArray();
    const sections = await db.collection<ProfileSection>("chunks").find({ visibility: "public" }).toArray();
    if (facts.length > 0 && sections.length > 0) return { facts, sections, source: "database" };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Profile database unavailable: ${name}`);
    markMongoDown();
  }
  return fileRecord();
}

function fileRecord(): ProfileRecord {
  return { facts: profile.facts, sections: profile.sections, source: "file" };
}
