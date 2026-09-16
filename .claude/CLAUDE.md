<!-- GSD:project-start source:PROJECT.md -->

## Project

**GSD for IBM Bob (gsd-bob)**

A standalone, installable adapter package that makes **open-gsd** — the GSD ("Getting Stuff Done") spec-driven planning framework, today a Claude Code skill/agent system — run natively inside **IBM Bob** (bob.ibm.com). It audits GSD's primitives (slash commands, subagents, workflows, templates), maps Bob's extension architecture, and translates GSD into Bob-native artifacts that work regardless of which model backend Bob routes to (Claude Code CLI, Gemini, etc.). It ships with a one-line npx installer (local/global scope, update/clean modes) and is built clean enough to eventually be contributed upstream as a first-class Bob runtime in gsd-core.

**Core Value:** A Bob user can install via a single command and run the full GSD planning loop — new-project → plan-phase → execute-phase → verify — natively, producing the same `.planning/` artifacts GSD produces in Claude Code.

### Constraints

- **Compatibility**: Must produce the same `.planning/` artifact contract GSD produces today (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json, phase plans) so the two runtimes stay interchangeable.
- **Tech stack**: Installer is npx/Node, mirroring gsd-core's `npx @opengsd/...` pattern — cross-platform, familiar to existing GSD users.
- **Dependencies**: Bound to IBM Bob's actual extension capabilities (unknown until researched) and to gsd-core's evolving structure (it is the upstream source of truth).
- **Contribution-readiness**: Adapter must be structured and documented to a standard the open-gsd maintainers would plausibly accept.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

Installer + tools: **Node `>=22.15.0`**, **CommonJS `.cjs`**, **node builtins only**
(`node:fs`, `node:path`, `node:os`) in the install/staging path — the single runtime dependency,
`js-yaml`, is confined to `src/bob-adapter.cjs` for the `custom_modes.yaml` merge — argv hand-parsed, matching
gsd-core's own installer so the work stays upstream-mergeable. Distribution is
`npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --<scope>`.

Do **not** add: a CLI framework (`commander`/`oclif`/`yargs`), `fs-extra`/`copyfiles`/`cpy`,
`chalk`/`ora`, ESM (`"type":"module"`), a YAML parser in the install path (frontmatter is
hand-sliced; `js-yaml` is already used only for the `custom_modes.yaml` merge), or
`@anthropic-ai/claude-agent-sdk` (gsd-bob is backend-agnostic by design).

## How gsd-core Actually Works (verified 2026-09-16 against the vendored 1.14.0 tree)

- Name: `@opengsd/gsd-core`, latest **`1.14.0`**. gsd-bob vendors it under `gsd-core/`
  (`gsd-core/VERSION`), five curated subdirs: `bin contexts references templates workflows`.
- `bin` map (4 entries): `gsd-core` → `bin/install.js`, `gsd-tools` → `gsd-core/bin/gsd-tools.cjs`,
  `gsd_run` → `gsd-core/bin/gsd_run`, **`gsd-mcp-server`** (added since 1.6.1).
- `engines` upstream: **node `>=24.0.0`**, npm `>=10`. **gsd-bob stays at `>=22.15.0`** — the only
  Node-24 API the payload reaches for (`RegExp.escape`) is feature-detected with an in-file
  fallback, and the vendored `bin` was executed on Node 22.15.0 during the re-vendor. Re-verify on
  every bump (MAINTAINING step 8).
- 72 commands upstream; gsd-bob curates **31** (`commands/gsd/*.md`) and emits all 31 — 0 unsupported.
- **There is no separate `--clean`/`--update` flag.** "Update" = re-run the same install command;
  "clean" = `--uninstall` then install. gsd-bob replicates this exactly — never invent new flags.
- The legacy `/gsd:<cmd>` colon form is deprecated upstream; only the hyphen form `gsd-<cmd>` is
  routable (and matches Bob's filename→command rule).
- The runtime registry is **generated** from `capabilities/<id>/capability.json`
  (`role: "runtime"` is copied into `runtimes[id]` verbatim), and `VALID_CONVERTER_NAMES` in
  `capability-validator.cjs` is a **closed allowlist** a descriptor's converters must be on.
- **External/pluggable runtime descriptors are a NO-GO** (verified): every module that resolves a
  runtime `require`s the frozen `capability-registry.cjs` directly and never calls
  `capability-loader.cjs`'s `loadRegistry`. The vendored hand-patch stays. See
  `.planning/research/260916-gsd-core-1.14.0-delta.md` §2.6 and `UPSTREAM.md`.
- **1.14.0 behavioural gate:** `execute-phase`'s isolation-dispatch step exits `FATAL` on a runtime
  whose descriptor declares `dispatch.isolation: "none"` unless `workflow.use_worktrees=false`.
  The installer seeds that key; `.planning/config.json` gets **no** `runtime` key (it is the
  Claude↔Bob interchange surface) — runtime identity lives in `gsd-core/.gsd-runtime`.

## IBM Bob Extension Surface (verified 2026-09-16: docs + the shipped bundles)

**Supported target: Bob 2.0.x only** (Bob Shell 2.0.0–2.0.4, Bob IDE 2.x). Bob Shell 1.0.x has
**no skills and no subagents**, so only commands + the mode would load, and 2.0.0 requires a
fresh install anyway — no version probe, no compatibility matrix. Bob Shell 2.x itself needs
Node 24.

| Bob primitive | On-disk format | Location (project / global) | Maps to GSD primitive |
|---|---|---|---|
| **Agent Skill** | `SKILL.md`, frontmatter `name` + `description` only; supports nested `scripts/`, `references/`, `assets/` | `.bob/skills/<name>/SKILL.md` / `~/.bob/skills/<name>/SKILL.md` | GSD skill — **direct 1:1** |
| **Slash command** | `<name>.md`, frontmatter `description` + `argument-hint`; filename → command name; `$1`/`$2` positional args | `.bob/commands/<name>.md` / `~/.bob/commands/<name>.md` | GSD slash command (workflow entry) |
| **Custom Mode** | YAML `customModes[]` with `slug`, `name`, `roleDefinition`, `whenToUse`, `customInstructions`, `groups` | **scope-asymmetric:** project `.bob/custom_modes.yaml`; global **`~/.bob/settings/custom_modes.yaml`** — owned solely by `modesRelPathForScope()`, never re-inline the literal | the emitted `gsd` mode |
| **Bob Rules** | plain-text rule files | `.bob/rules/`, `.bob/rules-{mode}/`, `.bobrules`, `.bobrules-{mode}` (+ `~/.bob/rules/`) | GSD project rules |
| **AGENTS.md** | markdown context, generated by `/init` | `~/.bob/AGENTS.md`, workspace `AGENTS.md` | GSD context convention (Phase 14) |
| **Settings / hooks** | `hooks` key in settings JSON | `.bob/settings.json`, `~/.bob/settings/settings.json` | Bob 2.x lifecycle hooks (Phase 14, deferred) |
| **MCP** | `bob mcp add` / config JSON | `.bob/mcp.json`, `~/.bob/settings/mcp_settings.json` | GSD MCP surface (Phase 15, deferred) |
| **Bob Shell (`bob`)** | terminal CLI; `bob run` for non-interactive, API key via **`BOB_API_KEY`**; `--trust` for untrusted folders | n/a | the host runtime for headless flows |

**Facts that bite:**
- **Config home `~/.bob` is fixed.** No env override relocates it (the shipped bundle computes
  `path.join(os.homedir(), ".bob")`; there is no `BOB_CONFIG_DIR`). The descriptor declares
  `env: []` — the field must stay present because gsd-core's `dot-home` branch iterates it.
- **`groups` validates as an OPEN string union, not an enum.** An unrecognised token loads
  silently and grants no tool, so the emitted set must be pinned by test. Verified vocabulary:
  `read, edit, execute, mcp, skill, workflow, todo, subtask, subagent, mode`; `command` is a
  back-compat **alias** Bob normalizes to `execute` (`execute` is canonical and what we emit).
  A mode with `groups` omitted gets no grouped tools at all.
- **Subagents:** `spawn_subagent` gives an isolated context window and **parallel fan-out**
  ("Multiple spawn_subagent calls in one turn run in parallel"); **nesting is forbidden**. There
  is **no git-worktree primitive** — hence `dispatch.isolation: "none"`.
- **Bob 2.0.1+ never auto-approves writes into `~/.bob`**, and settings writes always need
  explicit approval — expect a prompt on a global install run from inside a Bob session.
- **Untrusted folders:** project-scoped commands, skills, modes, rules, `AGENTS.md` and MCP
  servers are not loaded. `bob --trust` / `bob run --trust`, or the folder-trust dialog.
- **`.bob/agents/` persona files are not documented anywhere** (the page was withdrawn, 404) —
  Phase 14 stays deferred rather than guessing a format.
- No structured-choice prompt primitive → `workflow.text_mode: true` is seeded. Bob's real
  context window is **270k** → `context_window: 270000` is seeded.

## Sources

- The vendored `gsd-core/` 1.14.0 tree, read directly — `capability-registry.cjs`,
  `capability-validator.cjs`, `runtime-artifact-conversion.cjs`, `runtime-homes.cjs`,
  `runtime-name-policy.cjs`, `capability-loader.cjs`, `host-integration.cjs`,
  `references/gsd-run-resolver.md`, `workflows/execute-phase/steps/executor-isolation-dispatch.md`
  — HIGH.
- `.planning/research/260916-gsd-core-1.14.0-delta.md` — the sourced 1.6.1 → 1.14.0 code delta
  (registry schema, converter exports, resolver, Node floor, dispatch gate, 14 ranked risks) — HIGH.
- `.planning/research/260916-bob-shell-docs.md` (all 40 Shell pages, per-version table, 10 doc
  contradictions) and `260916-bob-ide-docs.md` (all 98 IDE pages) — HIGH (official docs).
- `.planning/research/260916-bob-1.0.4-bundle.md` — the shipped Bob Shell 1.0.4 bundle read as
  code (this machine's install) — HIGH, and the basis for the 1.0.x-unsupported decision.
- `.planning/phases/12-bob-2-0-capability-re-verification/12-BOB2-EVIDENCE.md` — the live Bob
  Shell 2.0.1 bundle evidence (modes-path asymmetry, `execute` canonical, fan-out, no config-home
  override) — HIGH.
- `.planning/phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md` — the real re-vendor log the
  MAINTAINING runbook is corrected from.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
