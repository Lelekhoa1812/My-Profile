import { describe, expect, it } from "vitest";
import { createProfileTools } from "./tools";

describe("profile tools", () => {
  it("tells the model to pass a heading and not an invented id", () => {
    const tools = createProfileTools({ facts: [], sections: [], source: "file" });
    const read = tools.read_section as { description?: string };
    expect(read.description).toContain("Do not invent an id.");
    expect(read.description).toContain("Shipped work");
  });
});
