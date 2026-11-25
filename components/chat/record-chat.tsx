"use client";

import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { shownAnswer } from "@/lib/chat/answer";
import { keepToolSentences } from "@/lib/chat/evidence";
import { sourcesFromParts, type Source } from "@/lib/chat/sources";
import { withMemory } from "@/lib/session/memory";

export type Turn = { id: string; question: string; answer: string; sources: Source[]; steps: string[]; done: boolean; reading: boolean };

const STEP_LINES: Record<string, string> = {
  plan_question: "Planning through this question...",
  lookup_fact: "Looking up a recorded fact...",
  list_sections: "Listing the sections...",
  search_sections: "Searching the record...",
  read_section: "Reading one section...",
  read_sections: "Reading the matching sections...",
  review_evidence: "Checking the evidence...",
};

function stepsOf(parts: UIMessage["parts"]): string[] {
  return parts.flatMap((part) => {
    if (!part.type.startsWith("tool-")) return [];
    const name = part.type.slice(5);
    return [STEP_LINES[name] ?? "Working through this step..."];
  });
}

type RecordChat = {
  chat: Chat<UIMessage>;
  dockOpen: boolean;
  setDockOpen: (open: boolean) => void;
  ask: (question: string, where?: "hero" | "dock") => void;
};

const Context = createContext<RecordChat | null>(null);

export const FOCUS_EVENT = "record:focus";
export type FocusDetail = { ids: string[]; busy: boolean };

export function RecordChatProvider({ children }: { children: ReactNode }) {
  const [chat] = useState(() => new Chat<UIMessage>({ transport: new DefaultChatTransport({ api: "/api/chat" }) }));
  const [dockOpen, setDockOpen] = useState(false);
  const { messages, status, sendMessage, clearError } = useChat({ chat });
  const busy = status === "submitted" || status === "streaming";

  const ask = useCallback(
    (question: string, where: "hero" | "dock" = "hero") => {
      const text = question.trim();
      if (!text || busy) return;
      clearError();
      if (where === "dock") setDockOpen(true);
      void sendMessage({ text });
    },
    [busy, clearError, sendMessage],
  );

  useEffect(() => {
    let cancel = false;
    void fetch("/api/chat")
      .then(async (response) => {
        if (!response.ok || cancel) return;
        const body = (await response.json()) as { turns?: { role: "user" | "assistant"; text: string }[] };
        if (cancel || chat.messages.length > 0 || !body.turns?.length) return;
        chat.messages = withMemory(
          body.turns.map((turn) => ({ role: turn.role, text: turn.text, at: "" })),
          [],
        );
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [chat]);

  const lastAnswer = [...messages].reverse().find((message) => message.role === "assistant");
  const ids = lastAnswer ? sourcesFromParts(lastAnswer.parts).map((source) => source.sectionId) : [];
  const key = `${ids.join(",")}|${busy}`;
  useEffect(() => {
    const [joined, flag] = key.split("|");
    window.dispatchEvent(new CustomEvent<FocusDetail>(FOCUS_EVENT, { detail: { ids: joined ? joined.split(",") : [], busy: flag === "true" } }));
  }, [key]);

  const value = useMemo(() => ({ chat, dockOpen, setDockOpen, ask }), [chat, dockOpen, ask]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRecordChat() {
  const context = useContext(Context);
  if (!context) throw new Error("useRecordChat needs RecordChatProvider.");
  const helpers = useChat({ chat: context.chat });
  return { ...context, ...helpers, busy: helpers.status === "submitted" || helpers.status === "streaming" };
}

export function toTurns(messages: readonly UIMessage[], streaming: boolean): Turn[] {
  const turns: Turn[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const question = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    const reply = messages[index + 1]?.role === "assistant" ? messages[index + 1] : undefined;
    const raw = reply ? reply.parts.map((part) => (part.type === "text" ? part.text : "")).join("") : "";
    const draft = reply && raw.trim() ? keepToolSentences(reply.parts, raw) : "";
    const last = index >= messages.length - 2;
    const done = !(last && streaming);
    const answer = shownAnswer(draft, done, Boolean(reply));
    turns.push({
      id: message.id,
      question,
      answer,
      sources: reply ? sourcesFromParts(reply.parts) : [],
      steps: reply ? stepsOf(reply.parts) : [],
      done,
      reading: !done && answer.length === 0,
    });
  }
  return turns;
}
