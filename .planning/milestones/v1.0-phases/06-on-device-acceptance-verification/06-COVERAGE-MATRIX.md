# Phase 6 Coverage Matrix — SC -> AC traceability

> **DERIVED from `.planning/ACCEPTANCE-CHECKLIST.md` `Confirms:` lines + `.planning/REQUIREMENTS.md` v1 IDs.**
> Guarded against drift by `test/acceptance-coverage.test.cjs` (VERIFY-01). Do not hand-curate the mapping —
> the test re-derives both sides at run time (the v1 requirement IDs above `## v2 Requirements`, minus
> `VERIFY-*`; and every `(FAMILY)-NN` token on each `Confirms:` line) and fails on any orphan SC or orphan AC.

This matrix proves VERIFY-01: every v1 success criterion across Phases 1–5 — the 28 canonical requirement IDs
in `.planning/REQUIREMENTS.md` (Phases 1–5, excluding this phase's own `VERIFY-01`/`VERIFY-02`) — is confirmed
by at least one step in the already-complete on-device checklist (`AC-01..AC-26`). It is a transcription of the
verified mapping in `06-RESEARCH.md §"SC->AC Coverage Matrix"`; it does NOT re-derive or re-author coverage, and
it authors no new `AC-NN` step.

## Mapping

| Phase | Requirement ID (canonical SC) | Confirmed by AC | Notes |
|-------|-------------------------------|-----------------|-------|
| 1 | SPIKE-01 | AC-01 | `Confirms: SPIKE-01 — …` |
| 1 | SPIKE-02 | AC-02 | `Confirms: SPIKE-02 — …` |
| 1 | SPIKE-03 | AC-03 | `Confirms: SPIKE-03 — …` |
| 1 | SPIKE-04 | AC-04 | `Confirms: SPIKE-04 — …` (covers 04(a)/(b)/(c) sub-rows under one canonical token) |
| 2 | RUNTIME-01 | AC-06 | `Confirms: RUNTIME-01 (…), RUNTIME-02 (…)` — multi-ID line |
| 2 | RUNTIME-02 | AC-06 | same line as RUNTIME-01 |
| 2 | RUNTIME-03 | AC-05 | `Confirms: RUNTIME-03 — …` |
| 2 | RUNTIME-04 | AC-12 | `Confirms: RUNTIME-04 — …` |
| 2 | TRANS-01 | AC-07 | `Confirms: TRANS-01 — …` |
| 2 | TRANS-02 | AC-08 | `Confirms: TRANS-02 — …` |
| 2 | TRANS-03 | AC-09 | `Confirms: TRANS-03 — …` |
| 2 | TRANS-04 | AC-10 | `Confirms: TRANS-04 — …` |
| 2 | TRANS-05 | AC-11 | `Confirms: TRANS-05 — …` |
| 3 | INSTALL-01 | AC-13, AC-16 | AC-13 `INSTALL-01 (…)`; AC-16 `INSTALL-01/05 dry-run safety` |
| 3 | INSTALL-02 | AC-13 | `INSTALL-02 (…)` on the multi-ID AC-13 line |
| 3 | INSTALL-03 | AC-13 | `INSTALL-03 (…)` on the AC-13 line |
| 3 | INSTALL-04 | AC-14 | `Confirms: INSTALL-04 — …` |
| 3 | INSTALL-05 | AC-15, AC-16 | AC-15 `INSTALL-05 — …`; AC-16 `INSTALL-01/05` |
| 4 | CORE-01 | AC-17 | `Confirms: CORE-01 — …` |
| 4 | CORE-02 | AC-18 | `Confirms: CORE-02 — …` |
| 4 | CORE-03 | AC-19 | `Confirms: CORE-03 — …` |
| 4 | CORE-04 | AC-20 | `Confirms: CORE-04 — …` |
| 4 | CORE-05 | AC-21 | `Confirms: CORE-05 — …` |
| 5 | QUAL-01 | AC-22 | `Confirms: QUAL-01 — …` |
| 5 | QUAL-02 | AC-23 | `Confirms: QUAL-02 — …` |
| 5 | QUAL-03 | AC-24, AC-25 | both `Confirms: QUAL-03 — …` (audit-fix + audit-uat) |
| 5 | UP-01 | AC-26 | AC-26 multi-ID `UP-01 — …; UP-02 — …` |
| 5 | UP-02 | AC-26 | same AC-26 line |

## Tallies

- **28 canonical SCs** = 4 SPIKE + 4 RUNTIME + 5 TRANS + 5 INSTALL + 5 CORE + 3 QUAL + 2 UP.
- **26 AC steps** (`AC-01..AC-26`).
- **Zero orphan SC** (every Phase 1–5 requirement ID is referenced by ≥1 AC step) and **zero orphan AC**
  (every AC step carries ≥1 canonical requirement ID).
- **Multi-ID AC lines** (one `Confirms:` line citing more than one requirement): `AC-06` (RUNTIME-01 + RUNTIME-02),
  `AC-13` (INSTALL-01 + INSTALL-02 + INSTALL-03), `AC-26` (UP-01 + UP-02). The drift-guard test collects ALL
  `(FAMILY)-NN` tokens per `Confirms:` line, not just the first.

**Join key.** The join key is the `(FAMILY)-\d{2}` requirement ID
(`(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-NN`), NOT the phase-local ` / SC#N` suffix that appears in some
`Confirms:` lines. Those `SC#N` suffixes are secondary phase-local numbering and drift from ROADMAP's per-phase
success-criterion counts, so they are deliberately ignored by both this matrix and the test.

This matrix is referenced from the checklist's run preamble (the `## How to Run` section added in this phase),
which points a runner to it as the proof that `AC-01..AC-26` already cover every v1 success criterion.
