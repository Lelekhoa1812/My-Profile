import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { MISSED } from "@/lib/chat/answer";
import { toTurns } from "./record-chat";

const messages = [
  { id: "q", role: "user", parts: [{ type: "text", text: "What is his title?" }] },
  { id: "a", role: "assistant", parts: [{ type: "text", text: "   " }] },
] as UIMessage[];

describe("toTurns", () => {
  it("waits while the answer is still streaming", () => {
    expect(toTurns(messages, true)[0].answer).toBe("");
    expect(toTurns(messages, true)[0].reading).toBe(true);
  });

  it("shows a sentence when the finished answer has no words", () => {
    expect(toTurns(messages, false)[0].answer).toBe(MISSED);
    expect(toTurns(messages, false)[0].done).toBe(true);
  });
});
