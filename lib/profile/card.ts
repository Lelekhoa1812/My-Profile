import type { ProfileFact, ProfileSection } from "./store";

function isPublic(visibility?: string): boolean {
  return (visibility ?? "public") === "public";
}

export function recordCard(facts: readonly ProfileFact[], sections: readonly ProfileSection[]): string {
  const publicFacts = facts.filter((fact) => isPublic(fact.visibility));
  const publicSections = sections.filter((section) => isPublic(section.visibility));
  const factLines = publicFacts.map((fact) => `${fact.key}: ${fact.value}`);
  const sectionLines = publicSections.map((section) => `## ${section.heading}\n${section.text}`);
  const headings = publicSections.map((section) => section.heading).join("; ");
  return ["Facts", ...factLines, "", ...sectionLines, "", `Headings: ${headings}`].join("\n");
}
