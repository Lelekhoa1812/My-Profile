import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as { profileMongo?: MongoClient };

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalForMongo.profileMongo) {
    globalForMongo.profileMongo = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      waitQueueTimeoutMS: 5_000,
    });
  }
  return globalForMongo.profileMongo;
}

export function getDb(): Db {
  const name = process.env.MONGODB_DB?.trim() || "profile";
  return getMongoClient().db(name);
}
