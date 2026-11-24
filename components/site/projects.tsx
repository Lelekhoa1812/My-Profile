"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import type { PointerEvent } from "react";
import type { Project } from "@/content/site";
import { STILLS } from "./stills";

export function Projects({ items }: { items: Project[] }) {
  return (
    <div className="grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ProjectEntry key={item.id} item={item} />
      ))}
    </div>
  );
}

function ProjectEntry({ item }: { item: Project }) {
  const still = item.image ? STILLS[item.image] : undefined;

  function track(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--x", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--y", `${event.clientY - box.top}px`);
  }

  return (
    <article id={item.sectionId?.startsWith("project-") ? item.sectionId : `project-${item.id}`} className="group relative px-5 pb-10 pt-9 md:px-8">
      <div aria-hidden className="absolute left-5 right-5 top-2 flex items-center opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 md:left-8 md:right-8">
        <span className="h-2 w-px bg-white/60" />
        <span className="h-px flex-1 bg-white/35" />
        <span className="data mx-2 text-[9px] text-white/60">{still ? `${still.width} × ${still.height}` : "no still"}</span>
        <span className="h-px flex-1 bg-white/35" />
        <span className="h-2 w-px bg-white/60" />
      </div>
      <div
        onPointerMove={track}
        onPointerEnter={(event) => event.currentTarget.style.setProperty("--r", "92px")}
        onPointerLeave={(event) => event.currentTarget.style.setProperty("--r", "0px")}
        className="lens relative aspect-[4/3] overflow-hidden border border-white/15 bg-white/[0.02]"
      >
        {still ? (
          <>
            <Image src={still} alt={item.alt ?? ""} fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 100vw" className="object-cover object-top opacity-80 grayscale" />
            <Image src={still} alt="" aria-hidden fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 100vw" className="lens-colour object-cover object-top" />
          </>
        ) : (
          <div className="hatch grid h-full place-items-center">
            <span className="data text-[10px] text-white/50">No public still</span>
          </div>
        )}
      </div>
      <h3 className="mt-6 text-[1.625rem] font-light leading-tight tracking-[-0.01em] text-ink">{item.title}</h3>
      <p className="data mt-2 text-[10px] text-white/55">{item.label}</p>
      <p className="pretty mt-4 leading-relaxed text-white/72">{item.line}</p>
      {item.result ? <p className="mt-3 font-mono text-[0.8125rem] leading-relaxed text-white/88">{item.result}</p> : null}
      {item.links.length > 0 ? (
        <p className="mt-5 flex flex-wrap gap-5">
          {item.links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="data flex items-center gap-1.5 border-b border-white/35 pb-1 text-[11px] text-ink transition-colors hover:border-white">
              {link.label}
              <ArrowUpRight aria-hidden className="h-3 w-3" strokeWidth={1.5} />
            </a>
          ))}
        </p>
      ) : null}
    </article>
  );
}
