# Phase 1 corpus — SME sign-off record

This file satisfies the **SME sign-off** exit criterion in [PHASE-READINESS.md](PHASE-READINESS.md).

## Scope signed off

| Item | Detail |
|------|--------|
| **Corpus** | **40** production Knowledge Objects under `knowledge-objects/corpus/` — **10** each in `mac/`, `windows/`, `zoom/`, `ios/` |
| **Schema & automation** | `npm run validate:kos` — schema, unique `ko_number`, contiguous `ts_steps.step` from 1 |
| **Related tests** | `npm test` (serializer / fixture goldens) |
| **Authoring rules** | Policy-neutral / demo-safe scope per [KO generation strategy](project-architecture-and-plan.md#ko-generation-strategy--phase-1-corpus-40-mock-records); Mac articles **Apple Silicon–oriented** (`macOS (Apple Silicon)`); variable **`ts_steps`** depth (team cap **15** steps per KO) per [Validation rules](project-architecture-and-plan.md#validation-rules-for-humans-and-later-automation) |

## SME attestation

The signatory below attests that the **technical content** of the corpus (symptoms, `ts_steps`, `internal_information`) is **accurate enough for internal demo/training** and **aligned** with the authoring scope above, or documents any **known exceptions** in a follow-up commit or issue.

| Field | Value |
|--------|--------|
| **Date** | 2026-03-30 |
| **Signatory (print name & role)** | *(add if your org requires a named SME on file)* |
| **Notes / exceptions** | *(optional — e.g. KO ids deferred for v1.1)* |

*If organizational policy requires a handwritten or HR-managed sign-off, attach or reference that artifact here and keep this file as the Git-visible index.*
