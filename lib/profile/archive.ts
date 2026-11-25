import archive from "../../content/archive.json";
import type { ProfileSection } from "./store";

type ArchiveItem = {
  id: string;
  title: string;
  kind: string;
  summary?: string;
  detail?: string;
  year?: number;
  url?: string;
  readme?: string;
};

const KIND: Record<string, string> = {
  repo: "GitHub repository",
  model: "Hugging Face model",
  dataset: "Hugging Face dataset",
  space: "Hugging Face Space",
};

function sectionId(id: string): string {
  return `archive-${id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/\.+$/, "");
}

export function archiveSection(item: ArchiveItem): ProfileSection {
  const kind = KIND[item.kind] ?? item.kind;
  const detail = item.kind === "repo" && item.detail ? `Repository language: ${clean(item.detail)}` : clean(item.detail);
  const parts = [clean(item.title), kind, clean(item.summary), detail, clean(item.readme), item.year ? String(item.year) : "", clean(item.url)].filter((part) => part.length > 0);
  const note = item.kind === "space" ? " A public Space is not a released product." : "";
  return {
    sectionId: sectionId(item.id),
    heading: item.title,
    sourceType: "project",
    aliases: [item.title, item.id],
    text: `${parts.join(". ")}.${note}`,
    visibility: "public",
  };
}

export function archiveSections(): ProfileSection[] {
  return (archive.items as ArchiveItem[]).map(archiveSection);
}

export function withArchive(sections: readonly ProfileSection[]): ProfileSection[] {
  const seen = new Set(sections.map((section) => section.sectionId));
  const extra = archiveSections().filter((section) => !seen.has(section.sectionId));
  return [...sections, ...extra];
}
