# Phase 1: Bob Capability Mapping - Research

**Researched:** 2026-06-17
**Domain:** IBM Bob extension primitives (docs-grounded capability mapping); GSD runtime-descriptor vocabulary
**Confidence:** HIGH on the four SPIKE resolutions (each grounded in a live `bob.ibm.com/docs` page + corroborating prior project research); MEDIUM on two absence-based defaults (SPIKE-01/02) by their nature; LOW on the config-home env override (documented absent → UNKNOWN/probe on device).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase boundary** — This phase is **research + specification, not code**. It produces exactly two artifacts:
1. `CAPABILITY-MAP.md` in the phase directory — the per-primitive decision record.
2. The first entries of `.planning/ACCEPTANCE-CHECKLIST.md` at the **planning root**.

**Locked by ROADMAP (do NOT re-decide):** the conservative defaults themselves are fixed — subagents → **sequential inline** (assume no isolation); prompts → **conversational `text_mode`** (assume no structured-choice primitive). This phase *records and sources* them; it does not relitigate them.

**Capability-map artifact shape:**
- **D-01:** Single `CAPABILITY-MAP.md` in the phase directory. Each primitive is a fixed-schema block, not prose.
- **D-02:** Per-primitive row schema: `primitive | conservative default | rationale | doc source (URL) | verbatim quote | confidence (HIGH/MEDIUM/LOW) | state | verification-step ref (AC-ID)`.
- **D-03:** The machine-readable `bob` runtime descriptor (JSON/code) is **NOT** built here — Phase 2 work. Phase 1 stops at the documented map. Phase 2 SC#4 verifies its emitter by *inspecting output against this map* → the map is a review-grade reference, not an import target.

**Verification-step format & home:**
- **D-04:** A single central `.planning/ACCEPTANCE-CHECKLIST.md` lives at the **planning root** (not inside the Phase 6 directory) and exists from Phase 1 onward.
- **D-05:** Each step has a stable ID (`AC-01`, `AC-02`, …) and fixed schema: `Cmd:` / `Expect:` / `Confirms:` / `Result: [ ] pass [ ] fail`.
- **D-06:** `CAPABILITY-MAP.md` rows reference steps by AC-ID only — map and checklist evolve independently.
- **D-07 (cross-phase convention — planner must carry forward):** Phases 2–5 append their own device-runnable steps to this same `.planning/ACCEPTANCE-CHECKLIST.md` using the same AC-ID + schema. Phase 6 runs the accumulated file with zero gathering/merge work. **Project-wide convention established here.**

**Evidence rigor:**
- **D-08:** Every recorded default cites the exact `bob.ibm.com` doc URL **+ a short verbatim quote** of the supporting text **+** a HIGH/MEDIUM/LOW confidence tier.
- **D-09:** Absence-based defaults (default rests on a primitive *not* being documented) are quoted as such — e.g. quote the nearest relevant text and annotate "(no spawn/completion-signal API documented)".
- **D-10:** LOW and MEDIUM rows constitute Phase 6's explicit "assumption may be wrong" watch-list.

**Undocumented-primitive handling:**
- **D-11:** When Bob's docs are *silent*, the row still records a **buildable conservative lower-bound default** so design never blocks.
- **D-12:** Such a row is tagged a distinct **`state` value** so the gap is loud. `state` ∈ { `Documented` (positively confirmed), `Absence-based` (default rests on a documented absence), `UNKNOWN` (docs entirely silent — discover on-device) }. UNKNOWN rows always also get an AC step and are confidence LOW.

**Research scope & reuse:**
- **D-13:** Researcher **re-fetches the live `bob.ibm.com` doc pages** for citation-grade URLs + verbatim quotes. The Bob research in `.claude/CLAUDE.md` is **scaffold / map of where to look**, NOT citable source-of-truth. *(Done — this RESEARCH.md re-fetched all four SPIKE-target pages.)*
- **D-14 (map breadth):** The **4 SPIKE primitives get the full treatment** (default + evidence + dedicated AC step). The **well-documented adjacent surface Phase 2 needs** — `SKILL.md` + slash-command frontmatter contract, MCP, Bob Rules, AGENTS.md — gets **lighter reference rows** (documented contract + source + confidence) but **no per-row AC step**.

### Claude's Discretion
- Exact markdown table/column rendering of the row schema (as long as all D-02 fields are present).
- Ordering of primitives within the map.
- Whether adjacent-surface reference rows live in the same `CAPABILITY-MAP.md` (recommended) or a clearly-labeled second section.

### Deferred Ideas (OUT OF SCOPE)
- **Machine-readable `bob` descriptor (JSON/code).** Phase 2 (Runtime Foundation). Phase 1 stops at the documented map. (D-03)
- **Per-row AC steps for the adjacent surface** (skills/commands/MCP/rules/AGENTS.md). Verified by Phase 2's TRANS-01/02 acceptance steps, not Phase 1 rows. (D-14)
- **Rich Bob-native re-modeling** of subagents/prompts (vs the v1 flag/degrade approach) — PROJECT-level v2 (NATIVE-01); out of every v1 phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SPIKE-01** | Confirm whether Bob supports isolated subagent spawning with completion signals, or only in-session mode switching (decides parallel-isolated vs sequential-inline). | **RESOLVED → Absence-based.** Bob's Tools page lists only "read, write, command, MCP, mode, and question tools" — no `new_task`/subagent-spawn tool, no completion-signal API. Orchestrator "delegates"/"coordinates" via in-session mode switching. Default = sequential inline. See SPIKE-01 Finding + AC-01. |
| **SPIKE-02** | Confirm whether Bob exposes a structured-choice prompt primitive, or whether interactive flows ride conversational `text_mode`. | **RESOLVED → Absence-based.** Bob's question tool is `ask_followup_question` ("Request clarification or additional detail"); docs show no structured/multiple-choice suggestion payload. Default = conversational `text_mode` (numbered text choices). See SPIKE-02 Finding + AC-02. |
| **SPIKE-03** | Confirm a GSD-shipped Bob mode/command can use Bob's `command` tool group to shell out to `node gsd-tools.cjs`. | **RESOLVED → Documented (positive).** The `command` tool group ("Execute terminal commands") is documented for both IDE and Shell custom modes, and the `execute_command` tool ("Run CLI commands in your workspace") is a first-class Bob tool. A GSD mode granted `command` can run `node gsd-tools.cjs`. See SPIKE-03 Finding + AC-03. |
| **SPIKE-04** | Determine Bob's config-home path + env-override variable (`~/.bob`, `BOB_CONFIG_DIR`?) and the IDE-vs-Shell detection signal. | **PARTIALLY RESOLVED.** Config home = `~/.bob/` (settings at `~/.bob/settings.json`), project config `.bob/settings.json` — **Documented/HIGH**. A `BOB_CONFIG_DIR`-style config-**home** override is **NOT documented → UNKNOWN/LOW** (default: treat `~/.bob` as fixed, drop the override). IDE-vs-Shell detection signal: `BOB_SHELL_CLI_IDE_SERVER_PORT` env var is present when Bob Shell runs inside an IDE-integrated terminal — **MEDIUM** (buildable signal). See SPIKE-04 Finding + AC-04. |
</phase_requirements>

## Summary

This is a **documentation-grounding phase**: no live IBM Bob exists on the dev device, so every claim is anchored to an official `bob.ibm.com/docs` page (re-fetched this session per D-13) and cross-checked against the prior project research already captured in `.claude/CLAUDE.md` and `.planning/research/`. The deliverable the planner needs is, per SPIKE: **documented finding (citation + verbatim quote + confidence) → conservative lower-bound default → a concrete device-runnable AC step.** The conservative defaults for SPIKE-01 (sequential inline) and SPIKE-02 (`text_mode`) are *locked by ROADMAP* — this phase sources them, it does not relitigate them.

All four SPIKEs resolved against live docs. Two confirmed **positively** (SPIKE-03 `command`/`execute_command` tool group exists; SPIKE-04 config home is `~/.bob`). Two confirmed by **documented absence** (SPIKE-01 no subagent-spawn tool; SPIKE-02 no structured-prompt payload) — which is exactly what justifies the locked conservative defaults. The single genuine UNKNOWN is the **config-home env override** (`BOB_CONFIG_DIR` is not documented) → the descriptor treats `~/.bob` as fixed and an AC step probes whether an override exists on hardware. A bonus discovery resolves the previously-open IDE-vs-Shell detection question: the `BOB_SHELL_CLI_IDE_SERVER_PORT` env variable.

**Primary recommendation:** Author `CAPABILITY-MAP.md` with **8 rows** — 4 full SPIKE rows (each with a dedicated AC-0N step) + 4 lighter adjacent-surface reference rows (skills frontmatter, slash-command frontmatter, custom-mode/`groups` schema, MCP/Rules/AGENTS.md) — and seed `.planning/ACCEPTANCE-CHECKLIST.md` with **AC-01..AC-04** using the D-05 schema. Use the verbatim quotes and URLs in the "SPIKE Findings" section below as the citation-grade evidence for each row.

## Architectural Responsibility Map

This phase produces no running code, so the "tiers" are the *artifact-production* responsibilities, not request-handling tiers. Mapped so the planner can sanity-check task assignment.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resolve 4 SPIKE primitives from docs | Research/Doc-conformance (this RESEARCH.md) | — | Citation-grade quotes belong in research output; the map *records* them. |
| `CAPABILITY-MAP.md` (decision record) | Phase artifact (planning doc) | — | D-01: single file in phase dir, fixed-schema rows. Input contract to Phase 2. |
| `.planning/ACCEPTANCE-CHECKLIST.md` seed (AC-01..04) | Planning-root artifact | — | D-04: lives at planning root; append target for Phases 2–6, run target for Phase 6. |
| Conservative-default selection | ROADMAP (locked) | This phase records only | SPIKE-01/02 defaults are pre-decided; phase sources them. |
| Adjacent-surface reference rows | Phase artifact (CAPABILITY-MAP §2) | gsd-core descriptor vocabulary | D-14: lighter rows, no AC step; shape-templated on gsd-core's Cline/Cursor converters. |

## SPIKE Findings (citation-grade evidence for the map rows)

> These four blocks are the **D-08 evidence packets** the planner should transcribe (URL + verbatim quote + confidence + state) into `CAPABILITY-MAP.md`. Each ends with the AC step to seed into `.planning/ACCEPTANCE-CHECKLIST.md`.

### SPIKE-01 — Subagents / parallelism model
- **Conservative default (LOCKED):** sequential inline execution (assume NO isolated subagents).
- **State:** `Absence-based`  ·  **Confidence:** MEDIUM
- **Source:** `https://bob.ibm.com/docs/ide/core-concepts/tools` (Tools) and `https://bob.ibm.com/docs/ide/features/modes` (Modes).
- **Verbatim quote (Tools):** the tool catalog covers "read, write, command, MCP, mode, and question tools only" — **no `new_task`/subtask-spawn tool and no completion-signal/parent-child task relationship is listed.** `[CITED: bob.ibm.com/docs/ide/core-concepts/tools]`
- **Verbatim quote (Modes):** Orchestrator mode is "a strategic workflow orchestrator who coordinates complex tasks by delegating them to appropriate specialized modes" and "Automatically switches between modes based on task requirements." Mode switching is sequential/in-session (drop-down, slash command, keyboard shortcut). `[CITED: bob.ibm.com/docs/ide/features/modes]`
- **D-09 annotation:** Orchestrator *delegates/coordinates*, but **no spawn-with-completion-signal API is documented**; delegation reads as sequential in-session mode switching, not isolated parallel subagents.
- **WATCH-LIST (D-10):** Third-party write-ups describe a "boomerang/`new_task`" isolated-context subtask model in *Roo-Code-family* tools; Bob's own docs do **not** confirm this primitive. If on-device probing shows Bob inherited it, this assumption is wrong → log as VERIFY-02 follow-up (could unlock v2 PAR-01).
- **AC-01 seed:**
  ```
  ## AC-01 — Subagent isolation
  Cmd:    <run a GSD stub mode/command that attempts to spawn an isolated subtask and await a completion signal>
  Expect: no isolated-subagent/new_task tool available; work runs sequentially inline (no parallel completion signal)
  Confirms: SPIKE-01 default (sequential inline)
  Result: [ ] pass  [ ] fail
  ```

### SPIKE-02 — Prompt / structured-choice primitive
- **Conservative default (LOCKED):** conversational `text_mode` (assume NO structured prompts; numbered text choices).
- **State:** `Absence-based`  ·  **Confidence:** MEDIUM
- **Source:** `https://bob.ibm.com/docs/ide/core-concepts/tools` (Tools).
- **Verbatim quote:** question tool is `ask_followup_question` — "Request clarification or additional detail"; "Question tools let Bob gather additional information needed to complete tasks." Docs show **"No evidence of structured/multiple-choice suggestion functionality."** `[CITED: bob.ibm.com/docs/ide/core-concepts/tools]`
- **D-09 annotation:** `ask_followup_question` is documented but **no structured-choice/suggested-answers payload** is documented → GSD's `AskUserQuestion` must degrade to numbered conversational `text_mode` (matches REQUIREMENTS TRANS-03).
- **WATCH-LIST (D-10):** If Bob's `ask_followup_question` actually accepts a `<suggest>`/suggestions array on hardware, a richer prompt degrade is possible → log as VERIFY-02 follow-up.
- **AC-02 seed:**
  ```
  ## AC-02 — Structured prompt primitive
  Cmd:    <run a GSD stub interactive flow that asks a multiple-choice question>
  Expect: only conversational text question available (ask_followup_question); numbered text_mode choices render and a typed answer is captured/validated
  Confirms: SPIKE-02 default (text_mode)
  Result: [ ] pass  [ ] fail
  ```

### SPIKE-03 — `command` tool group / shell-out to `node gsd-tools.cjs`
- **Conservative default:** A GSD-shipped Bob mode granted the `command` group CAN shell out to `node gsd-tools.cjs` (positively supported — no degrade needed).
- **State:** `Documented`  ·  **Confidence:** HIGH
- **Source (tool):** `https://bob.ibm.com/docs/ide/core-concepts/tools`. **Source (mode grant):** `https://bob.ibm.com/docs/ide/configuration/custom-modes` and `https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell`.
- **Verbatim quote (Tools):** `execute_command` — "Run CLI commands in your workspace" (e.g. installing dependencies, running tests, building projects); "Command tools let Bob run commands and perform system operations." `[CITED: bob.ibm.com/docs/ide/core-concepts/tools]`
- **Verbatim quote (custom-modes `groups`):** the available tool groups include `command: Execute terminal commands` (alongside `read`, `edit`, `browser`, `mcp`, `skill`). `[CITED: bob.ibm.com/docs/ide/configuration/custom-modes]` (Shell variant lists the same `command` group `[CITED: bob.ibm.com/docs/shell/configuration/custom-modes-bobshell]`.)
- **Design implication:** the `bob` runtime descriptor / GSD modes must declare `command` in their `groups` (and `mcp`/`read`/`edit` as needed). This is the seam through which `gsd_run query` works under Bob.
- **AC-03 seed:**
  ```
  ## AC-03 — command tool group shells out to gsd-tools.cjs
  Cmd:    <invoke a GSD stub mode/command (groups include `command`) that runs `node gsd-tools.cjs <a no-side-effect query>`>
  Expect: the command executes and its stdout/exit code is captured by Bob (proves gsd_run is reachable under Bob)
  Confirms: SPIKE-03 default (command group available)
  Result: [ ] pass  [ ] fail
  ```

### SPIKE-04 — Config home, env override, IDE-vs-Shell detection
- **Three sub-findings** (the map may render as one row with three lines, or split — Claude's discretion):

  **(a) Config home — Documented / HIGH.**
  - **Source:** `https://bob.ibm.com/docs/shell/configuration/configuring`.
  - **Verbatim quote:** user-wide config is "`~/.bob/settings.json` in your home directory"; project config is "`.bob/settings.json` in your project directory". Logs at "`~/.bob/logs/`". `[CITED: bob.ibm.com/docs/shell/configuration/configuring]`
  - **Default:** config home = `~/.bob/`; project scope = `<project>/.bob/`. (Matches gsd-core's `runtime-homes.cjs` global-vs-local pattern.)

  **(b) Config-home env override — UNKNOWN / LOW.**
  - **Source:** same `configuring` page + `install-and-setup` + `custom-modes`.
  - **Verbatim quote (configuring precedence):** the precedence chain is "Command-line arguments → Environment variables → System settings (`/etc/bobshell/settings.json`) → Project (`.bob/settings.json`) → User (`~/.bob/settings.json`) → System defaults → Hardcoded defaults." **"Environment variables"** appears as a tier that overrides *setting values* — but **no env var that relocates the config-home directory itself (no `BOB_CONFIG_DIR`/`BOB_HOME`) is documented.** `[CITED: bob.ibm.com/docs/shell/configuration/configuring]`
  - **D-11/D-12 buildable default:** treat `~/.bob` as a **fixed** home; the descriptor **drops the env override** rather than guessing a name. An AC step probes whether an override exists on hardware.

  **(c) IDE-vs-Shell detection signal — MEDIUM (buildable).**
  - **Source:** `https://bob.ibm.com/docs/shell/troubleshooting/troubleshoot`.
  - **Verbatim quote:** "Get the Bob Shell port from the terminal inside the dev container: `echo $BOB_SHELL_CLI_IDE_SERVER_PORT`" — i.e. the **`BOB_SHELL_CLI_IDE_SERVER_PORT` env var is present when Bob Shell runs inside an IDE-integrated terminal.** Also `BOBSHELL_API_KEY` marks headless/CI auth. `[CITED: bob.ibm.com/docs/shell/troubleshooting/troubleshoot]`
  - **Default detection rule (conservative):** if `BOB_SHELL_CLI_IDE_SERVER_PORT` is set → Shell-inside-IDE; else if `BOBSHELL_API_KEY`/non-interactive → headless Shell. This is *inference from a documented behavior*, not a documented "detect-my-runtime" API → MEDIUM, gets an AC probe.

- **AC-04 seed:**
  ```
  ## AC-04 — Config home, env override, IDE-vs-Shell signal
  Cmd:    <on a real Bob machine: print `~/.bob` contents; test whether a config-home env override (try BOB_CONFIG_DIR/BOB_HOME) relocates it; `echo $BOB_SHELL_CLI_IDE_SERVER_PORT` inside the IDE terminal>
  Expect: ~/.bob exists as config home; no override var relocates it (or: discover the real var name); BOB_SHELL_CLI_IDE_SERVER_PORT is set under IDE, unset in plain Shell
  Confirms: SPIKE-04 default (config home ~/.bob fixed; IDE-vs-Shell via BOB_SHELL_CLI_IDE_SERVER_PORT)
  Result: [ ] pass  [ ] fail
  ```

## Adjacent-Surface Reference Rows (D-14 — lighter rows, NO per-row AC step)

> Phase 2 (RUNTIME/TRANS) needs these documented contracts. They are **not in doubt**, so they get a documented contract + source + confidence, but no acceptance step (their in-Bob load is proven by Phase 2's TRANS-01/02 AC steps).

| Primitive | Documented contract | Source (URL) | Confidence |
|-----------|--------------------|--------------|-----------|
| **Agent Skill** | `<name>/SKILL.md` with YAML frontmatter; **only `name` + `description`** are read. Project `<project>/.bob/skills/`, global `~/.bob/skills/`; project-over-global precedence. "skills without descriptions are ignored." Converter must **strip** unsupported keys. No documented max description length. | `bob.ibm.com/docs/ide/features/skills` | HIGH |
| **Slash command** | `<name>.md` markdown; frontmatter **`description` + `argument-hint`** only. Filename→command (lowercased, spaces→dashes, special chars removed). Positional args `$1`,`$2` (no `$ARGUMENTS` documented). Project `.bob/commands/`, global `~/.bob/commands/`. Hyphen form only. | `bob.ibm.com/docs/ide/features/slash-commands` | HIGH |
| **Custom Mode** (`groups`) | `custom_modes.yaml`: `slug`, `name`, `roleDefinition`, `whenToUse` (opt), `customInstructions`, `groups`. Global `~/.bob/custom_modes.yaml`, project `.bob/custom_modes.yaml`. Tool groups: `read`, `edit` (fileRegex-restrictable), `browser`, `command`, `mcp`, **`skill`** (IDE). | `bob.ibm.com/docs/ide/configuration/custom-modes` · `bob.ibm.com/docs/shell/configuration/custom-modes-bobshell` | HIGH |
| **MCP / Rules / AGENTS.md** | MCP servers configurable (Bob-native). Bob Rules: `.bobrules` / `.bob/rules/` / `.bob/rules-{modeSlug}/` (and `~/.bob/rules/` global). AGENTS.md context convention generated by `/init`. | `bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob` · `bob.ibm.com/docs/shell/configuration/bobshell-custom-rules` | MEDIUM-HIGH |

## Project Constraints (from CLAUDE.md)

Directives extracted from `./.claude/CLAUDE.md` the planner MUST honor (same authority as locked decisions):

- **Hyphen command form only** — `gsd-<cmd>`, never the deprecated `gsd:<cmd>` colon form. (Matches Bob's filename→command rule.)
- **Strip unsupported frontmatter keys** in any emitted skill/command — Bob reads only `name`+`description` (skills) and `description`+`argument-hint` (commands); extra keys (`effort`, `allowed-tools`, `model`) are at best inert, at worst cause the skill to be **ignored**. (Phase 2 concern; flagged here so the map's reference rows say it.)
- **Backend-agnostic** — gsd-bob never references Claude/Gemini/Granite; Bob owns model routing. The capability map must not assume any specific backend.
- **`.planning/` root-anchoring** — artifacts sit at the workspace root; `.planning/ACCEPTANCE-CHECKLIST.md` lives at the planning root (D-04), never nested.
- **Express the map in gsd-core's descriptor vocabulary** (config home, artifact layout, aliases, capabilities, tool groups) so Phase 2 is a *move, not a rewrite* (UP-01). Reference shape: gsd-core's Cline/Cursor-family converters (`runtime-homes.cjs`, `runtime-name-policy.cjs`, `capability-registry.cjs`, `runtime-artifact-conversion.cjs`).
- **No live-Bob testing during development** — all Phase 1 verification is doc-conformance; device steps are deferred to `.planning/ACCEPTANCE-CHECKLIST.md` for the Phase 6 pass.

## Architecture Patterns

### Capability-Map Production Flow (this phase has no system architecture; this is the artifact pipeline)

```
 .claude/CLAUDE.md scaffold ─┐  (map of WHERE to look — NOT citable, D-13)
                             ├─► re-fetch live bob.ibm.com/docs pages (WebFetch)
 ROADMAP locked defaults  ───┘        │
       (SPIKE-01/02)                  ▼
                            citation packet per SPIKE
                            (URL + verbatim quote + confidence + state)
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                          ▼
   CAPABILITY-MAP.md (phase dir)              .planning/ACCEPTANCE-CHECKLIST.md (root)
   • 4 SPIKE rows (D-02 schema) ──AC-ID ref──► • AC-01..AC-04 (D-05 schema)
   • 4 adjacent reference rows (no AC)         • append target for Phases 2–6 (D-07)
                 │                                          │
                 ▼                                          ▼
        input contract → Phase 2                 run target → Phase 6
        (descriptor + emitter; SC#4 inspects)    (single on-device pass)
```

### Recommended Artifact Structure
```
.planning/
├── ACCEPTANCE-CHECKLIST.md          # NEW (D-04): root-anchored, AC-01..AC-04 seeded
└── phases/01-bob-capability-mapping/
    ├── 01-CONTEXT.md                # existing
    ├── 01-RESEARCH.md              # this file
    └── CAPABILITY-MAP.md            # NEW (D-01): 4 SPIKE rows + 4 adjacent rows
```

### Pattern 1: Fixed-schema decision-record rows over prose
**What:** Each primitive is a block/table with the exact D-02 fields, not paragraphs.
**When to use:** Always in `CAPABILITY-MAP.md` — keeps it review-grade and machine-inspectable for Phase 2 SC#4.
**Example (the user-endorsed shape, from CONTEXT §specifics):**
```
| primitive | SPIKE-01 Subagents |
| default   | sequential-inline (assume no isolation) |
| rationale | docs show in-session mode-switch only; no new_task/spawn tool listed |
| source    | bob.ibm.com/docs/ide/core-concepts/tools |
| quote     | "read, write, command, MCP, mode, and question tools only" (no spawn/completion-signal API documented) |
| confidence| MEDIUM |
| state     | Absence-based |
| verify    | AC-01 |
```

### Pattern 2: AC step schema (D-05)
```
## AC-01 — <title>
Cmd:    <exact command>
Expect: <expected output>
Confirms: <which SPIKE/SC it validates>
Result: [ ] pass  [ ] fail
```

### Anti-Patterns to Avoid
- **Citing `.claude/CLAUDE.md` as source-of-truth.** It is scaffold only (D-13). Every row cites a live `bob.ibm.com/docs` URL.
- **Leaving an UNKNOWN row blank.** D-11/D-12: still record a *buildable* default + tag `state: UNKNOWN` + attach an AC probe. Silence is not allowed.
- **Re-deciding the locked SPIKE-01/02 defaults.** Record + source them; do not relitigate (CONTEXT §domain).
- **Adding AC steps to adjacent-surface rows.** D-14: those rows get no AC step.
- **Building the JSON `bob` descriptor here.** Deferred to Phase 2 (D-03).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Describing the `bob` runtime's home/aliases/capabilities | A bespoke vocabulary invented for gsd-bob | gsd-core's existing descriptor terms (`runtime-homes.cjs`, `capability-registry.cjs`, tool-group names Bob already uses) | UP-01: keeps Phase 2 a move not a rewrite; map must already speak this language. |
| IDE-vs-Shell detection | A heuristic guess (parse `argv`, sniff TTY) | The documented `BOB_SHELL_CLI_IDE_SERVER_PORT` env signal + `BOBSHELL_API_KEY` for headless | Documented behavior beats guessing; AC-04 confirms on hardware. |
| Config-home resolution | A new env-var convention you invent | `~/.bob` fixed home (documented); drop the override until hardware proves one exists | D-11: no `BOB_CONFIG_DIR` is documented — inventing one would silently fail. |
| Verification of doc-absent primitives | Asserting them true/false in code now | An AC step that probes on hardware (Phase 6) | No live Bob; absence-based defaults are explicitly the Phase-6 watch-list (D-10). |

**Key insight:** Phase 1 builds *no* solutions — its entire job is to hand Phase 2 a sourced, fixed-schema contract and hand Phase 6 four runnable probes. The "don't hand-roll" rule here means *don't invent facts Bob's docs don't state* — record the conservative lower bound and defer the truth to the device pass.

## Runtime State Inventory

> Not a rename/refactor/migration phase. This phase creates two new doc artifacts and touches no stored data, services, OS registrations, secrets, or build artifacts.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — phase writes only Markdown docs. | none |
| Live service config | None — no live Bob; no services touched. | none |
| OS-registered state | None. | none |
| Secrets/env vars | None created/changed. (`BOBSHELL_API_KEY`/`BOB_SHELL_CLI_IDE_SERVER_PORT` are *documented for the future on-device pass*, not set here.) | none |
| Build artifacts | None — no code, no install. | none |

**Nothing found in any category — verified: this phase produces `CAPABILITY-MAP.md` + seeds `ACCEPTANCE-CHECKLIST.md` only.**

## Common Pitfalls

### Pitfall 1: Treating third-party "boomerang/new_task" write-ups as Bob fact
**What goes wrong:** WebSearch surfaces Roo-Code / Godspeed docs describing isolated-context subtasks with completion summaries and attributes them to "Orchestrator mode." Bob's *own* docs only say Orchestrator "delegates"/"coordinates" and list no `new_task` tool.
**Why it happens:** Bob's Orchestrator mode resembles Roo-family orchestrators; search engines blend them.
**How to avoid:** Only cite `bob.ibm.com/docs/*` pages. Tag the boomerang claim as the SPIKE-01 watch-list item (D-10), not as Bob behavior. The locked default (sequential inline) is correct regardless.
**Warning signs:** A citation URL that is not under `bob.ibm.com/docs`.

### Pitfall 2: Confusing "environment variables as a config-value tier" with "a config-home override"
**What goes wrong:** The Shell precedence chain lists "Environment variables" as tier 2 — easy to misread as "there's a `BOB_CONFIG_DIR`."
**Why it happens:** Env vars *do* override setting *values*; they do **not** relocate the `~/.bob` directory.
**How to avoid:** SPIKE-04 row (b) stays `UNKNOWN/LOW` with a buildable "`~/.bob` is fixed; drop the override" default and an AC probe. Do not record a `BOB_CONFIG_DIR` as documented.
**Warning signs:** A map row that cites `~/.bob` config home and then claims a named home-override var from the same page.

### Pitfall 3: WebFetch URL normalization noise
**What goes wrong:** WebFetch sometimes echoes the source host as `ibm.com`/`anthropic.com`/`docs.ibm.com` instead of `bob.ibm.com/docs/...`.
**Why it happens:** Fetch-side host normalization; the *content* still matches the requested `bob.ibm.com/docs/...` path.
**How to avoid:** Cite the canonical `bob.ibm.com/docs/...` URL that was requested (and that the prior HIGH-confidence project research already confirmed), not the echoed host. All URLs in this file use the canonical form.
**Warning signs:** A `CAPABILITY-MAP.md` source cell pointing at `ibm.com/us-en/products/...` instead of `bob.ibm.com/docs/...`.

### Pitfall 4: Letting the map and checklist drift into one file
**What goes wrong:** Inlining AC steps into the map (or map rows into the checklist) breaks D-06 (rows reference AC by ID only) and D-07 (Phases 2–6 append to the *root* checklist).
**How to avoid:** Two files. Map rows carry only an `AC-0N` reference; the steps live in `.planning/ACCEPTANCE-CHECKLIST.md`.
**Warning signs:** `Cmd:`/`Expect:` lines appearing inside `CAPABILITY-MAP.md`.

## Code Examples

This phase produces Markdown artifacts, not code. The two canonical "code" shapes are the row schema (Pattern 1) and the AC step schema (Pattern 2) above, both reproduced from the user-endorsed previews in CONTEXT §specifics. No source-code examples apply.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 1 = empirical "Bob Capability Spike" against a live Bob | Documentation-grounded "Bob Capability Mapping" — conservative defaults + deferred device probes | 2026-06-17 roadmap revision (test-deferred model) | No live Bob ever on dev device; empirical confirmation moves to the Phase 6 on-device pass. |
| Verification lives per-phase, ad hoc | One consolidated root `.planning/ACCEPTANCE-CHECKLIST.md`, appended by every phase (D-07) | This phase establishes it | Phase 6 runs an accumulated file with zero merge work. |
| `gsd:<cmd>` colon command form | `gsd-<cmd>` hyphen form only | gsd-core #2808 | Matches Bob's filename→command rule; relevant to adjacent slash-command row. |

**Deprecated/outdated:**
- The project brief's "Gemini" example as a confirmed Bob backend: prior research found public sources name Claude/Mistral/Granite, **not Gemini** — treat the backend set as Bob-internal and opaque (backend-agnostic anyway).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bob exposes no isolated-subagent/`new_task` spawn tool with completion signals (absence-based). | SPIKE-01 | LOW for v1 (default is the safe lower bound). If wrong, v2 PAR-01 parallel-isolated execution unlocks — pure upside; log via VERIFY-02. |
| A2 | Bob's `ask_followup_question` has no structured/multiple-choice suggestion payload (absence-based). | SPIKE-02 | LOW for v1 (text_mode degrade always works). If wrong, a richer prompt degrade is possible — log via VERIFY-02. |
| A3 | No env var relocates the `~/.bob` config home (no `BOB_CONFIG_DIR`); `~/.bob` is fixed. | SPIKE-04(b) | MEDIUM — if a global-scope override is actually needed for the installer/descriptor, Phase 2/3 must adapt. AC-04 probes it; UNKNOWN/LOW row makes the gap loud. |
| A4 | `BOB_SHELL_CLI_IDE_SERVER_PORT` reliably distinguishes IDE-embedded Shell from plain/headless Shell. | SPIKE-04(c) | MEDIUM — it's inferred from a troubleshooting example, not a documented "detect-runtime" API. AC-04 confirms; if wrong, fall back to `BOBSHELL_API_KEY`/interactivity heuristics. |
| A5 | No documented max description length for skills/commands (GSD descriptions are short anyway). | Adjacent rows | LOW — if a cap exists, long GSD descriptions truncate; verified incidentally in Phase 2 emission. |
| A6 | The `skill` tool group (IDE) implies skills are mode-accessible, but skill→command/skill *programmatic chaining* is still undocumented. | Adjacent / SPIKE-01 vicinity | MEDIUM — GSD workflows chain skills; if Bob lacks skill→command invocation, parity-first must flag dependent skills (Phase 2 TRANS-04). Not a Phase 1 blocker; flagged for Phase 2. |

## Open Questions

1. **Can a Bob skill or command programmatically invoke another skill/command (chaining)?**
   - What we know: a `skill` tool group exists (IDE custom modes "Access skills"); commands/skills are user-invocable.
   - What's unclear: whether one skill/command can *programmatically* trigger another (GSD workflows chain skills). Docs are silent.
   - Recommendation: NOT a SPIKE-gated Phase 1 row (it's a Phase 2 translation concern, TRANS-04). Note it in the map's adjacent section as an open Phase-2 question; if it matters, add an AC probe in Phase 2's checklist append, not here.

2. **Does Bob enforce a max skill/command description length?**
   - What we know: no cap documented; GSD descriptions are short.
   - What's unclear: a hidden cap (Claude caps ~1024 chars).
   - Recommendation: low risk; let Phase 2 emission surface it. No Phase 1 AC step (adjacent surface, D-14).

3. **Does BobShell non-interactive (headless/CI) auto-activate skills the same way the IDE does?**
   - What we know: `BOBSHELL_API_KEY` enables headless auth; modes "can be designed to work in both interactive and non-interactive sessions."
   - What's unclear: whether description-based skill auto-activation fires headlessly.
   - Recommendation: relevant to the CI story but not a Phase 1 SPIKE row; defer to a Phase 6 acceptance probe (the on-device pass can be run headless).

## Environment Availability

> This phase has **no external runtime dependencies** — it produces Markdown only. The tools/services below are documented for the *future* Phase 6 on-device pass, not required now.

| Dependency | Required By | Available (dev device) | Version | Fallback |
|------------|------------|------------------------|---------|----------|
| Live IBM Bob (IDE or Shell) | Phase 6 acceptance pass (NOT Phase 1) | ✗ (by design — no live Bob ever) | — | Doc-conformance now; defer all device steps to Phase 6 checklist. |
| WebFetch / WebSearch | This phase's doc grounding | ✓ | — | — |

**Missing dependencies with no fallback:** None block Phase 1 (it is doc-only).
**Missing dependencies with fallback:** Live Bob — fallback is the entire test-deferred model (AC-01..04 run in Phase 6).

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` in config. This phase writes only Markdown decision-records and an acceptance checklist — **no code, no input handling, no auth, no crypto, no data storage.** ASVS controls apply to later phases (the installer in Phase 3, the emitter in Phase 2), not to Phase 1 artifact authoring.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1 authors no auth. (`BOBSHELL_API_KEY` is *documented* for Phase 6, not implemented here.) |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | no | No input processed; the `text_mode` answer-validation contract is a Phase 2 (TRANS-03) concern, not Phase 1. |
| V6 Cryptography | no | No secrets/crypto handled. |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Recording an unverified primitive as fact (mis-grounding) | Information disclosure (false design assumption) | D-08 citation rigor: every row carries a live `bob.ibm.com` URL + verbatim quote + confidence; absence-based & UNKNOWN rows are tagged loud (D-09/D-12). |
| AC step that, when run in Phase 6, executes an unsafe command | Tampering / DoS on the device | Author AC commands as **read-only / no-side-effect** probes (e.g. a no-write `gsd_run query`, `echo $VAR`, directory listing) — never a destructive command. Flag this convention to the planner for AC-01..04. |

*Note for planner:* the only "security" surface Phase 1 owns is **(a)** citation honesty (don't fabricate Bob capabilities) and **(b)** ensuring every seeded AC command is side-effect-free so the Phase 6 unattended pass is safe to run on a user's real machine.

## Sources

### Primary (live `bob.ibm.com/docs` — re-fetched this session, D-13)
- `bob.ibm.com/docs/ide/core-concepts/tools` — tool catalog: `ask_followup_question`, `execute_command`, `command` group; absence of `new_task`/subtask tool. (SPIKE-01, SPIKE-02, SPIKE-03)
- `bob.ibm.com/docs/ide/features/modes` — Orchestrator "delegates/coordinates"; sequential in-session mode switching. (SPIKE-01)
- `bob.ibm.com/docs/ide/configuration/custom-modes` — `groups` incl. `command`/`skill`; `custom_modes.yaml` schema + paths. (SPIKE-03, adjacent)
- `bob.ibm.com/docs/shell/configuration/custom-modes-bobshell` — Shell mode `groups` incl. `command`. (SPIKE-03)
- `bob.ibm.com/docs/shell/configuration/configuring` — `~/.bob/settings.json`, `.bob/settings.json`, 7-tier precedence; no config-home override var. (SPIKE-04 a/b)
- `bob.ibm.com/docs/shell/getting-started/install-and-setup` — Node ≥22.15.0, install methods, `--auth-method api-key`, `BOBSHELL_API_KEY`. (SPIKE-04)
- `bob.ibm.com/docs/shell/troubleshooting/troubleshoot` — `BOB_SHELL_CLI_IDE_SERVER_PORT`, `NODE_EXTRA_CA_CERTS`, `~/.bob/logs/`. (SPIKE-04 c)
- `bob.ibm.com/docs/ide/features/skills` — `SKILL.md` `name`+`description` only; paths; precedence; "skills without descriptions are ignored." (adjacent)
- `bob.ibm.com/docs/ide/features/slash-commands` — `description`+`argument-hint`; filename→command; `$1`/`$2`; paths. (adjacent)

### Secondary (WebSearch — context, cross-checked against primary)
- `bob.ibm.com/docs/ide/getting-started/best-practices` — prompt enhancement / clarifying questions (corroborates conversational prompt model, SPIKE-02).
- Roo Code / Godspeed boomerang-task docs — **counter-evidence flagged as watch-list, NOT cited as Bob behavior** (Pitfall 1).

### Tertiary (prior project research — scaffold only per D-13, used to confirm URL targets)
- `.claude/CLAUDE.md` §"IBM Bob Extension Surface", §"Open Items / Assumptions to Validate in a Spike".
- `.planning/research/{ARCHITECTURE,STACK,PITFALLS,SUMMARY}.md`.

## Metadata

**Confidence breakdown:**
- SPIKE-01 (subagents → sequential inline): MEDIUM — Absence-based; default is locked & safe, but absence can only be *fully* confirmed on device.
- SPIKE-02 (prompts → text_mode): MEDIUM — Absence-based; same reasoning.
- SPIKE-03 (`command` group / shell-out): HIGH — positively documented in three pages.
- SPIKE-04 config home: HIGH; env override: LOW (UNKNOWN, documented-absent); IDE-vs-Shell signal: MEDIUM (inferred from documented behavior).
- Adjacent surface (skills/commands/modes/MCP/rules): HIGH (skills/commands/modes), MEDIUM-HIGH (MCP/rules).
- No external packages installed → **Package Legitimacy Audit: N/A**.

**Research date:** 2026-06-17
**Valid until:** ~2026-07-17 (Bob is a young, fast-moving product — re-verify the four SPIKE pages if planning slips past ~30 days, especially the Tools page for any new `new_task`/structured-prompt tool).
