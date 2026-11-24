import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ProfileRecord } from "../profile/load";
import { asksForExperienceSpan, asksForGraduation, asksForName, asksForPlace, asksForSpokenLanguages, contactLookupKey, listSections, lookupFacts, namedEmployer, readSection, searchSections } from "../profile/store";

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
        const name = asksForName(input.query);
        if (name) return lookupFacts(facts, { key: name });
        if (asksForPlace(input.query)) return lookupFacts(facts, { key: "location" });
        if (/\bcity\b/i.test(input.query) && /\b(it|that)\b/i.test(input.query) && !namedEmployer(input.query)) return lookupFacts(facts, { key: "location" });
        if (asksForExperienceSpan(input.query)) return lookupFacts(facts, { key: "experience" });
        if (asksForGraduation(input.query)) return lookupFacts(facts, { key: "degree" });
        if (asksForSpokenLanguages(input.query)) {
          const spoken = lookupFacts(facts, { key: "languages" });
          if (spoken.found) {
            return {
              found: true as const,
              sections: [{ sectionId: "skills", heading: "Languages", sourceType: "skills", text: spoken.facts.map((fact) => fact.value).join(" "), match: "keyword" as const }],
            };
          }
        }
        const filtered = searchSections(sections, input.query, input.sourceType);
        if (input.sourceType && !filtered.found) return searchSections(sections, input.query);
        return filtered;
      },
    }),
  };
}
