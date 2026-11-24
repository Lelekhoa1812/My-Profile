import { describe, expect, it } from "vitest";
import { traceDocs } from "./traces";

describe("traceDocs", () => {
  it("keeps a short tool name, input, and output", () => {
    const now = new Date("2026-11-24T00:00:00.000Z");
    const docs = traceDocs("thread-1", [{
      toolName: "search_sections",
      input: { query: "Harry the Hirer" },
      output: { found: true, text: "x".repeat(500) },
    }], now);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.toolName).toBe("search_sections");
    expect(docs[0]?.input).toContain("Harry the Hirer");
    expect(docs[0]?.output.length).toBe(400);
    expect(docs[0]?.expiresAt.getTime() - now.getTime()).toBe(48 * 60 * 60 * 1000);
  });
});
