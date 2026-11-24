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
    const city = await search.execute({ query: "What city was it?" });
    expect(city.found).toBe(true);
    expect(city.facts?.[0]?.value).toContain("Melbourne");
    expect(JSON.stringify(city)).not.toContain("EstateFolio");
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
    const name = await search.execute({ query: "What is his name?" });
    expect(name.found).toBe(true);
    expect(name.facts?.[0]?.value).toContain("Dang Khoa");
    const called = await search.execute({ query: "What is he also called?" });
    expect(called.found).toBe(true);
    expect(called.facts?.[0]?.value).toContain("Liam");
    const contact = await search.execute({ query: "How can I contact him?" });
    expect(contact.found).toBe(true);
    expect(contact.facts?.[0]?.label).toBe("Email");
    const graduated = await search.execute({ query: "When did he graduate?" });
    expect(graduated.found).toBe(true);
    expect(graduated.facts?.[0]?.value).toContain("Bachelor");
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

  it("returns the spoken languages and leaves a code question on the skills section", async () => {
    const tools = createProfileTools({ facts: profile.facts, sections: profile.sections, source: "file" });
    const search = tools.search_sections as unknown as {
      execute: (input: { query: string }) => Promise<{ found: boolean; sections?: { text: string; sectionId: string }[] }>;
    };
    const spoken = await search.execute({ query: "What languages does he speak?" });
    expect(spoken.sections?.[0]?.text).toContain("Mandarin");
    expect(spoken.sections?.[0]?.text).toContain("Vietnamese");
    expect(spoken.sections?.[0]?.text).not.toContain("Python");
  });

  it("returns the Harry pilot when a project-only search misses the role", async () => {
    const tools = createProfileTools({ facts: profile.facts, sections: profile.sections, source: "file" });
    const search = tools.search_sections as unknown as {
      execute: (input: { query: string; sourceType?: string }) => Promise<{ found: boolean; sections?: { sectionId: string; text: string }[] }>;
    };
    const result = await search.execute({ query: "pilot cut", sourceType: "project" });
    expect(result.sections?.[0]?.sectionId).toBe("role-harry-senior");
    expect(result.sections?.[0]?.text).toContain("40 percent");
  });
});
