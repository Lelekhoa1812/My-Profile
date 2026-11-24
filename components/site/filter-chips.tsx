"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type Chip = { value: string; label: string; count: number };

export function FilterChips({ label, chips, value, onChange }: { label: string; chips: Chip[]; value: string; onChange: (value: string) => void }) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next: string[]) => next[0] && onChange(next[0])}
      spacing={2}
      className="-mx-5 w-auto flex-nowrap overflow-x-auto rounded-none px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
    >
      {chips.map((chip) => (
        <ToggleGroupItem
          key={chip.value}
          value={chip.value}
          className="data h-auto rounded-none border border-white/25 px-3.5 py-2.5 text-[10px] font-normal tracking-[0.22em] text-white/72 hover:bg-white/[0.06] hover:text-ink aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black focus-visible:ring-0"
        >
          {chip.label}
          <span className="opacity-60"> · {chip.count}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
