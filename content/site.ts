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
  name: "Liam Le",
  known: "Liam",
  title: "AI Software Engineer",
  positioning: "I build and own the AI stack. A technical advance counts only when the business can measure it.",
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
  "How Liam design AI-native software for FoodFlow ERP?",
  "What is the architecture behind Harry the Hirer AI Assistant?",
  "What is MedSwin, which problem they solved and how it works?",
  "How did Liam lead the AI team at Mizco, and what was the outcome?",
];

export const cases: Case[] = [
  {
    id: "axis",
    sectionId: "role-axion",
    title: "A person approves every write",
    role: "AI Software Engineer, Axion Solutions",
    dates: "Jul 2026 – now",
    place: null,
    problem: "I build the assistant that drafts the next operational change. The write waits until a person approves it.",
    built: [
      "The business system keeps sales, purchasing, inventory, production, finance, and delivery. The assistant does not own that database.",
      "It calls typed tools and shows a preview before any write.",
      "A separate graph runs startup scouting, investor scouting, and portfolio reporting. Those drafts do not own the data.",
    ],
    result: null,
    stack: ["LangGraph", "LangChain", "LangSmith", "MCP", "OpenTelemetry"],
    flow: [
      { label: "AI-Native Software" },
      { label: "Workflow Automation" },
      { label: "Data Plane" },
      { label: "Task Planning" },
      { label: "Human Review" },
      { label: "Approval & Learning", gate: true },
      { label: "Actions & Controls"},
    ],
    links: [],
  },
  {
    id: "harry",
    sectionId: "role-harry-senior",
    title: "Answers a planner can check",
    role: "Senior AI Engineer, Harry the Hirer",
    dates: "Dec 2025 – Jul 2026",
    place: "Melbourne",
    problem: "Planners needed answers on stock, logistics, and documents that they could check.",
    built: [
      "I built retrieval over event inventory, logistics, planning, and documents.",
      "OCR reads the documents. Tools read the stock and the plan. A planner checks the answer.",
    ],
    result: { text: "~40% less repetitive lookup and drafting in the targeted pilot", source: "Resume, Senior AI Engineer bullet" },
    also: { text: "99.9% operational uptime on the OCR and validation suite", source: "Resume, OCR/IDP bullet" },
    stack: ["Azure AI Foundry", "LangGraph", "FastAPI", "BM25 + HNSW", "OCR/IDP", "MCP"],
    flow: [
      { label: "Planner" },
      { label: "Retrieve", note: "stock · documents" },
      { label: "Verifier" },
      { label: "Actions", gate: true },
      { label: "Learning" },
    ],
    links: [],
  },
  {
    id: "mizco",
    sectionId: "role-mizco",
    title: "A reviewer checks each quote document",
    role: "AI Team Lead, Mizco",
    dates: "Nov 2025 – Jun 2026",
    place: "Perth",
    problem: "Staff turned noisy quote requests into industrial documents by hand.",
    built: [
      "I led the pipeline from the quote text to the industrial document.",
      "Local models return constrained JSON and call tools.",
      "The review screen shows the confidence, the trace, and each failed check.",
    ],
    result: { text: "~50% less manual review and document preparation in the targeted work", source: "Resume, Mizco AI Team Lead" },
    stack: ["vLLM", "FastAPI", "Next.js", "Constrained JSON", "OpenTelemetry", "RAG"],
    flow: [
      { label: "RFQ", note: "noisy documents" },
      { label: "Extract", note: "OCR · IDP · ETL" },
      { label: "Planning" },
      { label: "Confidence" },
      { label: "Reviewer", gate: true },
      { label: "Generation", note: "spreadsheet · proposal · pricing" },
    ],
    links: [],
  },
  {
    id: "medswin",
    sectionId: "project-medswin",
    title: "Clinical answers with a cited source",
    role: "Researcher, Swinburne University of Technology",
    dates: "Aug 2025 – Jul 2026",
    place: "Melbourne",
    problem: "The lab needed a clinical answer with a specialist path, a cited source, and a score on public exams.",
    built: [
      "I led a five-person lab. The agents cover diagnostics, pharmacology, and triage.",
      "One line is fine-tuned on more than 500,000 curated cases. A second line uses 5 million synthetic cases.",
      "Retrieval uses clinical records and PubMed. The answer cites its source.",
    ],
    result: { text: "86% BERTScore on MedMCQA, PubMedQA, and MedQuAD", source: "Resume, Swinburne Researcher and MedSwin project" },
    also: { text: "Selected releases were among Australia's most downloaded AI models in Nov–Dec 2025", source: "Resume, MedSwin project" },
    stack: ["LoRA/QLoRA", "Distillation", "Agentic RAG", "EMR/EHR", "PubMed", "Hugging Face"],
    flow: [
      { label: "Retrieval" },
      { label: "Multi-agent" },
      { label: "Specialists", note: "diagnostics · pharmacology · triage" },
      { label: "Citation", gate: true },
      { label: "Distillation" },
      { label: "Evaluation", note: "benchmark · performance" },
      { label: "Release" , note: "model · dataset · reproducibility" },
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
  { id: "nam-a-ai", sectionId: "role-nam-a-ai", employer: "Nam A Bank", title: "AI & Data Engineer", place: "Ho Chi Minh City", start: "2024-12", end: "2025-05", lane: "consulting", outcome: "Read passports and remittance papers for customer onboarding.", proof: null, overlap: null },
  { id: "inet", sectionId: "role-inet", employer: "iNet Solution", title: "Software & Data Scientist", place: "Ho Chi Minh City", start: "2024-04", end: "2025-03", lane: "full-time", outcome: "Led the work that read news text and returned a sentiment score, a fact check, and a short summary.", proof: null, overlap: null },
  { id: "vietdan-ml", sectionId: "role-vietdan-ml", employer: "VietDan JSC", title: "ML Engineer", place: "Remote", start: "2024-12", end: "2025-02", lane: "consulting", outcome: "Read water-meter photos so staff entered fewer readings.", proof: "Manual meter processing fell about 35%.", overlap: null },
  { id: "nam-a-software", sectionId: "role-nam-a-software", employer: "Nam A Bank", title: "Software Engineer", place: "Remote", start: "2023-04", end: "2024-06", lane: "full-time", outcome: "Built features for the mobile banking app and the services behind it.", proof: null, overlap: null },
  { id: "vietdan-cloud", sectionId: "role-vietdan-cloud", employer: "VietDan JSC", title: "Cloud Software Engineer", place: "Remote", start: "2022-06", end: "2023-03", lane: "full-time", outcome: "Built the cloud services that ran the device apps and their models.", proof: null, overlap: null },
  { id: "alta", sectionId: "role-alta", employer: "Alta Media", title: "DevOps Cloud Engineer", place: "Remote", start: "2022-05", end: "2023-01", lane: "consulting", outcome: "Kept releases running on AWS and Azure.", proof: null, overlap: null },
  { id: "tien-thanh", sectionId: "role-tien-thanh", employer: "Tien Thanh Co", title: "IoT and Software Engineer", place: "Ho Chi Minh City", start: "2020-01", end: "2020-08", lane: "full-time", outcome: "Put device APIs and device data on AWS and Azure.", proof: null, overlap: null },
  { id: "degree", sectionId: "education-swinburne", employer: "Swinburne University", title: "Bachelor of Software Engineering", place: "Melbourne", start: "2022-02", end: "2025-11", lane: "research", outcome: "Finished the degree while working in industry roles.", proof: null, overlap: null },
];

export const projects: Project[] = [
  { id: "clara", sectionId: "role-pythera", title: "Clara", label: "Pythera", line: "Contributed to a Vietnamese medical language and vision model adopted by 175 Hospital in Ho Chi Minh City.", result: "More than 400,000 cases and more than 210,000 imaging studies", image: "clara.jpeg", alt: "A hand radiograph", links: [] },
  { id: "meter", sectionId: "project-meter", title: "Water-meter scanner", label: "VietDan", line: "Reads meter photos so staff enter fewer readings.", result: "Manual meter processing fell about 35%.", image: "meter.jpg", alt: "Industrial pipes and a pump", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Water-Meter-Scanner" }] },
  { id: "skyledge", sectionId: "project-skyledge", title: "SkyLedge fleet maintenance", label: "Acquired by SkyLedge Kenya", line: "OBD-II capstone for fleet maintenance. SkyLedge Kenya acquired it.", result: "about 15% lower servicing cost", image: "skyledge.jpg", alt: "An engine bay", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Capstone-Project" }] },
  { id: "writing", sectionId: "project-writing", title: "WritingJourney", label: "Sold to Hai Au Group", line: "IELTS, PTE, and TOEIC writing coach, version 1.5.0.", image: "ielts.png", alt: "A notebook and a pen", links: [{ label: "Live", href: "https://ielts-writing-boost.vercel.app" }, { label: "GitHub", href: "https://github.com/Lelekhoa1812/Writing-Journey" }] },
  { id: "golf", sectionId: "project-golf", title: "Golf scorecard scanner", label: "Sold to VHandicap", line: "Reads handwritten Vietnamese scorecards.", result: "~15% processing efficiency", image: "golf.png", alt: "A golfer on a fairway", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Golf-Scorecard-Scanner" }] },
  { id: "passport", sectionId: "project-passport", title: "Passport OCR", label: "Nam A Bank", line: "Reads Vietnamese passports for onboarding and remittance.", result: "1,373 downloads of the synthetic passport dataset", image: "passport.jpg", alt: "A desktop globe", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Vietnamese-Passport-OCR-Project-with-VietOCR" }, { label: "Dataset", href: "https://huggingface.co/datasets/khoaliamle/Synthetic-Passport-Dataset" }] },
  { id: "salle", sectionId: "project-salle", title: "Sall-e", label: "Robotics", line: "Ocean-cleanup robot. Led the software team of five.", result: "1,434 downloads of the garbage-classification dataset", image: "salle.png", alt: "The ocean from above", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Sall-e" }, { label: "Dataset", href: "https://huggingface.co/datasets/khoaliamle/Garbage_Classification_YOLO" }, { label: "Space", href: "https://huggingface.co/spaces/khoaliamle/Sall-eGarbageDetection" }] },
  { id: "ericsson", sectionId: "project-ericsson", title: "Ericsson 5G digital twin", label: "Ericsson Vietnam and Swinburne", line: "Predictive maintenance for 5G towers.", image: "5g.jpg", alt: "A network patch panel", links: [] },
  { id: "codoptic", sectionId: "project-codoptic", title: "Codoptic", label: "Open source", line: "Coding agent that turns a repository into interactive diagrams.", image: "codoptic.jpeg", alt: "Server racks in a dark hall", links: [{ label: "GitHub", href: "https://github.com/Codoptic/Codoptic" }] },
  { id: "cva", sectionId: "project-cva", title: "CVA", label: "Agent", line: "Career application agent that drafts, critiques, and waits for approval.", image: "cva.png", alt: "A desk and a notebook", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/CVA" }, { label: "Live", href: "https://cva-mauve.vercel.app" }] },
  { id: "roster", sectionId: "project-roster", title: "Roster management", label: "Sold to MJ Industrial Australia", line: "Android roster and payroll app.", image: "roster.jpg", alt: "A person writing in a notebook", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/RosterManagement" }] },
  { id: "triage", sectionId: "project-triage", title: "Triage Response", label: "Clinical AI", line: "Voice and vision triage over MIMIC-IV, with a drone medication path.", image: "triage.jpeg", alt: "An operating room", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Triage-LLM-Based" }, { label: "Space", href: "https://huggingface.co/spaces/khoaliamle/Triage_LLM" }] },
  { id: "sp500", sectionId: "project-sp500", title: "S&P 500 forecast", label: "Forecasting", line: "Forecasts the index from prices, news, and filings.", image: "market.jpg", alt: "A candlestick chart", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/S-P500_Prediction_Model" }] },
  { id: "router", sectionId: "project-router", title: "free-router", label: "Open source", line: "OpenAI-compatible router for Gemini, OpenRouter, and Nvidia NIM.", image: "router.jpg", alt: "A circuit board", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/free-router" }] },
  { id: "stt", sectionId: "project-stt", title: "stt-studio", label: "Open source", line: "Local inference studio for Whisper speech to text.", image: "mic.jpg", alt: "A studio microphone", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/stt-studio" }] },
  { id: "prophet", sectionId: "project-prophet", title: "Prophet", label: "Open source", line: "Time-series agent that forecasts from a series.", image: "clock.jpg", alt: "An hourglass", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/prophet" }] },
  { id: "survee", sectionId: "project-survee", title: "Survee", label: "Open source", line: "Agentic tool that runs a survey.", image: "survey.jpg", alt: "People marking up a plan", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/survee" }] },
  { id: "quotient", sectionId: "project-quotient", title: "Quotient", label: "Open source", line: "Takes meeting notes and augments them.", image: "notes.jpg", alt: "A meeting and an open notebook", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Quotient" }] },
  { id: "acnt", sectionId: "project-acnt", title: "Acnt-MCP", label: "Open source", line: "Accounting assistant over OpenCollective and exchange rates.", image: "ledger.jpg", alt: "Tax papers and a calculator", links: [{ label: "GitHub", href: "https://github.com/Lelekhoa1812/Acnt-MCP" }] },
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
