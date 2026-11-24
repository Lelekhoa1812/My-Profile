import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { loadProfile } from "../profile/load";
import { listSections, lookupFacts, readSection, searchSections } from "../profile/store";

const kind = z.enum(["identity", "role", "link", "date", "skill", "education"]).optional();

export function createProfileTools(): ToolSet {
  return {
    lookup_fact: tool({
      description: "Read one exact public fact such as a name, email, phone, link, date, or skill. Use this before stating a contact detail or a date.",
      inputSchema: z.object({ key: z.string().optional(), kind }).refine((input) => Boolean(input.key || input.kind), {
        message: "Provide a key or a kind.",
      }),
      execute: async (input) => lookupFacts((await loadProfile()).facts, input),
    }),
    list_sections: tool({
      description: "List profile section headings. Use this when the question asks what is on the record.",
      inputSchema: z.object({
        sourceType: z.enum(["role", "project", "education", "skills", "writing"]).optional(),
      }),
      execute: async (input) => listSections((await loadProfile()).sections, input.sourceType),
    }),
    read_section: tool({
      description: "Read one full profile section by its id. The text is the citable record.",
      inputSchema: z.object({ sectionId: z.string() }),
      execute: async (input) => readSection((await loadProfile()).sections, input.sectionId),
    }),
    search_sections: tool({
      description: "Find up to three profile sections by words in the question. If this returns found false, the record does not include that claim.",
      inputSchema: z.object({
        query: z.string(),
        sourceType: z.enum(["role", "project", "education", "skills", "writing"]).optional(),
      }),
      execute: async (input) => searchSections((await loadProfile()).sections, input.query, input.sourceType),
    }),
  };
}
