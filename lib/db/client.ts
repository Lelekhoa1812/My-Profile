import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as { profileMongo?: MongoClient; mongoQuietUntil?: number };

export function mongoIsQuiet(): boolean {
  return Date.now() < (globalForMongo.mongoQuietUntil ?? 0);
}

export function markMongoDown(): void {
  globalForMongo.mongoQuietUntil = Date.now() + 60_000;
}

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalForMongo.profileMongo) {
    globalForMongo.profileMongo = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 2_500,
      waitQueueTimeoutMS: 2_500,
    });
  }
  return globalForMongo.profileMongo;
}

export function getDb(): Db {
  const name = process.env.MONGODB_DB?.trim();
  const client = getMongoClient();
  return name ? client.db(name) : client.db();
}
