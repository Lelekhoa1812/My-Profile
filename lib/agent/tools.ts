import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ProfileRecord } from "../profile/load";
import { asksForExperienceSpan, asksForGraduation, asksForName, asksForPlace, asksForSpokenLanguages, asksForTitle, contactLookupKey, listSections, lookupFacts, namedEmployer, readSection, searchSections } from "../profile/store";

const kind = z.enum(["identity", "role", "link", "date", "skill", "education"]).optional();

type TurnRead = {
  searched: Set<string>;
  read: Map<string, string>;
};

const SECTION_LIMIT = 20;

function leadOf(text: string): string {
  const sentence = text.split(/(?<=[.!])\s+/)[0]?.trim() ?? "";
  return sentence.length <= 180 ? sentence : `${sentence.slice(0, 177).trim()}...`;
}

export function createProfileTools(record: ProfileRecord, question = ""): ToolSet {
  const facts = record.facts;
  const sections = record.sections;
  const turn: TurnRead = { searched: new Set(), read: new Map() };
  return {
    plan_question: tool({
      description: "State the intent and up to three search queries before any biography is read. Set factKey only for a closed fact: name, email, phone, location, degree, title, languages, or experience.",
      inputSchema: z.object({
        intent: z.string(),
        queries: z.array(z.string()).min(1).max(3),
        factKey: z.enum(["name", "email", "phone", "location", "degree", "title", "languages", "experience"]).optional(),
      }),
      execute: async (input) => ({ ok: true as const, intent: input.intent, queries: input.queries, factKey: input.factKey }),
    }),
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
      description: "Find the profile sections that match the question. If this returns found false, do not treat a weak overlap as a hit.",
      inputSchema: z.object({
        query: z.string(),
        sourceType: z.enum(["role", "project", "education", "skills", "writing"]).optional(),
      }),
      execute: async (input) => {
        const key = contactLookupKey(input.query) ?? contactLookupKey(question);
        if (key) return lookupFacts(facts, { key });
        const name = asksForName(input.query);
        if (name) return lookupFacts(facts, { key: name });
        if (asksForPlace(input.query) || asksForPlace(question)) return lookupFacts(facts, { key: "location" });
        if (/\bcity\b/i.test(input.query) && /\b(it|that)\b/i.test(input.query) && !namedEmployer(input.query)) return lookupFacts(facts, { key: "location" });
        if (asksForExperienceSpan(input.query)) return lookupFacts(facts, { key: "experience" });
        if (/\bpage title\b/i.test(input.query)) return lookupFacts(facts, { key: "page_title" });
        if (asksForTitle(input.query)) return lookupFacts(facts, { key: "public_title" });
        if (/\bwho is (he|him)\b/i.test(input.query) && !namedEmployer(input.query)) {
          const rows = ["full_name", "also_known_as", "public_title"].flatMap((key) => {
            const found = lookupFacts(facts, { key });
            return found.found ? found.facts : [];
          });
          if (rows.length > 0) return { found: true as const, facts: rows };
        }
        if (asksForGraduation(input.query)) return lookupFacts(facts, { key: "degree" });
        if (asksForSpokenLanguages(input.query)) {
          const spoken = lookupFacts(facts, { key: "languages" });
          if (spoken.found) {
            const text = spoken.facts.map((fact) => fact.value).join(" ");
            turn.searched.add("skills");
            return {
              found: true as const,
              sections: [{ sectionId: "skills", heading: "Languages", sourceType: "skills", lead: leadOf(text) }],
            };
          }
        }
        const filtered = searchSections(sections, input.query, input.sourceType);
        const found = input.sourceType && !filtered.found ? searchSections(sections, input.query) : filtered;
        if (!found.found || !("sections" in found)) return found;
        const leads = found.sections.slice(0, SECTION_LIMIT).map((section) => {
          turn.searched.add(section.sectionId);
          return { sectionId: section.sectionId, heading: section.heading, sourceType: section.sourceType, lead: leadOf(section.text) };
        });
        if (question && question !== input.query) {
          const visitor = searchSections(sections, question);
          const head = visitor.found && "sections" in visitor ? visitor.sections[0] : undefined;
          if (head && !leads.some((lead) => lead.sectionId === head.sectionId)) {
            turn.searched.add(head.sectionId);
            leads.unshift({ sectionId: head.sectionId, heading: head.heading, sourceType: head.sourceType, lead: leadOf(head.text) });
            leads.splice(SECTION_LIMIT);
          }
        }
        return { found: leads.length > 0, sections: leads };
      },
    }),
    read_sections: tool({
      description: "Read the full text of the sections returned by search_sections in this turn. Do not pass an id that search did not return.",
      inputSchema: z.object({ sectionIds: z.array(z.string()).min(1).max(SECTION_LIMIT) }),
      execute: async (input) => {
        const read = input.sectionIds.map((sectionId) => {
          if (!turn.searched.has(sectionId)) return { sectionId, found: false as const };
          const section = readSection(sections, sectionId);
          if (!section.found) return { sectionId, found: false as const };
          const text = section.text.slice(0, 2400);
          turn.read.set(section.sectionId, text);
          return { sectionId: section.sectionId, heading: section.heading, sourceType: section.sourceType, text, found: true as const };
        });
        return { found: read.some((section) => section.found), sections: read };
      },
    }),
    review_evidence: tool({
      description: "Return the text already read in this turn. Pass section ids only. A quote in the arguments is ignored.",
      inputSchema: z.object({ sectionIds: z.array(z.string()).max(SECTION_LIMIT) }),
      execute: async (input) => {
        const text = input.sectionIds.flatMap((sectionId) => {
          const read = turn.read.get(sectionId);
          return read ? [read] : [];
        }).join("\n");
        return text ? { found: true as const, text } : { found: false as const };
      },
    }),
  };
}
