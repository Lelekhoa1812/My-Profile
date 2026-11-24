"use client";

import { MessageSquareText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRecordChat } from "@/components/chat/record-chat";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Lane, Role } from "@/content/site";
import { monthLabel } from "@/lib/chat/sources";
import { FilterChips } from "./filter-chips";

const START = { year: 2020, month: 1 };

function index(value: string): number {
  const [year, month] = value.split("-").map(Number);
  return (year - START.year) * 12 + (month - START.month);
}

function pack(roles: Role[], now: string): { role: Role; row: number }[] {
  const rows: number[] = [];
  return [...roles]
    .sort((a, b) => index(a.start) - index(b.start))
    .map((role) => {
      const begin = index(role.start);
      const finish = index(role.end ?? now);
      let row = rows.findIndex((end) => end < begin);
      if (row === -1) {
        row = rows.length;
        rows.push(finish);
      } else rows[row] = finish;
      return { role, row };
    });
}

export function Timeline({ roles, lanes, now }: { roles: Role[]; lanes: { id: Lane; label: string }[]; now: string }) {
  const [focus, setFocus] = useState<string | null>(null);
  const [lane, setLane] = useState<string>("all");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, []);
  const span = index(now) + 3;
  const years = Array.from({ length: Math.ceil(span / 12) }, (_, i) => START.year + i).filter((year) => (year - START.year) * 12 < span - 4);
  const nowAt = (index(now) / span) * 100;

  const packed = useMemo(() => lanes.map((item) => ({ ...item, bars: pack(roles.filter((role) => role.lane === item.id), now) })), [lanes, roles, now]);

  function select(id: string) {
    setFocus(id);
    setLane("all");
    requestAnimationFrame(() => document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  return (
    <div>
      <div ref={scroller} className="-mx-5 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0" role="region" aria-label="Roles on a time axis, scroll sideways on small screens" tabIndex={0}>
        <div className="min-w-[56rem]">
          <div className="grid grid-cols-[10rem_1fr] gap-6">
            <span />
            <div className="relative h-7">
              {years.map((year) => (
                <span key={year} className="data absolute top-0 -translate-x-px border-l border-white/30 pl-2 text-[10px] text-white/55" style={{ left: `${(((year - START.year) * 12) / span) * 100}%` }}>
                  {year}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 space-y-px">
            {packed.map((item) => {
              const rowCount = Math.max(1, ...item.bars.map((bar) => bar.row + 1));
              return (
                <div key={item.id} className="grid grid-cols-[10rem_1fr] gap-6 border-t border-white/12 py-4">
                  <div className="sticky left-0 z-10 -ml-5 bg-black pl-5 md:static md:ml-0 md:bg-transparent md:pl-0">
                    <p className="text-[0.9375rem] leading-snug text-ink">{item.label}</p>
                    <p className="data mt-1 text-[10px] text-white/50">{item.bars.length} roles</p>
                  </div>
                  <div className="relative" style={{ height: `${rowCount * 2.25}rem` }}>
                    {years.map((year) => (
                      <span key={year} aria-hidden className="absolute inset-y-0 w-px bg-white/[0.07]" style={{ left: `${(((year - START.year) * 12) / span) * 100}%` }} />
                    ))}
                    <span aria-hidden className="absolute inset-y-0 w-px border-l border-dashed border-white/50" style={{ left: `${nowAt}%` }} />
                    {item.bars.map(({ role, row }) => {
                      const left = (index(role.start) / span) * 100;
                      const width = ((index(role.end ?? now) - index(role.start) + 1) / span) * 100;
                      const lit = focus === role.id;
                      return (
                        <Tooltip key={role.id}>
                          <TooltipTrigger
                            onClick={() => select(role.id)}
                            aria-label={`${role.employer}, ${role.title}, ${monthLabel(role.start)} to ${monthLabel(role.end)}`}
                            className={`absolute flex h-7 items-center overflow-hidden whitespace-nowrap border px-2 text-left text-[11px] leading-none transition-colors ${role.end ? "" : "border-dashed"} ${lit ? "border-white bg-white text-black" : "border-white/40 bg-white/[0.07] text-white/88 hover:border-white hover:bg-white hover:text-black"}`}
                            style={{ left: `${left}%`, width: `${width}%`, top: `${row * 2.25}rem` }}
                          >
                            {role.employer}
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8} className="block max-w-[18rem] rounded-none border border-white/30 bg-black px-4 py-3 text-left text-ink">
                            <span className="block text-sm">{role.employer}</span>
                            <span className="block text-[13px] text-white/72">{role.title}</span>
                            <span className="data mt-2 block text-[10px] text-white/55">
                              {monthLabel(role.start)} – {monthLabel(role.end)} · {lanes.find((entry) => entry.id === role.lane)?.label}
                            </span>
                            <span className="mt-2 block text-[13px] leading-snug text-white/80">{role.outcome}</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[10rem_1fr] gap-6">
            <span />
            <div className="relative h-6">
              <span className="data absolute top-1 -translate-x-full pr-2 text-[10px] text-white/55" style={{ left: `${nowAt}%` }}>
                Now
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="data mt-3 text-[10px] text-white/50 md:hidden">Swipe right for earlier years</p>
      <p className="mt-6 max-w-[44rem] text-sm leading-relaxed text-white/55">
        From May 2025 to July 2026 several engagements overlap. Lanes group roles by engagement. The resume does not state hours.
      </p>
      <RoleList roles={roles} lanes={lanes} lane={lane} onLane={setLane} focus={focus} />
    </div>
  );
}

function RoleList({ roles, lanes, lane, onLane, focus }: { roles: Role[]; lanes: { id: Lane; label: string }[]; lane: string; onLane: (value: string) => void; focus: string | null }) {
  const { ask, busy } = useRecordChat();
  const sorted = [...roles].sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));
  const shown = lane === "all" ? sorted : sorted.filter((role) => role.lane === lane);
  const chips = [{ value: "all", label: "All", count: roles.length }, ...lanes.map((item) => ({ value: item.id, label: item.label, count: roles.filter((role) => role.lane === item.id).length }))];

  return (
    <div className="mt-16">
      <FilterChips label="Filter roles by lane" chips={chips} value={lane} onChange={onLane} />
      <ol className="mt-8 border-t border-white/12">
        {shown.map((role) => (
          <li
            key={role.id}
            id={role.sectionId ?? role.id}
            className={`scroll-mt-28 border-b border-white/12 transition-colors duration-700 ${focus === role.id ? "bg-white/[0.06]" : ""}`}
          >
            <div id={`row-${role.id}`} className="grid gap-x-8 gap-y-2 py-6 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.15fr)_auto] md:items-baseline">
              <p className="data text-[11px] text-white/55">
                {monthLabel(role.start)} – {monthLabel(role.end)}
              </p>
              <div>
                <h3 className="text-[1.375rem] font-light leading-tight text-ink">{role.employer}</h3>
                <p className="mt-1 text-[0.9375rem] text-white/72">
                  {role.title}
                  {role.place ? <span className="text-white/50"> · {role.place}</span> : null}
                </p>
              </div>
              <div>
                <p className="pretty leading-relaxed text-white/88">{role.outcome}</p>
                <p className="data mt-2 text-[10px] text-white/50">
                  {lanes.find((item) => item.id === role.lane)?.label}
                  {role.overlap ? ` · ${role.overlap}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => ask(`Tell me about the ${role.title} role at ${role.employer}.`, "dock")}
                className="data mt-2 flex h-10 items-center gap-2 self-start justify-self-start border border-white/20 px-3 text-[10px] text-white/72 transition-colors hover:border-white hover:text-ink disabled:opacity-40 md:mt-0"
                aria-label={`Ask about ${role.employer}, ${role.title}`}
              >
                <MessageSquareText aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
                Ask
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
