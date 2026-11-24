import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { needsRefresh, needsSeed, profileHash } from "./seed";

describe("needsSeed", () => {
  it("seeds when either collection is empty", () => {
    expect(needsSeed(0, 0)).toBe(true);
    expect(needsSeed(0, 4)).toBe(true);
    expect(needsSeed(3, 0)).toBe(true);
  });

  it("leaves a populated record in place", () => {
    expect(needsSeed(12, 20)).toBe(false);
  });

  it("refreshes a populated record when the file hash changes", () => {
    const current = profileHash();
    expect(needsRefresh(12, 20, current, current)).toBe(false);
    expect(needsRefresh(12, 20, "old-hash", current)).toBe(true);
    expect(needsRefresh(0, 20, current, current)).toBe(true);
    expect(current).toMatch(/^[a-f0-9]{64}$/);
  });

  it("creates the tool trace indexes when the record is seeded", () => {
    const source = readFileSync("lib/profile/seed.ts", "utf8");
    expect(source).toContain('collection("tool_traces")');
    expect(source).toContain("threadId: 1, calledAt: -1");
    expect(source).toContain("expiresAt: 1");
  });
});
