import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { dropOtherEmployer, groundFollowUp, groundedQuestion, withMemory } from "./memory";

const question = { id: "q", role: "user", parts: [{ type: "text", text: "What is his title?" }] } as UIMessage;

describe("withMemory", () => {
  it("leaves the current page transcript alone", () => {
    const assistant = { id: "a", role: "assistant", parts: [{ type: "text", text: "AI Software Engineer." }] } as UIMessage;
    expect(withMemory([{ role: "user", text: "Earlier", at: "t" }], [question, assistant])).toEqual([question, assistant]);
  });

  it("puts the stored turns before a new question", () => {
    const messages = withMemory(
      [
        { role: "user", text: "Where does he work?", at: "t1" },
        { role: "assistant", text: "Axion Solutions.", at: "t2" },
      ],
      [question],
    );
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[1].parts[0]).toMatchObject({ text: "Axion Solutions." });
    expect(messages[2]).toBe(question);
  });

  it("rebuilds the panel from stored turns", () => {
    const messages = withMemory(
      [
        { role: "user", text: "Where does he work?", at: "t1" },
        { role: "assistant", text: "Axion Solutions.", at: "t2" },
      ],
      [],
    );
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("drops the previous employer when the new question names another", () => {
    const medswin = { id: "u1", role: "user", parts: [{ type: "text", text: "At MedSwin, what BERTScore did the lab record?" }] } as UIMessage;
    const score = { id: "a1", role: "assistant", parts: [{ type: "text", text: "The lab recorded 86 percent BERTScore." }] } as UIMessage;
    const axion = { id: "u2", role: "user", parts: [{ type: "text", text: "At Axion, what does Axis show before a write?" }] } as UIMessage;
    const kept = dropOtherEmployer([medswin, score, axion]);
    expect(kept).toEqual([axion]);
  });

  it("keeps the same employer on a follow-up", () => {
    const first = { id: "u1", role: "user", parts: [{ type: "text", text: "At Axion, what does Axis show before a write?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Axis shows a preview." }] } as UIMessage;
    const next = { id: "u2", role: "user", parts: [{ type: "text", text: "What engine does Axis use?" }] } as UIMessage;
    expect(dropOtherEmployer([first, answer, next])).toEqual([first, answer, next]);
  });

  it("keeps the latest employer when the follow-up does not name one", () => {
    const harry = { id: "u1", role: "user", parts: [{ type: "text", text: "At Harry the Hirer, what did the pilot cut?" }] } as UIMessage;
    const harryAnswer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "About 40 percent less repetitive lookup." }] } as UIMessage;
    const medswin = { id: "u2", role: "user", parts: [{ type: "text", text: "At MedSwin, what BERTScore did the lab record?" }] } as UIMessage;
    const medswinAnswer = { id: "a2", role: "assistant", parts: [{ type: "text", text: "86 percent BERTScore." }] } as UIMessage;
    const follow = { id: "u3", role: "user", parts: [{ type: "text", text: "What was that percent?" }] } as UIMessage;
    expect(dropOtherEmployer([harry, harryAnswer, medswin, medswinAnswer, follow])).toEqual([medswin, medswinAnswer, follow]);
  });

  it("names the previous employer on a stack follow-up", () => {
    const harry = { id: "u1", role: "user", parts: [{ type: "text", text: "At Harry the Hirer, what did the pilot cut?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "About 40 percent." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What was the stack?" }] } as UIMessage;
    const messages = [harry, answer, follow];
    expect(groundedQuestion(messages, 2)).toContain("harry");
    expect(groundFollowUp(messages).at(-1)?.parts[0]).toMatchObject({ text: expect.stringContaining("stack") });
    expect(follow.parts[0]).toMatchObject({ text: "What was the stack?" });
  });

  it("names the previous employer on an agent follow-up", () => {
    const medswin = { id: "u1", role: "user", parts: [{ type: "text", text: "At MedSwin, what BERTScore did the lab record?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "86 percent BERTScore." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What agents did he use?" }] } as UIMessage;
    expect(groundedQuestion([medswin, answer, follow], 2)).toContain("medswin");
    expect(follow.parts[0]).toMatchObject({ text: "What agents did he use?" });
  });

  it("keeps a named product off the previous employer", () => {
    const harry = { id: "u1", role: "user", parts: [{ type: "text", text: "At Harry the Hirer, what did the pilot cut?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "About 40 percent." }] } as UIMessage;
    const golf = { id: "u2", role: "user", parts: [{ type: "text", text: "What stack does the golf scanner use?" }] } as UIMessage;
    const ocr = { id: "u3", role: "user", parts: [{ type: "text", text: "What OCR does he use?" }] } as UIMessage;
    expect(groundedQuestion([harry, answer, golf], 2)).not.toContain("harry");
    expect(groundedQuestion([harry, answer, ocr], 2)).toContain("harry");
  });

  it("names the previous employer on a model follow-up", () => {
    const poptech = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at PopTech?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "He led the platform." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What models did he use?" }] } as UIMessage;
    expect(groundedQuestion([poptech, answer, follow], 2)).toContain("poptech");
  });

  it("names the previous product on a model follow-up", () => {
    const pedigree = { id: "u1", role: "user", parts: [{ type: "text", text: "What is the pedigree project?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "A mate-selection engine." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What models does it use?" }] } as UIMessage;
    expect(groundedQuestion([pedigree, answer, follow], 2)).toContain("pedigree");
  });

  it("names the previous employer on a score follow-up", () => {
    const medswin = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at MedSwin?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "He led the lab." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What score did the lab record?" }] } as UIMessage;
    expect(groundedQuestion([medswin, answer, follow], 2)).toContain("medswin");
  });
});
