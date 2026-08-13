---
phase: 05-quality-gates-upstream-readiness
plan: 03
subsystem: upstream-readiness-docs
tags: [upstream, readme, acceptance-checklist, audit, UP-01, UP-02]
dependency-graph:
  requires:
    - 05-01-SUMMARY.md (regenerated SUPPORT-ROSTER.md — the README's skill-list source)
    - 05-02-SUMMARY.md (quality-gate test suites cited as the AC on-device complements)
  provides:
    - UPSTREAM.md (5-artifact upstream-move inventory + targeted version 1.5.0)
    - README.md (maintainer-standard package README, UP-02 floor)
    - .planning/ACCEPTANCE-CHECKLIST.md AC-22..AC-26 (Phase 5 device-runnable steps)
  affects:
    - Phase 6 on-device acceptance pass (runs the full AC-01..AC-26 checklist)
    - eventual gsd-core upstream PR (pre-scoped by UPSTREAM.md)
tech-stack:
  added: []
  patterns:
    - "Roster-sourced README skill list (never hand-typed) — drift-proof against the generated SUPPORT-ROSTER.md"
    - "Append-only acceptance checklist with mutating /gsd-* step + read-only confirm per AC"
    - "Audit-not-refactor: confirm + record isolation, do not move code (D-07)"
key-files:
  created:
    - UPSTREAM.md
    - README.md
  modified:
    - .planning/ACCEPTANCE-CHECKLIST.md
decisions:
  - "Used a dedicated UPSTREAM.md (not a README section) for the 5-artifact inventory — keeps README user-facing, UPSTREAM.md maintainer-facing (RESOLVED in RESEARCH Open Q2)"
  - "README documents the absence of update/clean flags as 'no dedicated update or clean flags' (prose) to honor both the no-invented-flags rule and the literal acceptance grep (! grep -- --clean|--update)"
metrics:
  duration: 4min
  completed: 2026-06-19
status: complete
---

# Phase 5 Plan 03: Upstream Readiness (UPSTREAM.md, README, AC steps) Summary

UP-01 isolation audit confirmed + recorded as a file:line upstream-move inventory, a maintainer-standard README shipped sourcing its skill list from the generated roster, and the Phase 5 device-runnable acceptance steps (AC-22..AC-26) appended — all with zero code refactor (D-07).

## What Was Built

### Task 1 — UP-01 isolation audit + `UPSTREAM.md` (commit 7826ecd)
- **Audited (no code change):** confirmed `src/bob-adapter.cjs` is the only net-new Bob-specific substance module; the `src/installer/` `.bob` references are install-target paths, not model-backend branching. `node --test test/backend-neutrality.test.cjs` is green (3/3 — zero model-brand literals in the `"bob"` registry block + adapter).
- **Verified every file:line pointer against the live files before recording** — RESEARCH §5's pointers all resolve accurately to the current code:
  - `"bob"` registry entry: `gsd-core/bin/lib/capability-registry.cjs` **L3045–3109** (configHome L3053–3059, artifactLayout L3061–3098, commandStyle L3099). Note the active registry is the second object in the file; the live `"bob"` key is at L3045.
  - Converters named at L3069/L3087 (skill) and L3077/L3095 (command); impls in `runtime-artifact-conversion.cjs` (skill L735, command L763, exported L2015/L2016).
  - Alias: `runtime-aliases.manifest.json` **L79–82** (`"bob": ["bob","bob-cli"]`).
  - configHome resolution: `runtime-homes.cjs` generic `dot-home` case **L83–91**.
- **Recorded** targeted gsd-core version **1.5.0** and framed the doc as "what to lift, where it lives, why it's a move not a rewrite": 4 of 5 inventory items are pure descriptor/alias data or references to gsd-core's existing generic converters; the only net-new logic is the registry entry, the alias, and `bob-adapter.cjs`.

### Task 2 — `README.md` + AC-22..AC-26 (commit 93d3693)
- **`README.md` (net-new)** to the UP-02 content floor in maintainer tone: one-line `npx` install; scope (local `<project>/.bob/` vs global `~/.bob/`, resolved path printed before write); modes (re-run = update; `--uninstall` + install = clean; explicitly no dedicated update/clean flags); supported-skills list **sourced verbatim from `SUPPORT-ROSTER.md`** (all 10 Supported skills present, no README-only skill); flagged gaps (`gsd-autonomous`, `gsd-parallel-fanout` with reasons); targeted version 1.5.0; test-deferred / no-local-Bob posture with the standing suites named; pointers to ACCEPTANCE-CHECKLIST.md and UPSTREAM.md.
- **Appended AC-22..AC-26** to `.planning/ACCEPTANCE-CHECKLIST.md`, one per Phase 5 success criterion, mirroring the AC-17..AC-21 `## AC-NN — <title> (<REQ-ID>)` + `Cmd/Expect/Confirms/Result` schema exactly; each `Cmd` names a mutating `/gsd-*` step AND read-only `ls`/`grep`/`test` confirms; each `Confirms` cites its REQ-ID, restated SC, and the dev-time test it complements:
  - AC-22 code-review (+`--fix` workflow-only) — QUAL-01 → quality-gate-equivalence/contract
  - AC-23 debug + `continue <slug>` restore-from-disk — QUAL-02 → debug-state-persistence
  - AC-24 audit-fix native run — QUAL-03 → quality-gate-contract/roster-capmap
  - AC-25 audit-uat native run — QUAL-03 → quality-gate-contract/roster-capmap
  - AC-26 README/upstream-readiness doc checks — UP-01/UP-02 → backend-neutrality
- **AC-01..AC-21 untouched** (byte-identical; only a standard inter-section blank line added before AC-22, matching the existing schema's separator).

## Deviations from Plan

None — plan executed as written. One in-scope refinement: the README initially used the literal tokens `--update`/`--clean` to *document their absence*; reworded to "no dedicated update or clean flags" so the literal acceptance grep `! grep -qE '\-\-clean|\-\-update' README.md` passes while preserving the no-invented-flags guidance (logged as a decision, not a deviation).

## Verification

- `node --test test/backend-neutrality.test.cjs` → 3/3 pass (UP-01 guard green, no code changed).
- `grep -q npx README.md && grep -q '1.5.0' README.md && ! grep -qE '\-\-clean|\-\-update' README.md && grep -qE '^## AC-22 ' && grep -qE '^## AC-26 '` → "README + AC-22..26 present".
- Every Supported skill in `SUPPORT-ROSTER.md` appears in `README.md` (roster-sourced, no drift).
- AC-22..AC-26 each carry all four `Cmd/Expect/Confirms/Result` fields and a QUAL-01/QUAL-02/QUAL-03/UP-01/UP-02 REQ-ID.
- AC-01..AC-21 content byte-unchanged vs HEAD (append-only).
- UPSTREAM.md contains `1.5.0`, `bob-adapter`, `capability-registry`, and all five inventory artifact names.

## Self-Check: PASSED

- FOUND: UPSTREAM.md
- FOUND: README.md
- FOUND: .planning/ACCEPTANCE-CHECKLIST.md
- FOUND commit: 7826ecd (UP-01 audit + UPSTREAM.md)
- FOUND commit: 93d3693 (README + AC-22..26)
