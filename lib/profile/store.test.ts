import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { listSections, lookupFacts, readSection, searchSections } from "./store";

describe("profile store", () => {
  it("attributes the experience span to the resume summary", () => {
    const result = lookupFacts(profile.facts, { key: "experience" });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.facts[0]?.value).toContain("resume summary");
      expect(result.facts[0]?.value).toContain("4 years");
      expect(result.facts[0]?.value).toContain("3 years");
    }
  });

  it("returns a resume contact fact by key", () => {
    const result = lookupFacts(profile.facts, { key: "email" });
    expect(result.found).toBe(true);
    if (result.found) expect(result.facts[0]?.value).toBe("liamkl.work@gmail.com");
  });

  it("keeps contact, place, degree, and languages on fact lookup", () => {
    for (const key of ["phone", "location", "degree", "languages"]) {
      const result = lookupFacts(profile.facts, { key });
      expect(result.found, key).toBe(true);
    }
    expect(searchSections(profile.sections, "what is his email")).toEqual({ found: false });
    expect(searchSections(profile.sections, "what is his phone number")).toEqual({ found: false });
    const workflow = searchSections(profile.sections, "does the workflow send email");
    expect(workflow.found).toBe(true);
    if (workflow.found) expect(workflow.sections.some((section) => section.sectionId === "project-axion-workflows")).toBe(true);
  });

  it("does not return every fact when the kind is absent", () => {
    const result = lookupFacts(profile.facts, { kind: "role" });
    expect(result.found).toBe(false);
  });

  it("resolves the current title when the key and the kind are both off", () => {
    const result = lookupFacts(profile.facts, { key: "current_title", kind: "role" });
    expect(result.found).toBe(true);
    if (result.found) expect(result.facts[0]?.value).toBe("AI Software Engineer");
  });

  it("names public datasets and does not call a Space a release", () => {
    const result = searchSections(profile.sections, "Hugging Face datasets");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("project-hf-models");
      expect(result.sections[0]?.text).toContain("synthetic passport set");
      expect(result.sections[0]?.text).toContain("A public Space is not a production release.");
      expect(result.sections[0]?.text).not.toContain("1,373");
    }
  });

  it("names prompt-me without a production claim", () => {
    const result = searchSections(profile.sections, "What is prompt-me?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("project-public-code");
      expect(result.sections[0]?.text).toContain("no production claim");
      expect(result.sections[0]?.text).toContain("prompt-me");
    }
  });

  it("answers a live-model measure question from the live app and the recorded outcome", () => {
    const result = searchSections(profile.sections, "What does he measure after a model is live?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections.map((section) => section.sectionId)).toEqual(["project-meter", "project-cva", "project-shipped"]);
      expect(result.sections[0]?.text).toContain("35 percent");
      expect(result.sections[1]?.text).toContain("a person approves it");
    }
  });

  it("answers a write-approval question from the job and the live app", () => {
    const result = searchSections(profile.sections, "What will he not let a model write without a person?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections.map((section) => section.sectionId)).toEqual(["role-axion", "project-cva", "project-writing"]);
      expect(result.sections[0]?.text).toContain("approve a write");
    }
  });

  it("answers a ship-to-production question from the shipped-work section", () => {
    const result = searchSections(profile.sections, "What does he ship to production?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("project-shipped");
      expect(result.sections[0]?.text).toContain("not a production release");
    }
  });

  it("does not replace a named past role with the current title", () => {
    const result = searchSections(profile.sections, "What was his title at Harry the Hirer?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).not.toBe("role-axion");
      expect(result.sections.some((section) => section.sectionId === "role-harry-senior")).toBe(true);
    }
  });

  it("finds the section an employer names", () => {
    const questions: Array<[string, string]> = [
      ["What did he do at Mizco?", "role-mizco"],
      ["What is Teqar?", "role-teqar"],
      ["What is MedSwin?", "project-medswin"],
      ["What is CVA?", "project-cva"],
      ["Was SkyLedge acquired?", "project-skyledge"],
      ["What is the Ericsson project?", "project-ericsson"],
      ["What is free-router?", "project-router"],
      ["What is the ADHD assistant?", "project-adhd"],
      ["What did he do at Pythera?", "role-pythera"],
      ["What is Codoptic?", "project-codoptic"],
      ["What is Sall-e?", "project-salle"],
      ["What is the golf scorecard scanner?", "project-golf"],
      ["What is the roster app?", "project-roster"],
      ["What is Quotient?", "project-quotient"],
      ["What is Survee?", "project-survee"],
      ["What is Prophet?", "project-prophet"],
      ["What is stt-studio?", "project-stt"],
      ["What is Acnt-MCP?", "project-acnt"],
      ["What is MedVietAI?", "project-medvietai"],
      ["What is the clinical triage project?", "project-triage"],
      ["What is MedChat?", "project-medchat"],
      ["What is EstateFolio?", "project-estatefolio"],
      ["What is the S&P 500 forecast?", "project-sp500"],
      ["What is the passport OCR project?", "project-passport"],
      ["What did he do at Alta Media?", "role-alta"],
      ["What did he do at PopTech?", "role-poptech"],
      ["What did he do at iNet?", "role-inet"],
      ["What did he do at AITC?", "role-aitc"],
      ["What did he do at Hai Au Academy?", "role-hai-au"],
      ["What did he do at Tien Thanh?", "role-tien-thanh"],
    ];
    const misses = questions.flatMap(([query, sectionId]) => {
      const result = searchSections(profile.sections, query);
      const hit = result.found && result.sections.some((section) => section.sectionId === sectionId);
      return hit ? [] : [`${query} -> ${result.found ? result.sections.map((section) => section.sectionId).join(",") : "miss"}`];
    });
    expect(misses, misses.join(" | ")).toEqual([]);
  });

  it("returns both Nam A Bank jobs", () => {
    const result = searchSections(profile.sections, "What did he do at Nam A Bank?");
    expect(result.found).toBe(true);
    if (result.found) {
      const ids = result.sections.map((section) => section.sectionId);
      expect(ids).toContain("role-nam-a-ai");
      expect(ids).toContain("role-nam-a-software");
    }
  });

  it("opens the acquired work when the question asks about a sale", () => {
    const acquired = searchSections(profile.sections, "Did any product get acquired?");
    expect(acquired.found).toBe(true);
    if (acquired.found) {
      const ids = acquired.sections.map((section) => section.sectionId);
      expect(ids[0]).toBe("project-shipped");
      expect(ids).toContain("project-skyledge");
    }
    const sold = searchSections(profile.sections, "Which products were sold?");
    expect(sold.found).toBe(true);
    if (sold.found) {
      const ids = sold.sections.map((section) => section.sectionId);
      expect(ids).toEqual(expect.arrayContaining(["project-writing", "project-roster", "project-golf"]));
    }
  });

  it("opens the degree when the question asks where he studied", () => {
    const result = searchSections(profile.sections, "Where did he study?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("education-swinburne");
  });

  it("leaves a home-city question for the location fact", () => {
    expect(searchSections(profile.sections, "Where does he live?").found).toBe(false);
  });

  it("opens the current job when the question asks where he works now", () => {
    const result = searchSections(profile.sections, "Where does he work now, and what does a person approve?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("role-axion");
  });

  it("opens the current role and the shipped work when the question has no content words", () => {
    const result = searchSections(profile.sections, "Tell me about his work");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections.map((section) => section.sectionId)).toEqual(["role-axion", "project-shipped"]);
    }
  });

  it("reads the current job from a short role label", () => {
    const byRole = readSection(profile.sections, "Current role");
    const byAlias = readSection(profile.sections, "Axion");
    expect(byRole.found).toBe(true);
    expect(byAlias.found).toBe(true);
    if (byRole.found) expect(byRole.sectionId).toBe("role-axion");
    if (byAlias.found) expect(byAlias.sectionId).toBe("role-axion");
  });

  it("finds an approval question from the word approval", () => {
    const result = searchSections(profile.sections, "approval");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "role-axion")).toBe(true);
  });

  it("finds the current role when the question asks for the title", () => {
    const result = searchSections(profile.sections, "current title", "role");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("role-axion");
  });

  it("keeps the public title on the current resume role", () => {
    const result = lookupFacts(profile.facts, { key: "public_title" });
    expect(result.found).toBe(true);
    if (result.found) expect(result.facts[0]).toMatchObject({ label: "Current title", value: "AI Software Engineer" });
  });

  it("answers FoodFlow before the resume phrase for Axis", () => {
    const role = readSection(profile.sections, "Axion Solutions");
    const flow = readSection(profile.sections, "workflow engine");
    expect(role.found).toBe(true);
    expect(flow.found).toBe(true);
    if (role.found) {
      expect(role.text.indexOf("FoodFlow")).toBeLessThan(role.text.indexOf("capital-markets"));
      expect(role.text).toContain("does not rename FoodFlow");
    }
    if (flow.found) {
      expect(flow.text).toContain("does not call those recipes capital-markets products");
      expect(flow.text).toContain("saved persona");
      expect(flow.text).toContain("does not send email");
      expect(flow.text).toContain("does not send a message");
    }
  });

  it("reads a section by its heading as well as its id", () => {
    const result = readSection(profile.sections, "Axion Solutions");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sectionId).toBe("role-axion");
  });

  it("does not publish a download count for a public dataset", () => {
    for (const heading of ["Sall-e", "Passport OCR"]) {
      const section = readSection(profile.sections, heading);
      expect(section.found).toBe(true);
      if (section.found) expect(section.text).not.toMatch(/\d[\d,]* downloads/);
    }
  });

  it("reads one section from a unique heading phrase", () => {
    const hyphen = readSection(profile.sections, "shipped-work");
    expect(hyphen.found).toBe(true);
    if (hyphen.found) expect(hyphen.sectionId).toBe("project-shipped");
    expect(readSection(profile.sections, "axon-workflow-engine").found).toBe(false);
    const result = readSection(profile.sections, "workflow engine");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sectionId).toBe("project-axion-workflows");
  });

  it("refuses a heading phrase that matches two jobs", () => {
    expect(readSection(profile.sections, "Nam A Bank").found).toBe(false);
  });

  it("marks an empty section list as a miss", () => {
    expect(listSections(profile.sections, "writing")).toEqual({ found: false, sections: [] });
  });

  it("does not invent an employer that is absent", () => {
    expect(searchSections(profile.sections, "worked at Initech")).toEqual({ found: false });
  });

  it("finds the FoodFlow section from a paraphrase of the ERP", () => {
    const result = searchSections(profile.sections, "food distribution ERP");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("role-axion");
  });

  it("does not treat one shared word as a hit", () => {
    expect(searchSections(profile.sections, "leadership philosophy at the bank")).toEqual({ found: false });
  });

  it("finds the Ericsson digital twin from the resume", () => {
    const result = searchSections(profile.sections, "Ericsson 5G digital twin");
    expect(result.found).toBe(true);
    if (result.found) {
      const section = result.sections.find((item) => item.sectionId === "project-ericsson");
      expect(section?.text).toContain("production-grade");
      expect(section?.text).toContain("does not name it as a live customer app");
    }
  });

  it("keeps the water-meter deployment off the public app list", () => {
    const result = searchSections(profile.sections, "water meter scanner productionized");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("project-meter");
      expect(result.sections[0]?.text).toContain("productionized");
      expect(result.sections[0]?.text).toContain("does not name a public app");
    }
  });

  it("finds the writing coach sold to Hai Au Group", () => {
    const result = searchSections(profile.sections, "IELTS writing coach sold to Hai Au");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "project-writing")).toBe(true);
  });

  it("finds the MedVietAI sponsor named on the resume", () => {
    const result = searchSections(profile.sections, "National Data Association sponsor");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "project-medvietai")).toBe(true);
  });

  it("keeps a person in control of a CVA draft", () => {
    const result = readSection(profile.sections, "CVA");
    expect(result.found).toBe(true);
    if (result.found) expect(result.text).toContain("a person approves it");
  });

  it("keeps the SkyLedge cost figure as an estimate", () => {
    const result = searchSections(profile.sections, "SkyLedge capstone team");
    expect(result.found).toBe(true);
    if (result.found) {
      const hit = result.sections.find((section) => section.sectionId === "project-skyledge");
      expect(hit?.text).toContain("four-person");
      expect(hit?.text).toContain("estimate of about 15 percent");
    }
  });

  it("finds the S&P forecast without treating it as a published return", () => {
    const result = searchSections(profile.sections, "S&P 500 stock forecast");
    expect(result.found).toBe(true);
    if (result.found) {
      const hit = result.sections.find((section) => section.sectionId === "project-sp500");
      expect(hit?.text).toContain("does not include a return figure");
    }
  });

  it("finds Kafka and Agentforce from the resume skills list", () => {
    const kafka = searchSections(profile.sections, "does he use Kafka");
    const agentforce = searchSections(profile.sections, "does he use Salesforce Agentforce");
    expect(kafka.found).toBe(true);
    expect(agentforce.found).toBe(true);
    if (kafka.found) expect(kafka.sections.some((section) => section.text.includes("Kafka"))).toBe(true);
    if (agentforce.found) expect(agentforce.sections.some((section) => section.sectionId === "skills")).toBe(true);
  });

  it("finds MLflow and pgvector from the resume skills list", () => {
    const mlflow = searchSections(profile.sections, "does he use MLflow");
    const vectors = searchSections(profile.sections, "does he use pgvector");
    expect(mlflow.found).toBe(true);
    expect(vectors.found).toBe(true);
    if (mlflow.found) expect(mlflow.sections.some((section) => section.sectionId === "skills")).toBe(true);
    if (vectors.found) expect(vectors.sections.some((section) => section.sectionId === "skills")).toBe(true);
  });

  it("finds Kubernetes in the skills section", () => {
    const result = searchSections(profile.sections, "does he use Kubernetes");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "skills")).toBe(true);
  });

  it("finds the skills section from a language question", () => {
    const result = searchSections(profile.sections, "which languages does he speak");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "skills")).toBe(true);
  });
});
