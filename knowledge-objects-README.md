# Knowledge Objects (Phase 1 corpus)

## Where files go

| Location | Purpose |
|----------|---------|
| **`corpus/`** | **Phase 1 production KOs** — one `.json` file per KO (subfolders optional, e.g. `corpus/mac/`, `corpus/windows/` for human sorting only). **`npm run validate:kos`** checks **only** this tree for duplicate `ko_number` and corpus rules. |
| **`examples/`** | Templates — same schema, but **not** counted as production; illustrative `ko_number` values are fine. |

## Rules

- Follow **`schemas/knowledge-object.schema.json`** and [Validation rules](../project-architecture-and-plan.md#validation-rules-for-humans-and-later-automation) in the architecture doc.
- Use **only documented fields** on each KO unless the team extends the schema by agreement (extra keys are allowed by the schema but may be ignored at runtime).
- **`persona`** is **optional** in the schema but **recommended** for realistic ticket headers. If omitted, the desktop app sets the header name from **random given + family** lists (`src/pickDisplayName.ts` in the repo).
- **`ko_number`** must be **unique** across all files under **`corpus/`** (enforced by `npm run validate:kos`).
- **Target (Phase 1):** **40** KOs under **`corpus/`** — **10** each Mac, Windows, Zoom, iOS (enforce split via folders and/or PR review; not automated). Prefer **generic, demo-safe** issues — see [KO generation strategy](../project-architecture-and-plan.md#ko-generation-strategy--phase-1-corpus-40-mock-records).
- **`ts_steps`:** Use **as many numbered steps as needed** for a credible flow (**maximum 15** per KO unless the team changes that rule). Each step has **`title`** + **`action`**. **`examples/KO99999.example.json`** stays **short** for readability; **production** files are typically **much longer**. Avoid invalid JSON in `action` text (e.g. unescaped `\` in Windows paths — see [Validation rules](../project-architecture-and-plan.md#validation-rules-for-humans-and-later-automation)).
- **Mac corpus:** Phase 1 articles under **`corpus/mac/`** are **Apple Silicon–oriented**; use **`configuration_item`** values like **`macOS (Apple Silicon)`** — see architecture doc.

## Validate locally

From repo root:

```bash
npm run validate:kos
```

## Example

See `examples/KO99999.example.json` for **minimal field shape** only — add **as many `ts_steps` as needed** (see bullets above) when authoring real KOs under **`corpus/`** with a unique `KO…` id.

Phase 2+ implementers: [Handoff to Phase 2](../PHASE1-READINESS.md#handoff-to-phase-2-engineering) (corpus path, loader assumptions).
