import { describe, expect, it } from "vitest";
import { appendTurns } from "./turns";

describe("appendTurns", () => {
  it("keeps the question and the answer and clips a long paste", () => {
    const turns = appendTurns(`  hello  ${"x".repeat(3000)}`, "  The record does not include that.  ", "2026-11-24T00:00:00.000Z");
    expect(turns).toHaveLength(2);
    expect(turns[0]?.role).toBe("user");
    expect(turns[0]?.text.length).toBe(2000);
    expect(turns[1]).toEqual({ role: "assistant", text: "The record does not include that.", at: "2026-11-24T00:00:00.000Z" });
  });

  it("omits an empty assistant sentence", () => {
    expect(appendTurns("Where did he study?", "   ", "2026-11-24T00:00:00.000Z")).toEqual([
      { role: "user", text: "Where did he study?", at: "2026-11-24T00:00:00.000Z" },
    ]);
  });
});
