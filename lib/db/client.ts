import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as { profileMongo?: MongoClient; mongoQuietUntil?: number };

export function mongoIsQuiet(): boolean {
  return Date.now() < (globalForMongo.mongoQuietUntil ?? 0);
}

export const MONGO_QUIET_MS = 10 * 60 * 1000;

export function markMongoDown(now = Date.now()): void {
  globalForMongo.mongoQuietUntil = now + MONGO_QUIET_MS;
}

export function resetMongoQuiet(): void {
  globalForMongo.mongoQuietUntil = 0;
}

export const MONGO_OPTIONS = {
  maxPoolSize: 5,
  minPoolSize: 0,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 2_500,
  connectTimeoutMS: 2_500,
  socketTimeoutMS: 10_000,
  waitQueueTimeoutMS: 2_500,
} as const;

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalForMongo.profileMongo) {
    globalForMongo.profileMongo = new MongoClient(uri, MONGO_OPTIONS);
  }
  return globalForMongo.profileMongo;
}

export function getDb(): Db {
  const name = process.env.MONGODB_DB?.trim();
  const client = getMongoClient();
  return name ? client.db(name) : client.db();
}
