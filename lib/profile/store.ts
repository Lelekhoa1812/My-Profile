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

const FACT_LABELS: Record<string, string> = {
  full_name: "Name",
  also_known_as: "Also called",
  email: "Email",
  phone: "Phone",
  location: "Location",
  linkedin: "LinkedIn",
  github: "GitHub",
  huggingface: "Hugging Face",
  public_title: "Current title",
  page_title: "Page title",
  degree: "Degree",
  languages: "Languages",
};

export function factLabel(key: string): string {
  return FACT_LABELS[key] ?? key.replaceAll("_", " ");
}

export function lookupFacts(facts: readonly ProfileFact[], input: { key?: string; kind?: string }) {
  if (!input.key && !input.kind) return { found: false as const };
  const rows = facts.filter((fact) => (fact.visibility ?? "public") === "public")
    .filter((fact) => !input.key || fact.key === input.key)
    .filter((fact) => !input.kind || fact.kind === input.kind);
  if (rows.length === 0) return { found: false as const };
  return {
    found: true as const,
    facts: rows.map((fact) => ({ label: factLabel(fact.key), kind: fact.kind, value: fact.value })),
  };
}

export function listSections(sections: readonly ProfileSection[], sourceType?: string) {
  const sectionsOut = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .filter((section) => !sourceType || section.sourceType === sourceType)
    .map((section) => ({
      sectionId: section.sectionId,
      heading: section.heading,
      sourceType: section.sourceType,
    }));
  if (sectionsOut.length === 0) return { found: false as const, sections: sectionsOut };
  return { found: true as const, sections: sectionsOut };
}

export function readSection(sections: readonly ProfileSection[], sectionId: string) {
  const wanted = sectionId.trim().toLowerCase();
  const visible = sections.filter((item) => (item.visibility ?? "public") === "public");
  const section = visible.find((item) => item.sectionId === sectionId)
    ?? visible.find((item) => item.heading.toLowerCase() === wanted || item.sectionId.toLowerCase() === wanted)
    ?? uniqueHeading(visible, wanted);
  if (!section) return { found: false as const };
  return {
    found: true as const,
    sectionId: section.sectionId,
    heading: section.heading,
    sourceType: section.sourceType,
    text: section.text,
  };
}

function uniqueHeading(sections: readonly ProfileSection[], wanted: string): ProfileSection | undefined {
  if (wanted.length < 4) return undefined;
  const hits = sections.filter((item) => item.heading.toLowerCase().includes(wanted));
  return hits.length === 1 ? hits[0] : undefined;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "what", "which", "who", "where", "when", "why", "how", "does", "did", "can",
  "has", "have", "had", "was", "were", "are", "his", "him", "liam", "about", "tell", "that", "this", "from",
  "into", "must", "should", "would", "could", "any", "all", "you", "your", "there", "their", "first",
  "work", "worked", "working", "role", "project", "please", "describe",
]);

export function searchSections(sections: readonly ProfileSection[], query: string, sourceType?: string) {
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/))]
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  if (terms.length === 0) return { found: false as const };
  const pool = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .filter((section) => !sourceType || section.sourceType === sourceType)
    .map((section) => ({
      section,
      title: `${section.heading} ${(section.aliases ?? []).join(" ")}`.toLowerCase(),
      body: section.text.toLowerCase(),
    }));
  const weight = new Map(terms.map((term) => {
    const frequency = pool.filter((item) => item.title.includes(term) || item.body.includes(term)).length;
    return [term, Math.log(1 + pool.length / Math.max(1, frequency))];
  }));
  const hits = pool
    .map(({ section, title, body }) => {
      const matched = terms.filter((term) => title.includes(term) || body.includes(term)).length;
      const score = terms.reduce((total, term) => {
        const inTitle = title.includes(term);
        if (!inTitle && !body.includes(term)) return total;
        return total + (weight.get(term) ?? 0) * (inTitle ? 2 : 1);
      }, 0);
      return { section, score, matched };
    })
    .filter((hit) => hit.matched / terms.length >= 0.5)
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
