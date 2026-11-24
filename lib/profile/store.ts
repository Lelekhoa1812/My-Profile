export type ProfileFact = {
  key: string;
  kind: string;
  value: string;
  visibility?: string;
};

export type ProfileSection = {
  sectionId: string;
  heading: string;
  sourceType: string;
  aliases?: string[];
  text: string;
  visibility?: string;
};

export function lookupFacts(facts: readonly ProfileFact[], input: { key?: string; kind?: string }) {
  if (!input.key && !input.kind) return { found: false as const };
  const rows = facts.filter((fact) => (fact.visibility ?? "public") === "public")
    .filter((fact) => !input.key || fact.key === input.key)
    .filter((fact) => !input.kind || fact.kind === input.kind);
  if (rows.length === 0) return { found: false as const };
  return {
    found: true as const,
    facts: rows.map((fact) => ({ key: fact.key, kind: fact.kind, value: fact.value })),
  };
}

export function listSections(sections: readonly ProfileSection[], sourceType?: string) {
  return {
    sections: sections
      .filter((section) => (section.visibility ?? "public") === "public")
      .filter((section) => !sourceType || section.sourceType === sourceType)
      .map((section) => ({
        sectionId: section.sectionId,
        heading: section.heading,
        sourceType: section.sourceType,
      })),
  };
}

export function readSection(sections: readonly ProfileSection[], sectionId: string) {
  const section = sections.find((item) => item.sectionId === sectionId && (item.visibility ?? "public") === "public");
  if (!section) return { found: false as const };
  return {
    found: true as const,
    sectionId: section.sectionId,
    heading: section.heading,
    sourceType: section.sourceType,
    text: section.text,
  };
}

export function searchSections(sections: readonly ProfileSection[], query: string, sourceType?: string) {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  if (terms.length === 0) return { found: false as const };
  const hits = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .filter((section) => !sourceType || section.sourceType === sourceType)
    .map((section) => {
      const haystack = `${section.heading} ${(section.aliases ?? []).join(" ")} ${section.text}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { section, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  if (hits.length === 0) return { found: false as const };
  return {
    found: true as const,
    sections: hits.map((hit) => ({
      sectionId: hit.section.sectionId,
      heading: hit.section.heading,
      sourceType: hit.section.sourceType,
      text: hit.section.text,
      match: "keyword" as const,
    })),
  };
}
