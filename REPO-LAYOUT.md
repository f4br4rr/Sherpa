# Repository layout — what each folder is for

This page explains **top-level folders and key files** in this repo, including work done **before Phase 1** (KO authoring) so newcomers know why things exist.

**Audience:** Anyone joining the project — engineers, SMEs, PMs. For product concepts only, start with [team-pre-reads.md](team-pre-reads.md). For the full spec, see [project-architecture-and-plan.md](project-architecture-and-plan.md).

---

## Root documents

| Item | Purpose |
|------|---------|
| [project-architecture-and-plan.md](project-architecture-and-plan.md) | Single technical blueprint — behavior, phases, schemas described in prose. |
| [team-pre-reads.md](team-pre-reads.md) | Short, non-technical overview for the wider team. |
| [PHASE1-READINESS.md](PHASE1-READINESS.md) | Checklist: Phase 1 steps + exit criteria + **Handoff to Phase 2** (loader assumptions). |
| [REPO-LAYOUT.md](REPO-LAYOUT.md) | This file — map of folders. |

---

## `schemas/`

| File | Purpose |
|------|---------|
| `knowledge-object.schema.json` | **JSON Schema** for one Knowledge Object (KO) — field types, required keys, `ko_number` pattern, `ts_steps` shape, optional `persona` / `contributor_notes` / `rubric`, etc. Aligns with the architecture doc **Data schema blueprint** and **Validation rules**. |

**Why before Phase 1:** So every **production** KO under **`knowledge-objects/corpus/`** can be checked the same way locally and in CI (`npm run validate:kos`), instead of debating validity per pull request.

---

## `knowledge-objects/`

**Phase 1 production KOs** live under **`corpus/`** (one `.json` per KO; optional subfolders e.g. `corpus/mac/` for sorting). **`examples/`** holds templates only — validated for schema but **not** part of duplicate-`ko_number` corpus checks.

| Path | Purpose |
|------|---------|
| `README.md` | Layout (`corpus/` vs `examples/`), field discipline, **40-KO** split, **policy-neutral** authoring, link to schema + architecture. |
| `corpus/.gitkeep` | Keeps `corpus/` in git until the first KO lands. |
| `examples/KO99999.example.json` | Known-good example (illustrative id). |

**Why before Phase 1:** Clear drop zone and example so authors do not invent their own on-disk layout.

---

## `scripts/`

| File | Purpose |
|------|---------|
| `validate-ko-corpus.mjs` | **`corpus/`** — schema, **duplicate `ko_number`** (within corpus), **contiguous `ts_steps.step`**. **`examples/`** — schema + `ts_steps` only (no corpus uniqueness). |

Run from repo root: **`npm run validate:kos`**.

---

## `fixtures/`

**Golden data + contract** for **§5 Export Rules** in the architecture doc (scored vs **debug** transcript, Path 1 intro handling, post-intro gibberish retention).

| Path | Purpose |
|------|---------|
| `test-contract.md` | What the goldens prove, what is **out of scope** (e.g. EvidenceEvent / nuclear ordering tests live elsewhere). |
| `path1-invalid-intro/` | Input + expected **scored** slice + **debug** buffer for invalid intro + Persona A recovery + valid intro. |
| `post-intro-gibberish/` | Input + expected scored transcript; `ui-hint-rule.json` captures **§8 / B7** UI-orchestration notes (spec-backed). |

**Why before Phase 1:** Locks **export / evaluator transcript** behavior in **data** before Electron, MCP, or chat UI exist. Implementation can target these files in Phase 2+.

---

## `src/`

| File | Purpose |
|------|---------|
| `serializeExportTranscript.ts` | **Reference implementation** of the §5 split: builds scored `transcript` + `debugBuffer` from raw session messages (pluggable intro validator). |
| `serializeExportTranscript.test.ts` | **Jest** tests that load `fixtures/` and assert output matches goldens. |

**Why before Phase 1:** Optional spike so the contract is **executable**, not only documentation. The real app may move or replace this module later.

---

## Tooling config (root)

| File | Purpose |
|------|---------|
| `package.json` | Scripts: **`npm test`** (serializer), **`npm run validate:kos`** (KO corpus), **`npm run dev`** / **`npm run build:desktop`** (Electron + React — Phase 2). |
| `package-lock.json` | Locked dependency tree for reproducible installs. |
| `tsconfig.json` | TypeScript settings for `src/`. |
| `jest.config.cjs` | Jest + ESM + ts-jest for tests. |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `dist-electron/`. |

---

## `node_modules/`

Created by **`npm install`**. **Not** hand-edited; **not** committed (see `.gitignore`). Contains Jest, TypeScript, Ajv, etc.

---

## `.git/`

Git metadata — **`git init`** has been run; **remote** and **first commit** are for the team to add when ready.

---

## Quick commands (for people who run the repo)

```bash
npm install
npm run validate:kos   # corpus/ (production) + examples/ (schema only)
npm test               # serializer vs fixtures/
npm run dev            # Electron + Vite (Phase 2 chat shell)
```

## Desktop app (Phase 2+)

| Path | Purpose |
|------|---------|
| [electron/](electron/) | **Main process** (`main.ts`): tray, window lifecycle, IPC **`corpus:list`** reading **`knowledge-objects/corpus/**/*.json`**. **Preload** (`preload.ts`): hardened `contextBridge` → `window.app.listCorpusKos()`. |
| [renderer/](renderer/) | **React + Vite** chat shell: Start random scenario (abandon confirm), ticket header + persona fallback, dual-style bubbles, technician-first empty chat, **I’m stuck** / **End session** placeholders until Phase 4. |
| [vite.config.ts](vite.config.ts) | Vite root `renderer/`; production build → **`dist/renderer/`**. |
| [scripts/build-electron.mjs](scripts/build-electron.mjs) | Bundles `electron/*.ts` → **`dist-electron/*.cjs`** (esbuild). |

**Run from repo root:** `npm run dev` (Vite + watch + Electron) or `npm run build:desktop` then `npm start` for a production-style load (`dist/renderer` + `dist-electron`).
