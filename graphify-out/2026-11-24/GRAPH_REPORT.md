# Graph Report - profile  (2026-11-24)

## Corpus Check
- 87 files · ~2,109,097 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 564 nodes · 1145 edges · 23 communities (18 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf2cea7d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- loop.ts
- timeline.tsx
- record-chat.tsx
- NimPool
- store.ts
- package.json
- profile/load.ts
- components.json
- answer.ts
- devDependencies
- compilerOptions
- scripts
- page.tsx
- Product
- archive.py
- Surface brief: home (`app/page.tsx`)
- next-env.d.ts
- postcss.config.mjs
- route.ts
- next
- Liam Le
- dependencies

## God Nodes (most connected - your core abstractions)
1. `vitest` - 26 edges
2. `displayAnswer()` - 24 edges
3. `POST()` - 22 edges
4. `focusOnQuestion()` - 19 edges
5. `NimPool` - 19 edges
6. `searchSections()` - 16 edges
7. `compilerOptions` - 16 edges
8. `createProfileTools()` - 14 edges
9. `namedEmployer()` - 14 edges
10. `ChatDock()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `stepTools()`  [EXTRACTED]
  app/api/chat/route.ts → lib/agent/loop.ts
- `POST()` --calls--> `createProfileTools()`  [EXTRACTED]
  app/api/chat/route.ts → lib/agent/tools.ts
- `POST()` --calls--> `turnToStore()`  [EXTRACTED]
  app/api/chat/route.ts → lib/chat/answer.ts
- `POST()` --calls--> `identityCard()`  [EXTRACTED]
  app/api/chat/route.ts → lib/profile/card.ts
- `POST()` --calls--> `loadProfile()`  [EXTRACTED]
  app/api/chat/route.ts → lib/profile/load.ts

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 0 - "loop.ts"
Cohesion: 0.24
Nodes (13): CLOSED_LABELS, closedFacts(), hasNoText(), hasSectionText(), isRecord(), lastOutputs(), MISS_TOOLS, missesNamedEmployer() (+5 more)

### Community 1 - "timeline.tsx"
Cohesion: 0.09
Nodes (30): inter, metadata, mono, viewport, Chip, index(), measureLabelScroll(), pack() (+22 more)

### Community 2 - "record-chat.tsx"
Cohesion: 0.06
Nodes (43): ChatDock(), finishDrag(), onKeyDown(), onPointerMove(), persist(), clamp(), Point, Context (+35 more)

### Community 3 - "NimPool"
Cohesion: 0.06
Nodes (34): nim(), classifyStatus(), COOL_402_S, COOL_429_S, COOL_DEFAULT_S, COOL_KEY_S, DEMOTE_S, FailureDecision (+26 more)

### Community 4 - "store.ts"
Cohesion: 0.10
Nodes (35): createProfileTools(), kind, adjacentRoleIds(), asksForExperienceSpan(), asksForGraduation(), asksForName(), asksForPlace(), asksForSpokenLanguages() (+27 more)

### Community 5 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, type, @ai-sdk/openai-compatible, @base-ui/react, clsx, react-dom, shadcn (+10 more)

### Community 6 - "profile/load.ts"
Cohesion: 0.13
Nodes (26): ArchiveItem, archiveSection(), archiveSections(), clean(), KIND, sectionId(), withArchive(), IDENTITY_KEYS (+18 more)

### Community 7 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 8 - "answer.ts"
Cohesion: 0.06
Nodes (80): AnswerPart, ASK_STOP, askScore(), askWords(), certifySentences(), citesHeadings(), cleanToken(), collectStrings() (+72 more)

### Community 9 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node, @types/react, @types/react-dom, @types/three, typescript, vitest

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 12 - "page.tsx"
Cohesion: 0.08
Nodes (32): counts, currentMonth(), Home(), items, PROFILE_LINKS, Archive(), ArchiveItem, committedLabel() (+24 more)

### Community 13 - "Product"
Cohesion: 0.17
Nodes (11): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+3 more)

### Community 14 - "archive.py"
Cohesion: 0.52
Nodes (6): build(), committed_stamp(), get(), github_repos(), Build content/archive.json from the public GitHub and Hugging Face APIs. Run:…, title()

### Community 19 - "route.ts"
Cohesion: 0.07
Nodes (41): cleanId(), GET(), lastUserText(), maxDuration, noteEmptySlots(), POST(), readVisitor(), runtime (+33 more)

### Community 22 - "Liam Le"
Cohesion: 0.29
Nodes (6): Contact, Liam Le, Run it, Selected projects, This repository, Work

### Community 23 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, ai, @ai-sdk/openai-compatible, @ai-sdk/react, @base-ui/react, class-variance-authority, clsx, lucide-react (+11 more)

## Knowledge Gaps
- **169 isolated node(s):** `runtime`, `maxDuration`, `inter`, `mono`, `metadata` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 200 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `store.ts` to `loop.ts`, `record-chat.tsx`, `NimPool`, `package.json`, `profile/load.ts`, `answer.ts`, `route.ts`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `react` connect `page.tsx` to `timeline.tsx`, `record-chat.tsx`, `package.json`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `runtime`, `maxDuration`, `inter` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `timeline.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08658536585365853 - nodes in this community are weakly interconnected._
- **Should `record-chat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056866303690260134 - nodes in this community are weakly interconnected._
- **Should `NimPool` be split into smaller, more focused modules?**
  _Cohesion score 0.0649895178197065 - nodes in this community are weakly interconnected._