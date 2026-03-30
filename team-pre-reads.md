# Team Pre-Reads — IT Technician Training Simulator

**Who this is for:** Everyone on the demo team, including stakeholders like Bryan, whether you write code or not.

**What this is:** Short explanations of the ideas we will keep hearing about (concepts), plus a short **local setup** for anyone using the repo in Cursor. The numbered “Concept” sections below are concept-only.

**Companion doc:** For the full technical blueprint, see [project-architecture-and-plan.md](project-architecture-and-plan.md).

**Repo map:** For what each folder is for (`schemas/`, `fixtures/`, `knowledge-objects/`, etc.) and why those exist before Phase 1, see [REPO-LAYOUT.md](REPO-LAYOUT.md).

**Developers (parallel work):** Phases 1–6, dependency order, and how **six people** can split work without contradictions — [PHASES-PARALLEL-WORK.md](PHASES-PARALLEL-WORK.md).

## Local setup (everyone)

**Prerequisites:** [Node.js](https://nodejs.org/) **20 or newer** (LTS is fine). **npm** ships with Node; you do not need Yarn or pnpm for this repo.

**What you get:** Installing dependencies pulls TypeScript, Jest, and the KO corpus validator so you can build, run tests, and validate knowledge objects locally. Each teammate runs install on their own machine; the lockfile keeps versions aligned.

1. **Clone or pull** this repository (same copy everyone else uses on GitHub).
2. **Open the repo in Cursor:** **File → Open Folder…** and choose the **Sherpa** root (the folder that contains `package.json`).
3. **Install dependencies** — in the integrated terminal (or any shell), **cd** to that root, then:
   ```bash
   npm install
   ```
4. **Sanity checks** (optional but recommended after install or before a PR):
   ```bash
   npm run build          # TypeScript compile
   npm test               # serializer / fixture tests
   npm run validate:kos   # KO corpus + examples (when editing knowledge-objects/)
   ```

**When to run `npm install` again:** After `package-lock.json` changes (e.g. someone added or upgraded a dependency), or on a fresh clone.

**Do not commit** `node_modules/` — it is listed in `.gitignore`. Commit changes to `package.json` / `package-lock.json` only when the team intentionally changes dependencies.

**More detail:** Folder layout, scripts, and how `schemas/`, `fixtures/`, and `knowledge-objects/` fit together — [REPO-LAYOUT.md](REPO-LAYOUT.md). Phase 1 checklist and commands — [PHASE1-READINESS.md](PHASE1-READINESS.md).

---

### Two ways to practice (product direction)

The desktop app is planned to offer **two equal modes** once the second milestone ships: **Chat Practice** (random scenario, dual-persona chat, AI grading against the bound article) and **Written ATS Drill** (you pick a case, timed free-text in structured sections, **deterministic** keyword-based scoring — **no chat bot on that grading path**). Same KO library; **Written Drill** only lists articles that include a validated **rubric**. **Pass threshold and ATS weights match** the chat rubric on paper, but **written scores measure rubric coverage** — they are **not the same** as live chat scores; the scorecard and export carry a short disclaimer. **Saved files differ:** Chat Practice demo export uses **`exportSchemaVersion: "1.0"`** (official transcript + scores); Written Drill uses a **separate** JSON contract (**`ghd-export-v2`**, **`mode: "written_drill"`**) — see the architecture doc. Until **Written Drill** is built, work focuses on **Chat Practice** first.

---

## How a practice session starts (random scenario, ticket header, you speak first)

Before the numbered “deep” concepts below, here is the **actual flow** we are designing:

1. You click **Start Random Scenario**. The app picks **one** of our Knowledge Objects at random and builds a **fake ticket** like the ones you see in ServiceNow. If you were **already** in a practice ticket, that old session is **thrown away** (no saved score) and a new one starts — same idea as closing a tab and opening a fresh ticket.
2. You see a **ticket header** at the top: **ticket number** (**ko_number**), **persona name**, and **issue description** (**issueSummary**). The **name** usually comes from optional metadata on the article (**persona**, like “Karen - Accounting”); if the article has no persona, the app builds a **random full name** each scenario by combining a random **first name** and a random **last name** from two curated lists (see **`src/pickDisplayName.ts`** in the repo). The chat area below is **empty**.
3. **You (the technician) always send the first message** — for example, introducing yourself and offering help. The **simulated customer does not type until you do.**
4. After your intro, the **fake end-user** describes their problem in plain language. From there, the chat works like a real ticket: you ask questions, they answer **only** what you asked. **Export note:** The **official scored transcript** — the **same** conversation the mentor uses for **final grading** and the **demo JSON** includes — **starts at your first valid introduction**; failed opening attempts and the bot’s recovery line live in a **debug-only** audit path, not in that scored export. Rules: [Export Rules](project-architecture-and-plan.md#5-export-rules) in the architecture doc (Session state management, heading **5. Export Rules**).
5. If you ask for their **FMNO** (our internal employee number), the simulation will answer with a **random 5-digit number** and will **keep using that same number** if you ask again — like a stable ID for that session.

There is also a **second AI role** — a **senior mentor** — that usually stays **quiet** in the background and only **steps into the chat** if you are **totally stuck** or suggest something **destructive** (like wiping a machine for a tiny app issue). At the end, that same mentor voice gives you **scores and feedback**. The architecture doc explains how we keep those two roles from sounding like the same person.

**Closed-book rule (during the graded attempt):** While you are working the ticket, you **do not** get a **Search KB** button, **internal runbook viewer**, or **web search** in the app. The point is to assess **your** troubleshooting — like a closed-book quiz. The **mentor system** uses our **bound internal article** in the background to grade you on the **first release (MVP)**. **Exa** (web-style evidence) for **fair grading when your fix differs from the article** is planned **after MVP** — see Concept 2.

---

## Concept 1: What is an MCP server?

**MCP** stands for **Model Context Protocol**. Think of an MCP server as a **controlled bridge** between an AI assistant and your **local, approved information**.

Without MCP (or a similar pattern), a chatbot only knows what is in the conversation — or what someone pasted in. With MCP, the assistant can ask for **specific, allowed actions**, such as “search our local knowledge articles,” and the server returns **only what we decide it may see**.

**Simple analogy:** Imagine a help desk with a **locked drawer** of runbooks. The AI cannot open the drawer by itself. It must use a **defined tool** — like asking a librarian — and the librarian (the MCP server) brings back **sanitized, relevant pages**.

**Why we care:** Training simulations need **realistic knowledge** without exposing your whole computer or random files. MCP keeps access **narrow, predictable, and reviewable**.

**During a graded simulation:** MCP is used **only on the mentor side** (behind the scenes) so the **observer** can load the **bound article** and compare your work — **not** so you can search runbooks during the test. That keeps the sim a **closed-book** assessment.

---

## Concept 2: The value of Exa.ai

When people search the web or a KB, they often type **keywords** — like an error code or product name. That works when you already know the **right words**.

**Semantic search** is different: it tries to understand **meaning** and context — so it can match **ideas**, not only exact phrases.

**Exa.ai** in **our** architecture is **not** there so you can “look up the answer” during the graded simulation (you **cannot** — **closed-book**). Each practice ticket is already tied to **one** of our internal articles.

- **MVP (first release):** Your score is based on that **internal article** and the **conversation** only. **Exa is not part of the scoring engine** in v1.
- **After MVP:** Exa can help the **mentor** judge whether a solution that **does not match** the KO is still **valid** using **public vendor or reputable docs**, and we can add **after-score** “explore references” for **learning** (without changing a completed grade).

**Ground rule (when Exa is enabled later):** Our **internal article stays the main “company line”** for safety and policy; Exa helps judge **alternatives**, not overwrite critical warnings without rules.

---

## Concept 3: Version control — Git and GitHub

**Git** is a way to track **changes to files over time** — like “track changes” for an entire project, with the power to merge work from multiple people.

**GitHub** is a website (and service) where the team stores that Git history in the cloud so everyone can collaborate.

**Repository (“repo”):** The project folder plus its full history.

**Branch:** A **parallel line of work**. Example: you fix Zoom scenarios on a branch so `main` stays stable while you experiment.

**Pull request (“PR”):** A request to **merge** your branch into `main` (or another branch), usually with a description and review. It is the team’s quality gate before “this is official.”

**Why collaboration is safer with version control:** You can see **who changed what**, **undo** mistakes, and **review** before merging — instead of emailing files named `KO_final_FINAL_v3.xlsx`.

---

## Concept 4: Data structures — APIs and JSON (using our mock ServiceNow KO)

An **API** (Application Programming Interface) is a **structured way for programs to talk to each other** — “if you send me X, I return Y.” Our desktop app, MCP server, and cloud AI services will exchange data through APIs in a predictable format.

**JSON** is a common text format for that data. It uses **curly braces** for objects, **quotes** for text, **square brackets** for lists, and **commas** between items. It is easy for both humans and software to read.

Our **mock ServiceNow** knowledge articles are **Knowledge Objects (KOs)** stored as JSON. Each KO is one “article” with a number, title, configuration item, state, description, troubleshooting steps, internal notes, and **optionally** a **`persona`** string (fake **name and department** for the ticket header).

**Example shape** (illustrative only): The **Zoom / gray boxes** scenario below is **made-up sample text** to teach what JSON looks like. It is **not** the only kind of issue we will ship — the real project uses **many different KOs** (Mac, Windows, Zoom, Office Apps) with their own subjects and steps. Your real files will replace this content with reviewed articles.

Severity is intentionally excluded from this product. Scenarios are presented without severity framing.

```json
{
  "ko_number": "KO77812",
  "persona": "Karen - Accounting",
  "subject": "Gray boxes on Zoom when sharing a screen",
  "configuration_item": "Zoom (Windows)",
  "state": "Published",
  "description": "This happens when sharing an application or a video on a Zoom meeting.",
  "ts_steps": [
    {
      "step": 1,
      "title": "Disable Optimize for Video Clip",
      "action": "Instructions go here..."
    }
  ],
  "internal_information": "If issue persists, do X."
}
```

**How to read this:** Top-level fields describe the ticket/article. `ts_steps` is a **list** of steps; each step has its own `title` and `action`. This nesting is normal — programs walk the structure tree the same way every time.

---

## Concept 5: AI integration — LLMs, MCPs, prompting, and Claude

**LLM** means **large language model** — the AI that generates text based on input and patterns learned from data. It does not “know” your private files unless we **give** them through a controlled path.

**Two AI “people” in one session (dual persona):** Our design uses **two different roles** in the same practice ticket:

- **Persona A — the simulated end-user:** Non-technical, **only answers what you asked**, does not spoil the root cause or skip ahead, and does **not** sound like they read our internal knowledge base.
- **Persona B — the mentor / grader:** A **senior IT technician** who stays **mostly in the background**, **only jumps into the chat** if you are **completely stuck** or suggest something **overly destructive**, and who delivers the **final evaluation** when the scenario ends.

In the app, those voices should **look different** in the UI (for example **different colors, labels, or avatars**) so you always know whether **the customer** or **the mentor** is talking.

**Prompting** is how we **instruct** the model for **each** role — separate instructions so the customer does not accidentally sound like a coach (and vice versa).

**Tools (function calling) and MCP:** During the graded sim, **you** do **not** run MCP. The **mentor/orchestrator** uses tools like **load this article by ID** (and sometimes **search** across articles) **only on the backend** so scoring stays tied to real runbooks — while you stay **closed-book**. The **customer** never sees ServiceNow wording from MCP.

**Claude** (in our architecture plan) is one strong option for powering these roles — using **separate calls or modes** for the **customer** reply (**no tools**), the rare **mentor interrupt**, and the **final grading**. On **final grading**, **MCP** runs **in secret** so the mentor can load the **bound article** and score you (**MVP**). **Exa is not used for score math in v1**; **after MVP**, **optional Exa** may help the mentor judge **off-KO fixes** — still **never** as a technician-facing search during the attempt.

**Why MCP still matters:** It connects the **approved local library** to the **grading engine** — not to your screen mid-test.

**How the mentor should feel when it *does* speak or when you get your score:** **Patient Senior IT** — you get **three rated areas** (technical knowledge, logical thinking, root-cause troubleshooting), a **weighted score**, and either **Pass** or **Needs Improvement**, plus **coaching** — not a single “you failed everything” because one detail was fuzzy. **Course correction** for “nuclear” fixes instead of instant failure. The **customer** side stays **strict** about **not volunteering** extra clues. The model should **not** rubber-stamp “all fixed!” unless you have shown **real steps and evidence**.

---

## Concept 6: Deployment — CI/CD with GitHub Actions

**CI/CD** stands for **Continuous Integration** and **Continuous Delivery/Deployment**. Fancy words for a simple idea: **every time we propose a change, automatic checks run** so we catch problems early.

**GitHub Actions** is GitHub’s built-in way to run those checks — for example, when someone opens a pull request.

**What might run (conceptually):** “Do all KO JSON files still match our agreed schema?” “Does the project still typecheck?” Small tests around search behavior.

**Why it helps a small team:** Even one person forgets a comma in JSON sometimes. CI is a **safety net** so “works on my machine” does not become “breaks for Bryan’s demo.”

---

## Concept 7: Why this architecture choice — desktop app and local-first

We are building a **desktop app** with a **menu bar / system tray** presence and a **chat console** — not “only a website” — for several practical reasons:

- **It feels like a real technician tool** — something you keep at hand while working, not another browser tab lost in the noise.
- **Local-first knowledge** — our **Phase 1** mock ServiceNow articles (**40** JSON KOs, **10** per core area: Mac, Windows, Zoom, Office Apps) ship as files in the repo under **`knowledge-objects/corpus/`** (templates stay in **`knowledge-objects/examples/`** — see [REPO-LAYOUT.md](REPO-LAYOUT.md)). At runtime they live **on the machine** with the app; **MCP** exposes them in a **controlled** way. Scenarios aim to be **generic and demo-safe** (see the architecture doc’s **KO generation strategy**).
- **Clear demo story** — “Practice incidents that **start like a real ticket** (random scenario + header), **you open the chat** with **no runbook search**, the **customer** stays in character, the **mentor** grades against the **bound internal article** (**MVP**), with **Exa and off-KO fairness** as a **later** upgrade, and optional **learning links after** the grade when we add them.”
- **Less premature platform complexity** — A full cloud-hosted product means accounts, hosting bills, compliance conversations, and DevOps work we do not need for **v1**.

We are **not** saying cloud is bad forever. We are saying: for this **internal training simulator demo**, desktop + local KB + optional cloud AI/search is the **simplest credible path** for a small IT-led team — with room to grow later if the idea proves its value.


---

### Branch naming (GitHub)

Clear branch names make PRs and CI history easier to follow. For this repo, use the habits below.

**Basics**

1. **Descriptive names:** Say what the work is for — not generic labels like `fix` or `update`. Examples: `feature/export-json-v2`, `bugfix/transcript-split-edge-case`.
2. **Hyphens (kebab-case):** Separate words with hyphens. `bugfix/fix-login-issue` is easier to read than `bugfix/fixLoginIssue` or `bugfix/fix_login_issue`.
3. **Lowercase letters, numbers, hyphens:** Use `a-z`, `0-9`, and `-` only. Avoid spaces, underscores, and extra punctuation when you can.
4. **No stray hyphens:** Do not stack hyphens or end with one — e.g. `feature/new--login-` is hard to read and can confuse automation.
5. **Short but clear:** Enough detail to recognize the work at a glance, without turning the name into a sentence.

**Prefix by type**

Prefixes group work by purpose and line up with common GitHub automation:

| Prefix | Typical use in this project |
|--------|------------------------------|
| `feature/` | New app behavior, MCP wiring, scoring paths |
| `bugfix/` | Fixes in code, validators, or fixtures |
| `hotfix/` | Urgent fix for a demo or tagged release |
| `release/` | Version bumps, last checks before a release tag |
| `docs/` | Markdown and README-only changes (architecture, pre-reads, KO authoring notes) |

Examples: `feature/mcp-article-bind`, `docs/schema-readme-tweaks`, `release/1.0.0`.


---

## Quick glossary

| Term | Plain meaning |
|------|----------------|
| Official (scored) transcript | The chat lines that **count** for grading and demo export — **same list** for both; intro misfires stay in **debug/audit** only (see [Export Rules](project-architecture-and-plan.md#5-export-rules)) |
| MCP | Controlled bridge so the **mentor backend** can read approved local articles — **not** a technician search box during the test |
| Dual persona | Two AI roles: **customer** vs **mentor** — same session, different rules and UI |
| Closed-book | During the graded sim: **no** internal KB UI and **no** Exa for the technician |
| FMNO | Internal employee-style number; simulation returns a **random 5-digit** value, **stable** for that session |
| JSON | Structured text format for data |
| Phase 1 corpus | The **40** production knowledge-object files under **`knowledge-objects/corpus/`** (not the `examples/` folder) |
| PR | Pull request — propose and review changes before merge |
| CI | Automatic checks on changes |

---

## How to use this doc

Read once before the kickoff, skim before demos, and point new teammates here first. Questions are expected — the architecture doc goes deeper when you need it.


