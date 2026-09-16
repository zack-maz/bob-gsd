# On-Device Acceptance Checklist

**Established:** Phase 1 (Bob Capability Mapping) · **Run target:** Phase 6 (On-Device Acceptance Verification)

This is the single, consolidated, **root-anchored** (`.planning/ACCEPTANCE-CHECKLIST.md`), device-runnable acceptance checklist for gsd-bob. It exists from Phase 1 onward and lives at the planning root — never nested under a phase directory.

**Cross-phase append convention (D-07):** This file is the **append target for Phases 2–6**. Each later phase appends its own `AC-NN` steps using the same schema below (`Cmd:` / `Expect:` / `Confirms:` / `Result:`), so verification accumulates in one place with zero gathering or merge work. **Phase 6 runs the entire accumulated file once, unattended, on a real Bob-enabled machine** and records an unambiguous pass/fail per step.

**Schema (D-05):** Each step has a stable ID (`AC-01`, `AC-02`, …) and four fields in order:
- `Cmd:` — the exact command to run
- `Expect:` — the expected output / observable result
- `Confirms:` — which SPIKE / success criterion it validates
- `Result: [ ] pass  [ ] fail`

**Safety invariant (T-01-SC):** Every `Cmd:` line in this file MUST be read-only / side-effect-free — directory listing, `echo $VAR`, or a no-side-effect read-only `node gsd-tools.cjs` / `gsd_run query`. No install, write, delete, move, copy, or any state mutation. These commands run unattended on a user's real machine in Phase 6, so they must be safe to execute as-is.

---

## How to Run

Run this entire file once, top to bottom, on a **real Bob-enabled machine**. Coverage is already proven: every v1 success criterion across Phases 1–5 maps to ≥1 step below (see `.planning/phases/06-on-device-acceptance-verification/06-COVERAGE-MATRIX.md`, mechanically re-proven by `test/acceptance-coverage.test.cjs`). Your job is the single empirical pass, not interpretation.

**Prerequisites:**
- A real Bob install (IDE or Bob Shell), since no live Bob exists during development.
- Node `>=22.15.0` (the project engines floor).
- A throwaway / scratch workspace — the mutating steps install, run the loop, and uninstall against `.bob/`; do not run them in a workspace you care about.

**Install gsd-bob (the one mutating bootstrap, performed inside the AC-13 step):**

```
npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local
```

**For each step:** run the `Cmd:` line verbatim; type numbered answers when a flow prompts you. Mark `Result: [ ] pass [ ] fail` inline AND fill the matching row in `## Results Roll-Up`. Mark **fail** whenever the observed output does not match `Expect:`. **If a fail concerns a watch-list assumption** (a conservative Phase-1 default — subagent isolation, structured prompts, config-home override, IDE-vs-Shell signal), record the refutation in `.planning/ACCEPTANCE-FOLLOWUPS.md` so it becomes a tracked v2 enhancement rather than a silent gap.

**Read-only by default (T-01-SC preserved):** Steps `AC-01..AC-12`, `AC-26`, and `AC-27..AC-50` are pure read-only observation and may run in any order (`AC-27..AC-50` add no new mutating `Cmd:` — `grep`/`ls`/`cat` only). The ONLY mutating commands are the already-marked install / core-loop / quality-gate / uninstall runs inside `AC-13..AC-25` (`npx … gsd-bob …`, `/gsd-*` invocations). This run scaffolding adds **no new `Cmd:` line** and does not weaken the read-only-by-default posture — run the mutating steps in the dependency order below.

## Execution Order

1. **Read-only first (any order):** `AC-01..AC-12` (observation / `grep` / `cat` / `echo` only), `AC-26` (README / upstream doc greps), `AC-27` (model-neutrality grep), `AC-28..AC-48` (per-command emission-recognition, `ls`/`cat` only), and `AC-49..AC-50` (installed-artifact `cat` checks — most meaningful AFTER the `AC-13` install, but they mutate nothing). `AC-11`'s read-only `cat`/`grep` is most meaningful AFTER the `AC-13` install has run, but the command itself mutates nothing.
2. **Mutating steps, in this exact dependency order** (each depends on prior install / loop state):
   - `AC-13` — install (`gsd-bob --bob --local`) into a fresh scratch `.bob/`.
   - `AC-14` — re-run the same install (idempotency), after seeding a user mode/command/rule.
   - `AC-16` — `--dry-run` (no-op; writes nothing — placed here for narrative grouping with the install lifecycle).
   - `AC-17 → AC-18 → AC-19 → AC-20 → AC-21` — the core loop **in sequence** (`new-project → plan-phase → execute-phase → verify-work → progress`; each step needs the prior step's artifact).
   - `AC-22 → AC-23 → AC-24 → AC-25` — the quality gates (each needs the `AC-13` install).
   - `AC-26` — README / upstream doc checks (read-only; may also run anytime).
   - `AC-15` — uninstall (`--uninstall`) **LAST, as teardown.** AC-15 destroys the install that `AC-17..AC-25` require, so it MUST run after the loop and gates complete. Running it earlier tears down a prerequisite the later steps need.

## Results Roll-Up

The single at-a-glance pass/fail record to report. Mark each row (keep the inline `Result:` checkbox in each step too); add a short note on any `fail` and a `FU-NN` reference if you logged the refutation in `.planning/ACCEPTANCE-FOLLOWUPS.md`.

| AC-ID | pass/fail | notes |
|-------|-----------|-------|
| AC-01 | [ ] pass  [ ] fail | |
| AC-02 | [ ] pass  [ ] fail | |
| AC-03 | [ ] pass  [ ] fail | |
| AC-04 | [ ] pass  [ ] fail | |
| AC-05 | [ ] pass  [ ] fail | |
| AC-06 | [ ] pass  [ ] fail | |
| AC-07 | [ ] pass  [ ] fail | |
| AC-08 | [ ] pass  [ ] fail | |
| AC-09 | [ ] pass  [ ] fail | |
| AC-10 | [ ] pass  [ ] fail | |
| AC-11 | [ ] pass  [ ] fail | |
| AC-12 | [ ] pass  [ ] fail | |
| AC-13 | [ ] pass  [ ] fail | |
| AC-14 | [ ] pass  [ ] fail | |
| AC-15 | [ ] pass  [ ] fail | |
| AC-16 | [ ] pass  [ ] fail | |
| AC-17 | [ ] pass  [ ] fail | |
| AC-18 | [ ] pass  [ ] fail | |
| AC-19 | [ ] pass  [ ] fail | |
| AC-20 | [ ] pass  [ ] fail | |
| AC-21 | [ ] pass  [ ] fail | |
| AC-22 | [ ] pass  [ ] fail | |
| AC-23 | [ ] pass  [ ] fail | |
| AC-24 | [ ] pass  [ ] fail | |
| AC-25 | [ ] pass  [ ] fail | |
| AC-26 | [ ] pass  [ ] fail | |
| AC-27 | [ ] pass  [ ] fail | |
| AC-28 | [ ] pass  [ ] fail | |
| AC-29 | [ ] pass  [ ] fail | |
| AC-30 | [ ] pass  [ ] fail | |
| AC-31 | [ ] pass  [ ] fail | |
| AC-32 | [ ] pass  [ ] fail | |
| AC-33 | [ ] pass  [ ] fail | |
| AC-34 | [ ] pass  [ ] fail | |
| AC-35 | [ ] pass  [ ] fail | |
| AC-36 | [ ] pass  [ ] fail | |
| AC-37 | [ ] pass  [ ] fail | |
| AC-38 | [ ] pass  [ ] fail | |
| AC-39 | [ ] pass  [ ] fail | |
| AC-40 | [ ] pass  [ ] fail | |
| AC-41 | [ ] pass  [ ] fail | |
| AC-42 | [ ] pass  [ ] fail | |
| AC-43 | [ ] pass  [ ] fail | |
| AC-44 | [ ] pass  [ ] fail | |
| AC-45 | [ ] pass  [ ] fail | |
| AC-46 | [ ] pass  [ ] fail | |
| AC-47 | [ ] pass  [ ] fail | |
| AC-48 | [ ] pass  [ ] fail | |
| AC-49 | [ ] pass  [ ] fail | |
| AC-50 | [ ] pass  [ ] fail | |

---

## AC-01 — Subagent isolation

Cmd:    Run a GSD stub mode/command under Bob that spawns an isolated subagent and awaits a completion signal, then list Bob's available tools (read-only). Example, inside a Bob session: invoke the stub mode, then in its terminal run `node gsd-core/bin/gsd-tools.cjs query state.load` and observe whether an isolated-subagent tool (`spawn_subagent`, isolated context window, `subagent` tool group) is offered, and whether any tool spawns MULTIPLE concurrent subagents (parallel fan-out).
Expect: An isolated-subagent primitive IS available (Bob documents `spawn_subagent` with an isolated context window and a `subagent` tool group); subagents run sequentially. No parallel-fan-out tool (multiple concurrent subagents) is available or verified. Mode switching is in-session only.
Confirms: SPIKE-01 — corrected default "isolated subagents present (sequential); parallel fan-out unconfirmed".
Result: [ ] pass  [ ] fail

## AC-02 — Structured prompt primitive

Cmd:    Run a GSD stub interactive flow under Bob that asks a multiple-choice question, and observe which question tool Bob exposes (read-only observation; type a numbered answer when prompted).
Expect: Only the conversational `ask_followup_question` text question is available — no structured / multiple-choice suggestion payload. The numbered `text_mode` choices render and a typed answer is captured and validated.
Confirms: SPIKE-02 — conservative default "conversational text_mode (assume NO structured-choice primitive)".
Result: [ ] pass  [ ] fail

## AC-03 — command tool group shells out to gsd-tools.cjs

Cmd:    Invoke a GSD stub Bob mode/command whose `groups` include `command`, which runs the read-only query `node gsd-core/bin/gsd-tools.cjs query state.load` in the workspace.
Expect: The command executes under Bob and its stdout / exit code is captured by Bob (proves `gsd_run` is reachable via the `command` tool group under Bob). No install, write, or other mutation occurs.
Confirms: SPIKE-03 — conservative default "a GSD mode granted the `command` group CAN shell out to `node gsd-tools.cjs`".
Result: [ ] pass  [ ] fail

## AC-04 — Config home, env override, IDE-vs-Shell signal

Cmd:    On a real Bob machine, read-only: list the contents of the config home with `ls -la ~/.bob`; test whether a config-home env override exists by reading the resolved path under each candidate var without relocating anything — `echo $BOB_CONFIG_DIR` and `echo $BOB_HOME` (observe whether either is set / honored); and from inside the IDE-integrated terminal run `echo $BOB_SHELL_CLI_IDE_SERVER_PORT`, then again from a plain/headless Shell.
Expect: `~/.bob` exists as the config home; neither `BOB_CONFIG_DIR` nor `BOB_HOME` is documented/honored to relocate it (or the real override var name is discovered, read-only); `BOB_SHELL_CLI_IDE_SERVER_PORT` is set under the IDE-integrated terminal and unset in a plain Shell. No `.bob` directory is created, moved, or deleted.
Confirms: SPIKE-04 — config home `~/.bob` fixed (no documented relocation override; override dropped) and IDE-vs-Shell detection via `BOB_SHELL_CLI_IDE_SERVER_PORT`.
Result: [ ] pass  [ ] fail

## AC-05 — `.planning/` byte-compatibility, Bob vs Claude (RUNTIME-03)

Cmd:    On a real Bob machine, read-only end-to-end byte diff. In two throwaway copies of an identical sample project, run the SAME read-only `.planning/`-rendering query under each runtime config and compare the emitted artifact bytes WITHOUT mutating any tracked state: (1) `BOB_CONFIG_DIR=$(mktemp -d) node gsd-core/bin/gsd-tools.cjs query state.load > /tmp/bob.planning.out` (bob-resolved config home), (2) `CLAUDE_CONFIG_DIR=$(mktemp -d) node gsd-core/bin/gsd-tools.cjs query state.load > /tmp/claude.planning.out` (claude-resolved config home), then `diff /tmp/bob.planning.out /tmp/claude.planning.out`. Only temp dirs and `/tmp` output files are written; no project `.planning/` file is created, moved, or modified.
Expect: `diff` reports NO differences (exit 0) — the `.planning/` artifact bytes are identical under the bob and claude runtime configs, confirming the write path is runtime-agnostic on real hardware. This is the on-device complement to the hermetic `test/planning-bytecompat.test.cjs` golden diff.
Confirms: RUNTIME-03 — `.planning/` byte-compatible Claude↔Bob (Phase 2 plan 01; hermetic test proven, on-device pass pending).
Result: [ ] pass  [ ] fail

## AC-06 — `gsd_run` resolves the Bob config home (default + override) (RUNTIME-01, RUNTIME-02)

Cmd:    On a real Bob machine, read-only confirm the shim resolves the `bob` runtime home. With the env override set: `BOB_CONFIG_DIR=/tmp/xbob node gsd-core/bin/gsd-tools.cjs query state.load` (observe that the resolved config home is the overridden `/tmp/xbob` path, not `~/.bob`). Then with it unset: `unset BOB_CONFIG_DIR; node gsd-core/bin/gsd-tools.cjs query state.load` (observe the resolved home falls back to `~/.bob`). `state.load` is a read-only query; no `.bob` directory or `.planning/` file is created, moved, or deleted.
Expect: With `BOB_CONFIG_DIR=/tmp/xbob` the shim reads from the overridden path; unset, it reads from `~/.bob`. The query returns the loaded state without mutating any tracked file — proving `gsd_run query` works under Bob (RUNTIME-01) against a descriptor-resolved config home (RUNTIME-02). If `BOB_CONFIG_DIR` is not honored on the real device (SPIKE-04 left the override unverified), record that observation; the fixed `~/.bob` resolution is the required behavior.
Confirms: RUNTIME-01 (shim resolves a bob runtime home so `gsd_run query` works under Bob), RUNTIME-02 (bob runtime descriptor config home + env override).
Result: [ ] pass  [ ] fail

## AC-07 — GSD command is recognized under Bob with its description (TRANS-01)

Cmd:    On a real Bob machine, read-only inspect an emitted Bob slash command and confirm Bob recognizes it. List and read (no edits): `ls .bob/commands` then `cat .bob/commands/gsd-plan-phase.md`, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/<name>.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description. The command appears as `/gsd-<name>` (hyphen form). Confirms the emitted slash command is Bob-native and recognized.
Confirms: TRANS-01 — GSD commands emitted as Bob `.bob/commands/*.md` slash commands (frontmatter + `$1` args).
Result: [ ] pass  [ ] fail

## AC-08 — GSD skill is recognized under Bob (description present) (TRANS-02)

Cmd:    On a real Bob machine, read-only inspect an emitted Bob Agent Skill and confirm Bob recognizes it. List and read (no edits): `ls .bob/skills` then `cat .bob/skills/<name>/SKILL.md`, and observe whether Bob lists/activates the skill. No file is written, moved, or deleted.
Expect: `.bob/skills/<name>/SKILL.md` exists with frontmatter reduced to exactly `name:` + `description:` (no `effort`/`allowed-tools`/`argument-hint`); the description is non-empty so Bob does NOT ignore the skill (Pitfall 4). Bob recognizes the skill by its description.
Confirms: TRANS-02 — GSD skills emitted as Bob `.bob/skills/<name>/SKILL.md` Agent Skills where that is the right surface.
Result: [ ] pass  [ ] fail

## AC-09 — Interactive flow degrades to numbered text under Bob (TRANS-03)

Cmd:    On a real Bob machine, run a GSD interactive flow (e.g. invoke a `/gsd-*` command that asks a multiple-choice question) and read-only observe the prompt presentation; type a numbered answer when prompted (the typed answer is the only input — no file or state is mutated by the observation).
Expect: With the bob runtime default `workflow.text_mode:true`, the flow presents a NUMBERED text list (1., 2., …) rather than a structured-choice payload, and a typed numeric choice is captured and validated against the option set. This is the on-device complement to the hermetic `test/text-mode-golden.test.cjs` (TRANS-03 by reuse of the existing config+workflow seam, no converter rewriting).
Confirms: TRANS-03 — `AskUserQuestion` prompts degrade to `text_mode` (numbered text choices) under Bob so interactive flows can still ask.
Result: [ ] pass  [ ] fail

## AC-10 — Unsupported skill is omitted AND listed in the support roster (TRANS-04)

Cmd:    On a real Bob machine, read-only confirm an unsupported artifact is absent from the emitted set yet recorded loud. List the emitted set and grep the roster (no edits): `ls .bob/skills .bob/commands` (observe the unsupported skill, e.g. `gsd-parallel-fanout`, is NOT present) then `grep "unsupported on Bob:" SUPPORT-ROSTER.md` (observe it IS recorded with a reason). No file is written, moved, or deleted.
Expect: The unsupported skill does not appear under `.bob/skills` / `.bob/commands`, AND `SUPPORT-ROSTER.md` contains a matching `unsupported on Bob: <reason>` line — parity-first, never silently broken.
Confirms: TRANS-04 — skills requiring primitives Bob cannot support are explicitly flagged/skipped (parity-first), never silently broken.
Result: [ ] pass  [ ] fail

## AC-11 — Idempotent `custom_modes.yaml` merge preserves user modes (TRANS-05)

Cmd:    On a real Bob machine, AFTER a (separate, Phase-3) install has run on a config that already had a user-defined mode, read-only confirm the merge was idempotent and non-destructive. Read and grep (no edits): `cat ~/.bob/custom_modes.yaml` (observe the pre-seeded user mode is still present) then `grep -c "slug: gsd$" ~/.bob/custom_modes.yaml` (observe the `gsd` slug appears exactly once). The install itself is a Phase 3/6 action; THIS command is a read-only `cat`/`grep` only — no file is written, moved, or deleted.
Expect: The pre-existing user-defined mode is still present (not overwritten), and the `gsd` slug appears exactly once (not duplicated) — proving the merge is idempotent and slug-scoped, never clobbering user modes.
Confirms: TRANS-05 — `custom_modes.yaml` (and any shared Bob config) merged idempotently; installing gsd-bob never overwrites or duplicates user-defined modes.
Result: [ ] pass  [ ] fail

## AC-12 — No model-backend literals in the bob core paths (RUNTIME-04)

Cmd:    On a real Bob machine, read-only grep the vendored bob core paths for model-name literals (no edits): `grep -rniE "claude|gemini|granite|gpt" gsd-core/bin/lib/capability-registry.cjs src/bob-adapter.cjs | grep -viE "convertClaudeCommandToBob|generated|comment"` (the filter excludes gsd-core's universal `convertClaudeCommandTo<Runtime>` source-format converter-name prefix and comment/doc lines, matching the hermetic backend-neutrality scan). No file is written, moved, or deleted.
Expect: The grep returns NO genuine model-backend reference — the bob runtime entry and adapter contain zero model-brand literals; Bob owns model routing. This is the on-device complement to the hermetic `test/backend-neutrality.test.cjs`.
Confirms: RUNTIME-04 — the GSD core contains no branching on the model backend; gsd-bob never references Claude/Gemini/Granite.
Result: [ ] pass  [ ] fail

## AC-13 — Single-command install prints the target and produces a working `.bob/` layout (INSTALL-01/02/03)

Cmd:    On a real Bob machine, run ONE install command and observe the printed target, then read back the layout. Install (Phase-3-contributed mutating step, run in the Phase 6 pass): `npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local` (or `node bin/gsd-bob.cjs --bob --local` from a checkout). Then read-only confirm: `ls -la .bob`, `grep -c "slug: gsd$" .bob/custom_modes.yaml`, and `ls .bob/gsd-core/bin/gsd-tools.cjs`. The `cat`/`grep`/`ls` read-backs mutate nothing.
Expect: BEFORE writing, the command prints the resolved ABSOLUTE target path (e.g. `Installing into: /…/.bob`). After it completes, `.bob/custom_modes.yaml` exists with exactly one `slug: gsd`, and `.bob/gsd-core/bin/gsd-tools.cjs` is present — a working GSD layout at the chosen scope. The user could equally choose global (`--global` → `~/.bob`).
Confirms: INSTALL-01 (resolved target printed before writing), INSTALL-02 (local/global scope selectable via a single command), INSTALL-03 (clean install produces a working `.bob/` layout) / SC#1 / SC#2.
Result: [ ] pass  [ ] fail

## AC-14 — Re-run is idempotent and preserves user customizations (INSTALL-04)

Cmd:    On a real Bob machine, AFTER seeding a user mode/command/rule and running the AC-13 install once, run the SAME install command a SECOND time (Phase-6 mutating step), then read-only confirm. Re-run: `npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local`. Confirm (read-only): `grep -c "slug: gsd$" .bob/custom_modes.yaml` and `grep -c "slug: my-mode" .bob/custom_modes.yaml`, plus `ls` of any pre-existing user command/rule file.
Expect: `grep -c "slug: gsd$"` returns exactly `1` (no duplication on re-run), the pre-existing user mode `my-mode` is still present, and the user-authored command/rule files are untouched — the re-run updated in place without clobbering or duplicating anything.
Confirms: INSTALL-04 — re-running the installer updates idempotently, preserving user-authored commands, rules, and `gsd-*` modes without duplication / SC#3.
Result: [ ] pass  [ ] fail

## AC-15 — Manifest is the sole source of truth; uninstall touches only tracked entries (INSTALL-05)

Cmd:    On a real Bob machine, AFTER the AC-13/AC-14 install, read-only inspect the manifest, then run the manifest-driven uninstall (Phase-6 mutating step) and read-only confirm what it spared. Inspect: `cat .bob/.gsd-bob-manifest.json` (observe `entries[]`). Uninstall: `npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local --uninstall`. Confirm (read-only): `ls .bob/custom_modes.yaml`, `grep -c "slug: my-mode" .bob/custom_modes.yaml`, `grep -c "slug: gsd$" .bob/custom_modes.yaml`, and `ls -d .planning` (still present).
Expect: `.gsd-bob-manifest.json` lists the tracked `entries[]` (the sole source of truth). After `--uninstall`: matching tracked `file` entries are gone, `custom_modes.yaml` still exists with `my-mode` and NO `slug: gsd` (un-merged, not deleted), the manifest dotfile is removed, and `.planning/` is still present (never deleted). A user file the manifest does not track is left intact.
Confirms: INSTALL-05 — the manifest is the sole source of truth; update/uninstall touch only tracked entries; uninstall un-merges slices and never deletes `.planning/` (D-06/D-07) / SC#4.
Result: [ ] pass  [ ] fail

## AC-16 — `--dry-run` prints the plan and writes nothing

Cmd:    On a real Bob machine, run a dry-run install and confirm zero filesystem change. Snapshot, then dry-run, then re-snapshot (read-only around a no-write command): `find .bob -type f 2>/dev/null | sort > /tmp/before.txt; npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local --dry-run; find .bob -type f 2>/dev/null | sort > /tmp/after.txt; diff /tmp/before.txt /tmp/after.txt`. Only `/tmp` snapshot files are written; the `--dry-run` command itself writes nothing under `.bob/`.
Expect: The dry-run output carries the `PLAN (dry-run — nothing written)` marker and the full staging plan, and `diff /tmp/before.txt /tmp/after.txt` reports NO differences (exit 0) — the dry-run mutated nothing on disk. Note: for a global install with no project `.planning/`, `text_mode` is a per-project guarantee written into `<project>/.planning/config.json` only — it is NOT enforced at the runtime/descriptor level.
Confirms: INSTALL-01/05 dry-run safety (D-12) — `--dry-run` prints the plan and writes nothing; the global-scope `text_mode` limitation is surfaced, not hidden (per-project only).
Result: [ ] pass  [ ] fail

## AC-17 — `new-project` runs natively under Bob and lands a real `.planning/PROJECT.md` (CORE-01)

Cmd:    On a real Bob machine, AFTER the AC-13 install, run the in-Bob new-project loop step (Phase-6 mutating step): invoke `/gsd-new-project` and answer its prompts. Then read-only confirm the emitted command + skill and the produced artifact: `ls .bob/commands/gsd-new-project.md .bob/skills/gsd-new-project/SKILL.md`, `cat .planning/PROJECT.md`, and `grep -cE '^## (What This Is|Core Value|Requirements)' .planning/PROJECT.md`. The `/gsd-new-project` run is the mutating step (allowed, like AC-13's install); the `ls`/`cat`/`grep` read-backs mutate nothing.
Expect: `.bob/commands/gsd-new-project.md` and `.bob/skills/gsd-new-project/SKILL.md` exist (the converted core-loop entry is Bob-native); `.planning/PROJECT.md` was produced with its documented top-level headers (`## What This Is`, `## Core Value`, `## Requirements`) holding the real answers you typed — no unfilled `{{`/`TODO`/placeholder markers. This is the on-device complement to the hermetic `test/core-loop-equivalence.test.cjs` (D-05 real-answer guard).
Confirms: CORE-01 — new-project runs natively under Bob and produces a contract-conformant `.planning/PROJECT.md` / SC#1. (on-device complement to test/core-loop-equivalence.test.cjs)
Result: [ ] pass  [ ] fail

## AC-18 — `plan-phase` (incl. transitive `discuss-phase`) produces a contract-conformant PLAN.md (CORE-02)

Cmd:    On a real Bob machine, AFTER AC-17, run the in-Bob plan-phase loop step (Phase-6 mutating step): invoke `/gsd-plan-phase` (which threads through discuss-phase) and answer its prompts. Then read-only confirm the emitted commands and the produced PLAN.md: `ls .bob/commands/gsd-plan-phase.md .bob/commands/gsd-discuss-phase.md`, `ls .planning/phases/*/[0-9]*-PLAN.md`, and `grep -cE '^<(objective|tasks|success_criteria)>' .planning/phases/*/*-PLAN.md`. The `/gsd-plan-phase` run is the mutating step; the `ls`/`grep` read-backs mutate nothing.
Expect: `.bob/commands/gsd-plan-phase.md` and `.bob/commands/gsd-discuss-phase.md` both exist; a `*-PLAN.md` is produced under `.planning/phases/<phase>/` carrying the documented frontmatter fence (`phase:`/`plan:`) and section markers (`<objective>`, `<tasks>`, `<success_criteria>`). This is the on-device complement to the hermetic `test/core-loop-contract.test.cjs` (CORE-02 PLAN.md structural contract).
Confirms: CORE-02 — plan-phase (with transitive discuss-phase) produces a PLAN.md matching the documented section/frontmatter contract / SC#2. (on-device complement to test/core-loop-contract.test.cjs)
Result: [ ] pass  [ ] fail

## AC-19 — `execute-phase` (incl. `execute-plan`) commits atomically per task (CORE-03)

Cmd:    On a real Bob machine, AFTER AC-18, run the in-Bob execute-phase loop step (Phase-6 mutating step): invoke `/gsd-execute-phase`, which runs the execute-plan workflow sequentially inline and commits each task. Then read-only confirm the emitted command, the staged workflow, and the commit shapes: `ls .bob/commands/gsd-execute-phase.md`, `ls .bob/gsd-core/workflows/execute-plan.md`, and `git log --format='%s' -n 20 | grep -cE '^\w+\(\d+-\d+\)'` (count atomic-shaped subjects). The `/gsd-execute-phase` run is the mutating step; the `ls`/`git log` read-backs mutate nothing.
Expect: `.bob/commands/gsd-execute-phase.md` exists and `.bob/gsd-core/workflows/execute-plan.md` is staged as a workflow (CORE-03 is reached transitively via execute-phase→execute-plan, not as a separate slash command); the recent `git log` subjects all match the atomic `{type}({phase}-{plan})` shape `/^\w+\(\d+-\d+\)/` — one commit per task, under the sequential-inline model. This is the on-device complement to the hermetic `test/core-loop-contract.test.cjs` (CORE-03 atomic-commit contract).
Confirms: CORE-03 — execute-phase (with execute-plan) produces one atomic `{type}({phase}-{plan})` commit per task under sequential-inline / SC#3. (on-device complement to test/core-loop-contract.test.cjs)
Result: [ ] pass  [ ] fail

## AC-20 — `verify-work` (incl. transitive `verify-phase`) runs natively under Bob (CORE-04)

Cmd:    On a real Bob machine, AFTER AC-19, run the in-Bob verify loop step (Phase-6 mutating step): invoke `/gsd-verify-work`, which threads through the verify-phase workflow. Then read-only confirm the emitted command, the staged workflow, and the verification artifact: `ls .bob/commands/gsd-verify-work.md`, `ls .bob/gsd-core/workflows/verify-phase.md`, and `ls .planning/phases/*/*VERIFICATION*.md .planning/phases/*/*SUMMARY*.md 2>/dev/null`. The `/gsd-verify-work` run is the mutating step; the `ls` read-backs mutate nothing.
Expect: `.bob/commands/gsd-verify-work.md` exists and `.bob/gsd-core/workflows/verify-phase.md` is staged as a workflow (CORE-04 is reached transitively via verify-work→verify-phase, not as a separate slash command); the verify flow runs under Bob and produces/updates its verification artifact in `.planning/phases/<phase>/`. This is the on-device complement to the hermetic `test/core-loop-contract.test.cjs` workflow-staging assertion (verify-phase staged, not a command).
Confirms: CORE-04 — verify-work (with transitive verify-phase) runs natively under Bob / SC#4. (on-device complement to test/core-loop-contract.test.cjs)
Result: [ ] pass  [ ] fail

## AC-21 — `progress` runs natively and `.planning/` stays root-anchored, none nested (CORE-05)

Cmd:    On a real Bob machine, AFTER a full loop run (AC-17..AC-20), run the in-Bob progress step (Phase-6 mutating step): invoke `/gsd-progress`. Then read-only confirm the emitted command and the root-anchoring invariant: `ls .bob/commands/gsd-progress.md`, `find . -type d -name .planning | sort` (count and locate every `.planning/`), and `test ! -d .bob/.planning && echo "no nested .planning under scope"`. The `/gsd-progress` run is the mutating step; the `ls`/`find`/`test` read-backs mutate nothing.
Expect: `.bob/commands/gsd-progress.md` exists; `find . -type d -name .planning` lists EXACTLY ONE `.planning/`, located at the workspace root next to `.bob/` (not under the scope dir); no nested `.bob/.planning` exists. This is the on-device complement to the hermetic `test/core-loop-root-anchor.test.cjs` (single root-anchored `.planning/`, no nesting).
Confirms: CORE-05 — progress runs natively and the loop keeps exactly one root-anchored `.planning/` with no nested second / SC#5. (on-device complement to test/core-loop-root-anchor.test.cjs)
Result: [ ] pass  [ ] fail

## AC-22 — `code-review` (incl. `--fix`) runs natively under Bob (QUAL-01)

Cmd:    On a real Bob machine, AFTER the AC-13 install, run the in-Bob code-review quality gate (Phase-6 mutating step): make a small fixture change, then invoke `/gsd-code-review` to review it and `/gsd-code-review --fix` to apply the review's fixes to the working tree. Then read-only confirm the emitted command + skill and the staged fix workflow: `ls .bob/commands/gsd-code-review.md .bob/skills/gsd-code-review/SKILL.md`, `ls .bob/gsd-core/workflows/code-review-fix.md`, and `test ! -f .bob/commands/gsd-code-review-fix.md && echo "fix is workflow-only, not a command"`. The `/gsd-code-review` and `--fix` runs are the mutating steps; the `ls`/`test` read-backs mutate nothing.
Expect: `.bob/commands/gsd-code-review.md` and `.bob/skills/gsd-code-review/SKILL.md` exist (the converted gate is Bob-native); `.bob/gsd-core/workflows/code-review-fix.md` is staged as a workflow; NO `.bob/commands/gsd-code-review-fix.md` command exists (`--fix` is reached transitively through the workflow, not as a separate slash command); the review reports findings and `--fix` applies them to the working tree. This is the on-device complement to the hermetic `test/quality-gate-equivalence.test.cjs` + `test/quality-gate-contract.test.cjs`.
Confirms: QUAL-01 — code-review (with the `--fix` workflow) runs natively under Bob, emitting a Bob-native command + skill and a wholesale-staged fix workflow / SC#1. (on-device complement to test/quality-gate-equivalence.test.cjs)
Result: [ ] pass  [ ] fail

## AC-23 — `debug` + `continue <slug>` restores session state from disk (QUAL-02)

Cmd:    On a real Bob machine, AFTER the AC-13 install, run the in-Bob debug quality gate across a simulated context reset (Phase-6 mutating step): invoke `/gsd-debug` to start a session on a fixture bug (it writes `.planning/debug/<slug>.md`), then in a fresh session invoke `/gsd-debug continue <slug>` to resume. Then read-only confirm the emitted command + skill and the restored state on disk: `ls .bob/commands/gsd-debug.md .bob/skills/gsd-debug/SKILL.md`, `cat .planning/debug/<slug>.md`, and `grep -cE '^(status|hypothesis|next_action):' .planning/debug/<slug>.md`. The `/gsd-debug` and `continue` runs are the mutating steps; the `ls`/`cat`/`grep` read-backs mutate nothing.
Expect: `.bob/commands/gsd-debug.md` and `.bob/skills/gsd-debug/SKILL.md` exist; after `continue <slug>` the session's `status`, `hypothesis`, and `next_action` (plus Evidence / Eliminated counts) are restored VERBATIM from `.planning/debug/<slug>.md` — proving state survives a reset by reloading from disk, not a "session starts" false positive. This is the on-device complement to the hermetic `test/debug-state-persistence.test.cjs` start→reset→continue→restore round-trip.
Confirms: QUAL-02 — debug starts a session, persists state to `.planning/debug/<slug>.md`, and `continue <slug>` restores it from disk across a context reset / SC#2. (on-device complement to test/debug-state-persistence.test.cjs)
Result: [ ] pass  [ ] fail

## AC-24 — `audit-fix` runs natively under Bob (QUAL-03)

Cmd:    On a real Bob machine, AFTER the AC-13 install, run the in-Bob audit-fix quality gate (Phase-6 mutating step): invoke `/gsd-audit-fix` to find, classify, fix, test, and commit issues. Then read-only confirm the emitted command + skill and the roster posture: `ls .bob/commands/gsd-audit-fix.md .bob/skills/gsd-audit-fix/SKILL.md` and `grep -c "gsd-audit-fix" SUPPORT-ROSTER.md` then `grep "gsd-audit-fix" SUPPORT-ROSTER.md | grep -c "unsupported on Bob"`. The `/gsd-audit-fix` run is the mutating step; the `ls`/`grep` read-backs mutate nothing.
Expect: `.bob/commands/gsd-audit-fix.md` and `.bob/skills/gsd-audit-fix/SKILL.md` exist (the gate is Bob-native); `gsd-audit-fix` appears in `SUPPORT-ROSTER.md` Supported and in ZERO `unsupported on Bob:` lines (no quality-gate skip under the sequential-inline lower bound); the audit-to-fix pipeline runs to completion under Bob. This is the on-device complement to the hermetic `test/quality-gate-contract.test.cjs` + `test/roster-capmap.test.cjs`.
Confirms: QUAL-03 — audit-fix runs natively under Bob as a supported quality gate with zero new skips under the sequential-inline lower bound / SC#3. (on-device complement to test/quality-gate-contract.test.cjs)
Result: [ ] pass  [ ] fail

## AC-25 — `audit-uat` runs natively under Bob (QUAL-03)

Cmd:    On a real Bob machine, AFTER the AC-13 install, run the in-Bob audit-uat quality gate (Phase-6 mutating step): invoke `/gsd-audit-uat` to audit outstanding UAT / verification items. Then read-only confirm the emitted command + skill and the roster posture: `ls .bob/commands/gsd-audit-uat.md .bob/skills/gsd-audit-uat/SKILL.md` and `grep "gsd-audit-uat" SUPPORT-ROSTER.md | grep -c "unsupported on Bob"`. The `/gsd-audit-uat` run is the mutating step; the `ls`/`grep` read-backs mutate nothing.
Expect: `.bob/commands/gsd-audit-uat.md` and `.bob/skills/gsd-audit-uat/SKILL.md` exist; `gsd-audit-uat` appears in ZERO `unsupported on Bob:` lines (supported under the sequential-inline lower bound); the cross-phase UAT audit runs to completion under Bob. This is the on-device complement to the hermetic `test/quality-gate-contract.test.cjs` + `test/roster-capmap.test.cjs`.
Confirms: QUAL-03 — audit-uat runs natively under Bob as a supported quality gate with zero new skips under the sequential-inline lower bound / SC#3. (on-device complement to test/quality-gate-contract.test.cjs)
Result: [ ] pass  [ ] fail

## AC-26 — README / upstream-readiness doc checks (UP-01 / UP-02)

Cmd:    On a real Bob machine (or any checkout), read-only confirm the ship-ready docs are present and self-consistent. Read and grep (no edits): `grep -q npx README.md && echo install-present`; `grep -q '1.5.0' README.md && grep -q '1.5.0' UPSTREAM.md && echo version-recorded`; `! grep -qE '\-\-clean|\-\-update' README.md && echo no-invented-flags`; for each Supported skill in `SUPPORT-ROSTER.md`, `grep -q "<skill>" README.md` (confirm the README's supported list is roster-sourced, not hand-typed); and `grep -q 'capability-registry' UPSTREAM.md && grep -q 'bob-adapter' UPSTREAM.md && echo inventory-present`. Every command here is a read-only `grep`/`echo`; nothing is written, moved, or deleted.
Expect: `README.md` carries the `npx` install command, scope (local `.bob/` + global `~/.bob/`), the re-run=update / uninstall+install=clean wording, and version `1.5.0`, with NO `--clean`/`--update` flag mentioned; every skill in `SUPPORT-ROSTER.md`'s Supported section also appears in the README (roster-sourced); `UPSTREAM.md` records the 5-artifact move inventory (`capability-registry.cjs`, the two converters, `runtime-aliases.manifest.json`, `runtime-homes.cjs`) plus `src/bob-adapter.cjs` and the targeted version `1.5.0`. This is the on-device complement to the hermetic `test/quality-gate-equivalence.test.cjs` (roster-sourced emission) + `test/backend-neutrality.test.cjs` (the audited isolation UPSTREAM.md records).
Confirms: UP-01 — Bob-specific code isolated to one adapter component + the 5 gsd-core touchpoints, version 1.5.0 recorded in a durable maintainer-visible place; UP-02 — a maintainer-standard README ships covering install, scope/modes, roster-sourced supported skills, flagged gaps, version, and test-deferred posture / SC (upstream-readiness). (on-device complement to test/backend-neutrality.test.cjs)
Result: [ ] pass  [ ] fail

## AC-27 — model-neutrality zero-literal grep (NEUTRAL-03)

Cmd:    On a real Bob machine, AFTER the AC-13 install, read-only grep the emitted converted-artifact set for any surviving model-routing literal — tier tokens or a line-anchored model directive — scoped to the CONVERTED set only (NOT `"$BOB_HOME"/gsd-core/**`, which is the raw-copied vendored payload, out of scope per D-01): `grep -rniE '\b(opus|sonnet|haiku)\b|^[[:space:]]*(model|effort|model_profile|resolve_model_ids)[[:space:]]*:' "$BOB_HOME"/commands/gsd-*.md "$BOB_HOME"/skills/gsd-*/SKILL.md`. This is a pure read-only grep; nothing is written, moved, or deleted.
Expect: ZERO lines printed (grep exits non-zero) = PASS — every emitted `.bob/commands/gsd-*.md` and `.bob/skills/gsd-*/SKILL.md` carries no tier token and no machine-readable model directive; Bob owns model routing. Any printed `file:line` is a leaked literal = FAIL.
Confirms: NEUTRAL-03, ACCEPT-02 — zero model literals across the emitted `.bob/` converted set, guarding regressions / SC#3. (on-device complement to test/model-neutrality.test.cjs, which enforces the same invariant hermetically via the real staging path)
Result: [ ] pass  [ ] fail

## AC-28 — new-milestone command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `new-milestone` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-new-milestone.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-new-milestone.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-new-milestone` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `new-milestone`.
Result: [ ] pass  [ ] fail

## AC-29 — complete-milestone command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `complete-milestone` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-complete-milestone.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-complete-milestone.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-complete-milestone` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `complete-milestone`.
Result: [ ] pass  [ ] fail

## AC-30 — milestone-summary command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `milestone-summary` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-milestone-summary.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-milestone-summary.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-milestone-summary` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `milestone-summary`.
Result: [ ] pass  [ ] fail

## AC-31 — quick command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `quick` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-quick.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-quick.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-quick` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `quick`.
Result: [ ] pass  [ ] fail

## AC-32 — fast command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `fast` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-fast.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-fast.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-fast` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `fast`.
Result: [ ] pass  [ ] fail

## AC-33 — ship command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `ship` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-ship.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-ship.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-ship` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `ship`.
Result: [ ] pass  [ ] fail

## AC-34 — explore command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `explore` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-explore.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-explore.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-explore` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `explore`.
Result: [ ] pass  [ ] fail

## AC-35 — spec-phase command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `spec-phase` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-spec-phase.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-spec-phase.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-spec-phase` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `spec-phase`.
Result: [ ] pass  [ ] fail

## AC-36 — mvp-phase command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `mvp-phase` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-mvp-phase.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-mvp-phase.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-mvp-phase` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `mvp-phase`.
Result: [ ] pass  [ ] fail

## AC-37 — map-codebase command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `map-codebase` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-map-codebase.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-map-codebase.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-map-codebase` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `map-codebase`.
Result: [ ] pass  [ ] fail

## AC-38 — ui-phase command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `ui-phase` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-ui-phase.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-ui-phase.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-ui-phase` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `ui-phase`.
Result: [ ] pass  [ ] fail

## AC-39 — secure-phase command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `secure-phase` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-secure-phase.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-secure-phase.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-secure-phase` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `secure-phase`.
Result: [ ] pass  [ ] fail

## AC-40 — extract-learnings command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `extract-learnings` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-extract-learnings.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-extract-learnings.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-extract-learnings` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `extract-learnings`.
Result: [ ] pass  [ ] fail

## AC-41 — docs-update command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `docs-update` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-docs-update.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-docs-update.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-docs-update` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `docs-update`.
Result: [ ] pass  [ ] fail

## AC-42 — health command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `health` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-health.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-health.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-health` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `health`.
Result: [ ] pass  [ ] fail

## AC-43 — stats command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `stats` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-stats.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-stats.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-stats` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `stats`.
Result: [ ] pass  [ ] fail

## AC-44 — resume-work command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `resume-work` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-resume-work.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-resume-work.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-resume-work` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `resume-work`.
Result: [ ] pass  [ ] fail

## AC-45 — pause-work command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `pause-work` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-pause-work.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-pause-work.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-pause-work` (hyphen form).
Confirms: ACCEPT-01, CMD-01 — device-runnable emission/recognition step for the newly added Phase 9 command `pause-work`.
Result: [ ] pass  [ ] fail

## AC-46 — next command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `next` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-next.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-next.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-next` (hyphen form).
Confirms: ACCEPT-01, RESYNC-04 — device-runnable emission/recognition step for the newly added Phase 13 command `next`.
Result: [ ] pass  [ ] fail

## AC-47 — onboard command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `onboard` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-onboard.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-onboard.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-onboard` (hyphen form).
Confirms: ACCEPT-01, RESYNC-04 — device-runnable emission/recognition step for the newly added Phase 13 command `onboard`.
Result: [ ] pass  [ ] fail

## AC-48 — quick-batch command emitted + recognized under Bob (read-only) (ACCEPT-01)

Cmd:    On a real Bob machine, read-only inspect the emitted Bob slash command for the `quick-batch` command and confirm Bob recognizes it. List and read (no edits) the emitted file `gsd-quick-batch.md` in the `.bob/commands/` directory using `ls` and `cat` only, and observe the command in Bob's slash-command palette / listing. No file is written, moved, or deleted.
Expect: `.bob/commands/gsd-quick-batch.md` exists with `description:` (and, where applicable, `argument-hint:`) frontmatter and a `$1` positional-arg body; Bob lists the command and shows its description as `/gsd-quick-batch` (hyphen form).
Confirms: ACCEPT-01, RESYNC-04 — device-runnable emission/recognition step for the newly added Phase 13 command `quick-batch`.
Result: [ ] pass  [ ] fail

## AC-49 — installer seeds workflow.use_worktrees:false into .planning/config.json (read-only) (RESYNC-05)

Cmd:    On a real Bob machine, after the `AC-13` install has run, read the project's planning config with `cat .planning/config.json` (read-only; no edits). Inspect the `workflow` object and the top-level `context_window`.
Expect: `workflow.use_worktrees` is `false`, `workflow.text_mode` is `true`, and `context_window` is `270000`. No `runtime` key is present — `.planning/config.json` is the Claude-runtime interchange surface and must not pin a runtime. With `use_worktrees:false` present, `/gsd-execute-phase` dispatches instead of exiting `FATAL: runtime declares no executor-isolation primitive` (gsd-core 1.14.0 refuses to dispatch a wave on a runtime whose descriptor declares `dispatch.isolation: "none"`, which Bob's does — Bob has context isolation via `spawn_subagent` but no git-worktree primitive).
Confirms: RESYNC-05, ACCEPT-01 — the three adapter-owned config keys are seeded by the real install, and the 1.14.0 isolation gate is satisfied.
Result: [ ] pass  [ ] fail

## AC-50 — installed payload carries the bob runtime marker (read-only) (RESYNC-05)

Cmd:    On a real Bob machine, after the `AC-13` install has run, read the per-install runtime marker with `cat .bob/gsd-core/.gsd-runtime` (read-only; no edits). For a global install the path is `~/.bob/gsd-core/.gsd-runtime`.
Expect: the file exists and its only content is `bob` (plus a trailing newline). gsd-core resolves the active runtime as `GSD_RUNTIME` > `config.runtime` > this marker > `claude`, so without it every `dispatch-*` query silently answers for the Claude-runtime descriptor. Cross-check read-only: `node .bob/gsd-core/bin/gsd-tools.cjs query dispatch-isolation --json` reports runtime `bob` and isolation `none`.
Confirms: RESYNC-05, ACCEPT-01 — the runtime ladder resolves the `bob` descriptor from the installed payload.
Result: [ ] pass  [ ] fail
