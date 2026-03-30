# Phase 1 readiness checklist

**Later phases:** Detailed scope and sequencing for Phases 2–6 live in [project-architecture-and-plan.md — Phased roadmap](project-architecture-and-plan.md#phased-roadmap). This file stays **Phase 1 only**; separate phase-specific checklists can be added when each phase starts so we do not duplicate or drift from the architecture doc.

**Phase 1 goal (roadmap):** **40** validated JSON KOs (**10** each: Mac, Windows, Zoom, Office Apps) + **agreed** schema validators. Scenarios are **policy-neutral / demo-safe** (no AAD-only or policy-blocked **primary** fixes) — see [project-architecture-and-plan.md — KO generation strategy](project-architecture-and-plan.md#ko-generation-strategy--phase-1-corpus-40-mock-records).

**Folder map for the whole repo:** [REPO-LAYOUT.md](REPO-LAYOUT.md) (also linked from [team-pre-reads.md](team-pre-reads.md)).

## Done in this repo

| Item | Location |
|------|-----------|
| Doc snapshot on Desktop (overwrite-safe) | `~/Desktop/ghd-docs-snapshot-20260328-150517/` — `project-architecture-and-plan.md`, `team-pre-reads.md`, `REPO-LAYOUT.md`, `PHASE1-READINESS.md`, `knowledge-objects-README.md` (= repo `knowledge-objects/README.md`), `fixtures-test-contract.md` (refresh after major doc edits) |
| KO JSON Schema | `schemas/knowledge-object.schema.json` |
| Corpus validator (schema + duplicate `ko_number` + `ts_steps` order) | `npm run validate:kos` → `scripts/validate-ko-corpus.mjs` |
| Corpus drop zone + example | `knowledge-objects/README.md`, `knowledge-objects/corpus/` (production), `knowledge-objects/examples/KO99999.example.json` |
| Export / serializer goldens (Phase 2+ contract) | `fixtures/`, `fixtures/test-contract.md`, `src/serializeExportTranscript.ts` |
| Git repo initialized | `.git/` (commit when the team is ready) |

## Phase 1 exit criteria (definition of done)

- [ ] **40** production `.json` files under **`knowledge-objects/corpus/`** (target **10** per domain — use subfolders or PR checklist).
- [ ] **`npm run validate:kos`** exits **0** (corpus + examples schema-valid; no duplicate `ko_number` in `corpus/`).
- [ ] **`npm test`** passes (serializer goldens unchanged or updated deliberately).
- [ ] **SME sign-off** on corpus content (per team process).

---

## Handoff to Phase 2 (engineering)

Use when **desktop app / MCP / scenario loading** work begins. This section records **assumptions Phase 2 should treat as contract** unless the team explicitly changes them. Full behavior (tray, chat, `get_ko`, evaluator, export) stays in [project-architecture-and-plan.md](project-architecture-and-plan.md) — especially [Phased roadmap](project-architecture-and-plan.md#phased-roadmap) and Phase 2–4 prose.

| Topic | Assumption |
|--------|-------------|
| **Where to load KOs** | Only **`knowledge-objects/corpus/**/*.json`** (recursive). Do **not** load **`knowledge-objects/examples/`** for live scenario pools, counts, or **`get_ko`**. |
| **On-disk shape** | **One KO per file.** Canonical fields: **`schemas/knowledge-object.schema.json`**. |
| **Identity** | **`ko_number`** is unique across the whole **`corpus/`** tree; random scenario and binding should use it. |
| **CI** | Keep **`npm run validate:kos`** and **`npm test`** green on PRs that touch KOs or loaders. |

**Practical first step:** Implement a small loader that enumerates **`corpus/`**, parses JSON, and supports lookup by **`ko_number`** — then wire **Start Random Scenario** to that list (per architecture).

---

## Team agreements still needed (human)

1. **Ownership** — Who drafts KOs, who SME-signs off, PR review expectation (see architecture **KO generation strategy** — Process).
2. **Where to host remote** — Push this folder to GitHub/GitLab (add `remote`, branch protection).
3. **Baseline doc version** — Tag or note which architecture revision Phase 1 executed against (optional).

## Commands

```bash
npm install
npm run validate:kos   # corpus/ + examples/ (see knowledge-objects/README.md)
npm test               # serializer golden tests (unchanged)
```

## Scope reminder (40 KOs)

| Domain | Count |
|--------|-------|
| Mac | 10 |
| Windows | 10 |
| Zoom | 10 |
| Office Apps | 10 |

**Authoring filter:** Generic desk issues (e.g. slow performance, local printer, Excel/Zoom slowness or display quirks); avoid Entra/AAD-only or Intune/policy-blocked **sole** resolution paths — see architecture **Corpus authoring scope (policy-neutral, demo-safe)**.

See architecture doc **KO generation strategy — Distribution**.
