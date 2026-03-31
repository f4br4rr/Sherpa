# Phase readiness checklist (Phases 1–6)

**Canonical product spec:** [project-architecture-and-plan.md](project-architecture-and-plan.md) — especially [Phased roadmap](project-architecture-and-plan.md#phased-roadmap), **Phase dependencies**, [Recommended MVP scope](project-architecture-and-plan.md#recommended-mvp-scope-do-not-overbuild), and [Written ATS Drill](project-architecture-and-plan.md#written-ats-drill-additive-assessment-mode). If this checklist ever disagrees with the architecture doc, **trust the architecture doc** and update this file.

**Parallel work (six developers, merge order, lanes):** [PHASES-PARALLEL-WORK.md](PHASES-PARALLEL-WORK.md).

**Folder map:** [REPO-LAYOUT.md](REPO-LAYOUT.md) (also linked from [team-pre-reads.md](team-pre-reads.md)).

Use the checkboxes below to track what **must** be true before calling a phase done. Phase 1 items that are already satisfied in this repository remain marked `[x]`; later phases use `[ ]` until the team completes them.

---

## Phase dependencies (must respect)

- **Phase 1 → Phase 2 and Phase 4:** Corpus and validators must be real enough to bind scenarios and test prompts end-to-end.
- **Phase 2 → Phase 3:** Desktop shell and baseline session UX (**Start Random Scenario**, ticket header, dual-persona chat) before MCP and **EvidenceEvents** are exercised end-to-end.
- **Phase 3 → Phase 4:** `get_ko` / `search_kb` on mentor-only paths before the closed-book evaluator loop.
- **Phase 4 → Phase 5:** AI path proven before scorecard polish, Windows pass, and demo freeze.
- **Phase 5 → Phase 6:** Stable **Chat Practice** MVP before **Written ATS Drill**; optional rubric JSON (UI scaffold only) may run in parallel with Phases 4–5 and does **not** block chat.
- **KO auto-enrichment → Exa tier 2:** Do **not** build the enrichment pipeline before Exa adjudication on the evaluator path is stable (post-MVP). See architecture [KO Auto-Enrichment](project-architecture-and-plan.md#ko-auto-enrichment-post-mvp).

---

## Phase 1 — KO mock data

**Roadmap outcome:** **40** validated JSON KOs (**10** per domain: Mac, Windows, Zoom, iOS) + agreed schema validators; **policy-neutral / demo-safe** scope per [KO generation strategy](project-architecture-and-plan.md#ko-generation-strategy--phase-1-corpus-40-mock-records).

### Done in this repo (artifacts)

| Item | Location |
|------|-----------|
| Optional local doc snapshot | A dated copy may exist under `~/Desktop/` (e.g. `ghd-docs-snapshot-*`). **Authoritative** sources are **this repository**; refresh or discard any Desktop copy after **major doc or corpus edits** so it does not contradict the repo. |
| KO JSON Schema | `schemas/knowledge-object.schema.json` |
| Corpus validator (schema + duplicate `ko_number` + `ts_steps` order) | `npm run validate:kos` → `scripts/validate-ko-corpus.mjs` |
| Corpus drop zone + example | `knowledge-objects/README.md`, `knowledge-objects/corpus/` (production), `knowledge-objects/examples/KO99999.example.json` |
| Phase 1 SME sign-off record | [SME-SIGNOFF-PHASE1.md](SME-SIGNOFF-PHASE1.md) |
| Export / serializer goldens (Phase 2+ contract) | `fixtures/`, `fixtures/test-contract.md`, `src/serializeExportTranscript.ts` |

### Phase 1 exit criteria (definition of done)

- [x] **40** production `.json` files under **`knowledge-objects/corpus/`** (target **10** per domain — `mac/`, `windows/`, `zoom/`, `ios/`).
- [x] **`npm run validate:kos`** exits **0** (corpus + examples schema-valid; no duplicate `ko_number` in `corpus/`).
- [x] **`npm test`** passes (serializer goldens unchanged or updated deliberately).
- [x] **SME sign-off** on corpus content — **recorded** in [SME-SIGNOFF-PHASE1.md](SME-SIGNOFF-PHASE1.md). Production KOs use **many granular `ts_steps` per article** (often **9–15** steps); sign-off covers **technical accuracy**, **demo-safety**, and **plausible ordering** across the full step list, not only `subject` / `description`. *Add printed name/role in that file if your org requires a named SME on file.*

### Commands (Phase 1+)

```bash
npm install
npm run validate:kos   # corpus/ + examples/ (see knowledge-objects/README.md)
npm test               # serializer golden tests
```

### Scope reminder (40 KOs)

| Domain | Count |
|--------|-------|
| Mac | 10 |
| Windows | 10 |
| Zoom | 10 |
| iOS | 10 |

**Authoring filter:** Generic desk issues; avoid Entra/AAD-only or Intune/policy-blocked **sole** resolution paths — see architecture **Corpus authoring scope (policy-neutral, demo-safe)** and **KO generation strategy — Distribution**.

---

## Phase 2 — Desktop app shell

**Roadmap outcome:** Electron app with tray/menubar; **Start Random Scenario** (with **abandon** on superseding start); ticket header (`persona` or **random given + family** from `src/pickDisplayName.ts`); **dual-persona** chat styling; technician-first empty chat; **“End Session / Grade Me”** + **“I’m stuck — mentor hint”** (labels may vary).

**Depends on:** Phase 1 (corpus + validators).

### Must complete for Phase 2

- [x] **Electron** app boots with **tray / menu bar** and show/hide main window (per architecture [Recommended system architecture](project-architecture-and-plan.md#recommended-system-architecture)).
- [x] **Start Random Scenario** binds a KO from **`knowledge-objects/corpus/**/*.json`** only (not `examples/`); **abandon** or supersede prior session when starting a new scenario.
- [x] **Mock ticket header:** ticket id / `ko_number`, persona display name, issue description — **`resolveTicketDisplayName`** / `src/pickDisplayName.ts` when `persona` missing.
- [x] **Chat UI:** dual-styled transcript roles (technician vs Persona A vs Persona B), **technician-first** empty chat until first technician message.
- [x] **Controls present:** **End Session / Grade Me** and **I’m stuck — mentor hint** (wiring to real Persona B / MCP may wait for Phases 3–4; shell and session state hooks must exist).

**Practical first step:** Loader enumerating `corpus/`, parse JSON, lookup by `ko_number`, then wire **Start Random Scenario** to that list.

### Handoff to Phase 2 (engineering)

The table below is the **corpus contract** Phase 2+ should treat as binding unless the team explicitly changes it. Full runtime behavior (tray, chat, `get_ko`, evaluator, export) is in [project-architecture-and-plan.md](project-architecture-and-plan.md).

| Topic | Assumption |
|--------|-------------|
| **Where to load KOs** | Only **`knowledge-objects/corpus/**/*.json`** (recursive). Do **not** load **`knowledge-objects/examples/`** for live scenario pools, counts, or **`get_ko`**. |
| **On-disk shape** | **One KO per file.** Canonical fields: **`schemas/knowledge-object.schema.json`**. |
| **Identity** | **`ko_number`** is unique across the whole **`corpus/`** tree; random scenario and binding should use it. |
| **CI** | Keep **`npm run validate:kos`** and **`npm test`** green on PRs that touch KOs or loaders. |
| **Ticket header name** | If KO **`persona`** is missing or whitespace-only, set **`displayName`** via **`resolveTicketDisplayName`** in **`src/pickDisplayName.ts`** (random first + last; stable for the session). |
| **`ts_steps` shape** | **Variable length** per KO (as many steps as needed, **≤ 15** per current team rule). Validator enforces **contiguous** `step` numbers from **1** and schema compliance — see [Validation rules](project-architecture-and-plan.md#validation-rules-for-humans-and-later-automation). |

---

## Phase 3 — MCP server base

**Roadmap outcome:** **`get_ko`** + optional **`search_kb`**, **mentor-only** wiring; **EvidenceEvents** for replay/audit.

**Depends on:** Phase 2 (shell + session UX to attach tools to).

### Must complete for Phase 3

- [x] **`get_ko(bound_ko_number)`** (or equivalent read-by-id) serves KO JSON from the agreed corpus path; **reject path traversal** — corpus MCP (`npm run mcp:corpus`) + main-process **`mentor:getKo`** (`src/mentor/corpusMentorTools.ts`).
- [x] Optional **`search_kb`** (mentor/orchestrator only — **not** technician UI during graded attempt) — corpus MCP + **`mentor:searchKb`** IPC (not exposed on `window.app`).
- [x] **EvidenceEvents** logged for tool calls (name, args, timestamp, results — per architecture [Evidence trail](project-architecture-and-plan.md#evidence-trail-closed-book-compatible) / closed-book policy) — **`src/evidence/`** in-memory store; appended when **`mentor:getKo`** / **`mentor:searchKb`** run (stdio MCP remains separate unless bridged).
- [x] **Persona A** remains **without** MCP tools — preload exposes only **`listCorpusKos`** / **`startRandomSession`**.

### Phase 3 — implementation summary (repo state)

Detailed reference: [PHASE3_DOCUMENTATION.md](PHASE3_DOCUMENTATION.md). High level:

| Area | Implemented |
|------|-------------|
| **Corpus loading** | Shared **`src/corpus/loadCorpusIndex.ts`** for Electron (**`corpus:list`**, **`session:startRandom`**) and tooling; optional **`SHERPA_CORPUS_ROOT`**. |
| **Corpus MCP (stdio)** | **`npm run mcp:corpus`** → **`src/mcp/corpus-server.ts`** with **`get_ko`** and **`search_kb`** (Cursor / IDE). Optional **`npm run dev:mcp`** runs Vite + Electron + corpus MCP together. |
| **Mentor IPC (main process)** | **`mentor:getKo`** / **`mentor:searchKb`** invoke **`src/mentor/corpusMentorTools.ts`** — **not** exposed on **`window.app`** (technician / Persona A has no MCP surface). |
| **EvidenceEvents** | **`src/evidence/types.ts`** (architecture §3 shape), **`evidenceStore.ts`** (in-memory append), **`activeSession.ts`** + **`sessionId`** returned from **`session:startRandom`** for correlation. Events append when mentor tools run in-process. |
| **Electron launch** | **`scripts/run-electron.mjs`** unsets **`ELECTRON_RUN_AS_NODE`** so **`require("electron")`** resolves to the real API (see [REPO-LAYOUT.md](REPO-LAYOUT.md)). |

### Phase 3 — remaining / follow-ups (optional or later phases)

These are **not** all required to treat the Phase 3 **checklist rows above** as satisfied for internal milestones; several items are **product-hardening** or **Phase 4+** by design.

| Item | Notes |
|------|--------|
| **stdio MCP ↔ EvidenceEvents** | The **corpus MCP** process does **not** write into the Electron **`evidenceStore`**. A future **bridge** (or always using in-app mentor tools) would unify audit logs. |
| **Persistence** | Evidence is **in-memory** only; survives until app quit. **Disk / export attachment** aligns with Phase 4–5 (evaluator, demo export, `gradingIntegrity`). |
| **Snowflake MCP** | Not built; [PHASE3_DOCUMENTATION.md](PHASE3_DOCUMENTATION.md) §7 remains the sketch when evaluating a DB-backed backend. |
| **Full closed-book enforcement** | Preload omits mentor tools; **full** “no KB / Exa in technician UI” UX is **Phase 4** (see **Phase 4 — AI validation** below). |
| **Orchestrator / LLM** | Wiring **Persona B** to call **`mentor:getKo`** / **`search_kb`** with **turnIndex** on events is **Phase 4+** (evaluator and sentinel paths). |

---

## Phase 4 — AI validation

**Roadmap outcome:** **Closed-book** UX; **Persona A / B** prompts; **KO-only evaluator** for MVP (`get_ko`; **no Exa** required for score math); **FMNO**; **End Session / Grade Me** + **I’m stuck** wired to Persona B; end-to-end scenario; **Exa adjudication post-MVP**.

**Depends on:** Phase 3.

### Must complete for Phase 4

- [x] **Closed-book:** no internal KB browser and no Exa in **technician** UI during the graded attempt.
- [x] **Persona A** prompts and guardrails (no tools); **Persona B** mentor + evaluator paths with agreed prompt isolation.
- [x] **FMNO:** random **5-digit**, **session-stable** per architecture.
- [x] **I’m stuck** and **nuclear / disproportionate** sentinel behavior per [Dual persona architecture](project-architecture-and-plan.md#dual-persona-architecture-the-chat-experience) and **Runtime behavioral rules** (single **nuclear keyword list owner** per release).
- [x] **Evaluation** on **End Session / Grade Me** only (no auto-grade on “resolved” in MVP); **evaluator** uses **bound KO** via `get_ko`, **ATS three-factor** rubric, **no Exa** on scoring path for MVP.
- [x] **Degraded grading** if `get_ko` fails (e.g. **Incomplete — KO unavailable**, `gradingIntegrity`) per [Session state management design — Final evaluation step](project-architecture-and-plan.md#session-state-management-design).
- [x] **End-to-end:** one full scenario from random start through scorecard with export shape aligned to [Demo export snapshot (minimum v1)](project-architecture-and-plan.md#6-demo-export-snapshot-minimum-v1) (`exportSchemaVersion: "1.0"` for Chat Practice).

### Phase 4 — implementation summary (repo state)

| Area | Implemented |
|------|----------------|
| **LLM routing** | `src/llm/env.ts` — **Gemini**, **OpenAI-compatible** (NVIDIA integrate), or **Ollama** (`SHERPA_LLM_PROVIDER=ollama` / local URL); `.env` loaded via `electron/loadEnv.ts` + `scripts/run-electron.mjs`. |
| **Chat completions** | `src/llm/client.ts` — OpenAI-shaped `/v1/chat/completions`; `message.reasoning` fallback for Ollama/Qwen3; optional omit `max_tokens` for Persona B. `src/llm/geminiClient.ts` for Gemini. |
| **Persona A / B** | `src/llm/prompts.ts`, `src/llm/chatOrchestration.ts` — isolated system prompts; Persona A nuclear hesitation when keywords fire + shallow troubleshooting depth; FMNO in Persona A prompt. |
| **Nuclear sentinel** | `src/llm/nuclear.ts` (regex list) + `electron/main.ts` `chat:personaTurn` — mentor **nuclear** pass after Persona A when last technician line matches. |
| **I’m stuck** | IPC `chat:mentorStuck` → Persona B mentor (`kind: stuck`). |
| **Evaluator** | `src/llm/evaluator.ts` — `mentorGetKo` for bound KO, JSON ATS output, app **recomputes** weighted score (40/35/25) + Pass threshold; Gemini JSON mode when applicable. |
| **Demo export v1** | `src/export/demoExportV1.ts` + `chat:evaluate` returns `demoExport`; scorecard **Copy demo export JSON** in `renderer/src/App.tsx`. |
| **IPC** | `electron/preload.ts` — `chatPersonaTurn`, `chatMentorStuck`, `chatEvaluate` (no mentor tools on `window.app`). |

### Phase 4 — remaining / follow-ups (human or later)

| Item | Notes |
|------|--------|
| **Product QA / sign-off** | Treat checklist rows above as **engineering-complete**; run **scenario QA** (personas, nuclear, grading, export) and record **named acceptance** if your org requires it. |
| **Nuclear keyword owner** | `src/llm/nuclear.ts` is the canonical list for MVP — architecture asks for a **named owner** to review/QA per release. |
| **MCP `search_kb` on LLM tool-calling** | Evaluator uses **`get_ko`**; optional **`search_kb`** for mentor deep analysis is **not** wired as model tool calls (MVP scoring is KO + transcript). |
| **`turnIndex` on EvidenceEvents** | Still not populated on mentor tool events — architecture optional for richer audit. |
| **stdio MCP ↔ EvidenceEvents** | Unchanged from Phase 3 — corpus MCP process does not write the in-app evidence store. |
| **Exa** | **Not** on scoring or technician paths — remains **post-MVP** per roadmap. |
| **Architecture edge cases** | e.g. **unified teardown** on abandon mid-eval, cancel in-flight LLM — verify behavior under manual QA. |
| **Phase 5 overlap** | Scorecard shows Pass / weighted ATS; **Phase 5** still owns fuller **scorecard UX polish**, **Windows** pass, **demo freeze**, and stricter **export** vs architecture **§5 Export Rules** if gaps remain. |

---

## Phase 5 — UI integration and scoring refinement

**Roadmap outcome:** Scorecards, polish, **Windows** pass, **demo freeze** for Chat Practice MVP.

**Depends on:** Phase 4.

### Must complete for Phase 5

- [ ] **Scorecard UX:** Pass / Needs Improvement, per-factor coaching, **weighted score** recomputed in app (**40/35/25**, threshold **≥ 4.0**) — not raw model arithmetic only.
- [ ] **Demo export:** scored canonical transcript + ATS scores + coaching + `gradingIntegrity` + `learningBehavior` per architecture **§6** and **Export Rules**; omit raw EvidenceEvents from **demo** export if policy requires.
- [ ] **macOS-first** packaged demo per MVP scope; **Windows** validation pass for the demo build.
- [ ] **Demo freeze** agreed: scope matches [Recommended MVP scope — Include](project-architecture-and-plan.md#recommended-mvp-scope-do-not-overbuild); **Defer** list (Exa on scoring, SQLite, etc.) not silently expanded without review.
- [ ] Address or explicitly carry **Phase 5 TODOs** in the architecture doc (e.g. `sentinel_cap`, golden transcript schema) before any **production** commitment beyond internal demo.

---

## Phase 6 — Written ATS Drill (additive)

**Roadmap outcome:** Dashboard landing; KO picker (**Published** + category filter; **optional `rubric`** for UI scaffold only); timed written flow; **LLM evaluator + same ATS matrix / MCP / Exa policy as Chat Practice**; export **`ghd-export-v2`** with **`mode: "written_drill"`**; **no change** to Chat Practice **`exportSchemaVersion: "1.0"`** contract.

**Depends on:** Phase 5 (stable Chat MVP).

### Must complete for Phase 6

- [ ] **Dashboard:** two equal entry points — **Written Drill** | **Chat Practice**; tray opens Dashboard once Written ships (per [Landing UX — Written Drill delivery](project-architecture-and-plan.md#landing-ux-written-drill-delivery)).
- [ ] **Written session model:** `sessionKind: 'written_drill'`, own state machine (`atsStep` picker → brief → writing → follow-up → scorecard), **not** chat `phase` enum; mode switch → confirm → unified teardown.
- [ ] **KO picker:** technician **chooses** KO; **Published** + category ≠ **Other**; `rubric` optional; scaffold from `description` / `ts_steps` when rubric absent.
- [ ] **Closed-book** for technician during attempt; **MCP** on evaluation path: at least **`get_ko`**, optional **`search_kb`**; **EvidenceEvents** parity with chat; **Exa** only per feature flag and same policy as chat.
- [ ] **Scoring:** same **LLM evaluator discipline** and **ATS** keys (`technicalKnowledge`, `logicalThinking`, `rootCause`); [Flexibility guardrail](project-architecture-and-plan.md#flexibility-guardrail-not-rote-step-matching) applies; **no** rubric-keyword deterministic scorer.
- [ ] **Export:** `ghd-export-v2` / `written_drill` per [Export — Written Drill](project-architecture-and-plan.md#export--written-drill-ghd-export-v2); scorecard + export **disclaimer** for cross-modality comparison.
- [ ] **Do not** regress Chat Practice personas, export **1.0**, or closed-book rules except via reviewed shared modules.

---

## Team agreements still needed (human)

1. **Ownership** — Who owns schema, MCP, prompts, evaluator, export per [PHASES-PARALLEL-WORK.md](PHASES-PARALLEL-WORK.md) DRI rules.
2. **Remote / branching** — Branch protection on `main`, PR expectations ([team-pre-reads.md](team-pre-reads.md)).
3. **Baseline doc version** — Optional tag noting which architecture revision a phase shipped against.

---

## Related docs

- [PHASES-PARALLEL-WORK.md](PHASES-PARALLEL-WORK.md) — parallel lanes and merge order  
- [SME-SIGNOFF-PHASE1.md](SME-SIGNOFF-PHASE1.md) — Phase 1 corpus attestation  
- [project-architecture-and-plan.md](project-architecture-and-plan.md) — full specification  
- [OLLAMA-SETUP.md](OLLAMA-SETUP.md) — local Ollama + Qwen3 for LLM inference  
