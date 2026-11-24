import profile from "../../content/profile.json";
import { getDb, markMongoDown, mongoIsQuiet } from "../db/client";
import { withArchive } from "./archive";
import { needsRefresh, profileHash, seedProfile } from "./seed";
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
    let facts = await db.collection<ProfileFact>("profile_facts").find({ visibility: "public" }).toArray();
    let sections = await db.collection<ProfileSection>("chunks").find({ visibility: "public" }).toArray();
    const stored = await db.collection<{ hash?: string }>("profile_meta").findOne({ key: "content" });
    if (needsRefresh(facts.length, sections.length, stored?.hash ?? null, profileHash())) {
      await seedProfile(db);
      facts = await db.collection<ProfileFact>("profile_facts").find({ visibility: "public" }).toArray();
      sections = await db.collection<ProfileSection>("chunks").find({ visibility: "public" }).toArray();
    }
    if (facts.length > 0 && sections.length > 0) return { facts, sections: withArchive(sections), source: "database" };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Profile database unavailable: ${name}`);
    markMongoDown();
  }
  return fileRecord();
}

function fileRecord(): ProfileRecord {
  return { facts: profile.facts, sections: withArchive(profile.sections), source: "file" };
}
