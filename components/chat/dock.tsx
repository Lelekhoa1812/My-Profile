"use client";

import { ArrowDownRight, CornerDownLeft, MessagesSquare, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { panelFrame, snapToSide } from "@/lib/chat/place";
import { toTurns, useRecordChat } from "./record-chat";

const STORAGE_KEY = "profile.chat.place";
const BUTTON = 56;
const EDGE = 16;
const PANEL_GAP = 12;

type Point = { x: number; y: number };

function clamp(point: Point): Point {
  if (typeof window === "undefined") return point;
  return {
    x: Math.min(Math.max(EDGE, point.x), window.innerWidth - BUTTON - EDGE),
    y: Math.min(Math.max(EDGE, point.y), window.innerHeight - BUTTON - EDGE),
  };
}

export function ChatDock({ questions }: { questions: string[] }) {
  const { messages, busy, error, ask, dockOpen: open, setDockOpen: setOpen } = useRecordChat();
  const [draft, setDraft] = useState("");
  const [place, setPlace] = useState<Point>({ x: 24, y: 24 });
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });
  const placeRef = useRef(place);
  const drag = useRef<{ pointer: number; origin: Point; start: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const turns = toTurns(messages, busy);

  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  useEffect(() => {
    const sync = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setPlace((current) => clamp(current));
    };
    sync();
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Point | null;
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPlace(clamp(saved));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useLayoutEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, open]);

  function persist(next: Point) {
    const bounded = clamp(next);
    placeRef.current = bounded;
    setPlace(bounded);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    drag.current = { pointer: event.pointerId, origin: { x: event.clientX, y: event.clientY }, start: placeRef.current, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const dx = event.clientX - active.origin.x;
    const dy = event.clientY - active.origin.y;
    if (!active.moved && Math.hypot(dx, dy) < (event.pointerType === "touch" ? 8 : 4)) return;
    active.moved = true;
    persist({ x: active.start.x - dx, y: active.start.y - dy });
  }

  function finishDrag() {
    const active = drag.current;
    drag.current = null;
    if (!active?.moved) return;
    suppressClick.current = true;
    persist(snapToSide(placeRef.current, window.innerWidth, BUTTON));
  }

  function onClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setOpen(!open);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 48 : 16;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: place.x + step, y: place.y },
      ArrowRight: { x: place.x - step, y: place.y },
      ArrowUp: { x: place.x, y: place.y + step },
      ArrowDown: { x: place.x, y: place.y - step },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    persist(next);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    ask(text, "dock");
  }

  const panelWidth = Math.min(384, viewport.width - EDGE * 2);
  const frame = panelFrame(place, viewport.height, BUTTON, EDGE, PANEL_GAP);
  const buttonLeft = viewport.width - place.x - BUTTON;
  const panelLeft = Math.min(Math.max(EDGE, buttonLeft + BUTTON - panelWidth), viewport.width - panelWidth - EDGE);
  const anchoredLeft = buttonLeft + BUTTON / 2 < viewport.width / 2 ? Math.max(EDGE, Math.min(buttonLeft, viewport.width - panelWidth - EDGE)) : panelLeft;

  return (
    <>
      {open ? (
        <section
          role="dialog"
          id="ask-the-record"
          aria-label="Ask the record"
          className="dock-open fixed z-40 flex flex-col overflow-hidden border border-white/30 bg-black/92 backdrop-blur-md"
          style={{ left: anchoredLeft, bottom: frame.bottom, width: panelWidth, height: frame.height }}
        >
          <header className="flex items-center justify-between border-b border-white/15 py-2 pl-5 pr-2">
            <h2 className="text-[0.9375rem] tracking-[0.04em] text-ink">Ask the record</h2>
            <button
              type="button"
              aria-label="Close the panel"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
              className="grid h-10 w-10 place-items-center text-white/72 transition-colors hover:text-ink"
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </header>
          <div ref={log} className="flex-1 space-y-7 overflow-y-auto px-5 py-5" aria-live="polite">
            {turns.length === 0 ? (
              <div>
                <p className="text-[0.9375rem] leading-relaxed text-white/72">The assistant answers from Liam's record and names what it read. It says so when the record has no answer.</p>
                <ul className="mt-5 space-y-2">
                  {questions.map((question) => (
                    <li key={question}>
                      <button type="button" disabled={busy} onClick={() => ask(question, "dock")} className="w-full border border-white/18 px-3.5 py-2.5 text-left text-sm leading-snug text-white/80 transition-colors hover:border-white hover:text-ink">
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {turns.map((turn) => (
              <article key={turn.id} className="depth-in">
                <p className="text-sm leading-snug text-white/55">{turn.question}</p>
                {turn.reading ? (
                  <p className="data mt-3 text-[10px] text-white/55">
                    {turn.steps.at(-1) ?? "Reading the record"}
                    <span aria-hidden className="blink ml-1 inline-block h-[0.9em] w-[0.4em] translate-y-[0.1em] bg-white" />
                  </p>
                ) : null}
                {turn.answer ? <p className="pretty mt-2.5 text-[0.9875rem] font-light leading-relaxed text-ink">{turn.answer}</p> : null}
                {turn.done && turn.sources.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Sources">
                    {turn.sources.map((source, n) => (
                      <li key={source.sectionId}>
                        <a href={source.href} className="data flex items-center gap-1.5 border border-white/25 px-2 py-1.5 text-[9px] text-white/72 transition-colors hover:bg-white hover:text-black">
                          <span className="text-white/55">{n + 1}</span>
                          {source.label}
                          <ArrowDownRight aria-hidden className="h-3 w-3" strokeWidth={1.5} />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
            {error ? <p className="text-sm leading-relaxed text-white/72">The record did not answer this time. Ask again in a moment.</p> : null}
          </div>
          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/15 p-2 pl-4 transition-colors focus-within:border-white/60 focus-within:bg-white/[0.04]">
            <label className="sr-only" htmlFor="dock-question">
              Question
            </label>
            <input
              id="dock-question"
              ref={input}
              value={draft}
              autoComplete="off"
              enterKeyHint="send"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a role, a project, or a date"
              className="min-w-0 flex-1 bg-transparent py-2 text-[0.9375rem] text-ink outline-none placeholder:text-white/50"
            />
            <button type="submit" aria-label="Send the question" disabled={busy || draft.trim().length === 0} className="grid h-10 w-10 place-items-center border border-white/30 text-ink transition-colors hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink">
              <CornerDownLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </form>
        </section>
      ) : null}
      <button
        ref={button}
        type="button"
        aria-label={open ? "Close the question panel" : "Ask the record. Drag to move."}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={onClick}
        aria-controls="ask-the-record"
        onKeyDown={onKeyDown}
        className={`fixed z-40 grid cursor-grab touch-none place-items-center border text-ink transition-colors active:cursor-grabbing ${open ? "border-white bg-white text-black [&_svg]:text-black" : "border-white/45 bg-black/85 backdrop-blur hover:border-white"}`}
        style={{ right: place.x, bottom: place.y, width: BUTTON, height: BUTTON }}
      >
        {open ? <X aria-hidden className="h-5 w-5" strokeWidth={1.5} /> : <MessagesSquare aria-hidden className="h-5 w-5" strokeWidth={1.5} />}
        {busy && !open ? <span aria-hidden className="blink absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </button>
    </>
  );
}
