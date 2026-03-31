# Phases and parallel work (team of six)

**Canonical source:** [project-architecture-and-plan.md — Phased roadmap](project-architecture-and-plan.md#phased-roadmap) and **Phase dependencies** in that same section. This file adds **how six developers can work at once** without contradicting each other.

**Rules that prevent contradictions**

1. **One owner per contract surface:** JSON schema (`schemas/`), export/serializer contract (`fixtures/`, `src/serializeExportTranscript.ts`), session-state types, MCP tool names, and prompt packs — each has a **single DRI** per sprint; others file PRs against them.
2. **Phase order for integration:** You can **start** later-phase spikes on branches, but **merge order** respects dependencies below. Do not merge Phase 4 evaluator wiring before Phase 3 `get_ko` exists, etc.
3. **Phase 1 KO authoring:** **Unique `ko_number` globally** — use a shared tracker (issue board or spreadsheet) or **domain prefixes** plus assignee ranges so two people never claim the same ID.
4. **Long-lived branches:** Prefer **short PRs** plus **feature flags** or **isolated packages** over one mega-branch per person.

---

## All phases (summary)

| Phase | Focus | Main outcome |
| ----- | ----- | ------------ |
| **1** | KO mock data | **40** validated JSON KOs (**10** each: Mac, Windows, Zoom, iOS) plus agreed schema validators |
| **2** | Desktop app shell | Electron: tray, **Start Random Scenario**, ticket header, dual-persona chat UI, **End Session** / **I’m stuck** (UI plus session shell) |
| **3** | MCP server base | **`get_ko`** plus optional **`search_kb`**, mentor-only wiring, **EvidenceEvents** |
| **4** | AI validation | Closed-book UX, Persona A/B prompts, KO-only evaluator, FMNO, end-to-end chat scenario; Exa adjudication post-MVP |
| **5** | UI integration and scoring refinement | Scorecards, polish, Windows pass, demo freeze |
| **6** | Written ATS Drill (additive) | Dashboard, KO picker (Published + category; optional rubric for UI), timed written flow, **LLM evaluator + same ATS / MCP / Exa policy as chat**, **`ghd-export-v2`** — **no change** to Chat Practice **`1.0`** export contract |

---

## Dependencies (what must finish before what)

- **Phase 1 → Phase 2 and Phase 4:** Corpus and validators must be real enough to bind scenarios and test prompts (Phase 2 can use a **subset** of KOs early; Phase 4 needs stable `get_ko` plus KO shape).
- **Phase 2 → Phase 3:** Shell and baseline session UX before MCP is exercised end-to-end.
- **Phase 3 → Phase 4:** `get_ko` / `search_kb` on mentor paths before closed-book evaluator loop.
- **Phase 4 → Phase 5:** AI path working before heavy scorecard and demo freeze.
- **Phase 5 → Phase 6:** Stable Chat MVP before Written Drill ships; **optional rubric JSON authoring** (UI scaffold) may run **in parallel** with Phases 4–5 per the architecture doc (does not block chat delivery).
- **KO Auto-Enrichment:** After Exa adjudication is stable (post-MVP Phase 4+). Do **not** build the enrichment pipeline before that.

---

## Six people in parallel (by phase band)

### While Phase 1 is active (corpus not complete)

| Lane | Suggested headcount | Work | Collision avoidance |
| ---- | ------------------- | ---- | --------------------- |
| **Mac KOs** | 1 | 10 KOs | Own `ko_number` list; PRs touch only assigned files under `knowledge-objects/corpus/` |
| **Windows KOs** | 1 | 10 KOs | Same |
| **Zoom KOs** | 1 | 10 KOs | Same |
| **iOS KOs** | 1 | 10 KOs | Same |
| **Schema / validator / CI** | 1 | `schemas/`, `scripts/validate-ko-corpus.mjs`, CI | **DRI merges**; KO authors do not change schema without review |
| **Fixtures / serializer / docs** | 1 | `fixtures/`, `src/`, export docs | **DRI** for `serializeExportTranscript` and golden fixtures |

If validator and fixtures are light, merge lanes (e.g. one person owns both) and assign **two KO domains** to another person with strict ID ranges.

**Effort note:** Lanes are **10 articles per domain**, not equal hours. KOs differ in **`ts_steps` depth** (many granular steps per issue); plan SME review and scheduling accordingly.

### When Phase 1 is good enough to unblock app work (Phases 2–3 overlap)

| Person | Primary track | Depends on | Notes |
| ------ | ------------- | ---------- | ----- |
| **A** | Electron shell: tray, window, routing | Phase 1 subset | Own main process / entry |
| **B** | Session, ticket header, chat layout (no LLM) | Agreed IPC contract with A | Own renderer state module |
| **C** | Styling, design tokens, dual-persona bubbles | B’s components | Do not change session shape without B |
| **D** | MCP server: `get_ko`, EvidenceEvents | Corpus path from Phase 1 | Own MCP package or process |
| **E** | Wire **End Session** / **I’m stuck** to stubs, then to MCP | B plus D interfaces | Small, frequent integration PRs |
| **F** | Tests, build pipeline, Windows smoke checklist | All | Own CI; does not own product contracts alone |

Phase 3 **full** end-to-end still waits on Phase 2 shell — **D** can implement MCP against **fixtures** until the shell lands.

### Phases 4–5 (AI plus polish)

| Person | Track | Collision avoidance |
| ------ | ----- | ------------------- |
| **A** | Persona A (customer) prompts and UX copy | Own agreed `prompts/` subtree or package |
| **B** | Persona B (mentor) plus stuck/nuclear gating | **Single nuclear keyword list owner** per release (architecture doc) |
| **C** | Evaluator loop, KO-only scoring | Own evaluator module; uses `get_ko` as contract |
| **D** | Closed-book UX (hide KB, etc.) | Align session flags with B and C |
| **E** | Scorecards, export polish, Phase 5 TODOs | Own UI; schema changes with F |
| **F** | Export schema, golden transcripts, Windows pass | DRI for JSON schema updates |

### Phase 6 (after Phase 5 freeze)

Split by feature: dashboard shell, KO picker, written flow UI + timer, **shared evaluator / MCP wiring** with chat team, `ghd-export-v2` writer, tests.

**Hard rule:** Do **not** change Chat Practice export contract or Persona A/B behavior except through reviewed shared modules.

---

## Merge order cheat sheet

1. Schema and shared types (if changed)  
2. Corpus additions (`knowledge-objects/corpus/`)  
3. MCP and IPC  
4. Renderer and prompts  
5. Evaluator and scorecard  
6. Written Drill (separate export path)

---

## Related docs

- Phase readiness (Phases 1–6) — what “done” means per phase: [PHASE1-READINESS.md](PHASE1-READINESS.md)  
- Repo layout and commands: [REPO-LAYOUT.md](REPO-LAYOUT.md)  
- Onboarding: [team-pre-reads.md](team-pre-reads.md)

**Maintenance:** When the architecture roadmap changes, update this file so the phase table and dependencies stay aligned with [project-architecture-and-plan.md](project-architecture-and-plan.md).
