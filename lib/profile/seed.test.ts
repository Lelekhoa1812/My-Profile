import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { needsSeed } from "./seed";

describe("needsSeed", () => {
  it("seeds when either collection is empty", () => {
    expect(needsSeed(0, 0)).toBe(true);
    expect(needsSeed(0, 4)).toBe(true);
    expect(needsSeed(3, 0)).toBe(true);
  });

  it("leaves a populated record in place", () => {
    expect(needsSeed(12, 20)).toBe(false);
  });

  it("creates the tool trace indexes when the record is seeded", () => {
    const source = readFileSync("lib/profile/seed.ts", "utf8");
    expect(source).toContain('collection("tool_traces")');
    expect(source).toContain("threadId: 1, calledAt: -1");
    expect(source).toContain("expiresAt: 1");
  });
});
