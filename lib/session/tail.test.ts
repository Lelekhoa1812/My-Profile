import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/chat/route";
import { tailForModel } from "./tail";

describe("tailForModel", () => {
  it("keeps only the latest turns", () => {
    const messages = Array.from({ length: 10 }, (_, index) => index);
    expect(tailForModel(messages, 8)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps the tool call that belongs to a kept tool result", () => {
    const messages = [
      { role: "user", n: 0 },
      { role: "assistant", n: 1 },
      { role: "user", n: 2 },
      { role: "assistant", n: 3 },
      { role: "tool", n: 4 },
      { role: "user", n: 5 },
      { role: "assistant", n: 6 },
      { role: "user", n: 7 },
      { role: "assistant", n: 8 },
    ];
    expect(tailForModel(messages, 5).map((message) => message.n)).toEqual([3, 4, 5, 6, 7, 8]);
  });
});

describe("chat route", () => {
  it("asks for a question when the body is empty", async () => {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Ask a question to start.");
  });
});
