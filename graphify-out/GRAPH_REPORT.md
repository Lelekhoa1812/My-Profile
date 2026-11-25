# Graph Report - profile  (2026-11-25)

## Corpus Check
- 90 files · ~2,156,970 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 657 nodes · 1439 edges · 34 communities (30 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c366bc9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- profile/load.ts
- displayAnswer
- record-chat.tsx
- focusOnQuestion
- store.ts
- package.json
- dependencies
- components.json
- answer.ts
- toggle-group.tsx
- compilerOptions
- evidence.ts
- page.tsx
- Product
- archive.py
- Surface brief: home (`app/page.tsx`)
- next-env.d.ts
- postcss.config.mjs
- loop.ts
- route.ts
- devDependencies
- Liam Le
- NimPool
- header.tsx
- layout.tsx
- withSectionProof
- archive.tsx
- scripts
- sources.ts
- timeline.tsx
- ChatDock
- hero-console.tsx
- utils.ts

## God Nodes (most connected - your core abstractions)
1. `displayAnswer()` - 53 edges
2. `plainSentences()` - 38 edges
3. `sectionBlocks()` - 35 edges
4. `namedEmployer()` - 32 edges
5. `focusOnQuestion()` - 30 edges
6. `vitest` - 27 edges
7. `POST()` - 24 edges
8. `searchSections()` - 22 edges
9. `NimPool` - 19 edges
10. `createProfileTools()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `stepTools()`  [EXTRACTED]
  app/api/chat/route.ts → lib/agent/loop.ts
- `POST()` --calls--> `createProfileTools()`  [EXTRACTED]
  app/api/chat/route.ts → lib/agent/tools.ts
- `POST()` --calls--> `loadNimKeys()`  [EXTRACTED]
  app/api/chat/route.ts → lib/nim/keys.ts
- `POST()` --calls--> `identityCard()`  [EXTRACTED]
  app/api/chat/route.ts → lib/profile/card.ts
- `POST()` --calls--> `loadProfile()`  [EXTRACTED]
  app/api/chat/route.ts → lib/profile/load.ts

## Import Cycles
- None detected.

## Communities (34 total, 3 thin omitted)

### Community 0 - "profile/load.ts"
Cohesion: 0.13
Nodes (26): ArchiveItem, archiveSection(), archiveSections(), clean(), KIND, sectionId(), withArchive(), IDENTITY_KEYS (+18 more)

### Community 1 - "displayAnswer"
Cohesion: 0.13
Nodes (38): archiveAnswer(), citesHeadings(), cityJobsAnswer(), cloudAnswer(), codeLanguageAnswer(), databaseAnswer(), deploymentAnswer(), detectedAnswer() (+30 more)

### Community 2 - "record-chat.tsx"
Cohesion: 0.15
Nodes (12): Context, FOCUS_EVENT, FocusDetail, RecordChat, STEP_LINES, Props, RecordScene(), seeded() (+4 more)

### Community 3 - "focusOnQuestion"
Cohesion: 0.11
Nodes (32): askedOnlyHere(), askScore(), askWords(), bothWorkAnswer(), countedFact(), countedSentence(), dateOnly(), employmentPeriod() (+24 more)

### Community 4 - "store.ts"
Cohesion: 0.08
Nodes (52): createProfileTools(), kind, leadOf(), TurnRead, identityAnswer(), adjacentRoleIds(), askedPhrases(), askedProductSectionIds() (+44 more)

### Community 5 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, type, @ai-sdk/openai-compatible, @ai-sdk/react, @base-ui/react, react-dom, shadcn (+9 more)

### Community 6 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, ai, @ai-sdk/openai-compatible, @ai-sdk/react, @base-ui/react, class-variance-authority, clsx, lucide-react (+11 more)

### Community 7 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 8 - "answer.ts"
Cohesion: 0.09
Nodes (36): AnswerPart, ASK_STOP, beforePeriodsAnswer(), certifySentences(), cleanToken(), collectStrings(), CONTENT_STOP, contentWords() (+28 more)

### Community 9 - "toggle-group.tsx"
Cohesion: 0.36
Nodes (8): Chip, ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants, cn(), class-variance-authority

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "evidence.ts"
Cohesion: 0.18
Nodes (14): dropGapSentences(), stripMarkdown(), stripToolMarkup(), ALLOWED, EvidencePart, FRAMING, keepToolSentences(), outputTexts() (+6 more)

### Community 12 - "page.tsx"
Cohesion: 0.13
Nodes (19): counts, currentMonth(), Home(), items, PROFILE_LINKS, Cases(), ProjectEntry(), Projects() (+11 more)

### Community 13 - "Product"
Cohesion: 0.17
Nodes (11): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+3 more)

### Community 14 - "archive.py"
Cohesion: 0.33
Nodes (10): build(), committed_stamp(), first_paragraph(), get(), github_repos(), merge_readmes(), Build content/archive.json from the public GitHub and Hugging Face APIs. Run:…, raw_text() (+2 more)

### Community 19 - "loop.ts"
Cohesion: 0.28
Nodes (11): force(), ForcedTool, hasFacts(), hasReadText(), hasSectionIds(), isRecord(), lastOutput(), StepToolChoice (+3 more)

### Community 20 - "route.ts"
Cohesion: 0.07
Nodes (51): cleanId(), GET(), lastUserText(), maxDuration, noteEmptySlots(), POST(), readVisitor(), runtime (+43 more)

### Community 21 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node, @types/react, @types/react-dom, @types/three, typescript, vitest

### Community 22 - "Liam Le"
Cohesion: 0.29
Nodes (6): Contact, Liam Le, Run it, Selected projects, This repository, Work

### Community 23 - "NimPool"
Cohesion: 0.06
Nodes (35): nim(), classifyStatus(), COOL_402_S, COOL_429_S, COOL_DEFAULT_S, COOL_KEY_S, DEMOTE_S, FailureDecision (+27 more)

### Community 24 - "header.tsx"
Cohesion: 0.27
Nodes (7): Header(), NAV, Readout(), paintTheme(), readTheme(), Theme, ThemeSwitch()

### Community 25 - "layout.tsx"
Cohesion: 0.15
Nodes (10): inter, metadata, mono, viewport, Tooltip(), TooltipContent(), TooltipProvider(), TooltipTrigger() (+2 more)

### Community 26 - "withSectionProof"
Cohesion: 0.19
Nodes (14): dutyOutcome(), exposesGap(), missingApproval(), missingMeasured(), namedProduct(), newProof(), otherProduct(), periodSentence() (+6 more)

### Community 27 - "archive.tsx"
Cohesion: 0.32
Nodes (7): Archive(), ArchiveItem, committedLabel(), KIND_NAME, KINDS, statLabel(), FilterChips()

### Community 28 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 29 - "sources.ts"
Cohesion: 0.15
Nodes (15): RecordChatProvider(), Answer(), cases, roles, anchorSegments(), describe(), findTerm(), GENERIC_TERMS (+7 more)

### Community 30 - "timeline.tsx"
Cohesion: 0.21
Nodes (12): index(), measureLabelScroll(), pack(), RoleList(), scrollDuration(), ScrollingBarLabel(), START, Timeline() (+4 more)

### Community 31 - "ChatDock"
Cohesion: 0.22
Nodes (10): ChatDock(), finishDrag(), onKeyDown(), onPointerMove(), persist(), clamp(), Point, panelFrame() (+2 more)

### Community 32 - "hero-console.tsx"
Cohesion: 0.24
Nodes (9): stepsOf(), toTurns(), Turn, useRecordChat(), AskField(), HeroConsole(), Line, Props (+1 more)

### Community 33 - "utils.ts"
Cohesion: 0.40
Nodes (4): Button(), buttonVariants, clsx, tailwind-merge

## Knowledge Gaps
- **179 isolated node(s):** `runtime`, `maxDuration`, `inter`, `mono`, `metadata` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `route.ts` to `profile/load.ts`, `displayAnswer`, `store.ts`, `package.json`, `evidence.ts`, `loop.ts`, `NimPool`, `sources.ts`, `ChatDock`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `react` connect `record-chat.tsx` to `hero-console.tsx`, `package.json`, `toggle-group.tsx`, `page.tsx`, `header.tsx`, `layout.tsx`, `archive.tsx`, `timeline.tsx`, `ChatDock`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `runtime`, `maxDuration`, `inter` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `profile/load.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12773109243697478 - nodes in this community are weakly interconnected._
- **Should `displayAnswer` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Should `focusOnQuestion` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._