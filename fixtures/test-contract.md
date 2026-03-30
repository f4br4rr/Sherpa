# Serializer golden fixtures — test contract

This folder supports **Jest (or similar) golden tests** for the **scored vs debug transcript split** described in **`project-architecture-and-plan.md` → §5 Export Rules**, using **§6** for minimum **Message** shape on the scored path and **§8** for **post-intro gibberish** retention and Persona A behavior.

## What these tests prove

1. **Path 1 (§5):** Invalid technician intro rows and Persona A intro recovery rows are **omitted** from the scored canonical transcript and appear only in the **debug buffer**, with **`turnIndex: null`** on those debug rows. The first **valid** technician intro is **`turnIndex: 0`** in scored output.
2. **FIX 2 (§5):** Scored transcript messages **must not** include **`appendedDuringIntro: true`** (field must be absent from scored JSON, not merely `false`).
3. **Removal 1 + gibberish (§5 + §8):** After a valid intro, **technician** rows that are classified as gibberish/incoherent **remain** in the scored transcript; **`turnIndex`** is **0..n** in scored order. **Persona A is not invoked** for those gibberish turns (orchestration — often tested outside the serializer, but **`ui-hint-rule.json`** records the spec rule for adjacent suites).

## What these tests do *not* prove

- **EvidenceEvent** shape, **`flaggedDebug`**, or intro-time tool logging (**§3**) — **orchestrator / evidence pipeline** tests.
- **Nuclear vs stuck ordering (§8 C8)** — **orchestrator** tests.
- **Per-message `graded`** — **not** part of **§6** minimum `transcript` entry shape (`authorRole`, `content`, `timestamp`, `turnIndex`, optional `messageId`). If the app adds `graded` later, serializer tests should **not** require it unless you adopt an extended schema explicitly.

## Fixture conventions

| Convention | Rationale |
|------------|-----------|
| **`transcript`** (not `messages`) in scored outputs | Matches **§6** demo export field name for `Message[]`. |
| **`exportSchemaVersion: "1.0"`** on scored slices | **§6** Chat Practice semver; fixtures are a **partial document** (transcript slice + version), not a full scorecard payload. |
| **`debugBuffer` array** | Implementation-facing; **§5** requires debug Path 1 rows with **`turnIndex: null`** and suggests **`debugOnly: true`**. |
| **`reason` on debug rows** | **Not** defined in the architecture doc — **fixture / implementation vocabulary** for audits. Safe for goldens if tests only assert **`turnIndex: null`**, **`debugOnly`**, and presence of expected rows. |
| **`_fixtureNote`** | Human-readable; strip or ignore in strict JSON comparisons if desired. |

## Raw input shape

**`input-raw.json`** uses a **`messages`** array for **pre-serialization** session state (may omit or include live `turnIndex`). The serializer under test is responsible for producing **`transcript`** + **`debugBuffer`** per **§5**.
