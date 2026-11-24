import { ArrowUpRight, UserCheck } from "lucide-react";
import Image from "next/image";
import type { Case, FlowStep } from "@/content/site";
import { STILLS } from "./stills";

export function Cases({ items }: { items: Case[] }) {
  return (
    <div className="divide-y divide-white/12 border-y border-white/12">
      {items.map((item) => (
        <article key={item.id} id={`case-${item.id}`} className="grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <h3 className="balance text-[clamp(2rem,3.6vw,3.25rem)] font-light leading-[1.05] tracking-[-0.02em] text-ink">{item.title}</h3>
            <p className="data mt-4 text-white/55">
              {item.role}
              <span className="text-white/30"> · </span>
              {item.dates}
              {item.place ? (
                <>
                  <span className="text-white/30"> · </span>
                  {item.place}
                </>
              ) : null}
            </p>
            <p className="pretty mt-8 max-w-[38rem] text-[clamp(1.2rem,1.7vw,1.4rem)] font-light leading-snug text-white/88">{item.problem}</p>
            <ul className="mt-8 max-w-[40rem] space-y-4">
              {item.built.map((line) => (
                <li key={line} className="pretty border-t border-white/10 pt-4 leading-relaxed text-white/72">
                  {line}
                </li>
              ))}
            </ul>
            <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              <div>
                <dt className="data text-[11px] text-white/50">Result</dt>
                {item.result ? (
                  <dd className="mt-2">
                    <span className="block text-lg font-light leading-snug text-ink">{item.result.text}</span>
                    <span className="data mt-2 block text-[10px] text-white/50">{item.result.source}</span>
                  </dd>
                ) : (
                  <dd className="mt-2 leading-snug text-white/72">The resume states scope and controls here, not a number.</dd>
                )}
              </div>
              {item.also ? (
                <div>
                  <dt className="data text-[11px] text-white/50">Also on the resume</dt>
                  <dd className="mt-2">
                    <span className="block leading-snug text-white/88">{item.also.text}</span>
                    <span className="data mt-2 block text-[10px] text-white/50">{item.also.source}</span>
                  </dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="data text-[11px] text-white/50">Stack</dt>
                <dd className="mt-3 flex flex-wrap gap-2">
                  {item.stack.map((tool) => (
                    <span key={tool} className="data border border-white/20 px-2.5 py-1.5 text-[10px] tracking-[0.18em] text-white/72">
                      {tool}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            {item.links.length > 0 ? (
              <p className="mt-8 flex flex-wrap gap-6">
                {item.links.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="data flex items-center gap-1.5 border-b border-white/40 pb-1 text-ink hover:border-white">
                    {link.label}
                    <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </a>
                ))}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-8 self-start lg:sticky lg:top-28 lg:col-span-5 lg:pt-3">
            <Flow steps={item.flow} title={`How ${item.title} hands work to a person`} />
            {item.image && STILLS[item.image.src] ? (
              <figure className="border border-white/15 p-2">
                <Image src={STILLS[item.image.src]} alt={item.image.alt} sizes="(min-width: 1024px) 34vw, 100vw" className="h-auto w-full opacity-90 grayscale transition duration-700 hover:opacity-100 hover:grayscale-0" />
              </figure>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function Flow({ steps, title }: { steps: FlowStep[]; title: string }) {
  return (
    <figure className="columns-hair relative border border-white/15 px-6 py-7 md:px-8">
      <figcaption className="sr-only">{title}</figcaption>
      <ol className="relative">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex items-stretch gap-4">
            <div className="flex w-3 flex-col items-center">
              <span className={`mt-[0.7rem] block h-2.5 w-2.5 shrink-0 rounded-full border ${step.gate ? "border-white bg-white" : "border-white/70 bg-black"}`} />
              {index < steps.length - 1 ? <span className="w-px flex-1 bg-white/35" /> : null}
            </div>
            <div className={`mb-3 flex flex-1 items-center justify-between gap-3 px-3.5 py-2.5 ${step.gate ? "border border-white/80 bg-white/[0.06] outline outline-1 outline-offset-[3px] outline-white/25" : "border border-white/18"}`}>
              <span className="leading-snug text-ink">{step.label}</span>
              {step.gate ? <UserCheck aria-hidden className="h-4 w-4 shrink-0 text-ink" strokeWidth={1.5} /> : step.note ? <span className="data text-right text-[10px] text-white/50">{step.note}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
