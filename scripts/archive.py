"""Build content/archive.json from the public GitHub and Hugging Face APIs.

Run: python3 scripts/archive.py
"""

import json
import os
import pathlib
import re
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "archive.json"
GITHUB_USER = "Lelekhoa1812"
HF_AUTHORS = ["khoaliamle", "MedSwin", "MedVietAI"]

SKIP = {"My-Profile", "Lelekhoa1812", "Dockerfile", "W02-KotlinDemo"}

AREAS = {
    "agents": "Agentic AI",
    "clinical": "Clinical AI",
    "vision": "Vision Intelligence",
    "data": "Data Forecasting",
    "apps": "Web & mobile",
    "play": "Games & Tools",
    "coursework": "Coursework",
}

REPO_AREA = {
    "prophet": "data", "survee": "agents", "stt-studio": "agents", "Quotient": "agents",
    "free-router": "agents", "CVA": "agents", "undercut": "agents", "prompt-me": "agents",
    "Medical-Chatbot-RAG": "clinical", "AgentDiagram": "agents", "path-game": "play",
    "Acnt-MCP": "agents", "Writing-Journey": "agents", "Triage-LLM-Based": "clinical",
    "Capstone-Project": "data", "ADHD-Assistant": "agents", "MedLLM-Agent": "clinical",
    "Deepseek-OCR": "vision", "MedSwin": "clinical", "Whisper": "agents",
    "Medical-Messenger": "clinical", "Cooking-Tutor": "agents", "StudyBuddy": "agents",
    "Fretboard": "play", "Seat_Allocator": "apps", "Student-Management": "apps",
    "The-Auburn-Coffee": "apps", "AITC-Localbot": "agents", "SQL-LLM-CoT": "agents",
    "S-P500_Prediction_Model": "data", "Rock-Paper-Scissor-AI-Game-Ver2": "play",
    "AI-Tutor": "agents", "Eletrical-Automation": "data", "Sall-e": "vision",
    "Facial-Recognition-Web-app": "vision", "Sentiment-Analysis-with-Obsei": "agents",
    "Virtual-Instrument-Keyboard": "play", "Golf-Scorecard-Scanner": "vision",
    "Water-Meter-Scanner": "vision", "Vietnamese-Passport-OCR-Project-with-VietOCR": "vision",
    "RosterManagement": "apps", "Linguaphile": "apps", "Message-Encryption": "play",
    "Whac_A_Khang": "play", "Shop-Application": "apps", "TLS-Communication-Website": "apps",
    "Chess-Game": "play", "Knowledge-Test": "apps", "My-Music-Player": "apps",
    "QR-Code-Generator": "play", "Weather-Forecast-Website": "apps", "Monopoly-Game": "play",
    "Text-to-Speech-Website": "apps", "Face-Recognition-Website": "vision",
    "Rock-Paper-Scissor-AI-Game": "play", "Truth-Table": "play",
    "Multiplayer-Penalty-Shootout-Game": "play", "Robot-Navigation-Agent": "data",
    "Archiver-Game": "play", "TicTacToe-Game-by-C-Sharp": "play",
    "TicTacToe-Game-by-Python-Intelligent-Agent": "play", "Python-Calculator": "play",
}

COURSE_PREFIXES = ("COS", "SWE", "FIN", "INF", "ENG", "TNE")

SUMMARY = {
    "prophet": "Agent that forecasts time series.",
    "survee": "Agent-run survey tool.",
    "stt-studio": "Local, optimised Whisper inference and a speech-to-text studio.",
    "Quotient": "Meeting note-taker with augmentation.",
    "free-router": "OpenAI-compatible router across free Gemini, OpenRouter, and Nvidia NIM models.",
    "CVA": "Career application agent that drafts, critiques, and waits for approval.",
    "undercut": "Junior-developer coding agent.",
    "prompt-me": "Skill that refines a prompt before it spends tokens.",
    "Medical-Chatbot-RAG": "Medical chatbot over retrieval-augmented generation.",
    "AgentDiagram": "Diagram-as-code with a multi-agent coding assistant and a DSL.",
    "path-game": "Browser path puzzle.",
    "Acnt-MCP": "Accounting MCP assistant on OpenCollective and ExchangeRate data.",
    "Writing-Journey": "IELTS writing coach on Azure multimodal services.",
    "Triage-LLM-Based": "Voice and vision triage over MIMIC-IV.",
    "Capstone-Project": "OBD-II fleet maintenance capstone.",
    "ADHD-Assistant": "Personal assistant for daily life with ADHD.",
    "MedLLM-Agent": "Medical agent with MCP search and document RAG, built for the MCP 1st Birthday hackathon.",
    "Deepseek-OCR": "Gradio app for DeepSeek-OCR.",
    "MedSwin": "Gradio app for MedSwin-Distilled-7B.",
    "Whisper": "Gradio app for Whisper large-v3 turbo.",
    "Medical-Messenger": "Messaging app for clinical teams.",
    "Cooking-Tutor": "Cooking tutor with web-search MCP tools.",
    "StudyBuddy": "Study summariser with agentic RAG.",
    "Fretboard": "Note and chord lookup for guitar, bass, and ukulele.",
    "Seat_Allocator": "Seat allocation with sorting algorithms for an education centre.",
    "Student-Management": "Student management front end on Next.js, shadcn/ui, and React Query.",
    "The-Auburn-Coffee": "Menu and price site for The Auburn Coffee.",
    "AITC-Localbot": "Local bot with multimodal OCR and agentic RAG over partner PDFs.",
    "SQL-LLM-CoT": "Reasoning chain over SQL with Qwen3 and Gemini, semantic search, and RAG.",
    "S-P500_Prediction_Model": "S&P 500 prediction model with a React UI and a Flask API.",
    "Rock-Paper-Scissor-AI-Game-Ver2": "Rock paper scissors against a model that learns your moves.",
    "AI-Tutor": "Tutoring app with RAG, a knowledge base, and level-based teaching.",
    "Eletrical-Automation": "Electricity forecasting and control for PopTech.",
    "Sall-e": "Marine-debris detection and a robotic collector.",
    "Facial-Recognition-Web-app": "Face recognition with anti-spoofing and emotion detection.",
    "Sentiment-Analysis-with-Obsei": "Sentiment, entities, and summaries over multilingual articles.",
    "Virtual-Instrument-Keyboard": "Virtual keyboard that plays instruments.",
    "Golf-Scorecard-Scanner": "Handwritten Vietnamese golf scorecard scanner.",
    "Water-Meter-Scanner": "Real-time water-meter reading with Next.js, Node.js, and Flask.",
    "Vietnamese-Passport-OCR-Project-with-VietOCR": "Passport OCR with VietOCR and synthetic passports.",
    "RosterManagement": "Android roster and payroll app.",
    "Linguaphile": "English-learning Android app.",
    "Message-Encryption": "Message encryption in the browser.",
    "Whac_A_Khang": "Whac-a-mole for fun.",
    "Shop-Application": "Sales app on Spring Boot and Angular.",
    "TLS-Communication-Website": "TLS communication site for TNE30024.",
    "Chess-Game": "Chess in Python.",
    "Knowledge-Test": "Quiz site across topics.",
    "My-Music-Player": "Music player for Vietnamese acoustic songs.",
    "QR-Code-Generator": "QR code generator in TypeScript.",
    "Weather-Forecast-Website": "Weather forecast on the OpenWeatherMap API.",
    "Monopoly-Game": "Command-line Monopoly in Vietnamese and English.",
    "Text-to-Speech-Website": "Text or file to voice.",
    "Face-Recognition-Website": "Face recognition site.",
    "Rock-Paper-Scissor-AI-Game": "Rock paper scissors that predicts your choice.",
    "Truth-Table": "Truth-table generator.",
    "Multiplayer-Penalty-Shootout-Game": "Two-player online penalty shootout.",
    "Robot-Navigation-Agent": "Search algorithms for robot navigation.",
    "Archiver-Game": "Third-person game in GDevelop 5.",
    "TicTacToe-Game-by-C-Sharp": "Tic-tac-toe against a machine player in C#.",
    "TicTacToe-Game-by-Python-Intelligent-Agent": "Tic-tac-toe agent in Python.",
    "Python-Calculator": "Calculator in Python.",
}

HF_AREA = {
    "khoaliamle/Synthetic-Passport-Dataset": "vision", "khoaliamle/Corrosion_Rust": "vision",
    "khoaliamle/Garbage_Classification_YOLO": "vision", "khoaliamle/Vietnamese_Golf_Scorecard": "vision",
    "khoaliamle/MNIST_Number": "vision", "khoaliamle/Boning-Slicing": "vision",
    "khoaliamle/MNIST-Trained-Model-YOLOv11s-Numeric-Recognition": "vision",
    "khoaliamle/RCNN-Trained-CTC-Loss-MNIST-Numeric": "vision",
    "khoaliamle/Graffiti-Dectection-YOLOv6m": "vision",
    "khoaliamle/Vietnamese-Passport-Field-Recognition": "vision",
    "khoaliamle/SP500-Stock-Prediction": "data",
    "khoaliamle/Water-Meter-Segmentation-Detection": "vision",
    "khoaliamle/Rust_Detection": "vision", "khoaliamle/Garbage_Detection": "vision",
    "khoaliamle/Garbage_Classification": "vision", "khoaliamle/Driver_Behavior_OBD": "data",
    "khoaliamle/Fuel_Efficiency_OBD": "data",
    "khoaliamle/Sall-eGarbageDetection": "vision", "khoaliamle/Interview_AI": "agents",
    "khoaliamle/Facial_Recognition": "vision", "khoaliamle/OBD_Logger": "data",
    "khoaliamle/Tutorbot": "agents", "khoaliamle/QuerySearcher": "agents",
    "khoaliamle/PopTech_Cleaner": "data", "khoaliamle/SimilarityChecker": "agents",
    "khoaliamle/Resources_Searcher": "agents", "khoaliamle/EdSummariser": "agents",
    "khoaliamle/Embedding": "agents", "khoaliamle/Cooking_Tutor": "agents",
    "khoaliamle/WhisperAPI": "agents", "khoaliamle/OCR-MixVL": "vision",
    "khoaliamle/DeepseekOCR": "vision",
}


def get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "profile-archive", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def committed_stamp(value: str | None) -> str:
    if not value:
        return "1970-01-01T00:00:00Z"
    text = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def github_repos() -> list[dict]:
    repos: list[dict] = []
    page = 1
    while True:
        batch = get(f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&type=owner&page={page}")
        if not isinstance(batch, list) or not batch:
            break
        repos.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return repos


def title(name: str) -> str:
    return name.replace("_", " ").replace("-", " ").strip()


def build() -> list[dict]:
    items: list[dict] = []
    for repo in github_repos():
        name = repo["name"]
        if repo["fork"] or name in SKIP:
            continue
        course = name.startswith(COURSE_PREFIXES)
        items.append({
            "id": f"gh:{name}",
            "title": title(name),
            "kind": "repo",
            "area": "coursework" if course else REPO_AREA.get(name, "apps"),
            "summary": SUMMARY.get(name) or (repo["description"] or "").strip(),
            "detail": repo["language"] or "",
            "year": int((repo["created_at"] or repo["pushed_at"])[:4]),
            "committed": committed_stamp(repo.get("pushed_at") or repo.get("created_at")),
            "stat": repo["stargazers_count"],
            "url": repo["html_url"],
        })
    for author in HF_AUTHORS:
        for kind, path in (("model", "models"), ("dataset", "datasets"), ("space", "spaces")):
            for entry in get(f"https://huggingface.co/api/{path}?author={author}&limit=200&full=true"):
                ident = entry["id"]
                area = "clinical" if author in ("MedSwin", "MedVietAI") or "med" in ident.lower() or "pubmed" in ident.lower() or "triage" in ident.lower() else HF_AREA.get(ident, "agents")
                prefix = "" if kind == "model" else f"{path}/"
                task = (entry.get("pipeline_tag") or "").replace("-", " ")
                sdk = entry.get("sdk") or ""
                if kind == "model":
                    summary = f"{task.capitalize()} model published by {author}." if task else f"Model published by {author}."
                elif kind == "dataset":
                    summary = f"Dataset published by {author}."
                else:
                    summary = f"{sdk.capitalize()} Space published by {author}." if sdk else f"Space published by {author}."
                items.append({
                    "id": f"hf:{kind}:{ident}",
                    "title": title(ident.split("/", 1)[1]),
                    "kind": kind,
                    "area": area,
                    "summary": summary,
                    "detail": author,
                    "year": int((entry.get("createdAt") or "2025")[:4]),
                    "committed": committed_stamp(entry.get("lastModified") or entry.get("createdAt")),
                    "stat": entry.get("downloads") if kind != "space" else entry.get("likes", 0),
                    "owner": author,
                    "url": f"https://huggingface.co/{prefix}{ident}",
                })
    items.sort(key=lambda item: item["title"].lower())
    items.sort(key=lambda item: item["committed"], reverse=True)
    return items


def raw_text(url: str) -> str:
    headers = {"User-Agent": "profile-archive", "Accept": "application/vnd.github.raw"}
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def skip_line(stripped: str) -> bool:
    if not stripped or stripped.startswith(("#", "<!--", "![", "<", "|", "---", "===")):
        return True
    return bool(re.fullmatch(r"(!?\[[^\]]*\]\([^)]*\)\s*)+", stripped))


def first_paragraph(markdown: str) -> str:
    lines: list[str] = []
    for line in markdown.splitlines():
        stripped = line.strip()
        if skip_line(stripped):
            if lines:
                break
            continue
        lines.append(re.sub(r"^[-*]\s+", "", stripped))
    text = " ".join(lines)
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= 500:
        return text
    cut = text[:500].rsplit(" ", 1)[0].rstrip(".,;:")
    return cut


def merge_readmes() -> int:
    data = json.loads(OUT.read_text())
    copied = 0
    for item in data["items"]:
        if item.get("kind") != "repo" or not str(item.get("id", "")).startswith("gh:"):
            continue
        name = item["id"].split(":", 1)[1]
        try:
            paragraph = first_paragraph(raw_text(f"https://api.github.com/repos/{GITHUB_USER}/{name}/readme"))
        except Exception:
            continue
        if not paragraph:
            item.pop("readme", None)
            continue
        item["readme"] = paragraph
        copied += 1
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    return copied


if __name__ == "__main__":
    import sys
    if "--readmes" in sys.argv:
        print(merge_readmes(), "readmes")
    else:
        data = {"areas": AREAS, "items": build()}
        OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
        print(len(data["items"]), "items")
