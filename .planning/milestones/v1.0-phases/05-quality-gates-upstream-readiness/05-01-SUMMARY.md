---
phase: 05-quality-gates-upstream-readiness
plan: 01
subsystem: quality-gate artifact emission + support roster
tags: [port-by-conversion, slash-commands, support-roster, parity-gate]
status: complete
requires:
  - "src/installer/stage.cjs convertible loop (Phase 4 — unchanged)"
  - "src/bob-adapter.cjs gateArtifact/buildSupportRoster (Phase 2 — unchanged)"
  - "gsd-core/workflows/{code-review,debug,audit-fix,audit-uat}.md (vendored payload — staged wholesale)"
provides:
  - "commands/gsd/{code-review,debug,audit-fix,audit-uat}.md — quality-gate conversion inputs"
  - "Roster generator derives candidates from commands/gsd/*.md (full-roster, drift-proof)"
  - "SUPPORT-ROSTER.md regenerated: 4 quality gates Supported, zero new skip"
affects:
  - "Wave 2 verification suites (05-02/05-03) assert against these emitted artifacts + roster"
tech-stack:
  added: []
  patterns:
    - "Port-by-conversion (D-01): vendor source only; unchanged installer auto-converts"
    - "Roster candidate set derived from commands/gsd/*.md matching the installer's renderRoster authority"
key-files:
  created:
    - commands/gsd/code-review.md
    - commands/gsd/debug.md
    - commands/gsd/audit-fix.md
    - commands/gsd/audit-uat.md
  modified:
    - scripts/generate-support-roster.cjs
    - SUPPORT-ROSTER.md
decisions:
  - "Omitted `requires:` on all 4 sources (gate treats as requires: []) — none has a documented prerequisite slash-command slug, and `requires` must never name a subagent (runtime-resolved). code-review's --fix dispatches the already-staged code-review-fix workflow, not a command prerequisite."
  - "Curated edge cases (gsd-autonomous, gsd-parallel-fanout) win on name de-dup so the gate skip paths stay proven even though they are not commands/gsd/ sources."
metrics:
  duration: ~3 min
  completed: 2026-06-19
  tasks: 2
  files: 6
---

# Phase 5 Plan 01: Vendor Quality-Gate Command Sources + Full-Roster Generation Summary

Vendored the four daily-driver quality-gate slash-command sources (`code-review`, `debug`, `audit-fix`, `audit-uat`) into `commands/gsd/` so the unchanged Phase-4 installer convertible loop auto-emits them as Bob `.bob/commands/gsd-<x>.md` + `.bob/skills/gsd-<x>/SKILL.md` artifacts (QUAL-01, QUAL-03 emission half), and extended `generate-support-roster.cjs` to derive its candidate set from `commands/gsd/*.md` so any parity-first skip surfaces — regenerating `SUPPORT-ROSTER.md` with all four gates Supported and zero new unsupported line (QUAL-03 flagged-reason half, D-03 outcome confirmed).

## What Was Built

### Task 1 — 4 vendored quality-gate command sources (commit f4302b2)
Created `commands/gsd/{code-review,debug,audit-fix,audit-uat}.md` as vendored copies of the installed `~/.claude/skills/gsd-<cmd>/SKILL.md`, transformed to the exact shape of the 6 existing core-loop sources:
- Frontmatter `name:` uses the legacy colon dialect (`name: gsd:code-review`, etc.) — the converter's INPUT contract; it translates `gsd:`→`gsd-` on emission.
- `description:` unquoted; `argument-hint:` + `allowed-tools:` preserved verbatim from the installed skill.
- Body `@$HOME/.claude/gsd-core/...` references rewritten to `@~/.claude/gsd-core/...` (the form the 6 existing sources use), so each `<execution_context>` transitively loads its already-staged workflow.
- No `requires:` line (conservative derivation — see Decisions). No `commands/gsd/code-review-fix.md` (workflow-only; the `--fix` capability is covered by code-review's source body + the already-staged `code-review-fix.md` workflow).

`src/installer/stage.cjs` is byte-unchanged — the convertible loop (L239-266) enumerates `commands/gsd/*.md`, derives `name = gsd-<stem>`, gates via `gateArtifact`, and emits the flat command + nested skill with zero code change.

### Task 2 — full-roster derivation + regeneration (commit ecd041b)
Modified only the candidate-set construction in `scripts/generate-support-roster.cjs`: replaced the hard-coded Phase-2 representative subset with a set derived from `commands/gsd/*.md` via `fs.readdirSync` (the same source the installer iterates), mapping each `<stem>.md` to `{ name: 'gsd-' + stem, requires: [] }`. Appended the two curated edge cases (`gsd-autonomous`, `gsd-parallel-fanout`) and de-duplicated by name (curated wins). Updated the header scope comment to state the candidate set is now derived. The `bobCapabilityDecl`, `gateArtifact`/`buildSupportRoster` call shape, and body emission are otherwise unchanged. Regenerated `SUPPORT-ROSTER.md` by running the script (never hand-edited).

## Verification Performed

- Source-level: 10 total `commands/gsd/*.md` (6 core-loop + 4 quality-gate); each new file's `name:` matches `^name: gsd:(code-review|debug|audit-fix|audit-uat)$`; each carries a non-empty `description:`; no `code-review-fix.md`; `stage.cjs` byte-unchanged.
- Behavior (real installer entry, workspace as cwd): emits `commands/gsd-{code-review,debug,audit-fix,audit-uat}.md` + `skills/gsd-<x>/SKILL.md`. Converter normalized `name: gsd:code-review`→`name: gsd-code-review` on the skill and stripped `argument-hint`/`allowed-tools` (only `name`+`description` remain) — the documented Bob skill contract.
- Roster: regenerated SUPPORT-ROSTER.md lists all 4 quality gates under Supported; the only `unsupported on Bob:` subjects remain `gsd-autonomous` and `gsd-parallel-fanout` (D-03: zero new skips). 10 supported / 2 unsupported.
- Gate authority preserved: script still imports + calls `adapter.gateArtifact` / `adapter.buildSupportRoster`.
- `git diff --quiet src/installer/stage.cjs && git diff --quiet src/bob-adapter.cjs` — no converter/installer/gate change.
- Full suite: `npm test` → 155 pass, 0 fail.

## Deviations from Plan

### Verify-command invocation correction (not an artifact deviation)
- **Found during:** Task 1 `<verify>` automated step.
- **Issue:** The plan's verify command (`node bin/gsd-bob.cjs --bob --global -c "$(mktemp -d)/.bob" "$(mktemp -d)"`) passes a trailing positional workspace dir. The entry already takes the target via `-c` and rejects the extra positional with `Unknown flag` (exit 1).
- **Fix:** Ran the installer the way `test/core-loop-contract.test.cjs` drives it — `--bob --global -c <target>` with the scratch workspace as the process `cwd`, not a positional arg. This is a correction to *how the verify command is invoked*, not to any emitted artifact; the artifacts the verify step asserts were all produced correctly.
- **Files modified:** none (invocation-only).

No other deviations — the plan executed as written. No `BOB_SKIP_LIST` entries added (all gates degrade cleanly, as predicted by D-03 / RESEARCH §2).

## Known Stubs
None.

## Threat Flags
None — this plan adds static markdown command sources + a generator candidate-set change. No new network, auth, file-access, or schema surface. Debug slug path-traversal sanitization lives in the vendored `debug.md` workflow (unchanged), asserted by Wave 2's state-persistence test.

## Self-Check: PASSED
- FOUND: commands/gsd/code-review.md, commands/gsd/debug.md, commands/gsd/audit-fix.md, commands/gsd/audit-uat.md
- FOUND: scripts/generate-support-roster.cjs (modified), SUPPORT-ROSTER.md (regenerated)
- FOUND commit f4302b2 (Task 1), ecd041b (Task 2)
