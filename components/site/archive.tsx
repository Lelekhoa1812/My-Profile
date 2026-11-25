"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { FilterChips } from "./filter-chips";

export type ArchiveItem = {
  id: string;
  title: string;
  kind: "repo" | "model" | "dataset" | "space";
  area: string;
  summary: string;
  detail: string;
  year: number;
  committed: string;
  stat: number | null;
  owner?: string;
  url: string;
};

const KINDS: { value: ArchiveItem["kind"]; label: string; unit: string }[] = [
  { value: "repo", label: "Repositories", unit: "star" },
  { value: "model", label: "Models", unit: "download" },
  { value: "dataset", label: "Datasets", unit: "download" },
  { value: "space", label: "Spaces", unit: "like" },
];

const KIND_NAME: Record<ArchiveItem["kind"], string> = { repo: "Repo", model: "Model", dataset: "Dataset", space: "Space" };

const PAGE = 30;

export function Archive({ items, areas }: { items: ArchiveItem[]; areas: Record<string, string> }) {
  const [area, setArea] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const byArea = area === "all" ? items : items.filter((item) => item.area === area);
  const byKind = kind === "all" ? byArea : byArea.filter((item) => item.kind === kind);
  const matches = deferred ? byKind.filter((item) => `${item.title} ${item.summary} ${item.detail} ${item.owner ?? ""}`.toLowerCase().includes(deferred)) : byKind;
  const shown = all || deferred ? matches : matches.slice(0, PAGE);

  const areaChips = [{ value: "all", label: "All", count: items.length }, ...Object.entries(areas).map(([value, label]) => ({ value, label, count: items.filter((item) => item.area === value).length }))];
  const kindChips = [{ value: "all", label: "Every kind", count: byArea.length }, ...KINDS.map((entry) => ({ value: entry.value, label: entry.label, count: byArea.filter((item) => item.kind === entry.value).length })).filter((chip) => chip.count > 0)];

  return (
    <div>
      <div className="flex flex-col gap-4">
        <FilterChips label="Filter by area" chips={areaChips} value={area} onChange={(value) => { setArea(value); setKind("all"); }} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips label="Filter by kind" chips={kindChips} value={kind} onChange={setKind} />
          <label className="flex items-center gap-3 border-b border-white/30 py-2 focus-within:border-white lg:w-80">
            <Search aria-hidden className="h-4 w-4 text-white/55" strokeWidth={1.5} />
            <span className="sr-only">Search the archive</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, model, or tool"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-white/50"
            />
          </label>
        </div>
      </div>
      <p className="data mt-8 text-[10px] text-white/50" aria-live="polite">
        {matches.length} of {items.length} shown
      </p>
      {matches.length === 0 ? (
        <p className="mt-6 border-y border-white/12 py-10 text-white/72">
          Nothing in the archive matches “{query}”. Try a tool name such as LangGraph, YOLO, or Whisper.
        </p>
      ) : (
        <ul className="mt-3 border-t border-white/12 lg:grid lg:grid-cols-[minmax(12rem,1.35fr)_minmax(0,1.55fr)_minmax(0,13.25rem)_max-content_max-content_1rem] lg:gap-x-6">
          {shown.map((item) => {
            const committed = committedLabel(item.committed);
            const stat = statLabel(item);
            return (
              <li key={item.id} className="border-b border-white/10 lg:col-span-full lg:grid lg:min-w-0 lg:grid-cols-subgrid">
                <a href={item.url} target="_blank" rel="noreferrer" className="group grid min-w-0 gap-y-1 py-4 transition-colors hover:bg-white/[0.04] lg:col-span-full lg:grid-cols-subgrid lg:items-baseline lg:gap-y-0 lg:px-2">
                  <span className="min-w-0 break-words text-[1.0625rem] leading-snug text-ink">{item.title}</span>
                  <span className="pretty min-w-0 break-words text-[0.9375rem] leading-snug text-white/65">{item.summary || areas[item.area]}</span>
                  <span className="data min-w-0 text-[10px] text-white/55 lg:truncate">
                    {KIND_NAME[item.kind]}
                    {item.detail ? <span className="text-white/55"> · {item.detail}</span> : null}
                    <span className="lg:hidden">
                      {committed ? ` · ${committed}` : ""}
                      {stat ? ` · ${stat}` : ""}
                    </span>
                  </span>
                  <span className="data hidden whitespace-nowrap text-[10px] text-white/55 lg:block">
                    <span className="sr-only">Last commit </span>
                    {committed}
                  </span>
                  <span className="data hidden whitespace-nowrap text-right text-[10px] text-white/55 lg:block">{stat}</span>
                  <ArrowUpRight aria-hidden className="hidden h-3.5 w-3.5 justify-self-end text-white/40 transition-colors group-hover:text-ink lg:block" strokeWidth={1.5} />
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {!all && !deferred && matches.length > PAGE ? (
        <button type="button" onClick={() => setAll(true)} className="data mt-8 border border-white/30 px-5 py-3 text-[11px] text-ink transition-colors hover:bg-white hover:text-black">
          Show all {matches.length}
        </button>
      ) : null}
    </div>
  );
}

function committedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Melbourne",
  }).format(date);
}

function statLabel(item: ArchiveItem): string {
  if (!item.stat) return "";
  const unit = KINDS.find((entry) => entry.value === item.kind)?.unit ?? "";
  return `${item.stat.toLocaleString("en-AU")} ${unit}${item.stat === 1 ? "" : "s"}`;
}
