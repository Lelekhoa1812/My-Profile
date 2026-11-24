import type { ReactNode } from "react";
import profile from "../content/profile.json";
import { ChatDock } from "./chat-dock";

const featured = ["role-axion", "project-medswin", "role-harry-senior"] as const;

const chapters = [
  {
    id: "systems",
    title: "Systems that have to keep their word",
    ids: ["project-axion-workflows", "role-mizco", "role-teqar"],
  },
  {
    id: "research",
    title: "Research with a lab and a name",
    ids: ["role-swinburne-research", "project-medvietai", "role-pythera"],
  },
  {
    id: "record",
    title: "The employment record",
    ids: profile.sections.filter((section) => section.sourceType === "role").map((section) => section.sectionId),
  },
] as const;

function opening(heading: string, text: string): string {
  if (!heading || !text) return text || "";
  const body = text.startsWith(heading) ? text.slice(heading.length).replace(/^[\s.,]+/, "") : text;
  const mark = body.indexOf(". ");
  return mark === -1 ? body : body.slice(0, mark + 1);
}

function sectionText(id: string): { heading: string; text: string } | undefined {
  const section = profile.sections.find((item) => item.sectionId === id);
  if (!section) return undefined;
  return { heading: section.heading, text: section.text };
}

export default function Page() {
  const name = profile.facts.find((fact) => fact.key === "full_name")?.value ?? "Dang Khoa Le";
  const title = profile.facts.find((fact) => fact.key === "public_title")?.value;
  const place = profile.facts.find((fact) => fact.key === "location")?.value;

  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="#work" className="text-lg font-semibold tracking-[-0.03em]">{name}</a>
        <nav className="flex items-center gap-2" aria-label="Profiles">
          <IconLink href="https://github.com/Lelekhoa1812" label="GitHub"><GithubIcon /></IconLink>
          <IconLink href="https://www.linkedin.com/in/dang-khoa-le-96a6332a8" label="LinkedIn"><LinkedInIcon /></IconLink>
          <IconLink href="https://huggingface.co/khoaliamle" label="Hugging Face"><FaceIcon /></IconLink>
        </nav>
      </header>
      <main>
        <section id="work" className="mx-auto grid max-w-6xl items-start gap-10 px-6 pb-20 pt-8 md:grid-cols-[minmax(16rem,22rem)_1fr]">
          <img src="/img/me.jpeg" alt="Portrait of Dang Khoa Le" className="sticky top-6 aspect-[4/5] w-full object-cover" />
          <div>
            <h1 className="max-w-[12ch] text-[clamp(2.6rem,6vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
              {name}
            </h1>
            <p className="story mt-6 text-ink-soft">{title}. {place}. Senior AI Software Engineer at Axion Solutions.</p>
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {featured.map((id) => {
                const item = sectionText(id);
                if (!item) return null;
                return (
                  <li key={id} className="py-4">
                    <h2 className="text-xl font-semibold tracking-[-0.03em]">{item.heading}</h2>
                    <p className="mt-2 max-w-[62ch] text-ink-soft">{item.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
        {chapters.map((chapter) => (
          <section key={chapter.id} id={chapter.id} className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="max-w-[16ch] text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              {chapter.title}
            </h2>
            {chapter.id === "record" ? (
              <ul className="mt-10 max-w-3xl divide-y divide-line border-y border-line">
                {chapter.ids.map((id) => {
                  const item = sectionText(id);
                  if (!item) return null;
                  return (
                    <li key={id} className="py-3">
                      <p className="font-semibold">{item.heading}</p>
                      <p className="text-ink-soft">{opening(item.heading, item.text)}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-10 max-w-3xl space-y-8">
                {chapter.ids.map((id) => {
                  const item = sectionText(id);
                  if (!item) return null;
                  return (
                    <article key={id}>
                      <h3 className="text-lg font-semibold">{item.heading}</h3>
                      <p className="story mt-2 text-ink-soft">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </main>
      <ChatDock />
    </>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} aria-label={label} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-white">
      {children}
    </a>
  );
}

function GithubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3.5 9h3V21h-3V9Zm6 0h2.88v1.64h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V21h-3v-5.36c0-1.28-.02-2.92-1.78-2.92-1.78 0-2.05 1.39-2.05 2.82V21h-3V9Z" />
    </svg>
  );
}

function FaceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14.5c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" />
    </svg>
  );
}
