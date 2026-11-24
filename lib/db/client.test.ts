import { afterEach, describe, expect, it } from "vitest";
import { markMongoDown, mongoIsQuiet, resetMongoQuiet } from "./client";

describe("mongo quiet window", () => {
  afterEach(() => {
    resetMongoQuiet();
  });

  it("skips the database after a failed handshake", () => {
    expect(mongoIsQuiet()).toBe(false);
    markMongoDown();
    expect(mongoIsQuiet()).toBe(true);
  });
});
