"use client";

import { ArrowDownToLine, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeSwitch } from "./theme-switch";

const NAV = [
  { href: "#work", label: "Work" },
  { href: "#timeline", label: "Timeline" },
  { href: "#projects", label: "Projects" },
  { href: "#archive", label: "Archive" },
  { href: "#contact", label: "Contact" },
];

export function Header({ name, title, cv }: { name: string; title: string; cv: string }) {
  const [active, setActive] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sections = NAV.map((item) => document.querySelector(item.href)).filter((node): node is Element => Boolean(node));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      if (window.scrollY < window.innerHeight * 0.5) setActive("");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const main = document.getElementById("top");
    const dock = document.querySelector<HTMLElement>("[aria-controls='ask-the-record']");
    if (main) main.inert = true;
    if (dock) dock.inert = true;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const root = document.getElementById("menu");
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>("a, button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 64rem)").matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      if (main) main.inert = false;
      if (dock) dock.inert = false;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`fixed inset-x-0 top-0 ${open ? "z-50" : "z-30"}`}>
      <div className={`relative z-40 transition-[background-color,border-color] duration-500 ${scrolled || open ? "border-b border-white/12 bg-black/80 backdrop-blur-md" : "border-b border-transparent"}`}>
      <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center justify-between gap-6 px-5 md:h-20 md:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label={`${name}, back to the top`}>
          <Mark />
          <span className="leading-none">
            <span className="block text-[0.9375rem] tracking-[0.18em] text-ink uppercase">{name}</span>
            <span className="data mt-1.5 hidden text-[10px] tracking-[0.2em] text-white/55 sm:block">{title}</span>
          </span>
        </a>
        <div className="flex items-center gap-2 lg:gap-8">
          <ThemeSwitch />
          <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "true" : undefined}
              className={`data relative py-2 tracking-[0.28em] transition-colors ${active === item.href ? "text-ink" : "text-white/60 hover:text-ink"}`}
            >
              {item.label}
              <span aria-hidden className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-white transition-transform duration-500 ease-out-expo ${active === item.href ? "scale-x-100" : "scale-x-0"}`} />
            </a>
          ))}
          <a href={cv} download className="data flex items-center gap-2 border border-white/30 px-3 py-2 tracking-[0.2em] text-ink transition-colors hover:bg-white hover:text-black">
            CV
            <ArrowDownToLine aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <a href={cv} download className="data flex h-11 items-center gap-2 border border-white/30 px-3 text-ink">
            CV
            <ArrowDownToLine aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
          <button ref={menuButton} type="button" aria-expanded={open} aria-controls="menu" aria-label={open ? "Close the menu" : "Open the menu"} onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center border border-white/30 text-ink">
            {open ? <X aria-hidden className="h-4 w-4" strokeWidth={1.5} /> : <Menu aria-hidden className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>
        </div>
      </div>
      </div>
      {open ? (
        <>
          <div className="menu-scrim fixed inset-0 z-20 lg:hidden" onClick={() => setOpen(false)} />
          <nav id="menu" aria-label="Sections" className="menu-panel dock-open fixed inset-x-0 bottom-0 top-[4.5rem] z-30 overflow-y-auto border-t border-white/12 px-5 py-8 md:top-20 lg:hidden">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setOpen(false)} className="block border-b border-white/10 py-4 text-[2rem] font-light leading-tight text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        </>
      ) : null}
    </header>
  );
}

function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden className="shrink-0 text-ink">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="16" cy="16" r="10.5" />
        <ellipse cx="16" cy="16" rx="10.5" ry="3.8" transform="rotate(-24 16 16)" />
      </g>
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      <circle cx="25" cy="10.8" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function Readout() {
  const [state, setState] = useState({ percent: 0, label: "", show: false });
  useEffect(() => {
    const labels = new Map(NAV.map((item) => [item.href.slice(1), item.label]));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      let label = "";
      for (const [id, name] of labels) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top < window.innerHeight * 0.5) label = name;
      }
      setState({ percent, label, show: window.scrollY > window.innerHeight * 0.7 && percent < 96 });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div aria-hidden className={`data pointer-events-none fixed bottom-5 left-5 z-20 hidden items-center gap-3 text-[11px] text-white/55 transition-opacity duration-500 md:flex md:left-10 ${state.show ? "opacity-100" : "opacity-0"}`}>
      <span className="w-20">{state.label}</span>
      <span className="relative h-px w-24 bg-white/15">
        <span className="absolute inset-y-0 left-0 bg-white/70" style={{ width: `${state.percent}%` }} />
      </span>
      <span className="tabular-nums text-white/72">{String(state.percent).padStart(3, "0")}%</span>
    </div>
  );
}
