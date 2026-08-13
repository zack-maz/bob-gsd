---
phase: 02-runtime-foundation-artifact-translation
plan: 03
subsystem: artifact-translation
tags: [gsd-bob, text-mode, trans-03, phase-gate, support-roster, acceptance-checklist, node-test, reuse-seam]

# Dependency graph
requires:
  - phase: 02-runtime-foundation-artifact-translation
    plan: 01
    provides: "vendored gsd-core payload (config-loader.cjs text_mode seam, planning-workspace.cjs), test/_helpers/vendor.cjs, bob registry entry"
  - phase: 02-runtime-foundation-artifact-translation
    plan: 02
    provides: "src/bob-adapter.cjs (gateArtifact/buildSupportRoster), the two bob converters (proven free of AskUserQuestion rewriting)"
provides:
  - "test/text-mode-golden.test.cjs + test/fixtures/text-mode/config.json — TRANS-03 golden by reuse (seam projects workflow.text_mode:true; degradation contract; converter guard)"
  - "scripts/generate-support-roster.cjs + SUPPORT-ROSTER.md — generated unsupported-on-Bob roster (not hand-maintained)"
  - "AC-06..AC-12 appended to .planning/ACCEPTANCE-CHECKLIST.md — read-only device-runnable steps covering all nine Phase 2 requirements"
  - "Phase 2 gate: full node:test suite green (42/42, eight test files)"
  - "DECISION for Phase 3: bob-runtime default workflow.text_mode:true (option a — install-written config)"
affects: [installer phase (writes workflow.text_mode:true into bob .planning/config.json + regenerates SUPPORT-ROSTER.md), Phase 6 (runs AC-05..AC-12 on-device), upstream PR]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TRANS-03 satisfied by REUSE of gsd-core's config+workflow text_mode seam — no converter rewriting (D-09)"
    - "Golden seam test stages a throwaway <tmp>/.planning/config.json and calls loadConfig(tmp) to assert the workflow.text_mode projection"
    - "Support roster is GENERATED from the bob-adapter gate (scripts/generate-support-roster.cjs), never hand-maintained (T-02-10)"
    - "Converter-source guard built programmatically (token.join('')) so the test prose never self-trips the AskUserQuestion check"
    - "Acceptance-checklist append-only convention (D-07/D-11): one AC-NN block per requirement, every Cmd read-only (T-01-SC)"

key-files:
  created:
    - test/text-mode-golden.test.cjs
    - test/fixtures/text-mode/config.json
    - scripts/generate-support-roster.cjs
    - SUPPORT-ROSTER.md
  modified:
    - .planning/ACCEPTANCE-CHECKLIST.md

key-decisions:
  - "bob-runtime default is workflow.text_mode:true (RESEARCH Pattern 4 option a — set in the install-written .planning/config.json, NOT a config-loader override). Phase 3's installer MUST write this."
  - "TRANS-03 is config+workflow, not an artifact transform — the bob converters carry NO AskUserQuestion-rewriting branch (asserted against the vendored converter source)"
  - "AC-05 (RUNTIME-03) already existed (written in 02-01); this plan appends AC-06..AC-12 for the remaining eight Phase 2 requirement IDs — AC-01..AC-05 left untouched"
  - "SUPPORT-ROSTER.md lives at the PROJECT ROOT (committed to git); .planning/ artifacts (ACCEPTANCE-CHECKLIST.md, this SUMMARY) are gitignored in this project (commit_docs:false) and live on disk only"

patterns-established:
  - "Reuse-seam golden: assert a pre-built gsd-core seam carries the bob default into the value workflows read, rather than rebuilding the behavior"
  - "Generated-artifact roster: emit from the adapter gate via a committed script so the roster cannot silently go stale"

requirements-completed: [TRANS-03]

# Metrics
duration: 3min
completed: 2026-06-18
status: complete
---

# Phase 2 Plan 3: text_mode Degradation + Phase Close Summary

**TRANS-03 satisfied by REUSE — with `workflow.text_mode:true` forced for the bob runtime, gsd-core's existing config+workflow seam projects the flag into the value workflows read and degrades `AskUserQuestion` to a validated numbered text list (no converter rewriting). Phase closed: full node:test suite green (42/42), a generated `SUPPORT-ROSTER.md`, and read-only device-runnable AC-06..AC-12 appended for every Phase 2 requirement.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-18T04:18:28Z (Task 1)
- **Completed:** 2026-06-18T04:21:46Z
- **Tasks:** 3
- **Tests:** 42/42 pass (7 net-new this plan); eight test files green (the phase gate)
- **Files:** 4 created + 1 modified

## Accomplishments

- **TRANS-03 (Task 1) — by reuse, no rebuild:** `test/text-mode-golden.test.cjs` + `test/fixtures/text-mode/config.json`. Three assertion groups:
  1. **The seam carries the bob default.** A throwaway `<tmp>/.planning/config.json` IS the `workflow.text_mode:true` fixture; `loadConfig(tmp)` (vendored `config-loader.cjs`) resolves `text_mode === true` — the value workflow markdown reads (config-loader lines 107/557). A companion test proves the shipped global default is `false`, so the projection reflects the fixture, not a constant.
  2. **The degradation contract.** Given `text_mode:true` + a question spec, the presentation is a numbered text list and a typed numeric choice is captured and **validated** against the option set (in-range integers accepted; out-of-range / non-numeric rejected). This models the workflow-layer branch the seam gates (the flow asks + captures a validated answer in the Claude runtime).
  3. **Converter guard (D-09).** The bob converters (`convertClaudeCommandToBobSkill` / `convertClaudeCommandToBobCommand`) contain NO `AskUserQuestion`-rewriting branch — asserted against the vendored converter source (the `AskUserQuestion` replacements that DO exist live in the Cursor/other-runtime converters, not the bob ones). The forbidden token is built programmatically so the test prose never self-trips.
- **Phase gate + roster (Task 2):** Full suite `npm test` → **42/42** across all eight Phase 2 test files (descriptor, backend-neutrality, planning-bytecompat from 02-01; skill-golden, command-golden, merge, unsupported-gate from 02-02; text-mode-golden from this plan). `scripts/generate-support-roster.cjs` emits `SUPPORT-ROSTER.md` from the bob-adapter gate (`gateArtifact`/`buildSupportRoster`) — 3 supported, 2 `unsupported on Bob: <reason>` (the curated `gsd-autonomous` skip + an unmet `isolatedSubagents` dependency). Header documents the YAML comment-loss caveat (Pitfall 5) and that the roster is generated, not hand-maintained.
- **Acceptance checklist append (Task 3):** AC-06..AC-12 appended to `.planning/ACCEPTANCE-CHECKLIST.md` covering the eight Phase 2 requirements not already covered by the existing AC-05 (RUNTIME-03): AC-06 RUNTIME-01/02, AC-07 TRANS-01, AC-08 TRANS-02, AC-09 TRANS-03, AC-10 TRANS-04, AC-11 TRANS-05, AC-12 RUNTIME-04. All nine Phase 2 requirement IDs now appear in a `Confirms:` field; every appended `Cmd:` is read-only/side-effect-free (T-01-SC verified programmatically); AC-01..AC-05 untouched.

## Phase-3 Hand-off Decision (must-record)

**The bob runtime defaults `workflow.text_mode:true`** (RESEARCH Pattern 4, option a). This is set in the **install-written `.planning/config.json`**, NOT via a config-loader override. **Phase 3's installer must write `workflow.text_mode:true` into the bob `.planning/config.json`** so interactive GSD flows degrade to numbered text under Bob (SPIKE-02 conservative lower bound: no structured-choice primitive).

## Task Commits

1. **Task 1: text_mode degradation golden (TRANS-03)** — `31b8698` (test)
2. **Task 2: full-suite phase gate + generated SUPPORT-ROSTER.md** — `60b5f3b` (feat)
3. **Task 3: append AC-06..AC-12** — file written to disk; `.planning/` is gitignored in this project (commit_docs:false), so the deliverable is the on-disk file (intentional `skipped_gitignored` path — no git commit).

## TDD Gate Compliance

Task 1 is marked `tdd="true"`, but **TRANS-03 is satisfied entirely by REUSE** of gsd-core's pre-built config+workflow text_mode seam (built upstream, vendored in 02-01) — there is **no new production code** to RED-then-GREEN. The golden test therefore passes on first run against the existing seam, which is the correct and expected outcome for a reuse-by-design requirement (D-09: "reuse the seam, not rebuild"). The standard RED→GREEN fail-fast rule (a test passing before implementation signals a problem) does NOT apply here because the implementation deliberately predates the plan. No new converter/prompt-rewriting code was written; the only net-new code is test + a roster generator.

## Files Created/Modified

- `test/text-mode-golden.test.cjs` — TRANS-03 golden (7 tests: seam projection, default-false control, numbered-list presentation, valid-choice capture, validation rejection, converter guard, export wiring)
- `test/fixtures/text-mode/config.json` — `.planning/config.json`-shaped fixture with `workflow.text_mode:true`
- `scripts/generate-support-roster.cjs` — generates SUPPORT-ROSTER.md from the bob-adapter gate (node-builtins + the adapter only)
- `SUPPORT-ROSTER.md` (project root) — generated roster, 2 `unsupported on Bob:` lines + supported set + caveats header
- `.planning/ACCEPTANCE-CHECKLIST.md` — appended AC-06..AC-12 (read-only, per-requirement)

## Decisions Made

- **bob default `workflow.text_mode:true` via install-written config** (option a), recorded above for Phase 3.
- **TRANS-03 by reuse, asserted at the seam** — not via a rewritten converter; the converter guard pins D-09.
- **AC numbering continues at AC-06** because AC-05 (RUNTIME-03) was already authored in 02-01; no renumbering of existing steps.
- **Roster is generated, never hand-maintained** — a committed script is the source of truth so the parity gap can't silently go stale (T-02-10).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verify command `node --test test/` substituted with the project's `npm test` glob script**
- **Found during:** Task 2 (running the plan's phase-gate verify).
- **Issue:** The plan's verify and Task-2 action specify `node --test test/`. On Node >= 22 (this device runs Node 25.6.1) the bare directory argument is resolved as a module path and discovers no test files — `node --test test/` reports a spurious failure. This exact issue was already established and fixed in 02-01 (deviation #2), which set the `npm test` script to the glob `test/**/*.test.cjs`.
- **Fix:** Ran the phase gate via `npm test` (the established glob script) — the same eight test files, all 42 tests, exit 0. The roster-marker half of the verify (`node -e "...unsupported on Bob..."`) ran verbatim and passed.
- **Files modified:** none (used the existing 02-01 script).
- **Verification:** `npm test` → 42/42; `node -e "...SUPPORT-ROSTER.md...unsupported on Bob:..."` → `roster OK`.
- **Commit:** `60b5f3b` (Task 2).

**2. [Rule 3 - Documentation] AC numbering starts at AC-06, not AC-05**
- **Found during:** Task 3.
- **Issue:** The plan action says "APPEND ... starting at `AC-05`", but AC-05 already exists in the checklist (RUNTIME-03, authored by 02-01). Appending a second AC-05 would collide / require renumbering, which the plan and environment notes explicitly forbid.
- **Fix:** Appended AC-06..AC-12 instead; RUNTIME-03 is already covered by the pre-existing AC-05. The plan's verify (`includes('## AC-05')` + all nine requirement IDs present + AC-01..AC-04 intact) passes — AC-05 is present and untouched.
- **Files modified:** `.planning/ACCEPTANCE-CHECKLIST.md`.
- **Verification:** plan Task-3 verify node script → `AC append OK`; programmatic T-01-SC read-only audit → all 7 appended Cmd lines read-only.

---

**Total deviations:** 2 (both Rule 3 — a portable-Node verify substitution carried from 02-01, and an AC-numbering correction to avoid clobbering the existing AC-05). No production-code scope creep; no change to plan intent.

## Threat Surface Scan

No new threat surface beyond the plan's `threat_model`. All three registered threats are addressed:
- **T-02-08** (acceptance-checklist `Cmd:` mutating the user's machine in Phase 6): every appended Cmd is read-only — directory listing, `cat`/`grep`, `echo`/`unset` env, read-only `gsd_run query state.load`, and (per the AC-05 schema) `/tmp`-only redirects. Verified programmatically (zero install/write/delete/move/copy verbs in the 7 appended Cmd lines).
- **T-02-09** (text_mode silently NOT degrading): `text-mode-golden.test.cjs` asserts the seam carries `text_mode:true` into the resolved config and the flow asks + captures a validated answer; the bob default is recorded for Phase 3 to write.
- **T-02-10** (support roster going stale / silent): `SUPPORT-ROSTER.md` is generated from the gate via `scripts/generate-support-roster.cjs` and asserted to contain the `unsupported on Bob:` marker; the header documents regeneration.

No new threat flags: no new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced (test + roster generator + read-only checklist text only).

## Known Stubs

None. The `text_mode` degradation harness in the test models the documented workflow-layer contract (numbered list + validated typed choice) — it is a contract assertion, not a stub standing in for missing production behavior (the production behavior is gsd-core's existing seam, exercised via the real `loadConfig` projection). The representative roster candidate set is intentionally small (proves the gate mechanism); full-roster generation across every GSD skill is scoped to Phases 4-5, consistent with 02-02.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 3 (installer) must write `workflow.text_mode:true`** into the bob `.planning/config.json` and **regenerate `SUPPORT-ROSTER.md`** for the full skill set via `scripts/generate-support-roster.cjs` (or the installer's own call to `buildSupportRoster`).
- **Phase 6 (on-device)** runs the whole `.planning/ACCEPTANCE-CHECKLIST.md` (AC-01..AC-12) unattended on a real Bob machine — every Cmd is read-only and safe to execute as-is.
- All nine Phase 2 requirements (RUNTIME-01..04, TRANS-01..05) are now dev-time-verified (hermetic) with their live-Bob confirmations queued in the acceptance checklist.

## Self-Check: PASSED

- Created files verified present on disk: `test/text-mode-golden.test.cjs`, `test/fixtures/text-mode/config.json`, `scripts/generate-support-roster.cjs`, `SUPPORT-ROSTER.md`; `.planning/ACCEPTANCE-CHECKLIST.md` carries AC-12 (last appended step).
- Commits verified in git log: `31b8698` (Task 1, test), `60b5f3b` (Task 2, feat). Task 3's `.planning/` deliverable is on disk (gitignored in this project — intentional, commit_docs:false).
- `npm test` → 42/42 pass (phase gate); SUPPORT-ROSTER.md contains the `unsupported on Bob:` marker; AC append verify → `AC append OK`; all 9 requirement IDs present; AC-01..AC-04 intact.

---
*Phase: 02-runtime-foundation-artifact-translation*
*Completed: 2026-06-18*
