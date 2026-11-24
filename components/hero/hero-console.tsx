"use client";

import { ArrowDownRight, CornerDownLeft, MessagesSquare, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { toTurns, useRecordChat, type Turn } from "@/components/chat/record-chat";
import { anchorSegments } from "@/lib/chat/sources";

type Props = {
  positioning: string;
  intro: string;
  questions: string[];
  email: string;
};

export function HeroConsole({ positioning, intro, questions, email }: Props) {
  const { messages, busy, error, ask, setDockOpen } = useRecordChat();
  const turns = toTurns(messages, busy);
  const latest = turns.at(-1);
  const [hidden, setHidden] = useState<string | null>(null);
  const turn = latest && latest.id !== hidden ? latest : undefined;

  return (
    <div className="flex min-h-[calc(100svh-7rem)] flex-col justify-end gap-10 pb-10 pt-28 md:gap-12 md:pb-14">
      <div className="min-h-[19rem] md:min-h-[22rem]">
        {turn ? (
          <Answer key={turn.id} turn={turn} error={turn === latest && !busy ? error : undefined} email={email} onClear={() => setHidden(turn.id)} onContinue={() => setDockOpen(true)} />
        ) : (
          <div key="statement" className="constitute max-w-[52rem]">
            <h1 className="balance text-[clamp(2.4rem,5.2vw,4.75rem)] font-light leading-[1.02] tracking-[-0.025em] text-ink">{positioning}</h1>
            <p className="pretty measure mt-7 text-[1.0625rem] leading-[1.65] text-white/72 md:text-lg">{intro}</p>
          </div>
        )}
      </div>
      <AskField questions={questions} busy={busy} onAsk={(text) => ask(text)} />
    </div>
  );
}

function AskField({ questions, busy, onAsk }: { questions: string[]; busy: boolean; onAsk: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const typed = useTypedPlaceholder(questions, !focused && draft.length === 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    onAsk(text);
    setDraft("");
  }

  return (
    <div>
      <form onSubmit={submit} className="group relative flex items-center gap-4 border border-white/30 bg-black/70 px-5 py-4 backdrop-blur-[2px] transition-colors focus-within:border-white/70 md:px-7 md:py-5">
        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full bg-white ${busy ? "blink" : "opacity-60"}`} />
        <label htmlFor="ask-record" className="sr-only">
          Ask the record a question about Dang Khoa Le
        </label>
        <input
          id="ask-record"
          value={draft}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? "Ask about a role, a project, or a date" : typed}
          className="min-w-0 flex-1 bg-transparent text-[1.0625rem] text-ink outline-none placeholder:text-white/55 md:text-[1.1875rem]"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          className="data flex shrink-0 items-center gap-2 py-2 pl-3 text-white/72 transition-colors hover:text-white disabled:text-white/40 disabled:hover:text-white/40"
        >
          {busy ? "Reading" : "Ask"}
          <CornerDownLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </form>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5" aria-label="Questions to start with">
        {questions.slice(0, 3).map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAsk(question)}
              className="text-left text-sm text-white/55 underline decoration-white/20 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60 disabled:opacity-50"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useTypedPlaceholder(lines: string[], active: boolean): string {
  const [text, setText] = useState(lines[0] ?? "");
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let line = 0;
    let index = 0;
    let deleting = false;
    let timer = 0;
    const tick = () => {
      const target = lines[line];
      if (!deleting) {
        index += 1;
        setText(target.slice(0, index));
        if (index >= target.length) {
          deleting = true;
          timer = window.setTimeout(tick, 2400);
          return;
        }
        timer = window.setTimeout(tick, 34 + Math.random() * 40);
        return;
      }
      index -= 2;
      setText(target.slice(0, Math.max(index, 0)));
      if (index <= 0) {
        deleting = false;
        line = (line + 1) % lines.length;
        timer = window.setTimeout(tick, 420);
        return;
      }
      timer = window.setTimeout(tick, 16);
    };
    setText("");
    timer = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer);
  }, [active, lines]);
  return text;
}

type Line = { x1: number; y1: number; x2: number; y2: number; n: number };

function Answer({ turn, error, email, onClear, onContinue }: { turn: Turn; error?: Error; email: string; onClear: () => void; onContinue: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const segments = anchorSegments(turn.answer, turn.done ? turn.sources : []);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !turn.done || turn.sources.length === 0) {
      setLines([]);
      return;
    }
    const measure = () => {
      const box = element.getBoundingClientRect();
      const next: Line[] = [];
      turn.sources.forEach((_, n) => {
        const card = element.querySelector<HTMLElement>(`[data-card="${n}"]`);
        const anchor = element.querySelector<HTMLElement>(`[data-anchor="${n}"]`);
        if (!card || !anchor) return;
        const c = card.getBoundingClientRect();
        const a = anchor.getBoundingClientRect();
        if (c.left < a.right) return;
        next.push({ x1: a.left + a.width / 2 - box.left, y1: a.bottom + 2 - box.top, x2: c.left - box.left, y2: c.top + c.height / 2 - box.top, n });
      });
      setLines(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [turn.done, turn.sources, turn.answer]);

  return (
    <div ref={root} className="constitute relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-16">
      <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible xl:block">
        {lines.map((line) => {
          const drop = line.y1 + 18 + 10 * line.n;
          const path = `M${line.x1},${line.y1} V${drop} H${line.x2 - 28} V${line.y2} H${line.x2}`;
          return (
            <g key={line.n} className="text-white">
              <circle cx={line.x1} cy={line.y1} r="2.5" fill="currentColor" />
              <path d={path} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" pathLength={1} className="draw" style={{ animationDelay: `${180 * line.n}ms` }} />
              <text x={line.x2 - 24} y={line.y2 - 6} fill="currentColor" fillOpacity="0.5" fontSize="9" fontFamily="var(--font-jetbrains)">
                {Math.round(line.x2)}·{Math.round(line.y2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="relative">
        <p className="balance max-w-[44rem] text-[clamp(1.35rem,2.2vw,1.75rem)] font-light leading-snug text-white/60">{turn.question}</p>
        {turn.steps.length > 0 && !turn.done ? (
          <ol className="data mt-5 space-y-1 text-white/55" aria-label="What the assistant is reading">
            {turn.steps.map((step, index) => (
              <li key={`${step}-${index}`} className="depth-in">
                {step}
              </li>
            ))}
          </ol>
        ) : null}
        <p aria-live="polite" className="pretty measure mt-5 text-[clamp(1.125rem,1.6vw,1.3125rem)] font-light leading-[1.65] text-ink">
          {turn.reading && turn.steps.length === 0 ? <span className="text-white/55">Reading the record</span> : null}
          {segments.map((segment, index) =>
            segment.ref === undefined ? (
              <span key={index}>{segment.text}</span>
            ) : (
              <mark key={index} data-anchor={segment.ref} className="bg-transparent text-ink underline decoration-white/60 decoration-dashed underline-offset-[6px]">
                {segment.text}
                <sup className="ml-0.5 font-mono text-[10px] text-white/60">{segment.ref + 1}</sup>
              </mark>
            ),
          )}
          {!turn.done ? <span aria-hidden className="blink ml-1 inline-block h-[1em] w-[0.45em] translate-y-[0.15em] bg-white" /> : null}
        </p>
        {error ? (
          <p className="mt-4 text-white/72">
            The record did not answer this time. Ask again in a moment, or write to{" "}
            <a href={`mailto:${email}`} className="text-ink underline">
              {email}
            </a>
            .
          </p>
        ) : null}
        {turn.done ? (
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
            <button type="button" onClick={onContinue} className="data flex items-center gap-2 text-white/72 transition-colors hover:text-white">
              <MessagesSquare aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
              Continue in the panel
            </button>
            <button type="button" onClick={onClear} className="data flex items-center gap-2 text-white/72 transition-colors hover:text-white">
              <X aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
              Back to the summary
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col justify-center gap-5">
        {turn.done
          ? turn.sources.map((source, n) => (
              <a
                key={source.sectionId}
                href={source.href}
                data-card={n}
                className="depth-in relative border border-white/35 bg-black/85 p-4 backdrop-blur transition-colors hover:bg-white hover:text-black"
                style={{ animationDelay: `${300 + 180 * n}ms` }}
              >
                <span className="absolute -left-3 -top-3 grid h-6 w-6 place-items-center rounded-full border border-white/60 bg-black font-mono text-[10px] text-white">{n + 1}</span>
                <span className="flex items-start justify-between gap-3">
                  <span className="block text-[0.9375rem] leading-snug">{source.label}</span>
                  <ArrowDownRight aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
                </span>
                <span className="data mt-1.5 block text-[10px] opacity-60">{source.meta}</span>
              </a>
            ))
          : null}
      </div>
    </div>
  );
}
