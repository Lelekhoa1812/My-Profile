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

  it("names the previous product on a database, buyer, cut, or live follow-up", () => {
    const survee = { id: "u1", role: "user", parts: [{ type: "text", text: "What is Survee?" }] } as UIMessage;
    const golf = { id: "u2", role: "user", parts: [{ type: "text", text: "What is the golf scorecard scanner?" }] } as UIMessage;
    const meter = { id: "u3", role: "user", parts: [{ type: "text", text: "What is the water-meter scanner?" }] } as UIMessage;
    const cva = { id: "u4", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    expect(groundedQuestion([survee, answer, { id: "f1", role: "user", parts: [{ type: "text", text: "What database does it use?" }] } as UIMessage], 2)).toContain("survee");
    expect(groundedQuestion([golf, answer, { id: "f2", role: "user", parts: [{ type: "text", text: "Who bought it?" }] } as UIMessage], 2)).toContain("golf");
    expect(groundedQuestion([meter, answer, { id: "f3", role: "user", parts: [{ type: "text", text: "What did it cut?" }] } as UIMessage], 2)).toContain("meter");
    expect(groundedQuestion([cva, answer, { id: "f4", role: "user", parts: [{ type: "text", text: "Is it live?" }] } as UIMessage], 2)).toContain("cva");
  });

  it("leaves a live follow-up on the shipped list when no product came first", () => {
    const harry = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at Harry?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "He led the work." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "Is it live?" }] } as UIMessage;
    expect(groundedQuestion([harry, answer, follow], 2)).toBe("Is it live?");
  });

  it("names MedChat or stt-studio on a release follow-up", () => {
    const medchat = { id: "u1", role: "user", parts: [{ type: "text", text: "What is MedChat?" }] } as UIMessage;
    const studio = { id: "u2", role: "user", parts: [{ type: "text", text: "What is stt-studio?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const harry = { id: "u3", role: "user", parts: [{ type: "text", text: "What did he do at Harry?" }] } as UIMessage;
    expect(groundedQuestion([medchat, answer, { id: "f1", role: "user", parts: [{ type: "text", text: "Is it a deployed clinical system?" }] } as UIMessage], 2)).toContain("medchat");
    expect(groundedQuestion([studio, answer, { id: "f2", role: "user", parts: [{ type: "text", text: "Is it a production app?" }] } as UIMessage], 2)).toContain("stt-studio");
    expect(groundedQuestion([harry, answer, { id: "f3", role: "user", parts: [{ type: "text", text: "What does he ship to production?" }] } as UIMessage], 2)).toBe("What does he ship to production?");
  });

  it("names EstateFolio on a forecast follow-up", () => {
    const estate = { id: "u1", role: "user", parts: [{ type: "text", text: "What is EstateFolio?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "A price forecast." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What does the forecast read?" }] } as UIMessage;
    const harry = { id: "u3", role: "user", parts: [{ type: "text", text: "What did he do at Harry?" }] } as UIMessage;
    expect(groundedQuestion([estate, answer, follow], 2)).toContain("estatefolio");
    expect(groundedQuestion([harry, answer, follow], 2)).toBe("What does the forecast read?");
    const ericsson = { id: "u4", role: "user", parts: [{ type: "text", text: "What is Ericsson?" }] } as UIMessage;
    const forecastIt = { id: "u5", role: "user", parts: [{ type: "text", text: "What does it forecast?" }] } as UIMessage;
    expect(groundedQuestion([ericsson, answer, forecastIt], 2)).toContain("ericsson");
  });

  it("names the S&P forecast on a queue follow-up", () => {
    const forecast = { id: "u1", role: "user", parts: [{ type: "text", text: "What is the S&P forecast?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "A multi-horizon system." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What queue does it use?" }] } as UIMessage;
    const harry = { id: "u3", role: "user", parts: [{ type: "text", text: "What did he do at Harry?" }] } as UIMessage;
    expect(groundedQuestion([forecast, answer, follow], 2)).toContain("s&p");
    expect(groundedQuestion([harry, answer, follow], 2)).toBe("What queue does it use?");
  });

  it("keeps a later product on a stack follow-up", () => {
    const harry = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at Harry?" }] } as UIMessage;
    const survee = { id: "u2", role: "user", parts: [{ type: "text", text: "What is Survee?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const follow = { id: "u3", role: "user", parts: [{ type: "text", text: "What stack does it use?" }] } as UIMessage;
    expect(groundedQuestion([harry, answer, survee, answer, follow], 4)).toContain("survee");
    expect(groundedQuestion([harry, answer, follow], 2)).toContain("harry");
  });

  it("keeps the previous employer on an authentication follow-up", () => {
    const axion = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at Axion?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "He owns the vision." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What authentication does it use?" }] } as UIMessage;
    expect(groundedQuestion([axion, answer, follow], 2)).toContain("axion");
  });

  it("keeps the pedigree engine on a signal follow-up", () => {
    const pedigree = { id: "u1", role: "user", parts: [{ type: "text", text: "What is the pedigree engine?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "A mate-selection engine." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What signals does it use?" }] } as UIMessage;
    expect(groundedQuestion([pedigree, answer, follow], 2)).toContain("pedigree");
  });

  it("keeps an extract follow-up on the subject that records extraction", () => {
    const golf = { id: "u1", role: "user", parts: [{ type: "text", text: "What is the golf scanner?" }] } as UIMessage;
    const nam = { id: "u2", role: "user", parts: [{ type: "text", text: "What did he do at Nam A?" }] } as UIMessage;
    const cva = { id: "u3", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const extract = { id: "u4", role: "user", parts: [{ type: "text", text: "What does it extract?" }] } as UIMessage;
    expect(groundedQuestion([golf, answer, extract], 2)).toContain("golf");
    expect(groundedQuestion([nam, answer, extract], 2)).toContain("nam a");
    expect(groundedQuestion([cva, answer, extract], 2)).toBe("What does it extract?");
  });

  it("keeps an explain, train, cover, or build follow-up on the subject that records it", () => {
    const pedigree = { id: "u1", role: "user", parts: [{ type: "text", text: "What is the pedigree engine?" }] } as UIMessage;
    const medswin = { id: "u2", role: "user", parts: [{ type: "text", text: "What did he do at MedSwin?" }] } as UIMessage;
    const hai = { id: "u3", role: "user", parts: [{ type: "text", text: "What did he do at Hai Au?" }] } as UIMessage;
    const cva = { id: "u4", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const explain = { id: "u5", role: "user", parts: [{ type: "text", text: "What does it explain?" }] } as UIMessage;
    const train = { id: "u6", role: "user", parts: [{ type: "text", text: "What does it train?" }] } as UIMessage;
    const cover = { id: "u7", role: "user", parts: [{ type: "text", text: "What does it cover?" }] } as UIMessage;
    const build = { id: "u8", role: "user", parts: [{ type: "text", text: "What does it build?" }] } as UIMessage;
    expect(groundedQuestion([pedigree, answer, explain], 2)).toContain("pedigree");
    expect(groundedQuestion([cva, answer, explain], 2)).toBe("What does it explain?");
    expect(groundedQuestion([medswin, answer, train], 2)).toContain("medswin");
    expect(groundedQuestion([medswin, answer, cover], 2)).toContain("medswin");
    expect(groundedQuestion([hai, answer, cover], 2)).toContain("hai au");
    expect(groundedQuestion([medswin, answer, build], 2)).toContain("medswin");
    expect(groundedQuestion([cva, answer, build], 2)).toBe("What does it build?");
  });

  it("keeps a check follow-up on the subject that records a check", () => {
    const golf = { id: "u1", role: "user", parts: [{ type: "text", text: "What is the golf scanner?" }] } as UIMessage;
    const teqar = { id: "u2", role: "user", parts: [{ type: "text", text: "What does Teqar advise?" }] } as UIMessage;
    const harry = { id: "u3", role: "user", parts: [{ type: "text", text: "What did he do at Harry the Hirer?" }] } as UIMessage;
    const cva = { id: "u4", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const check = { id: "u5", role: "user", parts: [{ type: "text", text: "What does it check?" }] } as UIMessage;
    expect(groundedQuestion([golf, answer, check], 2)).toContain("golf");
    expect(groundedQuestion([teqar, answer, check], 2)).toContain("teqar");
    expect(groundedQuestion([harry, answer, check], 2)).toContain("harry");
    expect(groundedQuestion([cva, answer, check], 2)).toBe("What does it check?");
  });

  it("keeps an approve follow-up on the subject that records approval", () => {
    const cva = { id: "u1", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const harry = { id: "u2", role: "user", parts: [{ type: "text", text: "What did he do at Harry the Hirer?" }] } as UIMessage;
    const axion = { id: "u3", role: "user", parts: [{ type: "text", text: "What did he do at Axion?" }] } as UIMessage;
    const golf = { id: "u4", role: "user", parts: [{ type: "text", text: "What is the golf scanner?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const approve = { id: "u5", role: "user", parts: [{ type: "text", text: "What does it approve?" }] } as UIMessage;
    expect(groundedQuestion([cva, answer, approve], 2)).toContain("cva");
    expect(groundedQuestion([harry, answer, approve], 2)).toContain("harry");
    expect(groundedQuestion([axion, answer, approve], 2)).toContain("axion");
    expect(groundedQuestion([golf, answer, approve], 2)).toBe("What does it approve?");
  });

  it("keeps a write follow-up on CVA", () => {
    const cva = { id: "u1", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const golf = { id: "u2", role: "user", parts: [{ type: "text", text: "What is the golf scanner?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const write = { id: "u3", role: "user", parts: [{ type: "text", text: "What does it write?" }] } as UIMessage;
    const refused = { id: "u4", role: "user", parts: [{ type: "text", text: "What will it not write?" }] } as UIMessage;
    expect(groundedQuestion([cva, answer, write], 2)).toContain("cva");
    expect(groundedQuestion([golf, answer, write], 2)).toBe("What does it write?");
    expect(groundedQuestion([cva, answer, refused], 2)).toBe("What will it not write?");
  });

  it("keeps the previous subject on a show or draft follow-up", () => {
    const mizco = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at Mizco?" }] } as UIMessage;
    const cva = { id: "u2", role: "user", parts: [{ type: "text", text: "What is CVA?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recorded." }] } as UIMessage;
    const show = { id: "u3", role: "user", parts: [{ type: "text", text: "What does it show?" }] } as UIMessage;
    const draft = { id: "u4", role: "user", parts: [{ type: "text", text: "What does it draft?" }] } as UIMessage;
    expect(groundedQuestion([mizco, answer, show], 2)).toContain("mizco");
    expect(groundedQuestion([cva, answer, draft], 2)).toContain("cva");
  });

  it("keeps the previous employer on a cloud follow-up", () => {
    const harry = { id: "u1", role: "user", parts: [{ type: "text", text: "What did he do at Harry the Hirer?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Event inventory." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "What cloud does it use?" }] } as UIMessage;
    expect(groundedQuestion([harry, answer, follow], 2)).toContain("harry");
    expect(groundedQuestion([follow], 0)).toBe("What cloud does it use?");
  });

  it("keeps the previous subject on a deploy follow-up", () => {
    const ericsson = { id: "u1", role: "user", parts: [{ type: "text", text: "What is Ericsson?" }] } as UIMessage;
    const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "A 5G twin." }] } as UIMessage;
    const follow = { id: "u2", role: "user", parts: [{ type: "text", text: "Where was it deployed?" }] } as UIMessage;
    expect(groundedQuestion([ericsson, answer, follow], 2)).toContain("ericsson");
    expect(groundedQuestion([follow], 0)).toBe("Where was it deployed?");
    const reads = { id: "u3", role: "user", parts: [{ type: "text", text: "What does it read?" }] } as UIMessage;
    const reranker = { id: "u4", role: "user", parts: [{ type: "text", text: "How many documents does the reranker read?" }] } as UIMessage;
    expect(groundedQuestion([ericsson, answer, reads], 2)).toContain("ericsson");
    expect(groundedQuestion([ericsson, answer, reranker], 2)).toBe("How many documents does the reranker read?");
  });
});
