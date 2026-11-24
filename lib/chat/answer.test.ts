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
    expect(databases).not.toContain("does not own");
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
    expect(qwenUse).toContain("Qwen");
    const yoloUse = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is YOLO used for?") }],
      "",
      "What is YOLO used for?",
    );
    expect(yoloUse).toContain("YOLO");
    const fastApi = displayAnswer(
      [{ type: "tool-search_sections", state: "output-available", output: searchSections(profile.sections, "What is FastAPI used for?") }],
      "",
      "What is FastAPI used for?",
    );
    expect(fastApi).toContain("FastAPI");
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
