---
phase: 04-core-loop-port
plan: 02
subsystem: core-loop-verification
tags: [test, contract, root-anchor, acceptance-checklist, CORE-02, CORE-03, CORE-05]
requires:
  - "04-01 (vendored core-loop command sources + wired convertible loop)"
provides:
  - "test/core-loop-contract.test.cjs (e2e emission + PLAN/PROJECT structure + atomic commits)"
  - "test/core-loop-root-anchor.test.cjs (single root-anchored .planning/)"
  - "AC-17..AC-21 device-runnable acceptance steps"
affects:
  - ".planning/ACCEPTANCE-CHECKLIST.md"
tech-stack:
  added: []
  patterns:
    - "node:test scratch-tmpdir e2e via execFileSync against the real bin/gsd-bob.cjs"
    - "fs walk collecting .planning dirs for root-anchoring assertion"
    - "hermetic scratch git repo to prove atomic-commit subject shape"
key-files:
  created:
    - test/core-loop-contract.test.cjs
    - test/core-loop-root-anchor.test.cjs
  modified:
    - .planning/ACCEPTANCE-CHECKLIST.md
decisions:
  - "Used the real produced 04-01-PLAN.md as the CORE-02 PLAN.md structural fixture and the frozen PROJECT.golden.md as the PROJECT.md fixture — both are genuine artifact-contract instances, no new fixture needed."
  - "Proved CORE-03 atomic-commit shape with a hermetic scratch git repo (one commit per task, /^\\w+\\(\\d+-\\d+\\)/) rather than a frozen git-log fixture — exercises real git, fully deterministic, no network."
  - "Carried the Wave-1 correction forward: the phase ports 6 core-loop commands (not 8); execute-plan + verify-phase are WORKFLOWS staged under gsd-core/workflows/. Added an explicit e2e assertion that they ship as workflows and are NOT .bob/commands (CORE-03/04 transitive)."
metrics:
  duration: ~12m
  completed: 2026-06-19
  tasks: 3
  files: 3
status: complete
---

# Phase 4 Plan 2: Core-Loop Contract & Root-Anchoring Verification Summary

Completed the D-06 verification harness for the core loop: a contract suite that drives the real installer end-to-end and asserts core-loop command + skill emission, PLAN.md/PROJECT.md structural conformance (CORE-02), and atomic `{type}({phase}-{plan})` commits (CORE-03); a root-anchoring suite asserting exactly one workspace-root `.planning/` with no nesting and no `.planning/` artifactLayout target (CORE-05); and AC-17..AC-21 device-runnable acceptance steps appended to the consolidated checklist (CORE-01..05).

## What Was Built

**Task 1 — `test/core-loop-contract.test.cjs`** (commit `4ca422d`)
- e2e emission: `execFileSync(bin/gsd-bob.cjs, ['--bob','--global','-c',scratch])` from a scratch cwd, then `existsSync` on `commands/gsd-<name>.md` + `skills/gsd-<name>/SKILL.md` for all 6 core-loop commands.
- Workflow assertion: `execute-plan.md` + `verify-phase.md` land under `gsd-core/workflows/` (CORE-03/04 transitive) and are NOT emitted as `.bob/commands`.
- CORE-02: a produced PLAN.md (04-01-PLAN.md) carries the frontmatter fence + `<objective>`/`<tasks>`/`<success_criteria>` markers; PROJECT.golden.md carries `## What This Is`/`## Core Value`/`## Requirements`.
- CORE-03: a hermetic scratch git repo with one commit per task; every subject matches `/^\w+\(\d+-\d+\)/` and `log.length === task count`.

**Task 2 — `test/core-loop-root-anchor.test.cjs`** (commit `5f8b910`)
- Structural: bob `artifactLayout` (global + local) enumerates no `destSubpath` matching `/\.planning/`; only `commands` + `skills` kinds.
- Post-loop walk: scratch install materializes `.bob/`, a workspace-root `.planning/` is created, a recursive walk finds exactly one `.planning/` with `path.dirname === workspaceRoot`, and `!existsSync(scopeDir/.planning)` (Pitfall 5).

**Task 3 — AC-17..AC-21 appended to `.planning/ACCEPTANCE-CHECKLIST.md`** (commit `1df8143`)
- One AC per core-loop SC, four-field schema, continuing from AC-16.
- Every `Cmd:` is read-only; the in-Bob `/gsd-*` run is the Phase-6 mutating step wrapped in read-only confirms (AC-13 precedent, T-01-SC).
- Each `Confirms:` names the CORE criterion + its hermetic test complement.

## Deviations from Plan

None affecting behavior. One **plan-text correction carried from Wave 1** (already flagged in the dependency context): the plan's `must_haves` prose says the installer emits "gsd-plan-phase.md (+ the other 7)" — the phase actually ports **6** core-loop commands (gsd-new-project, gsd-plan-phase, gsd-discuss-phase, gsd-execute-phase, gsd-verify-work, gsd-progress). `execute-plan` and `verify-phase` are workflows (staged under `gsd-core/workflows/`), not `.bob/commands`. The contract suite asserts the 6-command set and adds an explicit assertion that the two workflows ship as workflows (CORE-03/04 covered transitively), not as commands. Verified live: a scratch install emits exactly 6 commands + 6 skills, and `gsd-core/workflows/{execute-plan,verify-phase}.md` are present.

## Verification

- `node --test test/core-loop-contract.test.cjs` → 5/5 pass.
- `node --test test/core-loop-root-anchor.test.cjs` → 2/2 pass.
- `grep -c '^## AC-1[7-9]\|^## AC-2[01]' .planning/ACCEPTANCE-CHECKLIST.md` → 5.
- `Result: [ ] pass` count increased by exactly 5 (17→22, the 17 includes the schema-doc example line).
- `npm test` → 155/155 pass (was 148 in Wave 1; +5 contract, +2 root-anchor).
- AC-01..AC-16 untouched (append-only; `## AC-16` still present, no renumber).

## Threat Surface

No new threat surface. All e2e writes are confined to `mkdtempSync` scratch dirs (T-04-05 mitigated); installs run `--global -c <scratch>` so the tracked `.planning/` is never written. AC `Cmd:` lines are read-only (T-04-06 mitigated). Root-anchoring asserted (T-04-08 mitigated).

## Self-Check: PASSED
- FOUND: test/core-loop-contract.test.cjs
- FOUND: test/core-loop-root-anchor.test.cjs
- FOUND: .planning/ACCEPTANCE-CHECKLIST.md (AC-17..AC-21, grep = 5)
- FOUND commit 4ca422d (contract suite)
- FOUND commit 5f8b910 (root-anchor suite)
- FOUND commit 1df8143 (AC append)
