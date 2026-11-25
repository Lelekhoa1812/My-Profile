# Liam Le

AI Software Engineer in Melbourne, Australia.

I build and own the AI stack. A technical advance counts only when the business can measure it. I have four years in software and three in AI, on retrieval, document intelligence, and agent workflows.

I work at [Axion Solutions](#work). A person approves every write. The assistant drafts the change. It does not own the business database.

Vietnamese is my first language. English is fluent. Mandarin is intermediate.

## Work

| When | Role | Where |
| --- | --- | --- |
| Jul 2026 – now | AI Software Engineer | Axion Solutions |
| May 2025 – now | AI Development Consultant | Teqar, Perth |
| Dec 2025 – Jul 2026 | Senior AI Engineer | Harry the Hirer, Melbourne |
| Nov 2025 – Jun 2026 | AI Team Lead | Mizco, Perth |
| Aug 2025 – Jul 2026 | Researcher | Swinburne University, Melbourne |

At Harry the Hirer, planners got answers they could check on stock, logistics, and documents. Lookup and drafting in the pilot fell about 40%.

At Mizco, I led the path from a noisy quote to an industrial document. A reviewer sees the confidence, the trace, and each failed check. Manual review in that work fell about 50%.

At Swinburne I led a five-person clinical lab. Answers cite a source. The public release is [MedSwin](https://huggingface.co/MedSwin). Scores reached 86% BERTScore on MedMCQA, PubMedQA, and MedQuAD.

I finished a Bachelor of Software Engineering at Swinburne University of Technology (2022–2025) while working.

## Selected projects

- **Clara** (Pythera). Vietnamese medical language and vision model used at 175 Hospital.
- **MedSwin**. Models, datasets, and Spaces from the Swinburne lab.
- **CVA**. Career application agent that drafts, critiques, and waits for approval. [Live](https://cva-mauve.vercel.app) · [GitHub](https://github.com/Lelekhoa1812/CVA)
- **WritingJourney**. IELTS, PTE, and TOEIC writing coach, sold to Hai Au Group. [Live](https://ielts-writing-boost.vercel.app)
- **SkyLedge fleet maintenance**. OBD-II capstone. SkyLedge Kenya acquired it.
- **Water-meter scanner**, **Passport OCR**, **Golf scorecard scanner**, and **Sall-e**. Document and vision tools with public repos.

The visitor page lists the full archive, including public GitHub repositories and Hugging Face models, datasets, and Spaces.

## This repository

This is the portfolio site. Employers and engineering leads read the record, then ask the assistant a question. The assistant answers only from that record. It does not invent scope, rank, or metrics.

The public copy lives in `content/site.ts`. Chat facts also live in `content/profile.json`.

### Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The page renders from the files in this repo. Chat needs a model key. Session storage needs MongoDB. Put these in `.env.local`. Do not commit that file.

| Variable | Use |
| --- | --- |
| `NVIDIA_NIM_API_KEY_1` … `NVIDIA_NIM_API_KEY_9` | NVIDIA NIM keys. The server rotates them. The browser never receives a key. |
| `NVIDIA_NIM_API_KEYS` | Optional comma-separated list of the same keys. |
| `MONGODB_URI` | Profile facts, sections, sessions, and tool traces. |
| `MONGODB_DB` | Optional database name. |

```bash
npm test
npm run typecheck
npm run build
```

## Contact

- Email: [liamkl.work@gmail.com](mailto:liamkl.work@gmail.com)
- Phone: [0450 445 373](tel:+61450445373)
- CV: [`public/cv/dang-khoa-le-cv.pdf`](public/cv/dang-khoa-le-cv.pdf)
- GitHub: [Lelekhoa1812](https://github.com/Lelekhoa1812)
- Hugging Face: [khoaliamle](https://huggingface.co/khoaliamle)
- LinkedIn: [dang-khoa-le](https://www.linkedin.com/in/dang-khoa-le-96a6332a8)
