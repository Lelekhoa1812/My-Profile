import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { searchSections } from "../profile/store";
import { displayAnswer, dropGapSentences, dropRecordTalk, dropSourceTail, holdAnswer, keptSentence, shownAnswer, turnToStore } from "./answer";

describe("displayAnswer", () => {
  it("reads the sentence field from a structured answer", () => {
    const text = displayAnswer([], '{"sentence": "His title is AI Software Engineer."}');
    expect(text).toBe("His title is AI Software Engineer.");
  });

  it("reads a sentence field that follows a lead-in", () => {
    const text = displayAnswer([], 'Answer: {"sentence": "CVA is the only named live app."}');
    expect(text).toBe("CVA is the only named live app.");
  });

  it("turns markdown into a plain sentence", () => {
    const text = displayAnswer([], "**Axion Solutions** ships FoodFlow.\n- CVA has a live app.");
    expect(text).toBe("Axion Solutions ships FoodFlow. CVA has a live app.");
    expect(text).not.toContain("**");
    expect(displayAnswer([], "Axis - a separate product.")).toBe("Axis - a separate product.");
  });

  it("hides a tool call that leaked into the sentence", () => {
    const leaked = `<tool_call> <function=search_sections> <parameter=query> Harry the Hirer
</parameter> <parameter=sourceType> role </parameter> </function> </tool_call>`;
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, heading: "Ericsson 5G digital twin" } }],
      leaked,
    );
    expect(text).toBe("");
    expect(shownAnswer(text, true, true)).toBe(holdAnswer());
    expect(shownAnswer(text, true, true)).not.toContain("tool_call");
  });

  it("replaces a boast when every tool missed", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }, { type: "text" }],
      "He led a team of 20 and cut review by 40%.",
    );
    expect(text).toBe(holdAnswer());
    expect(text).not.toContain("20");
    expect(text).not.toContain("40%");
    expect(text).not.toContain("record");
  });

  it("keeps a supported sentence when the lookup misses", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }],
      "Liam is an AI Software Engineer. The record does not include that.",
    );
    expect(text).toBe("Liam is an AI Software Engineer.");
  });

  it("drops an ungrounded quantity when the lookup misses", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: false } }],
      "The resume summary says 4 years of software engineering experience. He cut review by 40%.",
    );
    expect(text).toBe(holdAnswer());
    expect(text).not.toContain("4");
    expect(text).not.toContain("40%");
  });

  it("keeps a figure the tool returned and drops a figure it did not", () => {
    const text = displayAnswer(
      [{
        type: "tool-lookup_fact",
        state: "output-available",
        output: {
          found: true,
          facts: [{ label: "Experience", value: "The resume summary says 4 years of software engineering experience and 3 years of AI and machine-learning delivery." }],
        },
      }],
      "The resume summary says 4 years of software engineering experience. He cut review by 40%.",
    );
    expect(text).toBe("The resume summary says 4 years of software engineering experience.");
    expect(text).not.toContain("40%");
  });

  it("drops an employer the tool text does not name", () => {
    const text = displayAnswer(
      [{
        type: "tool-read_section",
        state: "output-available",
        output: { found: true, heading: "Axion Solutions", text: "Axion Solutions. AI Software Engineer. FoodFlow is the system of record." },
      }],
      "FoodFlow is the system of record. He worked at Initech.",
    );
    expect(text).toBe("FoodFlow is the system of record.");
    expect(text).not.toContain("Initech");
  });

  it("speaks a contact fact when the tool returns no section", () => {
    const email = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, facts: [{ label: "Email", value: "liamkl.work@gmail.com" }] } }],
      "",
      "What is his email?",
    );
    const place = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, facts: [{ label: "Location", value: "Melbourne, Australia" }] } }],
      "",
      "Where is he based?",
    );
    const experience = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, facts: [{ label: "Experience", value: "The resume summary says 4 years of software engineering experience and 3 years of AI and machine-learning delivery." }] } }],
      "",
      "How many years of experience does the resume state?",
    );
    expect(email).toContain("liamkl.work@gmail.com");
    expect(place).toContain("Melbourne, Australia");
    expect(experience).toContain("4 years");
    expect(experience).toContain("3 years");
  });

  it("uses the hold sentence when the store could not be read", () => {
    const text = displayAnswer(
      [{ type: "tool-lookup_fact", state: "output-available", output: { found: false, reason: "unavailable" } }],
      "His email is on the resume.",
    );
    expect(text).toBe(holdAnswer());
    expect(text).not.toContain("email");
  });

  it("stores nothing when the visitor stops the answer", () => {
    expect(turnToStore(true, [{ found: true }], "Liam works at Axion Solutions.")).toBeNull();
  });

  it("waits while the answer is still streaming", () => {
    expect(shownAnswer("", false, true)).toBe("");
  });

  it("shows a sentence when the finished answer has no words", () => {
    expect(shownAnswer("   ", true, true)).toBe(holdAnswer());
  });

  it("stores a hold sentence when the model finishes with no words", () => {
    expect(keptSentence([{ found: true, heading: "Skills" }], "   ")).toBe(holdAnswer());
  });

  it("stores the hold sentence when every tool missed and the model added a quantity", () => {
    expect(keptSentence([{ found: false }], "He led a team of 20.")).toBe(holdAnswer());
  });

  it("drops a trailing list of section headings the page already shows", () => {
    const headings = new Set(["axion solutions", "axion workflow engine"]);
    const text = "Axis does not own FoodFlow's database. (Axion Solutions; Axion workflow engine)";
    expect(dropSourceTail(text, headings)).toBe("Axis does not own FoodFlow's database.");
  });

  it("drops the same list when a full stop follows it", () => {
    const headings = new Set(["axion solutions", "axion workflow engine"]);
    const text = "Axis does not own FoodFlow's database. (Axion Solutions; Axion workflow engine).";
    expect(dropSourceTail(text, headings)).toBe("Axis does not own FoodFlow's database.");
  });

  it("drops a trailing Sources line that only names sections", () => {
    const headings = new Set(["axion solutions"]);
    const text = "Axis waits for approval.\nSources: Axion Solutions.";
    expect(dropSourceTail(text, headings)).toBe("Axis waits for approval.");
  });

  it("keeps a real parenthesis that is not a section heading", () => {
    expect(dropSourceTail("He speaks English (fluent).", new Set(["skills"]))).toBe("He speaks English (fluent).");
  });

  it("uses the tool headings when it drops the source tail", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, heading: "Axion Solutions", text: "Axis waits for approval." } }],
      "Axis waits for approval. (Axion Solutions)",
    );
    expect(text).toBe("Axis waits for approval.");
  });

  it("removes a record lead-in and keeps the fact", () => {
    const raw = '{"sentence": "According to the record, CVA has a live app. The record notes that a sale is not a production release."}';
    expect(displayAnswer([], raw)).toBe("CVA has a live app. A sale is not a production release.");
  });

  it("keeps the page archive when the model says the record says it", () => {
    const raw = '{"sentence": "The record says the visitor page lists the full public archive."}';
    expect(displayAnswer([], raw)).toBe("The visitor page lists the full public archive.");
  });

  it("drops a sentence that narrates the record and keeps the answer", () => {
    const text = dropRecordTalk(
      "Liam's job title is AI Software Engineer. The record lists the current title as AI Software Engineer. The page title field reads AI Software Engineer.",
    );
    expect(text).toBe("Liam's job title is AI Software Engineer.");
  });

  it("drops a sentence that names a missing fact", () => {
    expect(dropGapSentences("Liam builds CVA. The record does not include that.")).toBe("Liam builds CVA.");
    expect(dropGapSentences("CVA is the live app. The record does not say FoodFlow is in production.")).toBe("CVA is the live app.");
    expect(dropGapSentences("The record does not specify a live metric. Manual processing fell about 35 percent.")).toBe("Manual processing fell about 35 percent.");
    expect(dropGapSentences("The project does not list post-deployment metrics.")).toBe("");
  });

  it("uses the recorded percent when the model only names a gap", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Water-meter scanner. The resume records about 35 percent less manual meter processing, on more than 10,000 samples." }] } }],
      "The project does not list post-deployment metrics.",
    );
    expect(text).toBe("Water-meter scanner. About 35 percent less manual meter processing, on more than 10,000 samples.");
    const narrated = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "The resume records about 35 percent less manual meter processing, on more than 10,000 samples." }] } }],
      "The record shows a 35 percent reduction across more than ten thousand samples.",
    );
    expect(narrated).toBe("About 35 percent less manual meter processing, on more than 10,000 samples.");
    const withApproval = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [
        { text: "The resume records about 35 percent less manual meter processing, on more than 10,000 samples." },
        { text: "A reviewer agent critiques the draft, and a person approves it." },
      ] } }],
      "The record shows a reduction.",
    );
    expect(withApproval).toBe("About 35 percent less manual meter processing, on more than 10,000 samples.");
    const detailed = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [
        { text: "Water-meter scanner. ML work for VietDan JSC, December 2024 to February 2025. The resume records about 35 percent less manual meter processing, on more than 10,000 samples. The resume says the scanner was productionized. Deployment used Jetson and AWS." },
        { text: "A reviewer agent critiques the draft, and a person approves it." },
      ] } }],
      "The record shows a reduction.",
    );
    expect(detailed).toContain("VietDan JSC");
    expect(detailed).toContain("35 percent");
    expect(detailed).toContain("10,000 samples");
    expect(detailed).toContain("Jetson");
    expect(detailed).not.toContain("person approves");
  });

  it("does not add a later search's product to the first result", () => {
    const text = displayAnswer(
      [
        { type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Water-meter scanner. The resume records about 35 percent less manual meter processing, on more than 10,000 samples." }] } },
        { type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Ericsson 5G digital twin. Drift monitoring uses the population stability index." }] } },
      ],
      "The scanner cut manual meter processing by about 35 percent. The Ericsson twin monitors drift.",
    );
    expect(text).toContain("35 percent");
    expect(text).not.toContain("Ericsson");
  });

  it("uses the later search when the question names that employer", () => {
    const text = displayAnswer(
      [
        { type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Axion Solutions. Axis calls typed tools on FoodFlow, shows a preview, and waits for a person to approve a write." }] } },
        { type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Harry the Hirer, Senior AI Engineer. The resume records about 40 percent less repetitive lookup and drafting in targeted pilot workflows." }] } },
      ],
      "Axis shows a preview.",
      "At Harry the Hirer, what did the pilot cut?",
    );
    expect(text).toContain("40 percent");
    expect(text).not.toContain("FoodFlow");
  });

  it("adds the preview when a long write answer leaves it out", () => {
    const axion = profile.sections.find((item) => item.sectionId === "role-axion");
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: axion?.text ?? "" }] } }],
      "He will not let a model write into the system of record without a person. The employer is Axion Solutions and the product is Axis. The work covers the operating model, the strategy, and the vision for the platform across the current role.",
    );
    expect(text).toContain("preview");
    expect(text).toMatch(/approv/i);
    expect(text).not.toContain("Axion system");
  });

  it("keeps a normal sentence start when the offer names a recorded detail", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Water-meter scanner. Deployment used Jetson and AWS. The resume records about 35 percent less manual meter processing." }] } }],
      "The scanner cut manual work by 35 percent. Would you like the Jetson deployment?",
    );
    expect(text).toContain("Would you like");
  });

  it("does not attach the BERTScore to the synthetic case count", () => {
    const medswin = profile.sections.find((item) => item.sectionId === "role-swinburne-research");
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: medswin?.text ?? "" }] } }],
      "The lab recorded 86 percent BERTScore on 5 million synthetic cases.",
    );
    expect(text).toContain("86 percent");
    expect(text).toContain("MedMCQA");
    expect(text).not.toContain("BERTScore on 5 million");
  });

  it("does not give the uptime figure to the pilot cut", () => {
    const harry = profile.sections.find((item) => item.sectionId === "role-harry-senior");
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: harry?.text ?? "" }] } }],
      "The targeted pilot cut repetitive lookup by 99.9 percent.",
    );
    expect(text).toContain("40 percent");
    expect(text).toContain("operational uptime");
    expect(text).not.toContain("lookup by 99.9");
  });

  it("replaces a denial of the pilot figure with the recorded cut", () => {
    const harry = profile.sections.find((item) => item.sectionId === "role-harry-senior");
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: harry?.text ?? "" }] } }],
      "No pilot or cut metric is recorded for Liam's work.",
    );
    expect(text).toContain("40 percent");
    expect(text).not.toContain("No pilot");
  });

  it("adds the pilot figure when a short Harry answer omits it", () => {
    const harry = profile.sections.find((item) => item.sectionId === "role-harry-senior");
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: harry?.text ?? "" }] } }],
      "He led the event inventory work.",
    );
    expect(text).toContain("40 percent");
    expect(text).toContain("Planner");
  });

  it("keeps a later measured figure when the model answer is dropped", () => {
    const harry = profile.sections.find((item) => item.sectionId === "role-harry-senior");
    const harryText = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: harry?.text ?? "" }] } }],
      "The record does not list the pilot result.",
    );
    expect(harryText).toContain("40 percent");
    expect(harryText).toContain("Planner");
    const medswin = profile.sections.find((item) => item.sectionId === "role-swinburne-research");
    const medswinText = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: medswin?.text ?? "" }] } }],
      "The record does not list a BERTScore.",
    );
    expect(medswinText).toContain("86 percent");
    expect(medswinText).toContain("5 million");
  });

  it("keeps the Ericsson live-app boundary when the model only names a gap", () => {
    const section = profile.sections.find((item) => item.sectionId === "project-ericsson");
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: section?.text ?? "" }] } }],
      "The record does not include a deployment count.",
    );
    expect(text).toContain("production-grade");
    expect(text).toContain("not a named live customer app");
    expect(text).not.toContain("deployment count");
  });

  it("does not give Mizco the Harry percent", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [
        { text: "Mizco. The resume records about 50 percent less manual review." },
        { text: "Harry the Hirer. The resume records about 40 percent less repetitive lookup." },
      ] } }],
      "Mizco cut manual review by 40 percent.",
    );
    expect(text).toContain("50");
    expect(text).not.toContain("40");
  });

  it("replaces a denied research answer with the research role", () => {
    const text = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Swinburne research. Researcher at Swinburne University of Technology, Melbourne, August 2025 to July 2026. Clinical AI lab of five people. The resume records more than 500,000 curated cases and 86 percent BERTScore on MedMCQA, PubMedQA, and MedQuAD." }] } }],
      "The record shows a Bachelor of Software Engineering at Swinburne University of Technology from 2022 to 2025, but it does not list any research projects. Let me know if you want me to check his Capstone Project at RMIT or his AI capstone at Axon instead.",
    );
    expect(text).toContain("500,000");
    expect(text).toContain("BERTScore");
    expect(text).not.toContain("RMIT");
    expect(text).not.toContain("does not list");
    expect(text).not.toContain("Bachelor");
  });

  it("keeps Axis separate from the employer and adds the meter deployment", () => {
    const write = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Axion Solutions. Axis is a separate AI product. It shows a preview, and waits for a person to approve a write." }] } }],
      "In the Axion system called Axis, a model shows a preview of the proposed write and waits for a person to approve it before the write lands.",
    );
    expect(write).toContain("Axis");
    expect(write).toContain("preview");
    expect(write).not.toContain("Axion system");
    const meter = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Water-meter scanner. ML work for VietDan JSC, December 2024 to February 2025. The resume records about 35 percent less manual meter processing, on more than 10,000 samples. Deployment used Jetson and AWS." }] } }],
      "The resume records about 35 percent less manual meter processing on more than 10,000 samples.",
    );
    expect(meter).toContain("35 percent");
    expect(meter).toContain("VietDan");
    expect(meter).toContain("Jetson");
    const harry = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Harry the Hirer, Senior AI Engineer. Melbourne, December 2025 to July 2026. The resume records about 40 percent less repetitive lookup and drafting. A multi-agent layer uses Planner, Retriever, Verifier, Critic, and Tool-Executor agents. Retrieval uses BM25 and HNSW hybrid search." }] } }],
      "The targeted pilot cut repetitive lookup and drafting by about 40 percent.",
    );
    expect(harry).toContain("40 percent");
    expect(harry).toContain("Planner");
    expect(harry).toContain("2025");
    expect(harry).not.toMatch(/^Melbourne/);
    const pedigree = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Harry the Hirer, pedigree AI. March 2026 to May 2026. Thoroughbred pedigree AI for the Black Caviar lineage platform, in an ML and data science role. It is a mate-selection engine for genetic merit, compatibility, and inbreeding risk." }] } }],
      "The record does not show a role at Harry the Hirer before the Senior AI Engineer position that started in December 2025; the only earlier Harry the Hirer entry is a pedigree AI project from March to May 2026.",
    );
    expect(pedigree).toContain("Black Caviar");
    expect(pedigree).toContain("mate-selection");
    expect(pedigree).not.toContain("does not show");
    const axis = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Axis shows a preview, and a person approves the write. FoodFlow keeps Sales, Purchasing, Inventory, and Finance. The engine uses LangChain and LangGraph." }] } }],
      "Axis shows a preview.",
    );
    expect(axis).toContain("LangChain");
    expect(axis).not.toContain("FoodFlow");
  });

  it("drops a modifier that only exists inside a longer record word", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, text: "The resume records about 35 percent less manual meter processing, on more than 10,000 samples. The resume says the scanner was productionized." } }],
      "The scanner cut manual meter processing by about 35 percent on more than 10,000 production samples.",
    );
    expect(text).toContain("10,000 samples");
    expect(text).toContain("35 percent");
    expect(text).not.toContain("production samples");
  });

  it("answers the Axis write question without retelling the role", () => {
    const section = profile.sections.find((item) => item.sectionId === "role-axion");
    const parts = [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: section?.text ?? "" }] } }];
    const question = "At Axion, what does Axis show before a write?";
    const dumped = displayAnswer(parts, section?.text ?? "", question);
    const dropped = displayAnswer(parts, "The record does not say what Axis shows.", question);
    for (const text of [dumped, dropped]) {
      expect(text.split(/(?<=[.!])\s+/)[0]).toMatch(/preview/i);
      expect(text).toMatch(/approv/i);
      expect(text).toContain("separate");
      expect(text).toContain("2026");
      expect(text).not.toContain("delivery scheduling");
      expect(text).not.toContain("capital-markets");
      expect(text.split(/\s+/).length).toBeLessThan(80);
    }
  });

  it("answers the pilot and the lab score without the rest of the role", () => {
    const harry = profile.sections.find((item) => item.sectionId === "role-harry-senior");
    const harryText = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: harry?.text ?? "" }] } }],
      harry?.text ?? "",
      "At Harry the Hirer, what did the pilot cut?",
    );
    expect(harryText).toContain("40 percent");
    expect(harryText).toContain("2025");
    expect(harryText).not.toContain("Docker");
    expect(harryText.split(/\s+/).length).toBeLessThan(70);
    const medswin = profile.sections.find((item) => item.sectionId === "role-swinburne-research");
    const medswinText = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: medswin?.text ?? "" }] } }],
      medswin?.text ?? "",
      "At MedSwin, what BERTScore did the lab record?",
    );
    expect(medswinText).toContain("86 percent");
    expect(medswinText).not.toContain("clinical records");
    const medswinSearch = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "At MedSwin, what BERTScore did the lab record?") }],
      "",
      "At MedSwin, what BERTScore did the lab record?",
    );
    expect(medswinSearch).toContain("86 percent");
    expect(medswinSearch).toContain("five-person lab");
    expect(medswinSearch).toContain("July 2026");
    expect(medswinSearch).not.toContain("clinical records");
    const cases = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How many cases did the MedSwin lab curate?") }],
      "",
      "How many cases did the MedSwin lab curate?",
    );
    expect(cases).toContain("500,000");
    const intro = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Introduce him.") }],
      "",
      "Introduce him.",
    );
    const availability = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is he available for work?") }],
      "",
      "Is he available for work?",
    );
    expect(intro).toContain("AI Software Engineer");
    expect(availability).toContain("July 2026");
    expect(availability).toContain("AI Software Engineer");
    expect(availability.toLowerCase()).not.toContain("available");
    const spoken = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "Vietnamese (native), English (fluent), Mandarin (intermediate)" }] } }],
      "",
      "What languages does he speak?",
    );
    expect(spoken).toContain("Vietnamese");
    const background = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is his background?") }],
      "",
      "What is his background?",
    );
    expect(background).toContain("AI Software Engineer");
    const career = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Walk me through his career.") }],
      "",
      "Walk me through his career.",
    );
    expect(career).toContain("Axion");
    expect(career.toLowerCase()).not.toContain("career application");
    const databases = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What databases does he use?") }],
      "",
      "What databases does he use?",
    );
    expect(databases).toContain("MariaDB");
    expect(databases).toContain("MongoDB");
    expect(databases).toContain("SQLite");
    expect(databases).toContain("MySQL");
    expect(databases).not.toContain("does not own");
    const surveeDatabase = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What database does Survee use?") }],
      "",
      "What database does Survee use?",
    );
    expect(surveeDatabase).toContain("MongoDB");
    expect(surveeDatabase).not.toContain("MariaDB");
    const triageDatabase = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What database does the triage app use?") }],
      "",
      "What database does the triage app use?",
    );
    expect(triageDatabase).toContain("FAISS");
    expect(triageDatabase).not.toContain("MariaDB");
    const foodflowDatabase = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What database does FoodFlow use?") }],
      "",
      "What database does FoodFlow use?",
    );
    expect(foodflowDatabase).toContain("does not own");
    expect(foodflowDatabase).not.toContain("LangChain");
    const employer = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is his current employer?") }],
      "",
      "What is his current employer?",
    );
    expect(employer).toContain("Axion");
    const coded = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What languages does he code in?") }],
      "",
      "What languages does he code in?",
    );
    expect(coded).toContain("Python");
    expect(coded).toContain("TypeScript");
    expect(coded).not.toContain("Vietnamese");
    const ocr = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What OCR does he use?") }],
      "",
      "What OCR does he use?",
    );
    expect(ocr).toContain("VietOCR");
    const education = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is his education?") }],
      "",
      "What is his education?",
    );
    expect(education).toContain("Bachelor");
    const frameworks = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What frameworks does he use?") }],
      "",
      "What frameworks does he use?",
    );
    expect(frameworks).toContain("LangChain");
    expect(frameworks).not.toContain("capital-markets");
    expect(searchSections(profile.sections, "What papers has he written?").found).toBe(false);
    expect(searchSections(profile.sections, "What did he publish?").found).toBe(false);
    const vector = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What vector database does he use?") }],
      "",
      "What vector database does he use?",
    );
    expect(vector).toMatch(/pgvector|FAISS/);
    expect(vector).not.toContain("MariaDB");
    const llm = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What LLM does he use?") }],
      "",
      "What LLM does he use?",
    );
    expect(llm).toMatch(/Gemini|Qwen/);
    expect(llm).not.toContain("explanations");
    const resume = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Can I see his resume?") }],
      "",
      "Can I see his resume?",
    );
    expect(resume).not.toContain("capital-markets");
    const models = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What models does he use?") }],
      "",
      "What models does he use?",
    );
    expect(models).toContain("Gemini");
    expect(models).toContain("TimesFM");
    const coachSend = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the writing coach send?") }],
      "",
      "What does the writing coach send?",
    );
    expect(coachSend).toContain("scores a submission");
    const control = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Who stays in control of the writing coach?") }],
      "",
      "Who stays in control of the writing coach?",
    );
    expect(control).toContain("stays in control");
    const production = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is FoodFlow in production?") }],
      "",
      "Is FoodFlow in production?",
    );
    expect(production).toContain("business module");
    expect(production).toContain("not for a release");
    const skyledge = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is SkyLedge in production?") }],
      "",
      "Is SkyLedge in production?",
    );
    expect(skyledge).toContain("not a production release");
    expect(skyledge).toContain("acquired");
    const rosterLive = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is the roster app live?") }],
      "",
      "Is the roster app live?",
    );
    expect(rosterLive).toContain("only named live app");
    const faults = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How does SkyLedge predict faults?") }],
      "",
      "How does SkyLedge predict faults?",
    );
    expect(faults).toContain("K-means");
    const ranking = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How does the pedigree engine rank horses?") }],
      "",
      "How does the pedigree engine rank horses?",
    );
    expect(ranking).toContain("ranking");
    const speech = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What speech model does triage use?") }],
      "",
      "What speech model does triage use?",
    );
    expect(speech).toContain("Whisper");
    const bandwidth = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Ericsson forecast?") }],
      "",
      "What does Ericsson forecast?",
    );
    expect(bandwidth).toContain("bandwidth");
    const detects = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Ericsson detect?") }],
      "",
      "What does Ericsson detect?",
    );
    expect(detects).toContain("degradation");
    const popForecast = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does PopTech forecast?") }],
      "",
      "What does PopTech forecast?",
    );
    expect(popForecast).toContain("electricity");
    const archive = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the public archive include?") }],
      "",
      "What does the public archive include?",
    );
    expect(archive).toContain("prompt-me");
    expect(archive).toContain("StudyBuddy");
    expect(archive).toContain("Prophet");
    expect(archive.toLowerCase()).toContain("stt-studio");
    expect(archive).toContain("Acnt-MCP");
    expect(archive).not.toContain("star counts");
    const products = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the difference between Axis and FoodFlow?") }],
      "",
      "What is the difference between Axis and FoodFlow?",
    );
    expect(products).toContain("Axis");
    expect(products).toContain("FoodFlow");
    expect(products).not.toContain("EstateFolio");
    const overlap = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Did he work at Harry and MedSwin at the same time?") }],
      "",
      "Did he work at Harry and MedSwin at the same time?",
    );
    expect(overlap).toContain("Harry");
    const bothJobs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at both Axion and Harry?") }],
      "",
      "What did he do at both Axion and Harry?",
    );
    expect(bothJobs).toContain("Axis");
    expect(bothJobs).toContain("led");
    const namBoth = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did both Nam A roles cover?") }],
      "",
      "What did both Nam A roles cover?",
    );
    expect(namBoth).toContain("VietOCR");
    expect(namBoth).toContain("REST");
    const pedigreePlace = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where was the pedigree project based?") }],
      "",
      "Where was the pedigree project based?",
    );
    expect(pedigreePlace).toContain("Melbourne");
    expect(pedigreePlace).toContain("Black Caviar");
    const altaStack = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What stack does Alta use?") }],
      "",
      "What stack does Alta use?",
    );
    expect(altaStack).toContain("Kubernetes");
    const waits = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Axis wait for?") }],
      "",
      "What does Axis wait for?",
    );
    expect(waits).toMatch(/approve/);
    const syntheticCases = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How many synthetic cases did MedSwin use?") }],
      "",
      "How many synthetic cases did MedSwin use?",
    );
    expect(syntheticCases).toContain("5 million");
    expect(syntheticCases.indexOf("5 million")).toBeLessThan(syntheticCases.indexOf("500,000") === -1 ? syntheticCases.length : syntheticCases.indexOf("500,000"));
    const drift = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Ericsson use to detect drift?") }],
      "",
      "What does Ericsson use to detect drift?",
    );
    expect(drift).toContain("population stability index");
    const axisWrite = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Axis show before a write?") }],
      "",
      "What does Axis show before a write?",
    );
    expect(axisWrite).toContain("preview");
    expect(axisWrite).not.toContain("github.com");
    const uptime = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What uptime did the Harry services keep?") }],
      "",
      "What uptime did the Harry services keep?",
    );
    expect(uptime).toContain("99.9");
    const filings = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the S&P work use for text?") }],
      "",
      "What does the S&P work use for text?",
    );
    expect(filings).toContain("FinBERT");
    expect(filings).not.toContain("RFQ");
    const shipped = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does he ship to production?") }],
      "",
      "What does he ship to production?",
    );
    expect(shipped).toContain("CVA");
    const degree = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is his degree?") }],
      "",
      "What is his degree?",
    );
    expect(degree).toContain("Swinburne");
    const delivery = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does triage deliver?") }],
      "",
      "What does triage deliver?",
    );
    expect(delivery).toContain("drone");
    const ensemble = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the pedigree engine include?") }],
      "",
      "What does the pedigree engine include?",
    );
    expect(ensemble).toContain("Dosage");
    const verifier = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the verifier check at Harry?") }],
      "",
      "What does the verifier check at Harry?",
    );
    expect(verifier).toContain("evidence");
    const verifierRole = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the verifier do?") }],
      "",
      "What does the verifier do?",
    );
    expect(verifierRole).toContain("Verifier");
    expect(verifierRole).not.toContain("Validators check");
    const rerankerDuty = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the reranker do?") }],
      "",
      "What does the reranker do?",
    );
    expect(rerankerDuty.startsWith("An 8-million-document")).toBe(true);
    expect(rerankerDuty).not.toContain("Swinburne research");
    expect(rerankerDuty).not.toContain("five people");
    const langGraphDuty = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does LangGraph do?") }],
      "",
      "What does LangGraph do?",
    );
    expect(langGraphDuty).toContain("FastAPI");
    expect(langGraphDuty).not.toContain("Named tools include");
    const pgvectorDuty = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does pgvector do?") }],
      "",
      "What does pgvector do?",
    );
    expect(pgvectorDuty).toContain("pgvector");
    expect(pgvectorDuty).not.toContain("TypeScript");
    const llamaIndexDuty = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does LlamaIndex do?") }],
      "",
      "What does LlamaIndex do?",
    );
    expect(llamaIndexDuty).toContain("LlamaIndex");
    expect(llamaIndexDuty).not.toContain("TypeScript");
    const mcpDuty = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does MCP do?") }],
      "",
      "What does MCP do?",
    );
    expect(mcpDuty).toContain("MCP-style");
    expect(mcpDuty).not.toContain("OpenCollective");
    const golfGain = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the golf scanner gain?") }],
      "",
      "What did the golf scanner gain?",
    );
    expect(golfGain).toContain("15 percent");
    const claraAccuracy = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What accuracy did Clara record?") }],
      "",
      "What accuracy did Clara record?",
    );
    expect(claraAccuracy).toContain("95");
    expect(claraAccuracy).toContain("92");
    const adminEffort = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What was the admin effort cut?") }],
      "",
      "What was the admin effort cut?",
    );
    expect(adminEffort).toContain("35 percent");
    expect(adminEffort).not.toContain("40 percent");
    const manualWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What was the manual work cut?") }],
      "",
      "What was the manual work cut?",
    );
    expect(manualWork).toContain("manual work");
    expect(manualWork).not.toContain("40 percent");
    const artefactCut = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What was the artefact preparation cut?") }],
      "",
      "What was the artefact preparation cut?",
    );
    expect(artefactCut).toContain("50 percent");
    expect(artefactCut).not.toContain("40 percent");
    expect(artefactCut).not.toContain("BERTScore");
    const labLanguages = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What languages does the lab cover?") }],
      "",
      "What languages does the lab cover?",
    );
    expect(labLanguages).toContain("PubMed");
    expect(labLanguages).not.toContain("Mandarin");
    const labBenchmarks = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What benchmarks did the lab use?") }],
      "",
      "What benchmarks did the lab use?",
    );
    expect(labBenchmarks).toContain("MedMCQA");
    expect(labBenchmarks).toContain("86 percent");
    const medswinDatasets = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What datasets did MedSwin use?") }],
      "",
      "What datasets did MedSwin use?",
    );
    expect(medswinDatasets).toContain("MedQuAD");
    const poptechUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he use at PopTech?") }],
      "",
      "What did he use at PopTech?",
    );
    expect(poptechUse).toContain("TFT");
    expect(poptechUse).toContain("DQN");
    const harryTools = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he use at Harry?") }],
      "",
      "What did he use at Harry?",
    );
    expect(harryTools).toContain("Azure");
    expect(harryTools).toContain("FastAPI");
    const mizcoTools = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he use at Mizco?") }],
      "",
      "What did he use at Mizco?",
    );
    expect(mizcoTools).toContain("vLLM");
    const inetTools = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he use at iNet?") }],
      "",
      "What did he use at iNet?",
    );
    expect(inetTools).toContain("Obsei");
    const teqarScope = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he use at Teqar?") }],
      "",
      "What did he use at Teqar?",
    );
    expect(teqarScope).toContain("analytics");
    expect(teqarScope).toContain("vision quality checks");
    const harryRoleFigure = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Harry?") }],
      "",
      "What did he do at Harry?",
    );
    expect(harryRoleFigure).toContain("40 percent");
    const mizcoRoleFigure = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Mizco?") }],
      "",
      "What did he do at Mizco?",
    );
    expect(mizcoRoleFigure).toContain("50 percent");
    const axionRoleWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Axion?") }],
      "",
      "What did he do at Axion?",
    );
    expect(axionRoleWork).toContain("preview");
    expect(axionRoleWork).toContain("approve");
    const estatefolioIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is EstateFolio?") }],
      "",
      "What is EstateFolio?",
    );
    expect(estatefolioIs).toContain("price forecast");
    expect(estatefolioIs).toContain("Ho Chi Minh City");
    expect(estatefolioIs).toContain("transformer");
    expect(estatefolioIs).toContain("ST-GNN");
    const salleIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Sall-e?") }],
      "",
      "What is Sall-e?",
    );
    expect(salleIs).toContain("oceanic garbage");
    expect(salleIs).toContain("computer vision");
    expect(salleIs).toContain("Transformer");
    const golfIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the golf scorecard scanner?") }],
      "",
      "What is the golf scorecard scanner?",
    );
    expect(golfIs).toContain("VHandicap");
    expect(golfIs).toContain("YOLOv8");
    expect(golfIs).toContain("15 percent");
    const rosterIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Roster management?") }],
      "",
      "What is Roster management?",
    );
    expect(rosterIs).toContain("MJ Industrial");
    expect(rosterIs).toContain("Kotlin");
    const cvaProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is CVA?") }],
      "",
      "What is CVA?",
    );
    expect(cvaProduct).toContain("career application agent");
    expect(cvaProduct).toContain("person approves");
    const skyledgeProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is SkyLedge?") }],
      "",
      "What is SkyLedge?",
    );
    expect(skyledgeProduct).toContain("OBD-II");
    expect(skyledgeProduct).toContain("SkyLedge Kenya");
    const meterProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the water-meter scanner?") }],
      "",
      "What is the water-meter scanner?",
    );
    expect(meterProduct).toContain("35 percent");
    expect(meterProduct).toContain("10,000");
    expect(meterProduct).toContain("productionized");
    const surveeProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Survee?") }],
      "",
      "What is Survee?",
    );
    expect(surveeProduct).toContain("host-run interview");
    expect(surveeProduct).toContain("private link");
    expect(surveeProduct).toContain("does not score");
    expect(surveeProduct).toContain("MongoDB");
    const pedigreeMeasure = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the pedigree project measure?") }],
      "",
      "What did the pedigree project measure?",
    );
    expect(pedigreeMeasure).toContain("inbreeding");
    expect(pedigreeMeasure).not.toContain("40 percent");
    const namVision = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did Nam A use for vision?") }],
      "",
      "What did Nam A use for vision?",
    );
    expect(namVision).toContain("OpenCV");
    expect(namVision).not.toContain("REST");
    const meterHardware = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What hardware runs the water meter?") }],
      "",
      "What hardware runs the water meter?",
    );
    expect(meterHardware).toContain("Jetson");
    const queue = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What queue does the S&P work use?") }],
      "",
      "What queue does the S&P work use?",
    );
    expect(queue).toContain("Kafka");
    const classify = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Sall-e classify?") }],
      "",
      "What does Sall-e classify?",
    );
    expect(classify).toContain("localise");
    const managerCut = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does HA Manager reduce for the school?") }],
      "",
      "What does HA Manager reduce for the school?",
    );
    expect(managerCut).toContain("35");
    const managerLanguage = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What language does HA Manager use?") }],
      "",
      "What language does HA Manager use?",
    );
    expect(managerLanguage).toContain("bilingual");
    expect(managerLanguage).not.toContain("CVA");
    const golfMeasure = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the golf scanner measure?") }],
      "",
      "What does the golf scanner measure?",
    );
    expect(golfMeasure).toContain("15");
    const surveeStore = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Survee keep in the database?") }],
      "",
      "What does Survee keep in the database?",
    );
    expect(surveeStore).toContain("MongoDB");
    const founders = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does a separate Axion recipe send?") }],
      "",
      "What does a separate Axion recipe send?",
    );
    expect(founders).toContain("founders");
    const meterClaim = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the water meter production claim exclude?") }],
      "",
      "What does the water meter production claim exclude?",
    );
    expect(meterClaim).toContain("named public app");
    const safety = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What safety does MedSwin use?") }],
      "",
      "What safety does MedSwin use?",
    );
    expect(safety).toContain("guardrails");
    const summary = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does iNet summarise?") }],
      "",
      "What does iNet summarise?",
    );
    expect(summary).toContain("sentiment");
    const vertx = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the Nam A software role use besides REST?") }],
      "",
      "What does the Nam A software role use besides REST?",
    );
    expect(vertx).toContain("Vert.x");
    const altaCi = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Alta ship through CI?") }],
      "",
      "What does Alta ship through CI?",
    );
    expect(altaCi).toContain("CI/CD");
    const routePlan = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Sall-e plan after detection?") }],
      "",
      "What does Sall-e plan after detection?",
    );
    expect(routePlan).toContain("route planning");
    const digits = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the golf scanner use for digits?") }],
      "",
      "What does the golf scanner use for digits?",
    );
    expect(digits).toContain("MNIST");
    const labRecord = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the lab record?") }],
      "",
      "What did the lab record?",
    );
    expect(labRecord).toContain("BERTScore");
    const bothCases = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How many cases?") }],
      "",
      "How many cases?",
    );
    expect(bothCases).toContain("500,000");
    expect(bothCases).toContain("5 million");
    const downloads = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the resume say the MedSwin models were?") }],
      "",
      "What does the resume say the MedSwin models were?",
    );
    expect(downloads).toContain("downloaded");
    expect(downloads).not.toContain("re-counted");
    const host = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Axis draft on?") }],
      "",
      "What does Axis draft on?",
    );
    expect(host).toContain("same host");
    const bareMeasure = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he measure?") }],
      "",
      "What did he measure?",
    );
    expect(bareMeasure).toContain("40 percent");
    expect(bareMeasure).toContain("50 percent");
    expect(bareMeasure).toContain("86 percent");
    expect(bareMeasure).not.toContain("Named tools");
    const bareCut = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he cut?") }],
      "",
      "What did he cut?",
    );
    expect(bareCut).toContain("40 percent");
    expect(bareCut).not.toContain("Named tools");
    const buyer = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is VHandicap?") }],
      "",
      "What is VHandicap?",
    );
    expect(buyer).toContain("VHandicap");
    const industrial = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is MJ Industrial?") }],
      "",
      "What is MJ Industrial?",
    );
    expect(industrial).toContain("MJ Industrial");
    expect(industrial).not.toContain("PDFs");
    const whisper = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Whisper used for?") }],
      "",
      "What is Whisper used for?",
    );
    expect(whisper.toLowerCase()).toContain("whisper");
    expect(whisper).toContain("Speech uses Whisper");
    const qwenUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Qwen used for?") }],
      "",
      "What is Qwen used for?",
    );
    expect(qwenUse).toContain("Qwen-VL");
    const golfQwen = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Qwen2.5-VL used for?") }],
      "",
      "What is Qwen2.5-VL used for?",
    );
    expect(golfQwen).toContain("handwritten corrections");
    const poptechDqn = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is DQN used for?") }],
      "",
      "What is DQN used for?",
    );
    expect(poptechDqn).toContain("DQN");
    const harryMsal = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is MSAL used for?") }],
      "",
      "What is MSAL used for?",
    );
    expect(harryMsal).toContain("MSAL authentication");
    const medswinRecord = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did MedSwin record?") }],
      "",
      "What did MedSwin record?",
    );
    expect(medswinRecord).toContain("86 percent BERTScore");
    const labTrain = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the lab train?") }],
      "",
      "What did the lab train?",
    );
    expect(labTrain).toContain("LoRA");
    expect(labTrain).toContain("500,000");
    const labAgents = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What agents does the clinical lab use?") }],
      "",
      "What agents does the clinical lab use?",
    );
    expect(labAgents).toContain("specialist medical agents");
    expect(labAgents).not.toContain("React Native");
    const orchestrator = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the reasoning orchestrator do?") }],
      "",
      "What does the reasoning orchestrator do?",
    );
    expect(orchestrator).toContain("reranker");
    const downloadRank = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What download rank did MedSwin record?") }],
      "",
      "What download rank did MedSwin record?",
    );
    expect(downloadRank).toContain("most downloaded");
    expect(downloadRank).not.toContain("86 percent");
    const cvaLive = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is CVA live?") }],
      "",
      "Is CVA live?",
    );
    expect(cvaLive).toContain("cva-mauve.vercel.app");
    const handwriting = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the golf scanner do with handwriting?") }],
      "",
      "What does the golf scanner do with handwriting?",
    );
    expect(handwriting).toContain("MNIST");
    expect(handwriting).not.toContain("VHandicap");
    const accounting = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the accounting assistant use?") }],
      "",
      "What does the accounting assistant use?",
    );
    expect(accounting).toContain("OpenCollective");
    expect(accounting).not.toContain("ADHD");
    const fiveG = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is 5G?") }],
      "",
      "What is 5G?",
    );
    expect(fiveG).toContain("tower telemetry");
    expect(fiveG).not.toContain("Axis");
    const fiveGBuild = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he build for 5G?") }],
      "",
      "What did he build for 5G?",
    );
    expect(fiveGBuild).toContain("tower telemetry");
    expect(fiveGBuild).not.toContain("investor");
    const vietnameseLlm = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the Vietnamese medical LLM?") }],
      "",
      "What is the Vietnamese medical LLM?",
    );
    expect(vietnameseLlm).toContain("MedSwin");
    expect(vietnameseLlm).not.toContain("Gemini");
    const eightMillion = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the 8 million figure?") }],
      "",
      "What is the 8 million figure?",
    );
    expect(eightMillion).toContain("8-million-document");
    expect(eightMillion).not.toContain("5 million");
    const fiveMillion = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the 5 million figure?") }],
      "",
      "What is the 5 million figure?",
    );
    expect(fiveMillion).toContain("5 million synthetic cases");
    expect(fiveMillion).not.toContain("8-million");
    const harryPercent = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the 40 percent figure?") }],
      "",
      "What is the 40 percent figure?",
    );
    expect(harryPercent).toContain("40 percent");
    expect(harryPercent).not.toContain("15 percent");
    const mizcoPercent = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the 50 percent figure?") }],
      "",
      "What is the 50 percent figure?",
    );
    expect(mizcoPercent).toContain("50 percent");
    const meterPercent = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the 35 percent figure?") }],
      "",
      "What is the 35 percent figure?",
    );
    expect(meterPercent).toContain("admin effort");
    expect(meterPercent).toContain("manual work");
    expect(meterPercent).toContain("meter");
    const axionStart = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "When did the Axion role start?") }],
      "",
      "When did the Axion role start?",
    );
    expect(axionStart).toContain("July 2026");
    expect(axionStart).not.toContain("recipe");
    const title = displayAnswer(
      [
        { type: "tool-search_sections", state: "output-available", output: { found: true, facts: [{ label: "Current title", value: "AI Software Engineer" }, { label: "Page title", value: "AI Software Engineer" }] } },
        { type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is his title?") },
      ],
      "",
      "What is his title?",
    );
    expect(title).toBe("AI Software Engineer");
    const harryCity = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where did he live at Harry?") }],
      "",
      "Where did he live at Harry?",
    );
    expect(harryCity.startsWith("Melbourne")).toBe(true);
    expect(harryCity).not.toContain("mate-selection");
    const labCity = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where did he live at Swinburne research?") }],
      "",
      "Where did he live at Swinburne research?",
    );
    expect(labCity.startsWith("Researcher at Swinburne")).toBe(true);
    expect(labCity).toContain("Melbourne");
    expect(labCity).toContain("August 2025");
    const pytheraCity = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where did he live at Pythera?") }],
      "",
      "Where did he live at Pythera?",
    );
    expect(pytheraCity).toContain("January 2025");
    expect(pytheraCity).not.toContain("175 Hospital");
    const shippedList = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he shipped?") }],
      "",
      "What has he shipped?",
    );
    expect(shippedList).toContain("CVA");
    expect(shippedList).toContain("live app");
    const measuredWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he measured?") }],
      "",
      "What has he measured?",
    );
    expect(measuredWork).toContain("40 percent");
    expect(measuredWork).toContain("86 percent");
    const trainedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he trained?") }],
      "",
      "What has he trained?",
    );
    expect(trainedWork).toContain("LoRA");
    const deployedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he deployed?") }],
      "",
      "What has he deployed?",
    );
    expect(deployedWork).toContain("Jetson");
    const foundedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he founded?") }],
      "",
      "What has he founded?",
    );
    expect(foundedWork).toContain("founder");
    const aitcPartners = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What partners has he named?") }],
      "",
      "What partners has he named?",
    );
    expect(aitcPartners).toContain("Nvidia");
    expect(aitcPartners).not.toContain("CVA");
    const scoredWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he scored?") }],
      "",
      "What has he scored?",
    );
    expect(scoredWork).toContain("role fit");
    expect(scoredWork).toContain("submission");
    const draftRecipeDo = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the draft recipe do?") }],
      "",
      "What does the draft recipe do?",
    );
    expect(draftRecipeDo).toContain("does not send email");
    expect(draftRecipeDo).not.toContain("Apollo");
    const investorScouting = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does investor scouting do?") }],
      "",
      "What does investor scouting do?",
    );
    expect(investorScouting).toContain("people list");
    expect(investorScouting).not.toContain("Apollo");
    const draftedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he drafted?") }],
      "",
      "What has he drafted?",
    );
    expect(draftedWork).toContain("cover letter");
    expect(draftedWork).toContain("same host");
    const reviewedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he reviewed?") }],
      "",
      "What has he reviewed?",
    );
    expect(reviewedWork).toContain("uncertain");
    const exportedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he exported?") }],
      "",
      "What has he exported?",
    );
    expect(exportedWork).toContain("does not send a message");
    const forecastedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he forecasted?") }],
      "",
      "What has he forecasted?",
    );
    expect(forecastedWork).toContain("TimesFM");
    expect(forecastedWork).toContain("bandwidth");
    const monitoredWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he monitored?") }],
      "",
      "What has he monitored?",
    );
    expect(monitoredWork).toContain("population stability");
    const detectedWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What has he detected?") }],
      "",
      "What has he detected?",
    );
    expect(detectedWork).toContain("degradation");
    expect(detectedWork).toContain("YOLOv8");
    expect(detectedWork).toContain("waste");
    const yoloUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is YOLO used for?") }],
      "",
      "What is YOLO used for?",
    );
    expect(yoloUse).toContain("YOLOv8");
    expect(yoloUse).not.toContain("VietOCR");
    const fastApi = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is FastAPI used for?") }],
      "",
      "What is FastAPI used for?",
    );
    expect(fastApi).toContain("FastAPI");
    expect(fastApi).toContain("vLLM");
    const dockerUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Docker used for?") }],
      "",
      "What is Docker used for?",
    );
    expect(dockerUse).toContain("MSAL");
    expect(dockerUse).toContain("CI/CD");
    const mongoUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is MongoDB used for?") }],
      "",
      "What is MongoDB used for?",
    );
    expect(mongoUse).toContain("Answers stay in MongoDB");
    const ericssonWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Ericsson?") }],
      "",
      "What did he do at Ericsson?",
    );
    expect(ericssonWork).toContain("tower telemetry");
    const quotientShip = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did Quotient ship?") }],
      "",
      "What did Quotient ship?",
    );
    expect(quotientShip).toContain("brief");
    expect(quotientShip).toContain("not a deployed product");
    const medviet = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is MedVietAI?") }],
      "",
      "What is MedVietAI?",
    );
    expect(medviet).toContain("founder");
    expect(medviet).toContain("MedSwin");
    const poptechRole = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is PopTech?") }],
      "",
      "What is PopTech?",
    );
    expect(poptechRole).toContain("electricity");
    const poptechModelList = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What models did PopTech use?") }],
      "",
      "What models did PopTech use?",
    );
    expect(poptechModelList).toContain("TFT");
    const ericssonName = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the Ericsson 5G digital twin?") }],
      "",
      "What is the Ericsson 5G digital twin?",
    );
    expect(ericssonName).toContain("tower telemetry");
    const namA = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Nam A Bank?") }],
      "",
      "What is Nam A Bank?",
    );
    expect(namA).toContain("VietOCR");
    expect(namA).toContain("REST");
    const pythera = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Pythera?") }],
      "",
      "What is Pythera?",
    );
    expect(pythera).toContain("Clara");
    expect(pythera).toContain("400,000");
    const owned = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he own at AITC?") }],
      "",
      "What did he own at AITC?",
    );
    expect(owned).toContain("ingestion");
    const promptMe = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does prompt-me refine?") }],
      "",
      "What does prompt-me refine?",
    );
    expect(promptMe).toContain("refines a prompt");
    expect(promptMe).not.toContain("StudyBuddy");
    const medicalBot = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Medical-Chatbot?") }],
      "",
      "What is Medical-Chatbot?",
    );
    expect(medicalBot).toContain("medical questions");
    expect(medicalBot).not.toContain("Prophet");
    const harryRetrieve = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Harry retrieve with?") }],
      "",
      "What does Harry retrieve with?",
    );
    expect(harryRetrieve).toContain("BM25");
    expect(harryRetrieve).not.toContain("Medical-Chatbot");
    const critic = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the critic check?") }],
      "",
      "What does the critic check?",
    );
    expect(critic).toContain("Critic");
    expect(critic).not.toContain("Validators check");
    const cvaApprove = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does a person approve at CVA?") }],
      "",
      "What does a person approve at CVA?",
    );
    expect(cvaApprove).toContain("person approves");
    expect(cvaApprove).not.toContain("FoodFlow");
    const planner = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the planner do at Harry?") }],
      "",
      "What does the planner do at Harry?",
    );
    expect(planner).toContain("Planner");
    expect(planner).not.toContain("mate-selection");
    const namWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Nam A?") }],
      "",
      "What did he do at Nam A?",
    );
    expect(namWork).toContain("VietOCR");
    expect(namWork).toContain("REST");
    const triageWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do on the clinical triage response?") }],
      "",
      "What did he do on the clinical triage response?",
    );
    expect(triageWork).toContain("Whisper");
    expect(triageWork).toContain("Gemini");
    expect(triageWork).toContain("Qwen");
    const golfWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at the golf scanner?") }],
      "",
      "What did he do at the golf scanner?",
    );
    expect(golfWork).toContain("VHandicap");
    expect(golfWork).toContain("YOLO");
    const ericssonAbout = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Tell me about the Ericsson 5G digital twin.") }],
      "",
      "Tell me about the Ericsson 5G digital twin.",
    );
    expect(ericssonAbout).toContain("tower telemetry");
    const spAbout = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Tell me about the S&P 500 forecast.") }],
      "",
      "Tell me about the S&P 500 forecast.",
    );
    expect(spAbout).toContain("FinBERT");
    const cvaWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at CVA?") }],
      "",
      "What did he do at CVA?",
    );
    expect(cvaWork).toContain("drafts a CV");
    const writingWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at WritingJourney?") }],
      "",
      "What did he do at WritingJourney?",
    );
    expect(writingWork).toContain("scores a submission");
    const salleWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Sall-e?") }],
      "",
      "What did he do at Sall-e?",
    );
    expect(salleWork).toContain("localise");
    const funded = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Who funded MedVietAI?") }],
      "",
      "Who funded MedVietAI?",
    );
    expect(funded).toContain("National Data Association");
    const explained = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the pedigree engine explain with an LLM?") }],
      "",
      "What does the pedigree engine explain with an LLM?",
    );
    expect(explained).toContain("LLM explanations");
    const medvietAbout = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Tell me about MedVietAI.") }],
      "",
      "Tell me about MedVietAI.",
    );
    expect(medvietAbout).toContain("founder");
    const workflow = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Tell me about the Axion workflow engine.") }],
      "",
      "Tell me about the Axion workflow engine.",
    );
    expect(workflow).toContain("startup scouting");
    expect(workflow).toContain("separate from FoodFlow");
    expect(workflow).not.toContain("AI Software Engineer");
    const draftSend = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the draft recipe send?") }],
      "",
      "What does the draft recipe send?",
    );
    expect(draftSend).toContain("does not send email");
    expect(draftSend).not.toContain("export does not");
    expect(draftSend).not.toContain("persona");
    expect(draftSend).not.toContain("same host");
    const draftOn = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where does Axis draft?") }],
      "",
      "Where does Axis draft?",
    );
    expect(draftOn).toContain("same host");
    expect(draftOn).not.toContain("does not send");
    expect(draftOn).not.toContain("does not own");
    const ownsDatabase = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Does Axis own FoodFlow's database?") }],
      "",
      "Does Axis own FoodFlow's database?",
    );
    expect(ownsDatabase).toContain("does not own");
    expect(ownsDatabase).not.toContain("AI vision");
    expect(ownsDatabase).not.toContain("Software Engineer");
    const engineDatabase = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Does Axis own the Engine database?") }],
      "",
      "Does Axis own the Engine database?",
    );
    expect(engineDatabase).toContain("does not own the Engine database");
    expect(engineDatabase).not.toContain("governed graph");
    const dosage = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Does the pedigree engine use Dosage Theory?") }],
      "",
      "Does the pedigree engine use Dosage Theory?",
    );
    expect(dosage).toContain("Dosage Theory");
    const liveApp = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is CVA the only named live app?") }],
      "",
      "Is CVA the only named live app?",
    );
    expect(liveApp).toContain("only named live app");
    const besidesLanguage = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the HA Manager cover besides language?") }],
      "",
      "What does the HA Manager cover besides language?",
    );
    expect(besidesLanguage).toContain("enrollment");
    const haLanguage = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What language does HA Manager use?") }],
      "",
      "What language does HA Manager use?",
    );
    expect(haLanguage).toContain("bilingual");
    const melbourneJobs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Which jobs were in Melbourne?") }],
      "",
      "Which jobs were in Melbourne?",
    );
    expect(melbourneJobs).toContain("Harry");
    expect(melbourneJobs).toContain("PopTech");
    expect(melbourneJobs).toContain("Swinburne");
    const perthJobs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Which jobs were in Perth?") }],
      "",
      "Which jobs were in Perth?",
    );
    expect(perthJobs).toContain("Mizco");
    expect(perthJobs).toContain("Teqar");
    const namRoles = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the difference between the two Nam A roles?") }],
      "",
      "What is the difference between the two Nam A roles?",
    );
    expect(namRoles).toContain("VietOCR");
    expect(namRoles).toContain("REST");
    const cameFirst = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Which role came first, Nam A software or Nam A AI?") }],
      "",
      "Which role came first, Nam A software or Nam A AI?",
    );
    expect(cameFirst).toContain("software came first");
    expect(cameFirst).toContain("April 2023");
    expect(cameFirst).toContain("December 2024");
    const pedigreeBefore = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Was the pedigree project before the senior Harry role?") }],
      "",
      "Was the pedigree project before the senior Harry role?",
    );
    expect(pedigreeBefore).toContain("March 2026");
    expect(pedigreeBefore).toContain("December 2025");
    const overlapsLab = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What overlaps with the MedSwin lab?") }],
      "",
      "What overlaps with the MedSwin lab?",
    );
    expect(overlapsLab).toContain("Harry");
    expect(overlapsLab).toContain("Mizco");
    expect(overlapsLab).toContain("Teqar");
    expect(overlapsLab).toContain("August 2025");
    const betweenRoles = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do between Mizco and Axion?") }],
      "",
      "What did he do between Mizco and Axion?",
    );
    expect(betweenRoles).toContain("June 2026");
    expect(betweenRoles).toContain("July 2026");
    expect(betweenRoles).toContain("Harry");
    expect(betweenRoles).toContain("Axion");
    const betweenAlta = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What sits between Alta and Pythera?") }],
      "",
      "What sits between Alta and Pythera?",
    );
    expect(betweenAlta).toContain("iNet");
    expect(betweenAlta).toContain("VietDan");
    const harryExperience = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What was his experience at Harry the Hirer?") }],
      "",
      "What was his experience at Harry the Hirer?",
    );
    expect(harryExperience).toContain("event inventory");
    const studied = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where did he study?") }],
      "",
      "Where did he study?",
    );
    expect(studied).toContain("Swinburne University of Technology");
    expect(studied).toContain("Bachelor of Software Engineering");
    const workingNow = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is he working on now?") }],
      "",
      "What is he working on now?",
    );
    expect(workingNow).toContain("Axis");
    expect(workingNow).toContain("July 2026");
    const deployment = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does he use for deployment?") }],
      "",
      "What does he use for deployment?",
    );
    expect(deployment).toContain("Jetson");
    expect(deployment).toContain("Kubernetes");
    expect(deployment).not.toContain("ONNX");
    const poptechMeasure = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does he measure at PopTech?") }],
      "",
      "What does he measure at PopTech?",
    );
    expect(poptechMeasure).toContain("drift");
    const cloud = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What cloud platforms does he use?") }],
      "",
      "What cloud platforms does he use?",
    );
    expect(cloud).toContain("AWS");
    expect(cloud).toContain("Azure");
    expect(cloud).not.toContain("groups the stack");
    const harryCloud = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What cloud does Harry use?") }],
      "",
      "What cloud does Harry use?",
    );
    expect(harryCloud).toContain("Azure");
    expect(harryCloud).not.toContain("Planner");
    const rosterProductStack = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What stack does the roster use?") }],
      "",
      "What stack does the roster use?",
    );
    expect(rosterProductStack).toContain("Kotlin");
    expect(rosterProductStack).not.toContain("CVA");
    const triageProductStack = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What stack does triage use?") }],
      "",
      "What stack does triage use?",
    );
    expect(triageProductStack).toContain("FAISS");
    expect(triageProductStack).not.toContain("MIMIC");
    const vectorUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does he use for vectors?") }],
      "",
      "What does he use for vectors?",
    );
    expect(vectorUse).toMatch(/pgvector|FAISS/);
    expect(vectorUse).not.toContain("LangChain");
    const studyBuddy = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does StudyBuddy do?") }],
      "",
      "What does StudyBuddy do?",
    );
    expect(studyBuddy).toContain("study assistant");
    expect(studyBuddy).not.toContain("Prophet");
    expect(studyBuddy).not.toContain("Public repositories");
    const engineOwns = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the Engine own?") }],
      "",
      "What does the Engine own?",
    );
    expect(engineOwns).toContain("does not own the Engine database");
    expect(engineOwns).not.toContain("AI vision");
    expect(engineOwns).not.toContain("governed graph");
    const strengths = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is he good at?") }],
      "",
      "What is he good at?",
    );
    expect(strengths).toContain("machine learning");
    expect(strengths).not.toContain("Mandarin");
    const codeLanguages = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What programming languages does he use?") }],
      "",
      "What programming languages does he use?",
    );
    expect(codeLanguages).toContain("Python");
    expect(codeLanguages).toContain("TypeScript");
    expect(codeLanguages).not.toContain("Kubernetes");
    const router = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does free-router do?") }],
      "",
      "What does free-router do?",
    );
    expect(router).toContain("OpenRouter");
    expect(router).toContain("Mistral");
    const studio = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does stt-studio do?") }],
      "",
      "What does stt-studio do?",
    );
    expect(studio).toContain("faster-whisper");
    const survee = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Survee do?") }],
      "",
      "What does Survee do?",
    );
    expect(survee).toContain("questionnaire");
    const modelCards = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Hugging Face models do?") }],
      "",
      "What does Hugging Face models do?",
    );
    expect(modelCards).toContain("MNIST");
    const mizcoBuild = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he build at Mizco?") }],
      "",
      "What did he build at Mizco?",
    );
    expect(mizcoBuild).toContain("vLLM");
    expect(mizcoBuild).toContain("ReAct");
    const axionBuild = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he build at Axion?") }],
      "",
      "What did he build at Axion?",
    );
    expect(axionBuild).toContain("LangChain");
    expect(axionBuild).not.toContain("investor scouting");
    const poptechBuild = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he build at PopTech?") }],
      "",
      "What did he build at PopTech?",
    );
    expect(poptechBuild).toContain("TFT");
    expect(poptechBuild).toContain("XGBoost");
    const golfEfficiency = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What efficiency did the golf scanner record?") }],
      "",
      "What efficiency did the golf scanner record?",
    );
    expect(golfEfficiency).toContain("15 percent");
    expect(golfEfficiency).toContain("efficiency");
    const bm25 = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does BM25 do at Harry?") }],
      "",
      "What does BM25 do at Harry?",
    );
    expect(bm25).toContain("BM25");
    expect(bm25).not.toContain("mate-selection");
    const mcp = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does MCP do at Harry?") }],
      "",
      "What does MCP do at Harry?",
    );
    expect(mcp).toContain("MCP");
    expect(mcp).not.toContain("mate-selection");
    const kernel = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is a Shared Ancestor Compatibility Kernel?") }],
      "",
      "What is a Shared Ancestor Compatibility Kernel?",
    );
    expect(kernel).toContain("ensemble");
    expect(kernel).toContain("Kernel");
    const nicking = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Bayesian nicking?") }],
      "",
      "What is Bayesian nicking?",
    );
    expect(nicking).toContain("Bayesian nicking");
    expect(nicking).toContain("ensemble");
    const confidence = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is a confidence gate?") }],
      "",
      "What is a confidence gate?",
    );
    expect(confidence).toContain("confidence");
    const surveeIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Survee?") }],
      "",
      "What is Survee?",
    );
    expect(surveeIs).toContain("interview tool");
    expect(surveeIs).toContain("KQA");
    expect(surveeIs).toContain("MongoDB");
    const triageIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the clinical triage response?") }],
      "",
      "What is the clinical triage response?",
    );
    expect(triageIs).toContain("Whisper");
    expect(triageIs).toContain("Qwen-VL");
    expect(triageIs).toContain("MIMIC-IV");
    expect(triageIs).toContain("medication-delivery");
    const labFunded = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Was the lab Swinburne-funded?") }],
      "",
      "Was the lab Swinburne-funded?",
    );
    expect(labFunded).toContain("Swinburne-funded");
    const quotientProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Quotient?") }],
      "",
      "What is Quotient?",
    );
    expect(quotientProduct).toContain("recorded meeting");
    expect(quotientProduct).toContain("moment");
    expect(quotientProduct).toContain("held for review");
    expect(quotientProduct).toContain("not a deployed product");
    const coachProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is WritingJourney?") }],
      "",
      "What is WritingJourney?",
    );
    expect(coachProduct).toContain("Hai Au");
    expect(coachProduct).toContain("scores a submission");
    expect(coachProduct).toContain("stays in control");
    const forecastProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the S&P 500 forecast?") }],
      "",
      "What is the S&P 500 forecast?",
    );
    expect(forecastProduct).toContain("multi-horizon");
    expect(forecastProduct).toContain("FinBERT");
    expect(forecastProduct).toContain("Kafka");
    const adhdProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is ADHD Assistant?") }],
      "",
      "What is ADHD Assistant?",
    );
    expect(adhdProduct).toContain("Nvidia NIM");
    expect(adhdProduct).toContain("voice or text");
    expect(adhdProduct).not.toContain("user count");
    const twinProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the Ericsson 5G digital twin?") }],
      "",
      "What is the Ericsson 5G digital twin?",
    );
    expect(twinProduct).toContain("predictive-maintenance");
    expect(twinProduct).toContain("tower telemetry");
    expect(twinProduct).toContain("not a named live");
    expect(twinProduct).toContain("C#");
    const faceCards = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Hugging Face models?") }],
      "",
      "What is Hugging Face models?",
    );
    expect(faceCards).toContain("MNIST");
    expect(faceCards).toContain("Public datasets");
    expect(faceCards).toContain("huggingface.co/khoaliamle");
    expect(faceCards).toContain("not a production release");
    const pedigreeProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the pedigree project?") }],
      "",
      "What is the pedigree project?",
    );
    expect(pedigreeProduct).toContain("mate-selection");
    expect(pedigreeProduct).toContain("matrix factorization");
    expect(pedigreeProduct).toContain("64-dimensional");
    const pedigreeTools = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the pedigree project use?") }],
      "",
      "What did the pedigree project use?",
    );
    expect(pedigreeTools).toContain("matrix factorization");
    expect(pedigreeTools).toContain("64-dimensional");
    expect(pedigreeTools).not.toContain("40 percent");
    const axisProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Axis?") }],
      "",
      "What is Axis?",
    );
    expect(axisProduct).toContain("separate product");
    expect(axisProduct).toContain("preview");
    expect(axisProduct).toContain("approve");
    expect(axisProduct).toContain("does not own");
    const axionProduct = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Axion?") }],
      "",
      "What is Axion?",
    );
    expect(axionProduct).toContain("approve");
    expect(axionProduct).toContain("does not own");
    expect(axionProduct).toContain("AI vision");
    const workflowIs = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is the Axion workflow?") }],
      "",
      "What is the Axion workflow?",
    );
    expect(workflowIs).toContain("startup scouting");
    expect(workflowIs).toContain("export does not send");
    expect(workflowIs).toContain("does not send email");
    const mizcoRole = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Mizco?") }],
      "",
      "What is Mizco?",
    );
    expect(mizcoRole).toContain("vLLM");
    expect(mizcoRole).toContain("50 percent");
    const poptechIdentity = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is PopTech?") }],
      "",
      "What is PopTech?",
    );
    expect(poptechIdentity).toContain("XGBoost");
    expect(poptechIdentity).toContain("TFT");
    const inetRole = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is iNet?") }],
      "",
      "What is iNet?",
    );
    expect(inetRole).toContain("Obsei");
    const medswinRole = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is MedSwin?") }],
      "",
      "What is MedSwin?",
    );
    expect(medswinRole).toContain("Swinburne-funded");
    expect(medswinRole).toContain("86 percent");
    const harryIdentity = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is Harry the Hirer?") }],
      "",
      "What is Harry the Hirer?",
    );
    expect(harryIdentity).toContain("Azure");
    expect(harryIdentity).toContain("40 percent");
    expect(harryIdentity).toContain("event inventory");
    const triageModels = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What models does the clinical triage use?") }],
      "",
      "What models does the clinical triage use?",
    );
    expect(triageModels).toContain("Gemini");
    expect(triageModels).toContain("Qwen-VL");
    expect(triageModels).not.toContain("TimesFM");
    const prophetModels = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What models does Prophet use?") }],
      "",
      "What models does Prophet use?",
    );
    expect(prophetModels).toContain("TimesFM");
    expect(prophetModels).not.toContain("Free-router");
    const pedigreeModels = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What models does the pedigree engine use?") }],
      "",
      "What models does the pedigree engine use?",
    );
    expect(pedigreeModels).toContain("matrix factorization");
    expect(pedigreeModels).toContain("Dosage Theory");
    const golfModels = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What models does the golf scanner use?") }],
      "",
      "What models does the golf scanner use?",
    );
    expect(golfModels).toContain("YOLOv8");
    expect(golfModels).toContain("MNIST");
    expect(golfModels).toContain("Qwen2.5-VL");
    const insideHarry = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Does the pedigree project sit inside the Harry role?") }],
      "",
      "Does the pedigree project sit inside the Harry role?",
    );
    expect(insideHarry).toContain("March 2026");
    expect(insideHarry).toContain("December 2025");
    const labBuild = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he build at the Swinburne lab?") }],
      "",
      "What did he build at the Swinburne lab?",
    );
    expect(labBuild).toContain("LoRA");
    const exportSend = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the export send?") }],
      "",
      "What does the export send?",
    );
    expect(exportSend).toContain("export does not send");
    expect(exportSend).not.toContain("draft recipe");
    expect(medvietAbout).not.toMatch(/^The Hugging Face org is MedVietAI/);
    expect(fastApi).not.toContain("LoRA");
    expect(routePlan).not.toContain("Mandarin");
    expect(golfMeasure).not.toContain("Mandarin");
    const rosterStack = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What stack does the roster app use?") }],
      "",
      "What stack does the roster app use?",
    );
    expect(rosterStack).toContain("MariaDB");
    expect(rosterStack).not.toContain("Named tools");
    expect(overlap).toContain("December 2025");
    expect(overlap).toContain("August 2025");
    expect(archive.toLowerCase()).toContain("free-router");
    expect(ocr).not.toContain("Pydantic");
    const sold = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What products has he sold?") }],
      "",
      "What products has he sold?",
    );
    expect(sold).toContain("HA Manager");
    expect(sold).toContain("SkyLedge");
    const companies = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What companies has he worked for?") }],
      "",
      "What companies has he worked for?",
    );
    expect(companies).toContain("Axion Solutions");
    expect(companies).toContain("Harry the Hirer");
    expect(spoken).toContain("Mandarin");
    expect(cases).not.toContain("5 million");
    const synthetic = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How many synthetic cases does the MedSwin line cite?") }],
      "",
      "How many synthetic cases does the MedSwin line cite?",
    );
    expect(synthetic).toContain("5 million");
    expect(synthetic).not.toContain("500,000");
    expect(medswinText).toContain("MedMCQA");
    expect(medswinText).not.toContain("5 million");
    expect(medswinText).not.toContain("most downloaded");
    expect(medswinText).toContain("July 2026");
    expect(medswinText.split(/\s+/).length).toBeLessThan(80);
    const pedigree = profile.sections.find((item) => item.sectionId === "role-harry-pedigree");
    const pedigreeText = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: pedigree?.text ?? "" }] } }],
      pedigree?.text ?? "",
      "What did the mate-selection engine use?",
    );
    expect(pedigreeText).toContain("Black Caviar");
    const golf = profile.sections.find((item) => item.sectionId === "project-golf");
    const golfText = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: golf?.text ?? "" }] } }],
      golf?.text ?? "",
      "What did the golf app sell to?",
    );
    expect(golfText).toContain("VHandicap");
    expect(golfText.split(/(?<=[.!])\s+/)[0]).toMatch(/sold/i);
    const axion = profile.sections.find((item) => item.sectionId === "role-axion");
    const mixed = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: axion?.text ?? "" }, { text: harry?.text ?? "" }] } }],
      axion?.text ?? "",
      "At Harry the Hirer, what did the pilot cut?",
    );
    expect(mixed).toContain("40 percent");
    expect(mixed).not.toContain("preview");
    const broad = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: { found: true, sections: [{ text: "CVA is the only named live app. A sale is not a production release." }] } }],
      "CVA is the only named live app. Would you like the live app?",
      "What has he shipped?",
    );
    expect(broad).toContain("CVA");
    expect(broad).toContain("Would you like the live app?");
    const before = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do before Axion?") }],
      "",
      "What did he do before Axion?",
    );
    const after = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do after Harry the Hirer?") }],
      "",
      "What did he do after Harry the Hirer?",
    );
    const survey = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the survey tool store answers in?") }],
      "",
      "What does the survey tool store answers in?",
    );
    expect(before.split(/(?<=[.!])\s+/)[0]).toContain("Harry the Hirer");
    expect(after).toContain("Axion");
    expect(survey.split(/(?<=[.!])\s+/)[0]).toBe("Survee.");
    expect(survey).toContain("MongoDB");
    expect(survey).not.toContain("Medical-Chatbot");
    const golfOcr = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What OCR did the scorecard use?") }],
      "",
      "What OCR did the scorecard use?",
    );
    const stayed = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where do Survee answers stay?") }],
      "",
      "Where do Survee answers stay?",
    );
    const stack = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is in his stack?") }],
      "",
      "What is in his stack?",
    );
    expect(golfOcr.split(/(?<=[.!])\s+/)[0]).toContain("VietOCR");
    expect(stayed).toContain("MongoDB");
    expect(stack).toContain("Python");
    const corrections = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What checks the handwritten corrections?") }],
      "",
      "What checks the handwritten corrections?",
    );
    const bought = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Who bought the roster app?") }],
      "",
      "Who bought the roster app?",
    );
    expect(corrections).toContain("Qwen");
    expect(bought).toContain("MJ Industrial");
    const vision = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What vision model checks the scorecard handwriting?") }],
      "",
      "What vision model checks the scorecard handwriting?",
    );
    const hardware = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did SkyLedge run on?") }],
      "",
      "What did SkyLedge run on?",
    );
    const signals = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "How many signals does the pedigree ensemble use?") }],
      "",
      "How many signals does the pedigree ensemble use?",
    );
    expect(vision.split(/(?<=[.!])\s+/)[0]).toContain("Qwen");
    const exportRecipe = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the export recipe refuse to do?") }],
      "",
      "What did the export recipe refuse to do?",
    );
    const draft = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does the draft recipe refuse to send?") }],
      "",
      "What does the draft recipe refuse to send?",
    );
    expect(exportRecipe.split(/(?<=[.!])\s+/)[0]).toContain("does not send a message");
    expect(draft.split(/(?<=[.!])\s+/)[0]).toContain("does not send email");
    expect(hardware).toContain("Raspberry");
    expect(signals).toContain("10-signal");
    const embeddings = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the mate-selection engine use for embeddings?") }],
      "",
      "What did the mate-selection engine use for embeddings?",
    );
    const ericsson = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Is the Ericsson build a named live customer app?") }],
      "",
      "Is the Ericsson build a named live customer app?",
    );
    expect(embeddings).toContain("64-dimensional");
    const poptech = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did PopTech use for the electricity forecast?") }],
      "",
      "What did PopTech use for the electricity forecast?",
    );
    const manager = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What student platform did Hai Au sell?") }],
      "",
      "What student platform did Hai Au sell?",
    );
    expect(poptech).toContain("TFT");
    const alta = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did Alta Media operate?") }],
      "",
      "What did Alta Media operate?",
    );
    const inet = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did iNet use for the news pipeline?") }],
      "",
      "What did iNet use for the news pipeline?",
    );
    const traces = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Axis use for traces?") }],
      "",
      "What does Axis use for traces?",
    );
    const meter = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the water meter reduce?") }],
      "",
      "What did the water meter reduce?",
    );
    expect(alta).toContain("Kubernetes");
    const surveeRepo = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What repository holds the Survee code?") }],
      "",
      "What repository holds the Survee code?",
    );
    const golfDetect = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the golf scanner detect on the card?") }],
      "",
      "What did the golf scanner detect on the card?",
    );
    expect(surveeRepo).toContain("Lelekhoa1812/survee");
    const opencv = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did OpenCV do at Nam A Bank?") }],
      "",
      "What did OpenCV do at Nam A Bank?",
    );
    const altaWork = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Alta Media?") }],
      "",
      "What did he do at Alta Media?",
    );
    expect(opencv).toContain("OpenCV");
    const nam = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at Nam A Bank?") }],
      "",
      "What did he do at Nam A Bank?",
    );
    expect(nam).toContain("VietOCR");
    expect(nam).toContain("REST");
    expect(nam).toContain("2024");
    expect(nam).toContain("2023");
    const vietdan = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do at VietDan?") }],
      "",
      "What did he do at VietDan?",
    );
    expect(vietdan).toContain("10,000");
    const retrieval = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What retrieval does Harry use?") }],
      "",
      "What retrieval does Harry use?",
    );
    const validators = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did validators check at Harry?") }],
      "",
      "What did validators check at Harry?",
    );
    expect(retrieval).toContain("BM25");
    const docker = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "Where do the Harry services run?") }],
      "",
      "Where do the Harry services run?",
    );
    const coach = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did the writing coach plan?") }],
      "",
      "What did the writing coach plan?",
    );
    const refuse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Survee refuse to do?") }],
      "",
      "What does Survee refuse to do?",
    );
    expect(docker.split(/(?<=[.!])\s+/)[0]).toContain("Docker");
    const documents = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What reads the Mizco documents?") }],
      "",
      "What reads the Mizco documents?",
    );
    expect(documents).toContain("PDF");
    const prophet = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What forecast model does Prophet use?") }],
      "",
      "What forecast model does Prophet use?",
    );
    expect(prophet).toContain("TimesFM");
    const anomaly = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Ericsson use for anomaly detection?") }],
      "",
      "What does Ericsson use for anomaly detection?",
    );
    expect(anomaly.split(/(?<=[.!])\s+/)[0]).toContain("autoencoder");
    const measured = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does he measure after a model is live?") }],
      "",
      "What does he measure after a model is live?",
    );
    expect(measured).toContain("35 percent");
    expect(measured).toContain("10,000");
    expect(measured).toContain("Jetson");
    const afterHarry = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did he do after Harry the Hirer?") }],
      "",
      "What did he do after Harry the Hirer?",
    );
    expect(afterHarry).toContain("owns");
    const langsmith = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does LangSmith cover at Axion?") }],
      "",
      "What does LangSmith cover at Axion?",
    );
    expect(langsmith).toContain("traces");
    const gates = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What approval gates govern Axion execution?") }],
      "",
      "What approval gates govern Axion execution?",
    );
    expect(gates).toContain("audit trails");
    const notOwn = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What does Axis not own?") }],
      "",
      "What does Axis not own?",
    );
    expect(notOwn).toContain("does not own");
    expect(notOwn).toContain("database");
    expect(gates).not.toContain("message drafting");
    expect(langsmith).not.toContain("delivery scheduling");
    expect(afterHarry).toContain("Axis");
    expect(coach).toContain("rewrite");
    expect(refuse).toContain("does not score");
    expect(validators).toContain("evidence");
    expect(vietdan).toContain("AWS IoT");
    const aitc = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What did AITC build?") }],
      "",
      "What did AITC build?",
    );
    expect(aitc).toContain("industrial assistant");
    expect(altaWork).toContain("Kubernetes");
    expect(golfDetect).toContain("YOLOv8");
    expect(inet).toContain("Obsei");
    expect(traces).toContain("LangSmith");
    expect(meter).toContain("35 percent");
    expect(manager).toContain("HA Manager");
    expect(ericsson).toContain("not a named live customer app");
  });

  it("keeps the model sentence when a tool found a section", () => {
    const text = displayAnswer(
      [{ type: "tool-read_section", state: "output-available", output: { found: true, sectionId: "role-axion", text: "Axion Solutions. AI Software Engineer." } }],
      "Liam is a AI Software Engineer at Axion Solutions.",
    );
    expect(text).toBe("Liam is a AI Software Engineer at Axion Solutions.");
  });
});
