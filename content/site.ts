export type Lane = "full-time" | "consulting" | "research";

export type Role = {
  id: string;
  sectionId?: string;
  employer: string;
  title: string;
  place: string | null;
  start: string;
  end: string | null;
  lane: Lane;
  outcome: string;
  overlap: string | null;
};

export type FlowStep = { label: string; note?: string; gate?: boolean };

export type Case = {
  id: string;
  sectionId: string;
  title: string;
  role: string;
  dates: string;
  place: string | null;
  problem: string;
  built: string[];
  result: { text: string; source: string } | null;
  also?: { text: string; source: string };
  stack: string[];
  flow: FlowStep[];
  image?: { src: string; alt: string };
  links: { label: string; href: string }[];
};

export type Project = {
  id: string;
  sectionId?: string;
  title: string;
  label: string;
  line: string;
  result?: string;
  image?: string;
  alt?: string;
  links: { label: string; href: string }[];
};

export const person = {
  name: "Dang Khoa Le",
  known: "Liam",
  title: "Senior AI Software Engineer",
  positioning: "I build production AI that retrieves evidence, drafts the next action, and waits for a person to approve the write.",
  intro:
    "Senior AI Software Engineer at Axion Solutions, based in Melbourne. Four years in software engineering, three in AI. The work that repeats is retrieval, document intelligence, agent workflows, and evaluation.",
  email: "liamkl.work@gmail.com",
  phone: "0450 445 373",
  phoneHref: "tel:+61450445373",
  location: "Melbourne, Australia",
  cv: "/cv/dang-khoa-le-cv.pdf",
  languages: ["Vietnamese, native", "English, fluent", "Mandarin, intermediate"],
  links: {
    github: "https://github.com/Lelekhoa1812",
    huggingface: "https://huggingface.co/khoaliamle",
    linkedin: "https://www.linkedin.com/in/dang-khoa-le-96a6332a8",
  },
};

export const starterQuestions = [
  "What can Axis change in FoodFlow, and what must a person approve first?",
  "Which measured result should I read first?",
  "Which roles overlap in 2025 and 2026, and which is current?",
  "How do the 500,000 MedSwin cases differ from the 5 million synthetic ones?",
];

export const cases: Case[] = [
  {
    id: "axis",
    sectionId: "role-axion",
    title: "Axis on FoodFlow",
    role: "Senior AI Software Engineer, Axion Solutions",
    dates: "Jul 2026 – now",
    place: null,
    problem: "An AI layer on a food-distribution system of record, where the model never owns the data.",
    built: [
      "FoodFlow is the multi-tenant ERP and the system of record: sales, purchasing, inventory, production, finance, and delivery. Axis is a separate product with Studio copilot, Data Insight, and Message Writer.",
      "Axis calls typed MCP tools on FoodFlow, shows a preview, and waits for a person to approve. Axis does not own the FoodFlow database.",
      "A LangGraph engine runs startup outreach, investor and persona search, and portfolio reporting, with LangSmith traces and approval gates.",
    ],
    result: null,
    stack: ["LangGraph", "LangChain", "LangSmith", "MCP", "OpenTelemetry"],
    flow: [
      { label: "Axis", note: "copilot" },
      { label: "Typed MCP tool" },
      { label: "Preview" },
      { label: "Person approves", gate: true },
      { label: "FoodFlow", note: "system of record" },
    ],
    links: [],
  },
  {
    id: "harry",
    sectionId: "role-harry-senior",
    title: "Event retrieval at Harry the Hirer",
    role: "Senior AI Engineer, Harry the Hirer",
    dates: "Dec 2025 – Jul 2026",
    place: "Melbourne",
    problem: "Inventory, logistics, planning, and documents needed answers a planner could check.",
    built: [
      "A multi-agent retrieval layer: Planner, Retriever, Verifier, Critic, and Tool-Executor agents, with human approval.",
      "Hybrid search with BM25 and HNSW, reranking, citation checks, and hallucination tests.",
      "OCR and document extraction, MCP adapters to ERP data, and validation suites.",
    ],
    result: { text: "~40% less repetitive lookup and drafting in targeted pilot workflows", source: "Resume, Senior AI Engineer bullet" },
    also: { text: "99.9% operational uptime on the OCR and validation suite", source: "Resume, OCR/IDP bullet" },
    stack: ["Azure AI Foundry", "LangGraph", "FastAPI", "BM25 + HNSW", "OCR/IDP", "MCP"],
    flow: [
      { label: "Planner" },
      { label: "Retriever", note: "BM25 + HNSW" },
      { label: "Verifier" },
      { label: "Critic" },
      { label: "Planner approves", gate: true },
    ],
    links: [],
  },
  {
    id: "mizco",
    sectionId: "role-mizco",
    title: "Trust-first RFQs at Mizco",
    role: "AI Team Lead, Mizco",
    dates: "Nov 2025 – Jun 2026",
    place: "Perth",
    problem: "RFQ text had to become industrial artefacts that staff could review in compliance-sensitive work.",
    built: [
      "A pipeline from unstructured RFQ corpora to governed industrial artefacts.",
      "Local models on vLLM with constrained JSON, tool calling, and human review.",
      "A Next.js cockpit with confidence gates, traces, and validation.",
    ],
    result: { text: "~50% less manual review and artefact preparation in targeted workflows", source: "Resume, Mizco AI Team Lead" },
    stack: ["vLLM", "FastAPI", "Next.js", "Constrained JSON", "OpenTelemetry", "RAG"],
    flow: [
      { label: "RFQ corpus" },
      { label: "vLLM", note: "constrained JSON" },
      { label: "Confidence gate" },
      { label: "Reviewer signs", gate: true },
      { label: "Artefact" },
    ],
    links: [],
  },
  {
    id: "medswin",
    sectionId: "project-medswin",
    title: "MedSwin clinical agents",
    role: "Researcher, Swinburne University of Technology",
    dates: "Aug 2025 – Jul 2026",
    place: "Melbourne",
    problem: "Clinical answers needed specialist agents, a cited source, and a score the lab could publish.",
    built: [
      "Led a five-person lab. Specialist agents for diagnostics, pharmacology, and triage under a reasoning orchestrator.",
      "Fine-tuned on more than 500,000 curated cases. A separate training line uses 5 million synthetic cases.",
      "Agentic RAG over EMR, EHR, and PubMed, with an 8 million document biomedical reranker.",
    ],
    result: { text: "86% BERTScore across MedMCQA, PubMedQA, and MedQuAD", source: "Resume, Swinburne Researcher and MedSwin project" },
    also: { text: "Selected releases were among Australia's most downloaded AI models in Nov–Dec 2025", source: "Resume, MedSwin project" },
    stack: ["LoRA/QLoRA", "Distillation", "Agentic RAG", "EMR/EHR", "PubMed", "Hugging Face"],
    flow: [
      { label: "Orchestrator" },
      { label: "Specialist agents", note: "diagnostics · pharmacology · triage" },
      { label: "Reranker", note: "8M documents" },
      { label: "Cited answer", gate: true },
    ],
    image: { src: "medswin.png", alt: "MedSwin model and dataset release page" },
    links: [{ label: "MedSwin on Hugging Face", href: "https://huggingface.co/MedSwin" }],
  },
];

export const lanes: { id: Lane; label: string }[] = [
  { id: "full-time", label: "Full-time" },
  { id: "consulting", label: "Consulting and contract" },
  { id: "research", label: "Research and study" },
];

export const roles: Role[] = [
  { id: "axion", sectionId: "role-axion", employer: "Axion Solutions", title: "Senior AI Software Engineer", place: null, start: "2026-07", end: null, lane: "full-time", outcome: "Ships governed workflows for outreach, investor search, and portfolio reporting.", overlap: "Current role. Overlaps Teqar." },
  { id: "teqar", sectionId: "role-teqar", employer: "Teqar", title: "AI Development Consultant", place: "Perth", start: "2025-05", end: null, lane: "consulting", outcome: "Maps client workflows and turns the gaps into delivery plans.", overlap: "Concurrent consulting, still open." },
  { id: "harry-senior", sectionId: "role-harry-senior", employer: "Harry the Hirer", title: "Senior AI Engineer", place: "Melbourne", start: "2025-12", end: "2026-07", lane: "full-time", outcome: "Cut repetitive lookup and drafting about 40% in targeted pilot workflows.", overlap: "Overlaps Mizco, Teqar, and Swinburne." },
  { id: "swinburne-research", sectionId: "role-swinburne-research", employer: "Swinburne University", title: "Researcher", place: "Melbourne", start: "2025-08", end: "2026-07", lane: "research", outcome: "Reached 86% BERTScore on MedMCQA, PubMedQA, and MedQuAD.", overlap: "Concurrent research." },
  { id: "mizco", sectionId: "role-mizco", employer: "Mizco", title: "AI Team Lead", place: "Perth", start: "2025-11", end: "2026-06", lane: "consulting", outcome: "Cut manual review and artefact preparation about 50% in targeted workflows.", overlap: "Concurrent with Harry the Hirer and Teqar." },
  { id: "harry-pedigree", sectionId: "role-harry-pedigree", employer: "Harry the Hirer", title: "ML and Data Science", place: "Melbourne", start: "2026-03", end: "2026-05", lane: "consulting", outcome: "Built a 10-signal mate-selection model on the Black Caviar pedigree.", overlap: "Concurrent with the senior role, same employer." },
  { id: "aitc", sectionId: "role-aitc", employer: "AITC", title: "Senior AI Engineer", place: "Remote", start: "2025-06", end: "2025-11", lane: "full-time", outcome: "Turned partner PDFs into guidance with LLMs, NLP, and OCR.", overlap: "Overlaps Teqar, Swinburne, and Hai Au." },
  { id: "hai-au", sectionId: "role-hai-au", employer: "Hai Au Academy", title: "AI Software Engineer", place: "Binh Duong", start: "2025-08", end: "2025-10", lane: "consulting", outcome: "Cut repetitive data entry and onboarding effort by about 35%.", overlap: "Short contract." },
  { id: "pythera", sectionId: "role-pythera", employer: "Pythera", title: "AI LLM Engineer", place: "Remote", start: "2025-01", end: "2025-09", lane: "full-time", outcome: "Clara passed 95% recall and 92% precision on labelled sets.", overlap: "Overlaps Nam A Bank, iNet, and PopTech." },
  { id: "poptech", sectionId: "role-poptech", employer: "PopTech", title: "ML Engineer", place: "Melbourne", start: "2025-05", end: "2025-07", lane: "consulting", outcome: "Led four people on IoT electricity forecasting and control.", overlap: "Overlaps Pythera and AITC." },
  { id: "nam-a-ai", sectionId: "role-nam-a-ai", employer: "Nam A Bank", title: "AI and Data Engineer", place: "Ho Chi Minh City", start: "2024-12", end: "2025-05", lane: "consulting", outcome: "Built passport OCR and document intelligence for onboarding and remittance.", overlap: "Overlaps iNet and VietDan." },
  { id: "inet", sectionId: "role-inet", employer: "iNet Solution", title: "Software and Data Scientist", place: "Ho Chi Minh City", start: "2024-04", end: "2025-03", lane: "full-time", outcome: "Led sentiment, fact-checking, and summary pipelines over news text.", overlap: "Overlaps Nam A Bank and VietDan." },
  { id: "vietdan-ml", sectionId: "role-vietdan-ml", employer: "VietDan JSC", title: "ML Engineer", place: "Remote", start: "2024-12", end: "2025-02", lane: "consulting", outcome: "Cut manual meter processing 35% with 10,000-plus annotated samples.", overlap: "Overlaps Nam A Bank and iNet." },
  { id: "nam-a-software", sectionId: "role-nam-a-software", employer: "Nam A Bank", title: "Software Engineer", place: "Remote", start: "2023-04", end: "2024-06", lane: "full-time", outcome: "Built Vert.x services and Java Android modules for digital banking.", overlap: "Overlaps iNet from April 2024." },
  { id: "vietdan-cloud", sectionId: "role-vietdan-cloud", employer: "VietDan JSC", title: "Cloud Software Engineer", place: "Remote", start: "2022-06", end: "2023-03", lane: "full-time", outcome: "Built AWS services for IoT apps, telemetry, and ML deployment.", overlap: "Overlaps Alta Media." },
  { id: "alta", sectionId: "role-alta", employer: "Alta Media", title: "DevOps Cloud Engineer", place: "Remote", start: "2022-05", end: "2023-01", lane: "consulting", outcome: "Supported Docker, Kubernetes, and CI/CD releases on AWS and Azure.", overlap: "Overlaps VietDan cloud." },
  { id: "tien-thanh", sectionId: "role-tien-thanh", employer: "Tien Thanh Co", title: "IoT and Software Engineer", place: "Ho Chi Minh City", start: "2020-01", end: "2020-08", lane: "full-time", outcome: "Containerised IoT APIs and device data on AWS and Azure.", overlap: null },
  { id: "degree", sectionId: "education-swinburne", employer: "Swinburne University", title: "Bachelor of Software Engineering", place: "Melbourne", start: "2022-02", end: "2025-11", lane: "research", outcome: "Degree completed alongside industry roles.", overlap: "Study ran alongside work." },
];

export const projects: Project[] = [
  { id: "clara", sectionId: "role-pythera", title: "Clara", label: "Pythera", line: "Contributed to a Vietnamese medical language and vision model adopted by 175 Hospital in Ho Chi Minh City.", result: "400K+ doctor-annotated cases · 210K+ X-ray and MRI samples", image: "clara.jpeg", alt: "Clara medical assistant interface", links: [] },
  { id: "triage", sectionId: "project-triage", title: "Triage Response", label: "Clinical AI", line: "Voice and vision triage over MIMIC-IV, with a drone medication path.", image: "triage.jpeg", alt: "Triage response dashboard", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Triage-LLM-Based" }, { label: "Space", href: "https://huggingface.co/spaces/khoaliamle/Triage_LLM" }] },
  { id: "codoptic", sectionId: "project-codoptic", title: "Codoptic", label: "Open source", line: "Coding agent that turns a repository into interactive diagrams.", image: "codoptic.jpeg", alt: "Codoptic repository diagram", links: [{ label: "GitHub", href: "https://github.com/Codoptic/Codoptic" }] },
  { id: "cva", sectionId: "project-cva", title: "CVA", label: "Agent", line: "Career application agent that drafts, critiques, and waits for approval.", image: "cva.png", alt: "CVA application workspace", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/CVA" }, { label: "Live", href: "https://cva-mauve.vercel.app" }] },
  { id: "golf", sectionId: "project-golf", title: "Golf scorecard scanner", label: "Sold to VHandicap", line: "Reads handwritten Vietnamese scorecards.", result: "~15% processing efficiency", image: "golf.png", alt: "Golf scorecard with detected fields", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Golf-Scorecard-Scanner" }] },
  { id: "skyledge", sectionId: "project-skylege", title: "SkyLedge fleet maintenance", label: "Acquired by SkyLedge Kenya", line: "OBD-II fleet maintenance. Led the four-person capstone team.", result: "estimated ~15% lower servicing cost", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Capstone-Project" }] },
  { id: "roster", sectionId: "project-roster", title: "Roster management", label: "Sold to MJ Industrial Australia", line: "Android roster and payroll app.", image: "roster.jpg", alt: "Roster management Android screens", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/RosterManagement" }] },
  { id: "salle", sectionId: "project-salle", title: "Sall-e", label: "Robotics", line: "Ocean-cleanup robot. Led the software team of five.", image: "salle.png", alt: "Sall-e marine debris detection", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Sall-e" }, { label: "Space", href: "https://huggingface.co/spaces/khoaliamle/Sall-eGarbageDetection" }] },
  { id: "writing", title: "WritingJourney", label: "Sold to Hai Au Group", line: "IELTS, PTE, and TOEIC writing coach, version 1.5.0.", image: "ielts.png", alt: "WritingJourney essay feedback screen", links: [{ label: "Live", href: "https://ielts-writing-boost.vercel.app" }, { label: "GitHub", href: "https://github.com/Lelekhoa1812/Writing-Journey" }] },
  { id: "ericsson", title: "Ericsson 5G digital twin", label: "Ericsson Vietnam and Swinburne", line: "Predictive maintenance for 5G towers.", image: "5g.jpg", alt: "5G tower digital twin", links: [] },
];

export const research = {
  degree: { title: "Bachelor of Software Engineering", org: "Swinburne University of Technology", dates: "2022 – 2025" },
  lab: "Researcher at Swinburne from August 2025 to July 2026, leading a five-person clinical AI lab. MedSwin is the lab's public release of models, datasets, and Spaces.",
  orgs: [
    { name: "MedSwin", role: "Lab lead and release author", href: "https://huggingface.co/MedSwin" },
    { name: "MedVietAI", role: "Founder. Non-profit Vietnamese medical language model, sponsored by Vietnam's National Data Association.", href: "https://huggingface.co/MedVietAI" },
  ],
};

export const skills: { group: string; items: string[] }[] = [
  { group: "Agents and LLMOps", items: ["LangGraph", "LangChain", "LangSmith", "LlamaIndex", "MCP", "Tool calling", "Human approval", "Evals"] },
  { group: "Retrieval and document AI", items: ["RAG", "BM25", "HNSW", "Reranking", "OCR/IDP", "VLMs", "Constrained JSON", "YOLO"] },
  { group: "Cloud and serving", items: ["Azure AI Foundry", "Azure OpenAI", "AWS Bedrock", "SageMaker", "vLLM", "Nvidia NIM", "Docker", "Kubernetes"] },
  { group: "Software and applied ML", items: ["Python", "TypeScript", "Java", "FastAPI", "Next.js", "React", "LoRA/QLoRA", "XGBoost"] },
];
