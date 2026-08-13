---
phase: 04-core-loop-port
plan: 01
subsystem: installer / artifact-conversion
tags: [core-loop, converter-wiring, golden-diff, tdd, bob-adapter]
requires:
  - "@opengsd/gsd-core@1.5.0 vendored payload (gsd-core/bin/lib/runtime-artifact-conversion.cjs)"
  - "src/installer/stage.cjs convertible loop + gateArtifact (Phase 3)"
provides:
  - "6 vendored core-loop Claude command sources under commands/gsd/"
  - "converter-wired convertible loop emitting .bob/commands + .bob/skills"
  - "test/core-loop-equivalence.test.cjs + frozen test/fixtures/core-loop/ golden tree"
affects:
  - "src/installer/stage.cjs (convertible loop now fires converters, no longer raw-copies)"
tech-stack:
  added: []
  patterns:
    - "D-01 port-by-conversion: reuse the built bob converters, never raw-copy or hand-rewrite"
    - "golden-diff fixture-freeze (per-command byte-identity) mirroring test/command-golden.test.cjs"
    - "programmatic forbidden-token construction so test prose cannot self-trip"
    - "lazy require of converters inside the existsSync guard (absent-source path stays dependency-free)"
key-files:
  created:
    - "commands/gsd/new-project.md (Task 1, orchestrator-resolved)"
    - "commands/gsd/plan-phase.md (Task 1)"
    - "commands/gsd/discuss-phase.md (Task 1)"
    - "commands/gsd/execute-phase.md (Task 1)"
    - "commands/gsd/verify-work.md (Task 1)"
    - "commands/gsd/progress.md (Task 1)"
    - "test/core-loop-equivalence.test.cjs"
    - "test/fixtures/core-loop/*.command.expected.md (×6)"
    - "test/fixtures/core-loop/*.skill.expected.md (×6)"
    - "test/fixtures/core-loop/PROJECT.golden.md"
  modified:
    - "src/installer/stage.cjs"
    - "test/installer/stage.test.cjs"
decisions:
  - "Neutralization assertion targets the config-home PATH form (.claude/), not the bare substring .claude — the core-loop sources legitimately reference a --claude reviewer flag, which is real content, not a config-home leak."
  - "Converters are lazily required INSIDE the existsSync guard so the absent-source path never depends on the vendored conversion lib (keeps the empty-roster regression green and the no-op path dependency-free)."
  - "stage.test.cjs fixtures symlink the real vendored gsd-core/ + scripts/ + package.json (rather than deep-copy 5.4M) so the converter's transitive requires resolve against the genuine tree."
metrics:
  duration: "~25 min"
  completed: "2026-06-19"
  tasks: 3
  files: 21
status: complete
---

# Phase 4 Plan 1: Core-Loop Port — Vendor + Converter Wiring + Equivalence Suite

Closed the load-bearing emission gap for the GSD core loop on Bob: the 6 core-loop Claude command sources are vendored verbatim from gsd-core 1.5.0, the installer's convertible loop now fires the built `convertClaudeCommandToBobCommand` + `convertClaudeCommandToBobSkill` converters (emitting Bob-conformant `.bob/commands/gsd-<name>.md` + `.bob/skills/gsd-<name>/SKILL.md` instead of raw-copying), and a per-command golden-diff equivalence suite proves byte-identity, non-empty descriptions, neutralized bodies, the D-05 real-answer guard, and runtime-agnostic byte-compat.

## What Was Built

### Task 1 — Vendor 6 core-loop command sources (orchestrator-resolved checkpoint)

**Task 1 was a `checkpoint:human-verify gate="blocking-human"` acquisition step, resolved by the orchestrator before this executor run — NOT redone here.** Audit trail:

- A pre-flight discovered the plan originally listed **8** command sources, but `execute-plan` and `verify-phase` are **WORKFLOWS** (in `gsd-core/workflows/`, already vendored wholesale with the gsd-core payload), not slash commands. The plan was **corrected 8 → 6** everywhere. CORE-03 is covered transitively via `execute-phase → execute-plan`; CORE-04 via `verify-work → verify-phase`.
- The 6 real command sources (new-project, plan-phase, discuss-phase, execute-phase, verify-work, progress) were fetched verbatim via `npm pack @opengsd/gsd-core@1.5.0` and committed as `6b83282` "feat(04-01): vendor 6 core-loop command sources from gsd-core 1.5.0". The user approved the checkpoint.
- Verified at the start of this run: `ls commands/gsd/` lists exactly the 6 files; `grep -L '^description:' commands/gsd/*.md` returns nothing (all carry a non-empty description). Sources are unmodified (bodies still carry `.claude`/`gsd:`/`$ARGUMENTS` refs — neutralization is the converter's job, exercised in Tasks 2/3).

### Task 2 — Wire the convertible loop to the bob converters (TDD)

Rewired `src/installer/stage.cjs`'s convertible-artifact loop. Previously it raw-copied each source to `commands/gsd/<name>.md`. Now, per supported source `<stem>` it emits TWO artifacts matching the bob `artifactLayout` exactly:

- flat command `commands/gsd-<stem>.md` = `convertClaudeCommandToBobCommand(content, 'gsd-<stem>')`
- nested skill `skills/gsd-<stem>/SKILL.md` = `convertClaudeCommandToBobSkill(content, 'gsd-<stem>')`

Both routed through the existing `stageFile` helper (so both are manifest-tracked and flow through the D-04 collision policy + CR-01 containment guard). `gateArtifact(candidate, BOB_CAPABILITY_DECL)` remains the sole support authority (gate name = `gsd-<stem>`); no skip entries added, no new converter or `degrade*.cjs` introduced (D-01/D-03/D-04). The converters are required lazily inside the `existsSync` guard, so the absent-source path stays a clean dependency-free no-op — the existing empty-roster regression (`test/installer/stage.test.cjs`) stays green.

RED → GREEN: committed 5 failing tests (`a29d1f7`), then the rewire (`7c828ae`).

### Task 3 — Equivalence suite + frozen golden fixtures (TDD)

Created `test/core-loop-equivalence.test.cjs` (33 tests) and the frozen `test/fixtures/core-loop/` tree:

- **Per-command golden diff (×6):** both converter outputs are byte-identical to frozen `*.command.expected.md` / `*.skill.expected.md` (fixtures frozen by running the vendored converters once on the vendored sources). Mutation-verified: tampering a source byte makes the golden diff fail (T-04-01 provenance mitigation).
- **Empty-description guard (×6):** converted command carries a non-empty `description` + `argument-hint` and strips `effort`/`allowed-tools`/`agent`; converted skill carries `name` + non-empty `description` only.
- **Neutralization (×6):** bodies carry no config-home path ref and no colon-dialect ref (forbidden tokens built programmatically).
- **D-05 real-answer guard:** frozen golden `PROJECT.md` carries the sentinel project name "Acme Realtime Telemetry Pipeline" and no `TODO`/`placeholder`/`{{` markers.
- **Byte-compat proxy (RUNTIME-03):** the `.planning/` write path is byte-identical under the bob vs claude config home with no config-home leak.

Committed as `3ff3bda`.

## Verification

- `node --test test/installer/stage.test.cjs` — 15/15 pass (convertible loop emits converted command + skill; empty-source regression green).
- `node --test test/core-loop-equivalence.test.cjs` — 33/33 pass.
- `npm test` — full suite **148/148 green** (was 115 before this plan; no existing suite regressed).
- `ls commands/gsd/` — exactly 6 verbatim sources.
- `grep -c convertClaudeCommandToBob src/installer/stage.cjs` — **6** (both declared converters now called).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test fixture could not require the converter lib via a partial copy**
- **Found during:** Task 2 GREEN.
- **Issue:** `stage.cjs` lazily requires the converter from the (fixture) repoRoot's `gsd-core/bin/lib/`. The minimal `fixtureRepoRoot()` had no lib; copying just `runtime-artifact-conversion.cjs` (or even the whole `lib/`) failed because the converter's transitive requires reach into sibling libs, `scripts/fix-slash-commands.cjs`, and the repoRoot `package.json`.
- **Fix:** `seedConvertibleSource` now symlinks the real `pkgRoot`'s `gsd-core/`, `scripts/`, and `package.json` into the fixture so every transitive require resolves against the genuine vendored tree (cheaper than a 5.4M deep-copy and exercises the real converter).
- **Files modified:** `test/installer/stage.test.cjs`.
- **Commit:** `7c828ae`.

**2. [Rule 1 - Bug] D-05 golden PROJECT.md tripped its own placeholder guard**
- **Found during:** Task 3 first run.
- **Issue:** The golden `PROJECT.md` prose contained the words "placeholder"/"stub", which the `assert.doesNotMatch(/\bplaceholder\b/i)` guard correctly flagged.
- **Fix:** Reworded the fixture to remove the forbidden words while preserving the sentinel and intent.
- **Files modified:** `test/fixtures/core-loop/PROJECT.golden.md`.
- **Commit:** `3ff3bda`.

## Design Note (carried into the suite)

The must-have "no Claude config-home path ref" was implemented as a **path-form** check (`.claude/`), not a bare-substring check. The vendored `progress.md` legitimately references a `--claude` cross-AI reviewer flag — real content, not a config-home leak. The converter correctly leaves `--claude` intact and rewrites only `.claude/`-style path refs, so the suite asserts on the path form to avoid a false positive. The existing `test/command-golden.test.cjs` uses the bare substring only because its input fixture has no `--claude` flag.

## Threat Mitigations Confirmed

- **T-04-01 (tampering, supply-chain):** golden-diff mutation test proves a wrong/tampered source surfaces as a fixture mismatch.
- **T-04-02 (tampering, .bob writes):** the loop reuses the existing `stageFile` path (manifest + `safeJoin` containment guard); no new write path; `.planning/` never written by the loop.
- **T-04-03 (tampering, real workspace):** all scratch writes use `mkdtempSync` temp dirs; no test writes the tracked `.planning/`.
- **T-04-04 (info disclosure, config-home leak):** byte-compat proxy asserts the resolved config home leaks nowhere into the artifact body.

## Notes

- STATE.md / ROADMAP.md were intentionally NOT updated by this executor — the orchestrator owns those writes after the wave completes (per the run objective). The `.planning/` modifications visible in the working tree at handoff are the orchestrator's, not this plan's.

## Self-Check: PASSED
