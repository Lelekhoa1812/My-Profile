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

  it("returns the email fact and leaves a workflow email question on the section", async () => {
    const tools = createProfileTools({ facts: profile.facts, sections: profile.sections, source: "file" });
    const search = tools.search_sections as unknown as {
      execute: (input: { query: string }) => Promise<{ found: boolean; facts?: { label: string; value: string }[]; sections?: { sectionId: string }[] }>;
    };
    const email = await search.execute({ query: "What is his email?" });
    expect(email.found).toBe(true);
    expect(email.facts?.[0]?.label).toBe("Email");
    expect(email.facts?.[0]?.value).toContain("@");
    const workflow = await search.execute({ query: "Does the workflow send email?" });
    expect(workflow.found).toBe(true);
    expect(workflow.sections?.some((section) => section.sectionId === "project-axion-workflows")).toBe(true);
  });

  it("returns the experience span and keeps a named employer on the role", async () => {
    const tools = createProfileTools({ facts: profile.facts, sections: profile.sections, source: "file" });
    const search = tools.search_sections as unknown as {
      execute: (input: { query: string }) => Promise<{ found: boolean; facts?: { value: string }[]; sections?: { sectionId: string }[] }>;
    };
    const span = await search.execute({ query: "How many years of experience does he have?" });
    expect(span.found).toBe(true);
    expect(span.facts?.[0]?.value).toContain("4 years");
    expect(span.facts?.[0]?.value).toContain("3 years");
    const harry = await search.execute({ query: "What was his experience at Harry the Hirer?" });
    expect(harry.found).toBe(true);
    expect(harry.sections?.some((section) => section.sectionId === "role-harry-senior")).toBe(true);
  });
});
