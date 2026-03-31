# Phase 3 — MCP server implementation guide

**Purpose:** Reference for implementing Sherpa’s Phase 3 MCP work **after Phase 2 is complete** (desktop shell + session UX so tools and EvidenceEvents attach to real flows).

**Canonical specs:** [project-architecture-and-plan.md](project-architecture-and-plan.md) (MCP, closed-book, Evidence trail), [PHASE-READINESS.md](PHASE-READINESS.md) (Phase 3 exit criteria), [REPO-LAYOUT.md](REPO-LAYOUT.md) (corpus paths).

---

## 1. Why Phase 2 comes first

Per [PHASE-READINESS.md](PHASE-READINESS.md), **Phase 3 depends on Phase 2**: Electron shell, **Start Random Scenario**, ticket header, dual-persona chat, **End Session / Grade Me** and **I’m stuck** hooks. MCP servers can be exercised from Cursor earlier, but **full Phase 3** (mentor-only tools + **EvidenceEvents** in the real app) needs the host to log tool calls and wire Persona B.

---

## 2. What Phase 3 must deliver (MCP slice)

From [PHASE-READINESS.md](PHASE-READINESS.md) — **Phase 3 — MCP server base**:

| Requirement | Notes |
|-------------|--------|
| **`get_ko(bound_ko_number)`** | Return KO JSON from the agreed source; **reject path traversal** if any filesystem path is derived from user input. |
| **Optional `search_kb`** | Mentor/orchestrator only — **not** technician UI during graded attempt. |
| **EvidenceEvents** | Log tool name, args, timestamp, results — per architecture [Evidence trail](project-architecture-and-plan.md#evidence-trail-closed-book-compatible). |
| **Persona A** | **No** MCP tools. |

**Default stack (architecture):** TypeScript/Node MCP server alongside the app is the recommended default; Python is acceptable but splits the primary language.

---

## 3. Corpus vs Snowflake (choose one at a time)

**Operational rule:** Configure **either** a **corpus-backed** MCP **or** a **Snowflake-backed** MCP in a given environment — **not both** at once. Use the **same tool names** (`get_ko`, `search_kb`) so the mentor layer stays stable when you swap backends.

| Mode | Source of truth at runtime | Typical use |
|------|----------------------------|-------------|
| **Corpus** | Files under `knowledge-objects/corpus/**/*.json` | Local dev, CI, demos without Snowflake. |
| **Snowflake** | Table or view holding KO-shaped JSON | Evaluation when PAT, warehouse, and governance are in place. |

**Handoff contract (unchanged):** On-disk production KOs must match `schemas/knowledge-object.schema.json`, keep **unique** `ko_number` across `corpus/`, and **`npm run validate:kos`** green. Snowflake payloads should deserialize to the **same** logical shape as those JSON files.

---

## 4. Tool contract (both backends)

### `get_ko`

- **Input:** `ko_number` (string), must match `^KO[0-9]+$` (aligned with the schema pattern in `schemas/knowledge-object.schema.json`).
- **Output:** One KO object — same core shape as e.g. `knowledge-objects/corpus/ios/KO40001.json` (`ko_number`, `subject`, `configuration_item`, `state`, `description`, `ts_steps`, `internal_information`, plus optional fields the schema allows).
- **Errors:** Clear message if not found or invalid id.

### `search_kb`

- **Input:** `query` (string); optional `limit` (sensible default and upper bound, e.g. 10–50).
- **Output:** A list of hits (e.g. `ko_number`, short `preview`, optional `score`) sufficient for mentor cross-checks (e.g. “wrong article” patterns). Exact ranking is implementation-defined.
- **Corpus:** Substring or token match over selected fields or a normalized string form of the KO.
- **Snowflake:** Parameterized SQL only — **no** dynamic SQL built by concatenating raw user input.

---

## 5. EvidenceEvents (host responsibility)

- The **stdio MCP process** is not the sole system of record for EvidenceEvents.
- The **Electron app / orchestrator** should record each tool invocation for audit: name, args, timestamp, structured result, aligned with the architecture **Evidence trail** section.
- Implementers may add a short comment in MCP server code pointing here so logging is not duplicated only inside the MCP process.

---

## 6. Corpus MCP — configuration sketch

| Env var | Purpose |
|---------|---------|
| `SHERPA_CORPUS_ROOT` | Optional. Absolute path to the corpus root folder. If unset, default to this repo’s `knowledge-objects/corpus` (relative to the server working directory). |

**Intended behavior:**

1. At startup, recursively discover `**/*.json` under the corpus root.
2. Parse each file; index by `ko_number`; **fail fast** on duplicate `ko_number` or invalid JSON.
3. `get_ko`: lookup by id only — **do not** map arbitrary user strings to file paths (avoids traversal).
4. Transport: **stdio** for Cursor or CLI-spawned clients.

---

## 7. Snowflake MCP — configuration sketch

| Env var | Purpose |
|---------|---------|
| `SNOWFLAKE_ACCOUNT` | Account identifier (treat as sensitive in CI and local config). |
| `SNOWFLAKE_USER` | User identity. |
| `SNOWFLAKE_TOKEN` | Programmatic access token; use per your org’s Snowflake PAT guidance (often as password). |
| `SNOWFLAKE_ROLE` | Role to assume. |
| `SNOWFLAKE_WAREHOUSE` | **Required** for query execution. |
| `SNOWFLAKE_DATABASE` | Database name. |
| `SNOWFLAKE_SCHEMA` | Schema name. |
| `SNOWFLAKE_KO_TABLE` | Table name (e.g. `KOs`); resolve to `DATABASE.SCHEMA.TABLE` in application code. |

**Suggested table shape (adjust names in one module if your warehouse differs):**

- `KO_NUMBER` — string — matches JSON `ko_number`.
- `PAYLOAD` — `VARIANT` — full KO document.

**`get_ko`:** `SELECT` payload for a single `KO_NUMBER` using **bound parameters**.

**`search_kb`:** Parameterized query with a **LIMIT**; avoid unbounded scans in production.

---

## 8. Cursor / IDE — single MCP server entry

Use **one** `mcpServers` entry for Sherpa KO access, pointing at either the corpus or Snowflake implementation. Swap `command`, `args`, and `env` when changing backend — **do not** enable two competing KO servers in the same config.

Illustrative shape (paths and commands to be finalized at implementation time):

```json
{
  "mcpServers": {
    "sherpa-ko": {
      "command": "npx",
      "args": ["tsx", "src/mcp/corpus-server.ts"],
      "cwd": "${workspaceFolder}",
      "env": {}
    }
  }
}
```

---

## 9. Implementation checklist (when Phase 2 is done)

1. [ ] Add MCP dependencies per team choice (e.g. `@modelcontextprotocol/sdk`, runner such as `tsx` if using TypeScript).
2. [ ] Implement corpus and/or Snowflake server with **shared** tool names and schemas where practical.
3. [ ] Wire **EvidenceEvents** in the **Electron / orchestrator** layer for `get_ko` and `search_kb`.
4. [ ] Enforce closed-book rules: **no** technician-facing MCP or KB browser during the graded attempt; mentor/orchestrator only.
5. [ ] Run **`npm run validate:kos`** after any change that affects files under `knowledge-objects/corpus/`.
6. [ ] Update checkboxes in [PHASE-READINESS.md](PHASE-READINESS.md) as items ship.

---

## 10. Related paths in this repository

| Path | Relevance |
|------|-----------|
| `schemas/knowledge-object.schema.json` | KO JSON contract |
| `knowledge-objects/corpus/**` | Corpus-backed `get_ko` |
| `scripts/validate-ko-corpus.mjs` | Corpus validation (`npm run validate:kos`) |
| [PHASE-READINESS.md](PHASE-READINESS.md) | Phase 3 definition of done |

---

## 11. Related documentation links

- [PHASE-READINESS.md](PHASE-READINESS.md) — Phase dependencies and exit criteria  
- [project-architecture-and-plan.md](project-architecture-and-plan.md) — Full architecture, Evidence trail, closed-book rules  
- [REPO-LAYOUT.md](REPO-LAYOUT.md) — Folder map and commands  
