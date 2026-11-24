"use client";

import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { displayAnswer } from "@/lib/chat/answer";
import { sourcesFromParts, type Source } from "@/lib/chat/sources";

export type Turn = { id: string; question: string; answer: string; sources: Source[]; steps: string[]; done: boolean; reading: boolean };

const STEP_VERBS: Record<string, string> = {
  lookup_fact: "Fact",
  list_sections: "Index",
  read_section: "Read",
  search_sections: "Search",
};

function stepsOf(parts: UIMessage["parts"]): string[] {
  return parts.flatMap((part) => {
    if (!part.type.startsWith("tool-")) return [];
    const name = part.type.slice(5);
    const input = ("input" in part ? part.input : undefined) as Record<string, unknown> | undefined;
    const subject = input?.sectionId ?? input?.query ?? input?.key ?? input?.kind ?? input?.sourceType ?? "";
    return [`${STEP_VERBS[name] ?? name} ${String(subject)}`.trim()];
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
    const answer = reply ? displayAnswer(reply.parts, raw) : "";
    const last = index >= messages.length - 2;
    const done = !(last && streaming);
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
