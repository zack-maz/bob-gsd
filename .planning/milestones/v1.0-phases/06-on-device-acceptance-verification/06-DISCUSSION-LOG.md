# Phase 6: On-Device Acceptance Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 6-On-Device Acceptance Verification
**Mode:** `--auto --chain` — user delegated every decision; Claude selected the recommended option for each gray area (logged below).
**Areas discussed:** Completeness proof, Unattended-run structure, Wrong-assumption follow-up log, Phase footprint

---

## Completeness proof (VERIFY-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Coverage matrix + hermetic traceability test | Parse the checklist `Confirms:` lines, cross-reference the Phase 1–5 SC list, fail if any v1 SC is unreferenced | ✓ |
| Manual spot-check | Eyeball that AC-01..26 look complete; no automated proof | |

**User's choice:** Coverage matrix doc + `node:test` that parses ROADMAP/REQUIREMENTS SCs vs the checklist `Confirms:` lines (D-01/D-02).
**Notes:** Drift-proof and test-deferred (no live Bob). Mirrors the Phase 5 roster-vs-capmap parse-and-assert pattern. AC-01..26 already map to every Phase 1–5 SC; this proves it mechanically.

---

## Unattended-run structure (VERIFY-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Preamble + ordered execution + results roll-up | Wrap the frozen AC list with prereqs/env, read-only-first then mutating-in-dependency-order, and a top pass/fail summary table; AC bodies untouched | ✓ |
| Leave as a flat list | Ship AC-01..26 as-is with only the per-step checkbox | |

**User's choice:** Add a "How to run" preamble, an explicit execution order, and a results roll-up table; keep the per-step `Result: [ ] pass [ ] fail` (D-03/D-04).
**Notes:** "Unambiguous, no improvising" = literal checkbox per step + one summary table + verbatim `Cmd:` lines. Preserves the T-01-SC safety invariant (read-only default; mutating steps marked and ordered).

---

## Wrong-assumption follow-up log (VERIFY-02 SC#3)

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated root-anchored `ACCEPTANCE-FOLLOWUPS.md`, pre-seeded | Fixed schema (ID/Assumption/Observed/Impact/Proposed enhancement/Links), seeded with the SPIKE-01/02/04 watch-list rows, linked to v2 reqs | ✓ |
| Inline section in the checklist | A free-text "notes" block at the end of the checklist | |
| GitHub issues | File refutations as repo issues | |

**User's choice:** A dedicated `.planning/ACCEPTANCE-FOLLOWUPS.md` sibling, pre-seeded with the three watch-list assumptions the user flips after the pass (D-05/D-06).
**Notes:** The point is to catch over-conservatism (Bob actually supporting isolated subagents → PAR-01, or structured prompts → NATIVE-01) as tracked v2 work, never a silent note. Existence + schema + seeded rows = the VERIFY-02 mechanism; population is the user's on-device act.

---

## Phase footprint

| Option | Description | Selected |
|--------|-------------|----------|
| Doc-and-test-only | No runtime/adapter/installer/converter changes; only checklist scaffolding, coverage matrix + test, and the follow-up log | ✓ |
| Add tooling | Build a runner/harness around the checklist | |

**User's choice:** Doc-and-test-only (D-07).
**Notes:** Matches the verification-phase nature and the test-deferred principle — every Phase-6 deliverable is hermetically provable; the only hardware act is the user's single unattended pass, which Phase 6 enables but does not perform.

## Claude's Discretion

- Exact filename/format of the coverage matrix (standalone `COVERAGE-MATRIX.md` vs checklist section vs both) and the `node:test` file naming.
- `FU-NN` numbering + column order in `ACCEPTANCE-FOLLOWUPS.md` and how seeded watch-list rows render their initial "unconfirmed" state.
- Wording of the run preamble and the results roll-up table layout.
- One combined `test/acceptance-coverage.test.cjs` vs split test files — mirror the prevailing `test/` layout.

## Deferred Ideas

- Actually running the on-device pass + populating the follow-up log with real refutations — the user's single unattended act, not a build deliverable.
- Acting on any refuted assumption (PAR-01 parallelism, NATIVE-01 prompt re-modeling, a real config-home override) — explicitly v2.
- CI / automated harness that runs the checklist — out of scope (no live Bob in CI).
- The upstream PR to open-gsd/gsd-core (MERGE-01) — follow-on beyond v1.
