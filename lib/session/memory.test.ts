import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { withMemory } from "./memory";

const question = { id: "q", role: "user", parts: [{ type: "text", text: "What is his title?" }] } as UIMessage;

describe("withMemory", () => {
  it("leaves the current page transcript alone", () => {
    const assistant = { id: "a", role: "assistant", parts: [{ type: "text", text: "Senior AI Software Engineer." }] } as UIMessage;
    expect(withMemory([{ role: "user", text: "Earlier", at: "t" }], [question, assistant])).toEqual([question, assistant]);
  });

  it("puts the stored turns before a new question", () => {
    const messages = withMemory(
      [
        { role: "user", text: "Where does he work?", at: "t1" },
        { role: "assistant", text: "Axion Solutions.", at: "t2" },
      ],
      [question],
    );
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[1].parts[0]).toMatchObject({ text: "Axion Solutions." });
    expect(messages[2]).toBe(question);
  });
});
