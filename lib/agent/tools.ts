import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ProfileRecord } from "../profile/load";
import { asksForPlace, contactLookupKey, listSections, lookupFacts, readSection, searchSections } from "../profile/store";

const kind = z.enum(["identity", "role", "link", "date", "skill", "education"]).optional();

export function createProfileTools(record: ProfileRecord): ToolSet {
  const facts = record.facts;
  const sections = record.sections;
  return {
    lookup_fact: tool({
      description: "Read one exact public fact such as a name, email, phone, link, date, or skill. Use this before stating a contact detail or a date. For a title at a named past employer, use search_sections instead.",
      inputSchema: z.object({ key: z.string().optional(), kind }).refine((input) => Boolean(input.key || input.kind), {
        message: "Provide a key or a kind.",
      }),
      execute: async (input) => lookupFacts(facts, input),
    }),
    list_sections: tool({
      description: "List profile section headings. Use this when the question asks what is on the record.",
      inputSchema: z.object({
        sourceType: z.enum(["role", "project", "education", "skills", "writing"]).optional(),
      }),
      execute: async (input) => listSections(sections, input.sourceType),
    }),
    read_section: tool({
      description: "Read one full profile section. Pass the heading words, such as Shipped work or Axion workflow engine. Do not invent an id.",
      inputSchema: z.object({ sectionId: z.string() }),
      execute: async (input) => readSection(sections, input.sectionId),
    }),
    search_sections: tool({
      description: "Find up to three profile sections by words in the question. If this returns found false, do not treat a weak overlap as a hit.",
      inputSchema: z.object({
        query: z.string(),
        sourceType: z.enum(["role", "project", "education", "skills", "writing"]).optional(),
      }),
      execute: async (input) => {
        const key = contactLookupKey(input.query);
        if (key) return lookupFacts(facts, { key });
        if (asksForPlace(input.query)) return lookupFacts(facts, { key: "location" });
        return searchSections(sections, input.query, input.sourceType);
      },
    }),
  };
}
