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
  proof: string | null;
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
  title: "AI Software Engineer",
  positioning: "I build and own AI software, from retrieval to the write a person approves.",
  intro:
    "I am an AI Software Engineer at Axion Solutions in Melbourne. I have four years in software and three in AI, on retrieval, document intelligence, and agent workflows.",
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
  "What is live for a customer?",
  "What result did the water-meter model deliver?",
  "Where must a person approve a write?",
];

export const cases: Case[] = [
  {
    id: "axis",
    sectionId: "role-axion",
    title: "Evidence, a draft, and an approved write",
    role: "Senior AI Software Engineer, Axion Solutions",
    dates: "Jul 2026 – now",
    place: null,
    problem: "One system keeps the operational record. A separate assistant drafts the next change and waits for a person to approve the write.",
    built: [
      "The operational record covers sales, purchasing, inventory, production, finance, and delivery. The assistant does not own that database.",
      "The assistant calls typed tools, shows a preview, and waits for a person before any write.",
      "A separate governed graph runs startup scouting, investor scouting, and portfolio reporting. It drafts on the same host and does not own the data.",
    ],
    result: null,
    stack: ["LangGraph", "LangChain", "LangSmith", "MCP", "OpenTelemetry"],
    flow: [
      { label: "Retrieve" },
      { label: "Draft" },
      { label: "Preview" },
      { label: "Person approves", gate: true },
      { label: "Write" },
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
      "A retrieval layer over event inventory, logistics, planning, and documents. A person checks the answer.",
      "OCR and document extraction, with tool access to stock and planning data.",
    ],
    result: { text: "~40% less repetitive lookup and drafting in targeted pilot workflows", source: "Resume, Senior AI Engineer bullet" },
    also: { text: "99.9% operational uptime on the OCR and validation suite", source: "Resume, OCR/IDP bullet" },
    stack: ["Azure AI Foundry", "LangGraph", "FastAPI", "BM25 + HNSW", "OCR/IDP", "MCP"],
    flow: [
      { label: "Retrieve" },
      { label: "Check" },
      { label: "Person approves", gate: true },
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
      "Led a five-person lab. Specialist agents for diagnostics, pharmacology, and triage.",
      "Fine-tuned on more than 500,000 curated cases. A separate line uses 5 million synthetic cases. The two counts are not the same set.",
      "Retrieval over clinical records and PubMed, with a cited answer.",
    ],
    result: { text: "86% BERTScore across MedMCQA, PubMedQA, and MedQuAD", source: "Resume, Swinburne Researcher and MedSwin project" },
    also: { text: "Selected releases were among Australia's most downloaded AI models in Nov–Dec 2025", source: "Resume, MedSwin project" },
    stack: ["LoRA/QLoRA", "Distillation", "Agentic RAG", "EMR/EHR", "PubMed", "Hugging Face"],
    flow: [
      { label: "Orchestrator" },
      { label: "Specialists", note: "diagnostics · pharmacology · triage" },
      { label: "Cited answer", gate: true },
    ],
    image: { src: "medswin.png", alt: "A bright laboratory" },
    links: [{ label: "MedSwin on Hugging Face", href: "https://huggingface.co/MedSwin" }],
  },
];

export const lanes: { id: Lane; label: string }[] = [
  { id: "full-time", label: "Full-time" },
  { id: "consulting", label: "Consulting and contract" },
  { id: "research", label: "Research and study" },
];

export const roles: Role[] = [
  { id: "axion", sectionId: "role-axion", employer: "Axion Solutions", title: "Senior AI Software Engineer", place: null, start: "2026-07", end: null, lane: "full-time", outcome: "Searches for startups and investors, then drafts the portfolio update.", proof: null, overlap: null },
  { id: "teqar", sectionId: "role-teqar", employer: "Teqar", title: "AI Development Consultant", place: "Perth", start: "2025-05", end: null, lane: "consulting", outcome: "Shows each client where AI fits their work, then writes the plan to build it.", proof: null, overlap: null },
  { id: "harry-senior", sectionId: "role-harry-senior", employer: "Harry the Hirer", title: "Senior AI Engineer", place: "Melbourne", start: "2025-12", end: "2026-07", lane: "full-time", outcome: "Gave event planners answers they could check on stock, logistics, and documents.", proof: "Lookup and drafting in the pilot fell about 40%.", overlap: null },
  { id: "swinburne-research", sectionId: "role-swinburne-research", employer: "Swinburne University", title: "Researcher", place: "Melbourne", start: "2025-08", end: "2026-07", lane: "research", outcome: "Led a five-person lab that answered clinical questions.", proof: "The answers reached 86% BERTScore on MedMCQA, PubMedQA, and MedQuAD.", overlap: null },
  { id: "mizco", sectionId: "role-mizco", employer: "Mizco", title: "AI Team Lead", place: "Perth", start: "2025-11", end: "2026-06", lane: "consulting", outcome: "Turned each quote request into an industrial document a reviewer could check.", proof: "Manual review and document preparation fell about 50% in the targeted work.", overlap: null },
  { id: "harry-pedigree", sectionId: "role-harry-pedigree", employer: "Harry the Hirer", title: "ML and Data Science", place: "Melbourne", start: "2026-03", end: "2026-05", lane: "consulting", outcome: "Built a mate-selection aid for breeders on the Black Caviar line.", proof: "The model uses ten signals from the pedigree.", overlap: null },
  { id: "aitc", sectionId: "role-aitc", employer: "AITC", title: "Senior AI Engineer", place: "Remote", start: "2025-06", end: "2025-11", lane: "full-time", outcome: "Turned partner PDFs into guidance staff could read.", proof: null, overlap: null },
  { id: "hai-au", sectionId: "role-hai-au", employer: "Hai Au Academy", title: "AI Software Engineer", place: "Binh Duong", start: "2025-08", end: "2025-10", lane: "consulting", outcome: "Built the student system for enrolment, placement, timetables, and attendance.", proof: "Admin effort fell about 35%.", overlap: null },
  { id: "pythera", sectionId: "role-pythera", employer: "Pythera", title: "AI LLM Engineer", place: "Remote", start: "2025-01", end: "2025-09", lane: "full-time", outcome: "Helped build Clara, a Vietnamese medical model used at 175 Hospital.", proof: "It passed 95% recall and 92% precision on labelled sets.", overlap: null },
  { id: "poptech", sectionId: "role-poptech", employer: "PopTech", title: "ML Engineer", place: "Melbourne", start: "2025-05", end: "2025-07", lane: "consulting", outcome: "Led four people on electricity forecasts and control from site sensors.", proof: null, overlap: null },
  { id: "nam-a-ai", sectionId: "role-nam-a-ai", employer: "Nam A Bank", title: "AI and Data Engineer", place: "Ho Chi Minh City", start: "2024-12", end: "2025-05", lane: "consulting", outcome: "Read passports and remittance papers for customer onboarding.", proof: null, overlap: null },
  { id: "inet", sectionId: "role-inet", employer: "iNet Solution", title: "Software and Data Scientist", place: "Ho Chi Minh City", start: "2024-04", end: "2025-03", lane: "full-time", outcome: "Led the work that read news text and returned a sentiment score, a fact check, and a short summary.", proof: null, overlap: null },
  { id: "vietdan-ml", sectionId: "role-vietdan-ml", employer: "VietDan JSC", title: "ML Engineer", place: "Remote", start: "2024-12", end: "2025-02", lane: "consulting", outcome: "Read water-meter photos so staff entered fewer readings.", proof: "Manual meter processing fell about 35%.", overlap: null },
  { id: "nam-a-software", sectionId: "role-nam-a-software", employer: "Nam A Bank", title: "Software Engineer", place: "Remote", start: "2023-04", end: "2024-06", lane: "full-time", outcome: "Built features for the mobile banking app and the services behind it.", proof: null, overlap: null },
  { id: "vietdan-cloud", sectionId: "role-vietdan-cloud", employer: "VietDan JSC", title: "Cloud Software Engineer", place: "Remote", start: "2022-06", end: "2023-03", lane: "full-time", outcome: "Built the cloud services that ran the device apps and their models.", proof: null, overlap: null },
  { id: "alta", sectionId: "role-alta", employer: "Alta Media", title: "DevOps Cloud Engineer", place: "Remote", start: "2022-05", end: "2023-01", lane: "consulting", outcome: "Kept releases running on AWS and Azure.", proof: null, overlap: null },
  { id: "tien-thanh", sectionId: "role-tien-thanh", employer: "Tien Thanh Co", title: "IoT and Software Engineer", place: "Ho Chi Minh City", start: "2020-01", end: "2020-08", lane: "full-time", outcome: "Put device APIs and device data on AWS and Azure.", proof: null, overlap: null },
  { id: "degree", sectionId: "education-swinburne", employer: "Swinburne University", title: "Bachelor of Software Engineering", place: "Melbourne", start: "2022-02", end: "2025-11", lane: "research", outcome: "Finished the degree while working in industry roles.", proof: null, overlap: null },
];

export const projects: Project[] = [
  { id: "clara", sectionId: "role-pythera", title: "Clara", label: "Pythera", line: "Contributed to a Vietnamese medical language and vision model adopted by 175 Hospital in Ho Chi Minh City.", result: "More than 400,000 cases and more than 210,000 imaging studies", image: "clara.jpeg", alt: "A hand radiograph", links: [] },
  { id: "triage", sectionId: "project-triage", title: "Triage Response", label: "Clinical AI", line: "Voice and vision triage over MIMIC-IV, with a drone medication path.", image: "triage.jpeg", alt: "An operating room", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Triage-LLM-Based" }, { label: "Space", href: "https://huggingface.co/spaces/khoaliamle/Triage_LLM" }] },
  { id: "codoptic", sectionId: "project-codoptic", title: "Codoptic", label: "Open source", line: "Coding agent that turns a repository into interactive diagrams.", image: "codoptic.jpeg", alt: "Server racks in a dark hall", links: [{ label: "GitHub", href: "https://github.com/Codoptic/Codoptic" }] },
  { id: "cva", sectionId: "project-cva", title: "CVA", label: "Agent", line: "Career application agent that drafts, critiques, and waits for approval.", image: "cva.png", alt: "A desk and a notebook", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/CVA" }, { label: "Live", href: "https://cva-mauve.vercel.app" }] },
  { id: "golf", sectionId: "project-golf", title: "Golf scorecard scanner", label: "Sold to VHandicap", line: "Reads handwritten Vietnamese scorecards.", result: "~15% processing efficiency", image: "golf.png", alt: "A golfer on a fairway", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Golf-Scorecard-Scanner" }] },
  { id: "skyledge", sectionId: "project-skyledge", title: "SkyLedge fleet maintenance", label: "Acquired by SkyLedge Kenya", line: "OBD-II capstone for fleet maintenance. SkyLedge Kenya acquired it.", result: "about 15% lower servicing cost", image: "skyledge.jpg", alt: "An engine bay", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Capstone-Project" }] },
  { id: "roster", sectionId: "project-roster", title: "Roster management", label: "Sold to MJ Industrial Australia", line: "Android roster and payroll app.", image: "roster.jpg", alt: "A person writing in a notebook", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/RosterManagement" }] },
  { id: "salle", sectionId: "project-salle", title: "Sall-e", label: "Robotics", line: "Ocean-cleanup robot. Led the software team of five.", image: "salle.png", alt: "The ocean from above", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Sall-e" }, { label: "Space", href: "https://huggingface.co/spaces/khoaliamle/Sall-eGarbageDetection" }] },
  { id: "writing", sectionId: "project-writing", title: "WritingJourney", label: "Sold to Hai Au Group", line: "IELTS, PTE, and TOEIC writing coach, version 1.5.0.", image: "ielts.png", alt: "A notebook and a pen", links: [{ label: "Live", href: "https://ielts-writing-boost.vercel.app" }, { label: "GitHub", href: "https://github.com/Lelekhoa1812/Writing-Journey" }] },
  { id: "ericsson", sectionId: "project-ericsson", title: "Ericsson 5G digital twin", label: "Ericsson Vietnam and Swinburne", line: "Predictive maintenance for 5G towers.", image: "5g.jpg", alt: "A network patch panel", links: [] },
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
  { group: "Retrieval and document AI", items: ["RAG", "BM25", "HNSW", "pgvector", "Reranking", "OCR/IDP", "VLMs", "Constrained JSON", "YOLO"] },
  { group: "Cloud and serving", items: ["Azure AI Foundry", "Azure OpenAI", "AWS Bedrock", "SageMaker", "Salesforce Agentforce", "Nvidia NIM", "Docker", "Kubernetes", "Kafka", "MLflow"] },
  { group: "Software and applied ML", items: ["Python", "TypeScript", "Java", "FastAPI", "Next.js", "React", "LoRA/QLoRA", "XGBoost"] },
];
