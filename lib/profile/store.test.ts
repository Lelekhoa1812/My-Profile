import { describe, expect, it } from "vitest";
import profile from "../../content/profile.json";
import { withArchive } from "./archive";
import { asksForTitle, listSections, lookupFacts, readSection, searchSections } from "./store";

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

  it("answers a queue question from the S&P data path", () => {
    const result = searchSections(profile.sections, "What queue does it use?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("project-sp500");
      expect(result.sections[0]?.text).toContain("Apache Kafka");
    }
  });

  it("treats a current title question as the public title", () => {
    expect(asksForTitle("What is his current title?")).toBe(true);
    expect(asksForTitle("What was his title at Harry the Hirer?")).toBe(false);
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

  it("answers a short model-write question from the same approval", () => {
    const result = searchSections(profile.sections, "What will he not let a model write?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("role-axion");
      expect(result.sections[0]?.text).toContain("approve a write");
    }
  });

  it("answers a build-with-tool question from the sections that name the tool", () => {
    const fastapi = searchSections(profile.sections, "What did he build with FastAPI?");
    const docker = searchSections(profile.sections, "What did he build with Docker?");
    const kubernetes = searchSections(profile.sections, "What did he build with Kubernetes?");
    expect(fastapi.found).toBe(true);
    expect(docker.found).toBe(true);
    expect(kubernetes.found).toBe(true);
    if (fastapi.found) expect(fastapi.sections[0]?.sectionId).toBe("role-harry-senior");
    if (docker.found) expect(docker.sections.map((section) => section.sectionId)).toEqual(["role-harry-senior", "role-alta"]);
    if (kubernetes.found) expect(kubernetes.sections[0]?.sectionId).toBe("role-alta");
    const kafka = searchSections(profile.sections, "What did he build with Kafka?");
    expect(kafka.found).toBe(true);
    if (kafka.found) {
      expect(kafka.sections.some((section) => section.text.includes("Kafka"))).toBe(true);
      expect(kafka.sections[0]?.sectionId).not.toBe("project-axion-workflows");
    }
  });

  it("answers a pedigree leakage question from the pedigree role", () => {
    const result = searchSections(profile.sections, "What does the pedigree guard against?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("role-harry-pedigree");
      expect(result.sections[0]?.text).toContain("leakage");
    }
  });

  it("answers a Free Router share question from the gateway", () => {
    const result = searchSections(profile.sections, "What does Free Router share?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("project-router");
  });

  it("answers a founder-email question from the workflow recipe", () => {
    const result = searchSections(profile.sections, "Who receives the founder email?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("project-axion-workflows");
  });

  it("answers a named-live-app question from the Ericsson twin and the live app", () => {
    const result = searchSections(profile.sections, "What is not a named live app?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.map((section) => section.sectionId)).toEqual(["project-ericsson", "project-shipped"]);
  });

  it("answers a named-public-app question from the water-meter scanner", () => {
    const result = searchSections(profile.sections, "What is not a named public app?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("project-meter");
  });

  it("answers a production-release question from the sale and the public Space", () => {
    const result = searchSections(profile.sections, "What is not a production release?");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections.map((section) => section.sectionId)).toEqual(["project-shipped", "project-hf-models"]);
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
    const purchaser = searchSections(profile.sections, "Who is the purchaser of the golf app?");
    expect(purchaser.found && purchaser.sections[0]?.sectionId).toBe("project-golf");
    expect(purchaser.found && purchaser.sections[0]?.text).toContain("VHandicap");
    const golf = searchSections(profile.sections, "What did the golf app sell to?");
    expect(golf.found && golf.sections[0]?.sectionId).toBe("project-golf");
    expect(golf.found && golf.sections[0]?.text).toContain("VHandicap");
    const intro = searchSections(profile.sections, "Introduce him.");
    expect(intro.found && intro.sections[0]?.sectionId).toBe("role-axion");
    const job = searchSections(profile.sections, "What is his job now?");
    expect(job.found && job.sections[0]?.sectionId).toBe("role-axion");
    const pilot = searchSections(profile.sections, "What did the pilot keep running?");
    expect(pilot.found && pilot.sections[0]?.sectionId).toBe("role-harry-senior");
    const academy = searchSections(profile.sections, "What student platform did Hai Au sell?");
    expect(academy.found && academy.sections[0]?.sectionId).toBe("role-hai-au");
    expect(academy.found && academy.sections[0]?.text).toContain("HA Manager");
    const ericsson = searchSections(profile.sections, "Is the Ericsson build a named live customer app?");
    expect(ericsson.found && ericsson.sections[0]?.sectionId).toBe("project-ericsson");
    expect(ericsson.found && ericsson.sections[0]?.text).toContain("not a named live customer app");
    const skyledge = searchSections(profile.sections, "Who acquired the SkyLedge project?");
    expect(skyledge.found && skyledge.sections[0]?.sectionId).toBe("project-skyledge");
    expect(skyledge.found && skyledge.sections[0]?.text).toContain("Kenya");
    const sold = searchSections(profile.sections, "Which products were sold?");
    expect(sold.found).toBe(true);
    if (sold.found) {
      const ids = sold.sections.map((section) => section.sectionId);
      expect(ids).toEqual(expect.arrayContaining(["project-writing", "project-roster", "project-golf"]));
    }
  });

  it("opens the proof for the three employer questions", () => {
    const live = searchSections(profile.sections, "At Axion, what does Axis show before a write?");
    const meter = searchSections(profile.sections, "At Harry the Hirer, what did the pilot cut?");
    const write = searchSections(profile.sections, "At MedSwin, what BERTScore did the lab record?");
    const research = searchSections(profile.sections, "What research did he study at Swinburne?");
    const earlier = searchSections(profile.sections, "What did he build for Harry the Hirer before the senior role?");
    expect(live.found && live.sections[0]?.sectionId).toBe("role-axion");
    expect(live.found && live.sections[0]?.text).toContain("shows a preview");
    expect(meter.found && meter.sections[0]?.sectionId).toBe("role-harry-senior");
    expect(meter.found && meter.sections[0]?.text).toContain("40 percent");
    expect(write.found && write.sections[0]?.sectionId).toBe("role-swinburne-research");
    expect(write.found && write.sections[0]?.text).toContain("BERTScore");
    expect(research.found && research.sections.some((section) => section.sectionId === "role-swinburne-research")).toBe(true);
    expect(earlier.found && earlier.sections[0]?.sectionId).toBe("role-harry-pedigree");
    const prior = searchSections(profile.sections, "What did he do before Harry the Hirer?");
    expect(prior.found && prior.sections[0]?.sectionId).toBe("role-aitc");
    const axionWhisper = searchSections(profile.sections, "At Axion, what does he use for whisper?");
    expect(axionWhisper.found && axionWhisper.sections[0]?.sectionId).toBe("role-axion");
    const vietdanKafka = searchSections(profile.sections, "At VietDan, what does he use for kafka?");
    expect(vietdanKafka.found && vietdanKafka.sections.every((section) => section.sectionId.includes("vietdan"))).toBe(true);
    const rosterForecast = searchSections(profile.sections, "What does it forecast for the roster app?");
    expect(rosterForecast.found && rosterForecast.sections.every((section) => section.sectionId === "project-roster")).toBe(true);
    const studioDraft = searchSections(profile.sections, "What does it draft for stt-studio?");
    expect(studioDraft.found && studioDraft.sections[0]?.sectionId).toBe("project-stt");
    const thoroughbred = searchSections(profile.sections, "At Harry, what is thoroughbred?");
    expect(thoroughbred.found && thoroughbred.sections[0]?.sectionId).toBe("role-harry-pedigree");
    expect(prior.found && prior.sections.some((section) => section.sectionId === "role-harry-pedigree")).toBe(false);
    const beforeAxion = searchSections(profile.sections, "What did he do before Axion?");
    const afterHarry = searchSections(profile.sections, "What did he do after Harry the Hirer?");
    const beforeMizco = searchSections(profile.sections, "What did he do before Mizco?");
    const beforePedigree = searchSections(profile.sections, "Where did he work before the pedigree project?");
    expect(beforeAxion.found && beforeAxion.sections[0]?.sectionId).toBe("role-harry-senior");
    expect(afterHarry.found && afterHarry.sections[0]?.sectionId).toBe("role-axion");
    expect(beforeMizco.found && beforeMizco.sections[0]?.sectionId).toBe("role-aitc");
    expect(beforePedigree.found && beforePedigree.sections[0]?.sectionId).toBe("role-harry-senior");
    const axion = searchSections(profile.sections, "What LangGraph engine does he run at Axion?");
    const harry = searchSections(profile.sections, "What agents did he use at Harry?");
    expect(axion.found && axion.sections.some((section) => section.sectionId === "role-harry-senior")).toBe(false);
    expect(harry.found && harry.sections.some((section) => section.sectionId === "role-swinburne-research")).toBe(false);
    const salle = searchSections(withArchive(profile.sections), "What did Sall-e detect?");
    const roster = searchSections(withArchive(profile.sections), "What did the roster app use for payroll?");
    expect(salle.found && salle.sections[0]?.sectionId).toBe("project-salle");
    expect(roster.found && roster.sections[0]?.sectionId).toBe("project-roster");
    const pop = searchSections(profile.sections, "What did he forecast at PopTech?");
    const triage = searchSections(profile.sections, "What drone does the clinical triage response use?");
    expect(pop.found && pop.sections[0]?.text).toContain("XGBoost");
    expect(triage.found && triage.sections[0]?.text).toContain("Great Shark");
    const estate = searchSections(profile.sections, "What does EstateFolio forecast for Hanoi?");
    const nam = searchSections(profile.sections, "What synthetic passports did he build at Nam A Bank?");
    expect(estate.found && estate.sections[0]?.text).toContain("ST-GNN");
    expect(nam.found && nam.sections[0]?.sectionId).toBe("role-nam-a-ai");
    const prophet = searchSections(profile.sections, "What does Prophet use to forecast a spreadsheet?");
    const ericsson = searchSections(profile.sections, "What stack does the Ericsson digital twin use?");
    expect(prophet.found && prophet.sections[0]?.text).toContain("TimesFM");
    expect(ericsson.found && ericsson.sections[0]?.text).toContain("ONNX");
    const hai = searchSections(profile.sections, "What percent did Hai Au cut?");
    expect(hai.found && hai.sections[0]?.sectionId).toBe("role-hai-au");
    expect(hai.found && hai.sections.some((section) => section.sectionId === "role-harry-senior")).toBe(false);
    expect(hai.found && hai.sections.some((section) => section.sectionId === "role-axion")).toBe(false);
    const stack = searchSections(profile.sections, "What is in his stack?");
    expect(stack.found && stack.sections[0]?.sectionId).toBe("skills");
    expect(stack.found && stack.sections[0]?.text).toContain("Python");
    const harryStack = searchSections(profile.sections, "What is in his stack at Harry the Hirer?");
    expect(harryStack.found && harryStack.sections[0]?.sectionId).toBe("role-harry-senior");
    const survey = searchSections(profile.sections, "What does the survey tool store answers in?");
    expect(survey.found && survey.sections[0]?.sectionId).toBe("project-survee");
    expect(survey.found && survey.sections[0]?.text).toContain("MongoDB");
    const hanoi = searchSections(profile.sections, "What graph does the Hanoi forecast use?");
    expect(hanoi.found && hanoi.sections[0]?.sectionId).toBe("project-estatefolio");
    expect(hanoi.found && hanoi.sections[0]?.text).toContain("ST-GNN");
    expect(hanoi.found && hanoi.sections.some((section) => section.sectionId === "project-sp500")).toBe(false);
    const pilot = searchSections(profile.sections, "What did the pilot cut?");
    expect(pilot.found && pilot.sections[0]?.sectionId).toBe("role-harry-senior");
    expect(pilot.found && pilot.sections[0]?.text).toContain("40 percent");
    const mate = searchSections(profile.sections, "What did the mate-selection engine use?");
    expect(mate.found && mate.sections[0]?.sectionId).toBe("role-harry-pedigree");
    expect(mate.found && mate.sections[0]?.text).toContain("Black Caviar");
    const water = searchSections(profile.sections, "What did the water meter cut?");
    expect(water.found && water.sections.map((section) => section.sectionId)).toEqual(["project-meter", "role-vietdan-ml"]);
  });

  it("opens the degree when the question asks where he studied", () => {
    const result = searchSections(profile.sections, "Where did he study?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("education-swinburne");
  });

  it("leaves a home-city question for the location fact", () => {
    expect(searchSections(profile.sections, "Where does he live?").found).toBe(false);
  });

  it("finds the live app when the question asks where CVA is live", () => {
    const result = searchSections(profile.sections, "Where is CVA live?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections.some((section) => section.sectionId === "project-cva" || section.sectionId === "project-shipped")).toBe(true);
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
      expect(flow.text).toContain("not capital-markets products");
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

  it("does not answer an unknown tool from the current role", () => {
    expect(searchSections(profile.sections, "What does he use Terraform for?")).toEqual({ found: false });
  });

  it("matches a summary question to the recorded spelling", () => {
    const result = searchSections(profile.sections, "What does he summarize?");
    expect(result.found).toBe(true);
    if (result.found) expect(result.sections[0]?.sectionId).toBe("role-inet");
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
      expect(section?.text).toContain("not a named live customer app");
    }
  });

  it("keeps the water-meter deployment off the public app list", () => {
    const result = searchSections(profile.sections, "water meter scanner productionized");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.sections[0]?.sectionId).toBe("project-meter");
      expect(result.sections[0]?.text).toContain("productionized");
      expect(result.sections[0]?.text).toContain("not a named public app");
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

  it("opens the S&P drift check before the PopTech sensor check", () => {
    const result = searchSections(profile.sections, "What drift check does the S&P project use?");
    expect(result.found && result.sections[0]?.sectionId).toBe("project-sp500");
    expect(result.found && result.sections[0]?.text).toContain("retrain");
  });

  it("opens the CVA approval before the archive card", () => {
    const result = searchSections(withArchive(profile.sections), "What does CVA wait for before a write?");
    expect(result.found && result.sections[0]?.sectionId).toBe("project-cva");
    expect(result.found && result.sections[0]?.text).toContain("a person approves it");
    expect(result.found && result.sections.some((section) => section.sectionId.startsWith("archive-"))).toBe(false);
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
