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
  experience_span: "Experience",
};

export function factLabel(key: string): string {
  return FACT_LABELS[key] ?? key.replaceAll("_", " ");
}

const FACT_KEY_ALIASES: Record<string, readonly string[]> = {
  current_title: ["public_title"],
  job_title: ["public_title"],
  title: ["public_title", "page_title"],
  job: ["public_title"],
  name: ["full_name"],
  experience: ["experience_span"],
};

function factKeys(key: string): string[] {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return [...new Set([normalized, ...(FACT_KEY_ALIASES[normalized] ?? [])])];
}

export function lookupFacts(facts: readonly ProfileFact[], input: { key?: string; kind?: string }) {
  if (!input.key && !input.kind) return { found: false as const };
  let rows = facts.filter((fact) => (fact.visibility ?? "public") === "public");
  if (input.key) {
    const keys = factKeys(input.key);
    const byKey = rows.filter((fact) => keys.includes(fact.key));
    rows = byKey.length > 0 ? byKey : rows.filter((fact) => {
      const hay = `${fact.key} ${factLabel(fact.key)} ${fact.value}`.toLowerCase();
      const terms = keys[0]?.split("_").filter((term) => term.length > 2 && !STOP_WORDS.has(term)) ?? [];
      return terms.length > 0 && terms.every((term) => hay.includes(term));
    });
  }
  if (input.kind) {
    const byKind = rows.filter((fact) => fact.kind === input.kind);
    if (byKind.length > 0) rows = byKind;
    else if (!input.key) return { found: false as const };
  }
  if (rows.length === 0) return { found: false as const };
  return {
    found: true as const,
    facts: rows.map((fact) => ({ label: factLabel(fact.key), kind: fact.kind, value: fact.value })),
  };
}

export function listSections(sections: readonly ProfileSection[], sourceType?: string) {
  const sectionsOut = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .filter((section) => !section.sectionId.startsWith("archive-"))
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
  const phrase = wanted.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const visible = sections.filter((item) => (item.visibility ?? "public") === "public");
  const section = visible.find((item) => item.sectionId === sectionId)
    ?? visible.find((item) => item.heading.toLowerCase() === wanted || item.sectionId.toLowerCase() === wanted)
    ?? uniqueHeading(visible, wanted)
    ?? (phrase === wanted ? undefined : uniqueHeading(visible, phrase));
  if (!section) return { found: false as const };
  return {
    found: true as const,
    sectionId: section.sectionId,
    heading: section.heading,
    sourceType: section.sourceType,
    text: section.text,
  };
}

const BROAD_SECTION_IDS = ["role-axion", "project-shipped"] as const;

function broadSections(pool: readonly { section: ProfileSection; title: string; body: string }[]) {
  const chosen = BROAD_SECTION_IDS.flatMap((sectionId) => {
    const hit = pool.find((item) => item.section.sectionId === sectionId);
    return hit ? [hit] : [];
  });
  if (chosen.length === 0) return { found: false as const };
  return {
    found: true as const,
    sections: chosen.map((hit) => ({
      sectionId: hit.section.sectionId,
      heading: hit.section.heading,
      sourceType: hit.section.sourceType,
      text: hit.section.text,
      match: "broad" as const,
    })),
  };
}

function namesAnotherRole(pool: readonly { section: ProfileSection; title: string; body: string }[], terms: readonly string[]): boolean {
  return pool.some((item) => item.section.sourceType === "role"
    && item.section.sectionId !== "role-axion"
    && terms.some((term) => term !== "title" && term !== "current" && (item.title.includes(term) || item.body.includes(term))));
}

function uniqueHeading(sections: readonly ProfileSection[], wanted: string): ProfileSection | undefined {
  if (wanted.length < 4) return undefined;
  const hits = sections.filter((item) => item.heading.toLowerCase().includes(wanted));
  return hits.length === 1 ? hits[0] : undefined;
}

const FACT_ONLY_TERMS = new Set([
  "email", "phone", "number", "mobile", "location", "address", "degree", "linkedin", "github", "huggingface",
]);

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "what", "which", "who", "where", "when", "why", "how", "does", "did", "can",
  "has", "have", "had", "was", "were", "are", "his", "him", "liam", "about", "tell", "that", "this", "from",
  "into", "must", "should", "would", "could", "any", "all", "you", "your", "there", "their", "first",
  "work", "worked", "working", "role", "project", "please", "describe",
]);

export function searchSections(sections: readonly ProfileSection[], query: string, sourceType?: string) {
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/))]
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  const pool = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .filter((section) => !sourceType || section.sourceType === sourceType)
    .map((section) => ({
      section,
      title: `${section.heading} ${(section.aliases ?? []).join(" ")}`.toLowerCase(),
      body: section.text.toLowerCase(),
    }));
  if (terms.length === 0) return broadSections(pool);
  if (terms.every((term) => FACT_ONLY_TERMS.has(term))) return { found: false as const };
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
      return { section, title, score, matched };
    })
    .filter((hit) => hit.matched / terms.length >= 0.5)
    .filter((hit) => !hit.section.sectionId.startsWith("archive-") || terms.some((term) => hit.title.includes(term)))
    .sort((left, right) => right.score - left.score);
  if (terms.includes("title") && !namesAnotherRole(pool, terms)) {
    const current = pool.find((item) => item.section.sourceType === "role" && item.body.includes("ai software engineer"));
    if (current && !hits.some((hit) => hit.section.sectionId === current.section.sectionId)) {
      hits.unshift({ section: current.section, title: current.title, score: Number.POSITIVE_INFINITY, matched: terms.length });
    }
  }
  const complete = hits.filter((hit) => terms.every((term) => hit.title.includes(term)));
  const top = (complete.length > 0 ? complete : hits).slice(0, 3);
  if (top.length === 0) return { found: false as const };
  return {
    found: true as const,
    sections: top.map((hit) => ({
      sectionId: hit.section.sectionId,
      heading: hit.section.heading,
      sourceType: hit.section.sourceType,
      text: hit.section.text,
      match: "keyword" as const,
    })),
  };
}
