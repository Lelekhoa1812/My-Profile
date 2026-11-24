import { factLabel, type ProfileFact, type ProfileSection } from "./store";

function isPublic(visibility?: string): boolean {
  return (visibility ?? "public") === "public";
}

export function recordCard(facts: readonly ProfileFact[], sections: readonly ProfileSection[]): string {
  const publicFacts = facts.filter((fact) => isPublic(fact.visibility));
  const publicSections = sections.filter((section) => isPublic(section.visibility) && !section.sectionId.startsWith("archive-"));
  const factLines = publicFacts.map((fact) => `${factLabel(fact.key)}: ${fact.value}`);
  const sectionLines = publicSections.map((section) => `## ${section.heading}\n${section.text}`);
  return ["Facts", ...factLines, "", ...sectionLines].join("\n");
}
