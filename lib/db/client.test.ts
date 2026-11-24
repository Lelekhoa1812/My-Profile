import { afterEach, describe, expect, it } from "vitest";
import { markMongoDown, MONGO_OPTIONS, mongoIsQuiet, resetMongoQuiet } from "./client";

describe("mongo quiet window", () => {
  afterEach(() => {
    resetMongoQuiet();
  });

  it("skips the database after a failed handshake", () => {
    expect(mongoIsQuiet()).toBe(false);
    markMongoDown();
    expect(mongoIsQuiet()).toBe(true);
  });

  it("stops a refused handshake before a long wait", () => {
    expect(MONGO_OPTIONS.connectTimeoutMS).toBe(2_500);
    expect(MONGO_OPTIONS.serverSelectionTimeoutMS).toBe(2_500);
  });
});
