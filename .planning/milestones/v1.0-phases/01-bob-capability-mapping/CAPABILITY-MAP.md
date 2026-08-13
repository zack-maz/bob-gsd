# Bob Capability Map — Phase 1

**Authored:** Phase 1 (Bob Capability Mapping) · **Source rigor:** D-08 (live `bob.ibm.com/docs` URL + verbatim quote + confidence per row)

This is the per-primitive **documented capability decision record** for gsd-bob. It records a conservative lower-bound default for each load-bearing IBM Bob primitive, grounded in Bob's official docs.

**Role:** This map is the **input contract to Phase 2** (Runtime Foundation & Artifact Translation). Phase 2 SC#4 inspects the emitter's output *against this map* — the map is a review-grade reference, not an import target. This phase does **NOT** build the machine-readable `bob` runtime descriptor (JSON/code); that is Phase 2 work (D-03).

**Schema (D-02):** Each SPIKE primitive is a fixed-schema block carrying: `primitive` · `conservative default` · `rationale` · `doc source (URL)` · `verbatim quote` · `confidence` · `state` · `verification-step ref (AC-ID)` · `Watch-list (Phase 6)`.

**State vocabulary (D-12):** `Documented` (positively confirmed) · `Absence-based` (default rests on a documented absence) · `UNKNOWN` (docs silent — discover on-device).

The locked conservative defaults for SPIKE-01 (sequential inline) and SPIKE-02 (`text_mode`) are recorded and sourced here per ROADMAP — they are not relitigated.

---

## Section 1 — SPIKE Rows (full treatment)

### SPIKE-01 — Subagents / parallelism model

| Field | Value |
|-------|-------|
| primitive | SPIKE-01 — Subagent spawning / parallelism |
| conservative default | **sequential inline (assume NO isolated subagents)** |
| rationale | Bob's tool catalog lists only read / write / command / MCP / mode / question tools — no `new_task`/subtask-spawn tool and no completion-signal or parent-child task relationship. Orchestrator mode "delegates"/"coordinates" via in-session mode switching (drop-down / slash command / keyboard shortcut), which reads as sequential, not isolated parallel subagents. |
| doc source (URL) | `https://bob.ibm.com/docs/ide/core-concepts/tools` · `https://bob.ibm.com/docs/ide/features/modes` |
| verbatim quote | Tools: "read, write, command, MCP, mode, and question tools only" **(no spawn/completion-signal API documented)**. Modes: Orchestrator is "a strategic workflow orchestrator who coordinates complex tasks by delegating them to appropriate specialized modes" and "Automatically switches between modes based on task requirements." |
| confidence | MEDIUM |
| state | Absence-based |
| verification-step ref | AC-01 |
| Watch-list (Phase 6) | yes |

### SPIKE-02 — Prompt / structured-choice primitive

| Field | Value |
|-------|-------|
| primitive | SPIKE-02 — Structured-choice prompt primitive |
| conservative default | **conversational text_mode (assume NO structured-choice primitive; numbered text choices)** |
| rationale | Bob's question tool is `ask_followup_question` with no structured / multiple-choice suggestion payload documented. GSD's `AskUserQuestion` must therefore degrade to numbered conversational `text_mode` choices (matches REQUIREMENTS TRANS-03). |
| doc source (URL) | `https://bob.ibm.com/docs/ide/core-concepts/tools` |
| verbatim quote | "Request clarification or additional detail"; "Question tools let Bob gather additional information needed to complete tasks." **(no structured-choice / suggested-answers payload documented)** |
| confidence | MEDIUM |
| state | Absence-based |
| verification-step ref | AC-02 |
| Watch-list (Phase 6) | yes |

### SPIKE-03 — `command` tool group / shell-out to `node gsd-tools.cjs`

| Field | Value |
|-------|-------|
| primitive | SPIKE-03 — `command` tool group shell-out |
| conservative default | **a GSD mode granted the `command` group CAN shell out to `node gsd-tools.cjs`** (positively supported — no degrade needed) |
| rationale | The `execute_command` tool ("Run CLI commands in your workspace") is a first-class Bob tool, and the `command` tool group ("Execute terminal commands") is documented for both IDE and Shell custom modes. A GSD mode that declares `command` in its `groups` can run `node gsd-tools.cjs`. **Design implication:** the `bob` descriptor / GSD modes MUST declare `command` in their `groups` (plus `read`/`edit`/`mcp` as needed) — this is the seam through which `gsd_run query` works under Bob. |
| doc source (URL) | `https://bob.ibm.com/docs/ide/core-concepts/tools` · `https://bob.ibm.com/docs/ide/configuration/custom-modes` · `https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell` |
| verbatim quote | Tools: `execute_command` — "Run CLI commands in your workspace"; "Command tools let Bob run commands and perform system operations." Custom-modes `groups`: "command: Execute terminal commands" (alongside `read`, `edit`, `browser`, `mcp`, `skill`); the Shell variant lists the same `command` group. |
| confidence | HIGH |
| state | Documented |
| verification-step ref | AC-03 |
| Watch-list (Phase 6) | no |

### SPIKE-04 — Config home, env override, IDE-vs-Shell detection

Rendered as three sub-findings (D-08 — independent confidence tiers), all sharing verification-step ref **AC-04**.

**(a) Config home**

| Field | Value |
|-------|-------|
| primitive | SPIKE-04(a) — Config home |
| conservative default | config home = `~/.bob/`; project scope = `<project>/.bob/` |
| rationale | User-wide and project config locations are positively documented; matches gsd-core's `runtime-homes.cjs` global-vs-local pattern. |
| doc source (URL) | `https://bob.ibm.com/docs/shell/configuration/configuring` |
| verbatim quote | "`~/.bob/settings.json` in your home directory"; "`.bob/settings.json` in your project directory" (logs at "`~/.bob/logs/`"). |
| confidence | HIGH |
| state | Documented |
| verification-step ref | AC-04 |
| Watch-list (Phase 6) | no |

**(b) Config-home env override**

| Field | Value |
|-------|-------|
| primitive | SPIKE-04(b) — Config-home env override |
| conservative default | **none documented — treat `~/.bob` as fixed, drop the override** (D-11 buildable default) |
| rationale | The Shell precedence chain lists "Environment variables" as a tier that overrides *setting values* — but **no env var that relocates the config-home directory itself (no `BOB_CONFIG_DIR`/`BOB_HOME`) is documented.** The descriptor drops the override rather than guessing a name; AC-04 probes for one on hardware. |
| doc source (URL) | `https://bob.ibm.com/docs/shell/configuration/configuring` |
| verbatim quote | Precedence: "Command-line arguments → Environment variables → System settings (`/etc/bobshell/settings.json`) → Project (`.bob/settings.json`) → User (`~/.bob/settings.json`) → System defaults → Hardcoded defaults." **(no `BOB_CONFIG_DIR`/`BOB_HOME` config-home relocation var documented)** |
| confidence | LOW |
| state | UNKNOWN |
| verification-step ref | AC-04 |
| Watch-list (Phase 6) | yes |

**(c) IDE-vs-Shell detection signal**

| Field | Value |
|-------|-------|
| primitive | SPIKE-04(c) — IDE-vs-Shell detection signal |
| conservative default | **`BOB_SHELL_CLI_IDE_SERVER_PORT` set → Shell-inside-IDE; else headless/plain Shell** (inferred detection rule) |
| rationale | The troubleshooting doc shows `BOB_SHELL_CLI_IDE_SERVER_PORT` is present when Bob Shell runs inside an IDE-integrated terminal; `BOBSHELL_API_KEY` marks headless/CI auth. This is inference from a documented behavior, not a documented "detect-my-runtime" API, so it gets an on-device probe. |
| doc source (URL) | `https://bob.ibm.com/docs/shell/troubleshooting/troubleshoot` |
| verbatim quote | "Get the Bob Shell port from the terminal inside the dev container: `echo $BOB_SHELL_CLI_IDE_SERVER_PORT`" |
| confidence | MEDIUM |
| state | Documented (signal) — inferred-as-detection-rule |
| verification-step ref | AC-04 |
| Watch-list (Phase 6) | yes |

> **Phase 6 watch-list (D-10):** Every row above whose `Watch-list (Phase 6)` value is `yes` is part of Phase 6's explicit "assumption may be wrong" watch-list — SPIKE-01 (MEDIUM), SPIKE-02 (MEDIUM), SPIKE-04(b) env-override (LOW), and SPIKE-04(c) IDE-vs-Shell (MEDIUM). Phase 6 filters this map to exactly the `Watch-list (Phase 6): yes` rows. HIGH-confidence rows — SPIKE-03 and SPIKE-04(a) config-home — are marked `no` and are not on the watch-list.

---

## Section 2 — Adjacent-Surface Reference Rows (D-14 — lighter; no AC step)

> Phase 2 needs these documented contracts. They are **not in doubt**, so each carries a documented contract + source URL + confidence but **no acceptance step** (their in-Bob load is proven by Phase 2's TRANS-01/02 acceptance steps). These rows carry no `AC-0N` reference.

| Primitive | Documented contract | Source (URL) | Confidence |
|-----------|---------------------|--------------|-----------|
| **Agent Skill** | `<name>/SKILL.md` with YAML frontmatter; **only `name` + `description`** are read. Project `<project>/.bob/skills/`, global `~/.bob/skills/`; project-over-global precedence. "skills without descriptions are ignored." Converter must **strip** unsupported keys (`effort`, `allowed-tools`, `model`). No documented max description length. | `https://bob.ibm.com/docs/ide/features/skills` | HIGH |
| **Slash command** | `<name>.md` markdown; frontmatter **`description` + `argument-hint`** only. Filename→command (lowercased, spaces→dashes, special chars removed). Positional args `$1`,`$2` (no `$ARGUMENTS` documented). Project `.bob/commands/`, global `~/.bob/commands/`. Hyphen form only (`gsd-<cmd>`). | `https://bob.ibm.com/docs/ide/features/slash-commands` | HIGH |
| **Custom Mode (`groups`)** | `custom_modes.yaml`: `slug`, `name`, `roleDefinition`, `whenToUse` (opt), `customInstructions`, `groups`. Global `~/.bob/custom_modes.yaml`, project `.bob/custom_modes.yaml`. Tool groups: `read`, `edit` (fileRegex-restrictable), `browser`, `command`, `mcp`, `skill` (IDE). | `https://bob.ibm.com/docs/ide/configuration/custom-modes` · `https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell` | HIGH |
| **MCP / Rules / AGENTS.md** | MCP servers configurable (Bob-native). Bob Rules: `.bobrules` / `.bob/rules/` / `.bob/rules-{modeSlug}/` (and `~/.bob/rules/` global). AGENTS.md context convention generated by `/init`. | `https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob` · `https://bob.ibm.com/docs/shell/configuration/bobshell-custom-rules` | MEDIUM-HIGH |
