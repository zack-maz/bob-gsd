---
phase: 01-bob-capability-mapping
plan: 01
subsystem: infra
tags: [ibm-bob, capability-mapping, acceptance-checklist, docs-conformance, spike]

requires: []
provides:
  - "CAPABILITY-MAP.md — 4 full SPIKE rows (D-02 schema) + 4 adjacent reference rows; input contract to Phase 2"
  - ".planning/ACCEPTANCE-CHECKLIST.md — root-anchored, read-only AC-01..AC-04; append target for Phases 2-6, run target for Phase 6"
  - "AC-ID convention (AC-01..AC-04) and the D-07 cross-phase append convention"
  - "state vocabulary established: Documented / Absence-based / UNKNOWN"
affects: [Phase 2 (Runtime Foundation & Artifact Translation), Phase 6 (On-Device Acceptance Verification)]

tech-stack:
  added: []
  patterns:
    - "Fixed-schema decision-record rows over prose (D-02)"
    - "Citation-grounded doc-conformance: live bob.ibm.com/docs URL + verbatim quote + confidence per row (D-08)"
    - "Watch-list marker derived mechanically from confidence (LOW/MEDIUM -> yes, HIGH -> no) for Phase 6 filtering (D-10)"
    - "Read-only / side-effect-free seeded acceptance commands (T-01-SC)"

key-files:
  created:
    - .planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md
    - .planning/ACCEPTANCE-CHECKLIST.md
  modified: []

key-decisions:
  - "Recorded (not relitigated) the ROADMAP-locked SPIKE-01 (sequential inline) and SPIKE-02 (text_mode) conservative defaults, sourced to bob.ibm.com/docs"
  - "SPIKE-04 split into 3 sub-findings with independent confidence tiers: config home ~/.bob (HIGH/Documented), env override (LOW/UNKNOWN - dropped), IDE-vs-Shell via BOB_SHELL_CLI_IDE_SERVER_PORT (MEDIUM)"
  - "Phase 6 watch-list is a checkable column: 4 rows marked yes (SPIKE-01, SPIKE-02, SPIKE-04b, SPIKE-04c), 2 marked no (SPIKE-03, SPIKE-04a)"

patterns-established:
  - "Map references acceptance steps by AC-ID only; step bodies live solely in the root checklist (D-06)"
  - "Adjacent-surface rows carry documented contract + source + confidence but NO AC step (D-14)"

requirements-completed: [SPIKE-01, SPIKE-02, SPIKE-03, SPIKE-04]

duration: 2min
completed: 2026-06-18
status: complete
---

# Phase 1 Plan 01: Bob Capability Mapping Summary

**Documentation-grounded capability map resolving all four Bob SPIKE primitives (subagents, prompts, command shell-out, config home) with conservative lower-bound defaults cited to live bob.ibm.com/docs, plus a root-anchored read-only acceptance checklist seeded with AC-01..AC-04.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-18T02:07:18Z
- **Completed:** 2026-06-18T02:09:27Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- Authored `CAPABILITY-MAP.md` resolving SPIKE-01..04 as fixed-schema rows (all D-02 fields), each citing a live `bob.ibm.com/docs` URL + verbatim quote + confidence + state + AC-ID, plus a mechanically-derived `Watch-list (Phase 6)` marker.
- Recorded the ROADMAP-locked defaults — SPIKE-01 sequential inline (Absence-based/MEDIUM), SPIKE-02 conversational `text_mode` (Absence-based/MEDIUM) — sourced, not relitigated.
- Recorded SPIKE-03 (command-group shell-out, Documented/HIGH) and SPIKE-04 three sub-findings: config home `~/.bob` (Documented/HIGH), env override (UNKNOWN/LOW — dropped), IDE-vs-Shell signal `BOB_SHELL_CLI_IDE_SERVER_PORT` (MEDIUM).
- Added 4 adjacent-surface reference rows (Agent Skill, Slash command, Custom Mode groups, MCP/Rules/AGENTS.md) with documented contract + source + confidence and no AC step (D-14).
- Seeded `.planning/ACCEPTANCE-CHECKLIST.md` at the planning root with read-only AC-01..AC-04 (D-05 schema) and a header documenting the D-07 cross-phase append convention.

## Task Commits

`.planning/` is gitignored in this project (`.gitignore` contains `.planning/`, and `config.json` has `commit_docs: false`). Per-task git commits for the `.planning/` artifacts are therefore an **intentional skip** (the SDK `skipped_gitignored` success path). Artifacts were written to disk and verified there; they are deliberately kept out of git history. No `git add -f` override was used.

1. **Task 1: Seed .planning/ACCEPTANCE-CHECKLIST.md** — skipped (.planning gitignored); written + verified on disk
2. **Task 2: Author CAPABILITY-MAP.md** — skipped (.planning gitignored); written + verified on disk

## Files Created/Modified
- `.planning/ACCEPTANCE-CHECKLIST.md` (NEW) — root-anchored device-runnable acceptance checklist; read-only AC-01..AC-04 in D-05 schema; append target for Phases 2-6.
- `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` (NEW) — per-primitive capability decision record; 4 full SPIKE rows + 4 adjacent reference rows; input contract to Phase 2.

## Decisions Made
- Followed the plan as specified. SPIKE-04 rendered as three sub-finding blocks (D-08 discretion) so each carries an independent confidence tier and a correct watch-list marker; all three share AC-04.
- Confirmed citation discipline: 10 distinct `bob.ibm.com/docs` URLs cited (≥6 required); no `CLAUDE.md` and no `ibm.com/us-en/products/` host in any source/quote cell.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `.planning/` is gitignored (project-deliberate; `commit_docs: false`). Resolved per GSD policy by treating the commit as the intentional `skipped_gitignored` success path rather than force-staging with `git add -f`. Artifacts live on disk and were verified by their `<verify>` grep guards (both passed) and the phase-level checks.

## User Setup Required
None - no external service configuration required. This phase produced only Markdown documentation (no code, no descriptor, no installs — D-03 defers the descriptor to Phase 2).

## Next Phase Readiness
- Phase 2 has its input contract: `CAPABILITY-MAP.md` documents the `bob` capability surface in gsd-core descriptor vocabulary (config home, tool groups, artifact layout). Phase 2 SC#4 inspects its emitter output against this map.
- Phase 6 has 4 seeded read-only probes (AC-01..AC-04) and an established append convention.
- Watch-list rows (SPIKE-01, SPIKE-02, SPIKE-04b env-override, SPIKE-04c IDE-vs-Shell) flagged for on-device confirmation.
- No machine-readable descriptor built (D-03 deferred to Phase 2, as required).

## Self-Check: PASSED

- FOUND: `.planning/ACCEPTANCE-CHECKLIST.md`
- FOUND: `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md`
- FOUND: `.planning/phases/01-bob-capability-mapping/01-01-SUMMARY.md`
- Commit-existence check: N/A — `.planning/` is gitignored (`commit_docs: false`); artifact commits are the intentional `skipped_gitignored` success path. Both `<verify>` grep guards and all phase-level checks passed against on-disk content.

---
*Phase: 01-bob-capability-mapping*
*Completed: 2026-06-18*
