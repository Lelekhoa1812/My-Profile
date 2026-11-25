import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { ChatDock } from "@/components/chat/dock";
import { RecordChatProvider } from "@/components/chat/record-chat";
import { HeroConsole } from "@/components/hero/hero-console";
import { SceneMount } from "@/components/scene/scene-mount";
import { Archive, type ArchiveItem } from "@/components/site/archive";
import { Cases } from "@/components/site/cases";
import { Header, Readout } from "@/components/site/header";
import { Projects } from "@/components/site/projects";
import { STILLS } from "@/components/site/stills";
import { Timeline } from "@/components/site/timeline";
import archive from "@/content/archive.json";
import profile from "@/content/profile.json";
import { cases, lanes, person, projects, research, roles, skills, starterQuestions } from "@/content/site";

const items = archive.items as ArchiveItem[];
const counts = {
  repo: items.filter((item) => item.kind === "repo").length,
  model: items.filter((item) => item.kind === "model").length,
  dataset: items.filter((item) => item.kind === "dataset").length,
  space: items.filter((item) => item.kind === "space").length,
};

const PROFILE_LINKS = [
  { label: "LinkedIn", href: person.links.linkedin },
  { label: "GitHub", href: person.links.github },
  { label: "Hugging Face", href: person.links.huggingface },
];

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Home() {
  const sectionIds = profile.sections.map((section) => section.sectionId);
  return (
    <RecordChatProvider>
      <a href="#ask-record" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to the question field
      </a>
      <Header name={person.name} title={person.title} cv={person.cv} />
      <main id="top">
        <section className="relative overflow-hidden" aria-label="Introduction">
          <SceneMount sectionIds={sectionIds} archiveCount={items.length} />
          <div className="relative mx-auto max-w-[90rem] px-5 md:px-10">
            <HeroConsole positioning={person.positioning} intro={person.intro} questions={starterQuestions} email={person.email} />
            <div className="flex flex-col gap-3 border-t border-white/12 py-5 pr-20 sm:flex-row sm:items-center sm:justify-between md:pr-24">
              <a href={`mailto:${person.email}`} className="w-fit text-[0.9375rem] text-ink underline decoration-white/30 underline-offset-[6px] hover:decoration-white">
                {person.email}
              </a>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {PROFILE_LINKS.map((link) => (
                  <li key={link.href}>
                    <ExternalLink href={link.href}>{link.label}</ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <Section id="work" title="Highlighted Works">
          <Cases items={cases} />
        </Section>

        <Section id="timeline" title="Timeline">
          <Timeline roles={roles} lanes={lanes} now={currentMonth()} />
        </Section>

        <Section id="projects" title="Projects">
          <Projects items={projects} />
        </Section>

        <Section
          id="archive"
          title="Everything public"
          intro={`${counts.repo} repositories, ${counts.model} models, ${counts.dataset} datasets, ${counts.space} Spaces.`}
        >
          <Archive items={items} areas={archive.areas} />
        </Section>

        <Section id="research" title="Research and study" intro={research.lab}>
          <div className="grid gap-12 lg:grid-cols-12">
            <dl className="space-y-8 lg:col-span-5">
              <div className="border-t border-white/12 pt-5">
                <dt className="text-[1.375rem] font-light leading-tight text-ink">{research.degree.title}</dt>
                <dd className="mt-2 text-white/72">{research.degree.org}</dd>
                <dd className="data mt-2 text-[10px] text-white/50">{research.degree.dates}</dd>
              </div>
              {research.orgs.map((org) => (
                <div key={org.name} className="border-t border-white/12 pt-5">
                  <dt>
                    <a href={org.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[1.375rem] font-light leading-tight text-ink hover:underline">
                      {org.name}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-white/55" strokeWidth={1.5} />
                    </a>
                  </dt>
                  <dd className="pretty mt-2 leading-relaxed text-white/72">{org.role}</dd>
                </div>
              ))}
            </dl>
            <div id="skills" className="scroll-mt-28 lg:col-span-7">
              <h3 className="text-[1.375rem] font-light leading-tight text-ink">Stack</h3>
              <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {skills.map((group) => (
                  <div key={group.group} className="border-t border-white/12 pt-4">
                    <h4 className="text-[0.9375rem] text-ink">{group.group}</h4>
                    <ul className="mt-3 space-y-1.5">
                      {group.items.map((skill) => (
                        <li key={skill} className="font-mono text-[0.8125rem] text-white/72">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <section id="contact" className="scroll-mt-20 border-t border-white/12">
          <div className="mx-auto grid max-w-[90rem] gap-12 px-5 pb-32 pt-20 md:px-10 md:pt-28 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <h2 className="text-[clamp(2.25rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-ink">Write to Liam</h2>
              <a href={`mailto:${person.email}`} className="mt-8 block w-fit break-all text-[clamp(1.75rem,5.4vw,5rem)] font-light leading-[1.05] tracking-[-0.03em] text-ink underline decoration-white/25 decoration-1 underline-offset-[0.18em] transition-colors hover:decoration-white">
                {person.email}
              </a>
              <dl className="mt-12 grid gap-8 sm:grid-cols-3">
                <div>
                  <dt className="data text-[10px] text-white/50">Phone</dt>
                  <dd className="mt-2">
                    <a href={person.phoneHref} className="text-ink hover:underline">
                      {person.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="data text-[10px] text-white/50">Based in</dt>
                  <dd className="mt-2 text-ink">{person.location}</dd>
                </div>
                <div>
                  <dt className="data text-[10px] text-white/50">Languages</dt>
                  <dd className="mt-2 space-y-0.5 text-ink">
                    {person.languages.map((language) => (
                      <span key={language} className="block">
                        {language}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
                <a href={person.cv} download className="data flex items-center gap-2 border border-white/40 px-4 py-3 text-[11px] text-ink transition-colors hover:bg-white hover:text-black">
                  Download the CV
                  <ArrowDownToLine aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
                </a>
                {PROFILE_LINKS.map((link) => (
                  <ExternalLink key={link.href} href={link.href}>
                    {link.label}
                  </ExternalLink>
                ))}
              </div>
            </div>
            <figure className="lg:col-span-3 lg:col-start-10">
              <Image src={STILLS["me.jpeg"]} alt={`${person.name}, also known as ${person.known}`} sizes="(min-width: 1024px) 22vw, 60vw" className="aspect-[4/5] w-full max-w-[18rem] border border-white/15 object-cover grayscale" />
              <figcaption className="data mt-3 text-[10px] text-white/50">
                {person.name} · {person.known}
              </figcaption>
            </figure>
          </div>
          <footer className="mx-auto flex max-w-[90rem] border-t border-white/12 px-5 py-6 md:px-10">
            <p className="data text-[10px] text-white/50">Melbourne · {new Date().getFullYear()}</p>
          </footer>
        </section>
      </main>
      <Readout />
      <ChatDock questions={starterQuestions} />
    </RecordChatProvider>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-white/12">
      <div className="mx-auto max-w-[90rem] px-5 py-20 md:px-10 md:py-28">
        <div className={`mb-12 md:mb-16 ${intro ? "grid gap-6 lg:grid-cols-12" : ""}`}>
          <h2 className="text-[clamp(2.25rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-ink lg:col-span-5">{title}</h2>
          {intro ? <p className="pretty max-w-[40rem] text-[1.0625rem] leading-relaxed text-white/72 lg:col-span-6 lg:col-start-7 lg:pt-3">{intro}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="data flex items-center gap-1.5 border-b border-white/35 pb-1 text-[11px] text-ink transition-colors hover:border-white">
      {children}
      <ArrowUpRight aria-hidden className="h-3 w-3" strokeWidth={1.5} />
    </a>
  );
}
