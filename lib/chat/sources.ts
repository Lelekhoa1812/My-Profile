import { cases, projects, roles } from "../../content/site";

export type Source = {
  sectionId: string;
  label: string;
  meta: string;
  href: string;
  terms: string[];
};

type ToolLikePart = { type: string; state?: string; output?: unknown };

const HREF: Record<string, string> = {
  "project-axion-workflows": "#case-axis",
  "project-medvietai": "#research",
  "project-sp500": "#projects",
  "project-estatefolio": "#projects",
  "project-adhd": "#projects",
  "project-medchat": "#projects",
  "project-public-code": "#archive",
  "project-hf-models": "#archive",
  skills: "#skills",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(value: string | null): string {
  if (!value) return "now";
  const [year, month] = value.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

const GENERIC_TERMS = new Set(["public", "project", "projects", "engineer", "software", "senior", "github", "model", "models", "archive", "section", "record", "visitor", "page", "works"]);

function sourceTerms(label: string, heading: string, roleTitle?: string): string[] {
  const words = heading.split(/[\s,]+/).filter((word) => word.length > 4 && !GENERIC_TERMS.has(word.toLowerCase()));
  return [...new Set([label, heading, ...(roleTitle ? [roleTitle] : []), ...words])];
}
function describe(sectionId: string, heading: string, sourceType: string): Source {
  const role = roles.find((item) => item.sectionId === sectionId);
  const study = cases.find((item) => item.sectionId === sectionId);
  const project = projects.find((item) => item.sectionId === sectionId);
  const label = role ? role.employer : project ? project.title : heading;
  const meta = role
    ? `${role.title} · ${monthLabel(role.start)} – ${monthLabel(role.end)}`
    : study
      ? `${study.role.split(",")[0]} · ${study.dates}`
      : project
        ? project.label
        : sourceType;
  const href = HREF[sectionId] ?? (study && !role ? `#case-${study.id}` : `#${sectionId}`);
  return { sectionId, label, meta, href, terms: sourceTerms(label, heading, role?.title) };
}

export function sourcesFromParts(parts: readonly ToolLikePart[], limit = 3): Source[] {
  const read: Source[] = [];
  const searched: Source[] = [];
  for (const part of parts) {
    if (!part.type.startsWith("tool-") || part.state !== "output-available") continue;
    const output = part.output as Record<string, unknown> | undefined;
    if (!output || output.found !== true) continue;
    if (part.type === "tool-read_section" && typeof output.sectionId === "string") {
      read.push(describe(output.sectionId, String(output.heading ?? ""), String(output.sourceType ?? "")));
    }
    if (part.type === "tool-search_sections" && Array.isArray(output.sections)) {
      for (const hit of output.sections as Record<string, unknown>[]) {
        if (typeof hit.sectionId === "string") searched.push(describe(hit.sectionId, String(hit.heading ?? ""), String(hit.sourceType ?? "")));
      }
    }
  }
  const seen = new Set<string>();
  return [...read, ...searched].filter((source) => !seen.has(source.sectionId) && seen.add(source.sectionId)).slice(0, limit);
}

export type Segment = { text: string; ref?: number };

function findTerm(haystack: string, term: string): number {
  const lower = haystack.toLowerCase();
  const needle = term.toLowerCase();
  let from = 0;
  while (from < lower.length) {
    const start = lower.indexOf(needle, from);
    if (start < 0) return -1;
    const before = start === 0 || !/[a-z0-9]/i.test(lower[start - 1]);
    const after = start + needle.length >= lower.length || !/[a-z0-9]/i.test(lower[start + needle.length]);
    if (before && after) return start;
    from = start + 1;
  }
  return -1;
}

export function anchorSegments(answer: string, sources: readonly Source[]): Segment[] {
  const marks: { start: number; end: number; ref: number }[] = [];
  sources.forEach((source, ref) => {
    for (const term of source.terms) {
      if (!term) continue;
      const start = findTerm(answer, term);
      if (start < 0) continue;
      const end = start + term.length;
      if (marks.some((mark) => start < mark.end && mark.start < end)) continue;
      marks.push({ start, end, ref });
      break;
    }
  });
  marks.sort((left, right) => left.start - right.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) segments.push({ text: answer.slice(cursor, mark.start) });
    segments.push({ text: answer.slice(mark.start, mark.end), ref: mark.ref });
    cursor = mark.end;
  }
  if (cursor < answer.length) segments.push({ text: answer.slice(cursor) });
  return segments;
}
