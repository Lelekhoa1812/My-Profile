import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { createProfileTools } from "./tools";

describe("profile tools", () => {
  it("tells the model to pass a heading and not an invented id", () => {
    const tools = createProfileTools({ facts: [], sections: [], source: "file" });
    const read = tools.read_section as { description?: string };
    expect(read.description).toContain("Do not invent an id.");
    expect(read.description).toContain("Shipped work");
    const lookup = tools.lookup_fact as { description?: string };
    expect(lookup.description).toContain("use search_sections instead");
  });

  it("returns the location fact when the question asks where he lives", async () => {
    const tools = createProfileTools({ facts: profile.facts, sections: profile.sections, source: "file" });
    const search = tools.search_sections as unknown as { execute: (input: { query: string }) => Promise<{ found: boolean; facts?: { value: string }[] }> };
    const result = await search.execute({ query: "Where does he live?" });
    expect(result.found).toBe(true);
    expect(result.facts?.[0]?.value).toContain("Melbourne");
  });
});
