---
phase: 06-on-device-acceptance-verification
plan: 01
subsystem: testing
tags: [acceptance, traceability, node-test, coverage-matrix, verify, bob]

# Dependency graph
requires:
  - phase: 01-bob-capability-mapping
    provides: ACCEPTANCE-CHECKLIST.md AC-01..04 + CAPABILITY-MAP watch-list (SPIKE-01/02/04)
  - phase: 02-runtime-and-translation
    provides: AC-05..12 (RUNTIME/TRANS) + the backend-neutral bob adapter
  - phase: 03-installer
    provides: AC-13..16 (INSTALL) + manifest-driven install/uninstall
  - phase: 04-core-loop-port
    provides: AC-17..21 (CORE) + core-loop equivalence tests
  - phase: 05-quality-gates-upstream-readiness
    provides: AC-22..26 (QUAL/UP) + SUPPORT-ROSTER + UPSTREAM.md
provides:
  - SC->AC coverage matrix proving 28 v1 SCs map to AC-01..26 with zero orphans (VERIFY-01)
  - root-anchored pre-seeded ACCEPTANCE-FOLLOWUPS.md wrong-assumption log (VERIFY-02 SC#3)
  - insert-only run scaffolding (How to Run + Execution Order + Results Roll-Up) on the checklist (VERIFY-02)
  - hermetic acceptance-coverage.test.cjs (no orphan SC, no orphan AC, followups presence)
affects: [on-device-acceptance, milestone-close, v2-planning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive-from-source-of-truth traceability test (parse REQUIREMENTS v1 + checklist Confirms lines at run time; never freeze an ID list)"
    - "Family-ID regex join key /(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-NN/ keyed on the requirement ID, ignoring phase-local SC#N suffixes"
    - "Insert-only doc modification (additions only above AC-01; frozen AC bodies byte-unchanged, verified by git diff deletion check)"

key-files:
  created:
    - .planning/phases/06-on-device-acceptance-verification/06-COVERAGE-MATRIX.md
    - .planning/ACCEPTANCE-FOLLOWUPS.md
    - test/acceptance-coverage.test.cjs
  modified:
    - .planning/ACCEPTANCE-CHECKLIST.md

key-decisions:
  - "Coverage matrix is a standalone phase-dir file (D-01 standalone option) so the frozen checklist body stays untouched"
  - "AC-15 uninstall ordered LAST as teardown (D-03) so it never destroys the install AC-17..25 depend on"
  - "FU-03 (SPIKE-04 config-home override) links a descriptive proposed enhancement — no invented v2 ID, since REQUIREMENTS §v2 has none (Pitfall 5)"
  - "Followups presence test is structural only — does not assert rows stay 'unconfirmed' (the runner flips them post-pass)"

patterns-established:
  - "Coverage proof: human-readable matrix + machine drift-guard test re-deriving both sides from live source files"
  - "Root-anchored fixed-schema log seeded but empty of refutations — existence+schema+rows ARE the mechanism"

requirements-completed: [VERIFY-01, VERIFY-02]

# Metrics
duration: 4min
completed: 2026-06-19
status: complete
---

# Phase 6 Plan 01: On-Device Acceptance Verification Summary

**Proved every v1 success criterion (28 requirement IDs across Phases 1–5) maps to ≥1 step in the AC-01..26 checklist via a standalone coverage matrix and a hermetic node:test, then wrapped the frozen checklist with insert-only run scaffolding and stood up a pre-seeded root-anchored wrong-assumption follow-up log.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-19T22:08:15Z
- **Completed:** 2026-06-19T22:11:40Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified insert-only)

## Accomplishments
- VERIFY-01 proven: `06-COVERAGE-MATRIX.md` transcribes the verified 28-SC → AC-01..26 mapping (zero orphan SC, zero orphan AC), and `test/acceptance-coverage.test.cjs` mechanically re-proves it by parsing `REQUIREMENTS.md` v1 IDs + the checklist `Confirms:` lines at run time.
- VERIFY-02 satisfied: the checklist now carries a `## How to Run` preamble, a dependency-ordered `## Execution Order` (read-only first; AC-15 uninstall last as teardown), and a single at-a-glance `## Results Roll-Up` — all inserted before `## AC-01` with every AC body byte-unchanged.
- VERIFY-02 SC#3 satisfied: `.planning/ACCEPTANCE-FOLLOWUPS.md` is a root-anchored sibling of the checklist, pre-seeded with watch-list rows FU-01 (SPIKE-01→PAR-01+NATIVE-01), FU-02 (SPIKE-02→NATIVE-01), FU-03 (SPIKE-04(b) config-home→descriptive enhancement, no invented v2 ID), and FU-04 (SPIKE-04(c) IDE-vs-Shell→NATIVE-01).
- Full suite green: `npm test` → 188 tests pass, 0 fail (the new file auto-globbed; nothing regressed).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the coverage matrix (VERIFY-01 / D-01)** - `7e17335` (docs)
2. **Task 2: Stand up the pre-seeded follow-up log (VERIFY-02 SC#3 / D-05, D-06)** - `812c33e` (docs)
3. **Task 3: Insert-only run scaffolding + hermetic traceability/presence test (VERIFY-01/02 / D-02..D-04, D-06)** - `d9347f7` (feat)

## Files Created/Modified
- `.planning/phases/06-on-device-acceptance-verification/06-COVERAGE-MATRIX.md` (created) - SC→AC traceability proof: derived-from-source blockquote, 28-row mapping table, zero-orphan tallies, family-ID join-key note.
- `.planning/ACCEPTANCE-FOLLOWUPS.md` (created) - root-anchored seven-column wrong-assumption log seeded with FU-01..FU-04 watch-list rows.
- `test/acceptance-coverage.test.cjs` (created) - hermetic node:test: no orphan SC, no orphan AC, follow-up-log presence; derives both sides from live docs, no frozen ID list.
- `.planning/ACCEPTANCE-CHECKLIST.md` (modified, insert-only) - added How to Run + Execution Order + Results Roll-Up before AC-01; AC-01..26 bodies untouched; references the follow-up log by path.

## Decisions Made
- Standalone coverage matrix (D-01) over a checklist-embedded section, to keep the frozen AC bodies untouched (Pitfall 2).
- AC-15 uninstall placed last in the execution order as teardown (D-03), since it destroys the install AC-17..25 require.
- FU-03 links a descriptive proposed enhancement rather than a v2 requirement ID — REQUIREMENTS §v2 genuinely has no config-home-override ID (Pitfall 5); the presence test asserts no such ID.
- One test file holding all three assertions (Research Open Q2), matching roster-capmap.test.cjs single-concern weight.
- Included the optional FU-04 row to match the full CAPABILITY-MAP §D-10 watch-list.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' verify gates and the phase-level checks passed on first run; no Rule 1–4 deviations were triggered.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The on-device acceptance pass itself is the user's single empirical act, run once on a real Bob machine per the new `## How to Run` preamble.

## Next Phase Readiness
- The full v1 acceptance gate is now provable, runnable, and self-recording: a coverage matrix + hermetic test (VERIFY-01), run scaffolding (VERIFY-02), and a seeded follow-up log (VERIFY-02 SC#3).
- D-07 honored: no runtime/adapter/installer/converter code touched; output is docs + one hermetic test; frozen AC bodies and the T-01-SC read-only invariant preserved.
- Ready for the on-device pass and milestone close. Any assumption refuted on hardware lands in `.planning/ACCEPTANCE-FOLLOWUPS.md` as tracked v2 work.

## Self-Check: PASSED

All created files exist on disk (`06-COVERAGE-MATRIX.md`, `ACCEPTANCE-FOLLOWUPS.md`, `test/acceptance-coverage.test.cjs`, `06-01-SUMMARY.md`) and all three task commits (`7e17335`, `812c33e`, `d9347f7`) are present in git history.

---
*Phase: 06-on-device-acceptance-verification*
*Completed: 2026-06-19*
