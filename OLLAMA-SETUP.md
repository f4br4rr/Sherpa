# Local Ollama + Qwen3 for Sherpa

Sherpa talks to the LLM through an **OpenAI-compatible** HTTP API. [Ollama](https://ollama.com) exposes that API at `**http://localhost:11434/v1`**, which matches what `src/llm/client.ts` expects (`POST /v1/chat/completions`).

**Related:** [.env.example](.env.example) (env vars), [PHASE-READINESS.md](PHASE-READINESS.md) (Phase 4 LLM routing).

---

## 1. Install Ollama

1. Download and install Ollama for your OS from **[https://ollama.com/download](https://ollama.com/download)**.
2. On macOS and Windows, the menu-bar app often starts the server automatically. On Linux, follow the site instructions (service or `ollama serve`).

Confirm the API is up:

```bash
curl -s http://localhost:11434/api/tags | head
```

If that fails, start the daemon (e.g. open the Ollama app or run `ollama serve` in a terminal).

---

## 2. Pull a Qwen3 model

Sherpa’s default Ollama model name is `**qwen3**` (see `src/llm/env.ts`). Pull it:

```bash
ollama pull qwen3
```

**Variants:** Tags like `qwen3:8b` or `qwen3:4b` may be smaller/faster. After pulling, list what you have:

```bash
ollama list
```

Set the **exact** tag in `.env` so it matches `ollama list` (e.g. `SHERPA_LLM_MODEL=qwen3:8b`).

---

## 3. Quick test (optional)

```bash
ollama run qwen3 "Reply in one short sentence."
```

Or hit the OpenAI-compatible endpoint:

```bash
curl -s http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3","messages":[{"role":"user","content":"Say hi."}]}' | head -c 400
```

You should see JSON with `choices[0].message` (and sometimes `reasoning` for Qwen3 — Sherpa handles empty `content` in `src/llm/client.ts`).

---

## 4. Configure Sherpa (repo root `.env`)

Copy [.env.example](.env.example) to `.env` if needed, then set at least:

```env
SHERPA_LLM_PROVIDER=ollama
```

**Optional overrides** (defaults are usually fine):


| Variable                            | Default                     | Purpose                                  |
| ----------------------------------- | --------------------------- | ---------------------------------------- |
| `SHERPA_LLM_BASE_URL`               | `http://localhost:11434/v1` | Only change if Ollama listens elsewhere. |
| `SHERPA_LLM_MODEL` / `OLLAMA_MODEL` | `qwen3`                     | Must match a pulled model name.          |


**API key:** Not required for localhost Ollama. If you also set `SHERPA_NVIDIA_API_KEY`, provider selection follows `src/llm/env.ts` (NVIDIA key wins unless you force `SHERPA_LLM_PROVIDER=ollama` and avoid a conflicting setup).

`.env` is loaded on startup via `electron/loadEnv.ts` and `scripts/run-electron.mjs` (see [.gitignore](.gitignore) — do not commit secrets).

---

## 5. Run the app

From the repository root:

```bash
npm install
npm run dev
```

Use **Start Random Scenario** and send a technician message. The Electron **main** process calls Ollama on your machine (same host as the app).

---

## 6. Performance tips

- **GPU:** Ensure Ollama can use GPU drivers where available; CPU-only Qwen3 is often slow (tens of seconds per turn).
- **Smaller quant / tag:** Try a smaller `qwen3:`* variant if latency is too high.
- **Persona B:** Mentor calls omit `max_tokens` so the server/model sets the cap (`src/llm/chatOrchestration.ts`).

---

## 7. Troubleshooting


| Issue                                    | What to check                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| Connection refused on `11434`            | Ollama not running; start app or `ollama serve`.                                |
| `model not found`                        | Run `ollama pull <tag>` and set `SHERPA_LLM_MODEL` to that tag.                 |
| Empty chat replies / errors on `content` | Update Sherpa (reasoning fallback in `extractAssistantText`) or upgrade Ollama. |
|                                          |                                                                                 |


---



