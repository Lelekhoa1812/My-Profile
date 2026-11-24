"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";

const STORAGE_KEY = "profile.chat.place";

type Point = { x: number; y: number };

export function ChatDock() {
  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [place, setPlace] = useState<Point>({ x: 24, y: 24 });
  const placeRef = useRef(place);
  placeRef.current = place;
  const drag = useRef<{ pointer: number; origin: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Point;
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) setPlace(clamp(parsed));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function persist(next: Point) {
    const bounded = clamp(next);
    placeRef.current = bounded;
    setPlace(bounded);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    drag.current = { pointer: event.pointerId, origin: { x: event.clientX, y: event.clientY }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const dx = event.clientX - active.origin.x;
    const dy = event.clientY - active.origin.y;
    const threshold = event.pointerType === "touch" ? 8 : 4;
    if (!active.moved && Math.hypot(dx, dy) < threshold) return;
    active.moved = true;
    persist({ x: place.x - dx, y: place.y - dy });
    active.origin = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    drag.current = null;
    if (!active) return;
    if (active.moved) {
      suppressClick.current = true;
      const current = placeRef.current;
      const centerFromLeft = window.innerWidth - current.x - 28;
      persist({ x: centerFromLeft >= window.innerWidth / 2 ? 24 : window.innerWidth - 80, y: current.y });
    }
  }

  function onClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setOpen((value) => !value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") persist({ x: place.x + step, y: place.y });
    if (event.key === "ArrowRight") persist({ x: place.x - step, y: place.y });
    if (event.key === "ArrowUp") persist({ x: place.x, y: place.y + step });
    if (event.key === "ArrowDown") persist({ x: place.x, y: place.y - step });
    if (event.key === "Escape") setOpen(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setDraft("");
    clearError();
    await sendMessage({ text });
  }

  return (
    <div className="fixed z-20" style={{ right: place.x, bottom: place.y }}>
      {open ? (
        <section
          className="panel-open absolute bottom-16 right-0 flex h-[min(32rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden bg-white shadow-[0_18px_40px_-24px_rgba(20,32,40,0.45)]"
          aria-label="Questions about Liam"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold">Ask about Liam</h2>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center">
              <CloseIcon />
            </button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? <p className="text-ink-soft">Ask about a role, a project, or a date.</p> : null}
            {messages.map((message) => {
              const text = message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("");
              const waiting = text.length === 0 && message.parts.some((part) => part.type !== "text");
              return (
                <article key={message.id} className={message.role === "user" ? "text-right" : ""}>
                  {text ? <p className="story text-base">{text}</p> : null}
                  {waiting ? <p className="text-sm text-ink-soft">Reading the record.</p> : null}
                </article>
              );
            })}
            {error ? <p className="text-oxide">{error.message} Ask again in a moment.</p> : null}
          </div>
          <form onSubmit={onSubmit} className="flex gap-2 border-t border-line p-3">
            <label className="sr-only" htmlFor="chat-question">Question</label>
            <input
              id="chat-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Which system is FoodFlow?"
              className="min-w-0 flex-1 border border-line bg-paper px-3 py-2 placeholder:text-ink-soft"
            />
            <button type="submit" aria-label="Send" disabled={status === "submitted" || status === "streaming"} className="grid h-11 w-11 place-items-center bg-oxide text-paper disabled:opacity-50">
              <SendIcon />
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        aria-label={open ? "Close the chat" : "Open the chat"}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="grid h-14 w-14 cursor-grab touch-none place-items-center rounded-full bg-oxide text-paper shadow-[0_12px_24px_-16px_rgba(14,107,82,0.9)] active:cursor-grabbing"
      >
        <ChatIcon />
      </button>
    </div>
  );
}

function clamp(point: Point): Point {
  if (typeof window === "undefined") return point;
  return {
    x: Math.min(Math.max(16, point.x), window.innerWidth - 80),
    y: Math.min(Math.max(16, point.y), window.innerHeight - 80),
  };
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 16.5 3.5 20.5 8 18.5h8.5A3.5 3.5 0 0 0 20 15V7.5A3.5 3.5 0 0 0 16.5 4h-9A3.5 3.5 0 0 0 4 7.5v6A3 3 0 0 0 5 16.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
