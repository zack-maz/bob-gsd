# Phase 12 — Plan 01 Summary

**Phase:** 12 — Bob 2.0 Capability Re-verification
**Requirements:** BOB2-01 … BOB2-05
**Status:** Complete
**Date:** 2026-08-13
**Evidence:** [`12-BOB2-EVIDENCE.md`](./12-BOB2-EVIDENCE.md)

## What this phase was for

Replace the capability model gsd-bob had been building on — derived from Bob 1.0.x docs, some of
it from the IDE docs rather than Shell's — with one confirmed against a live Bob Shell 2.0.1
install, *before* Phase 13 re-vendors a payload on top of it.

It found a shipping P0.

## Outcome

Five requirements closed, three prior beliefs refuted, one silent bug fixed.

### The P0 — global installs produced an invisible mode (BOB2-04)

Bob 2.0 resolves the global custom-modes file as `~/.bob/settings/custom_modes.yaml`. gsd-bob
wrote `~/.bob/custom_modes.yaml`. **Bob never read it**, and nothing surfaced an error — the
install reported success and the GSD mode simply did not exist. Project-scope installs were
unaffected: Bob resolves those as `<workspace>/.bob/custom_modes.yaml`, with no `settings/`
segment. The two scopes are asymmetric.

`modesRelPathForScope()` now owns that asymmetry, with the evidence in the doc comment, so no
call site re-inlines a literal. `isModesRelPath()` keys uninstall off a basename match, so a
manifest written by v0.2.x — which recorded the old home-root path — still un-merges cleanly
instead of stranding its mode entry.

### The tool-group contradiction was a naming difference (BOB2-02)

Bob's docs disagreed; both pages were describing real behaviour. `command` is a **back-compat
alias** that Bob normalizes to `execute`, in both the modes loader and the importer.

The more consequential discovery sits underneath it: `groups` is validated as an **open string
union**, not an enum. An unrecognised group name passes validation, loads silently, and never
matches a tool — the mode just quietly lacks the capability. That is a failure mode no schema
error will ever surface, so the emitted set is now pinned by a test that fails on any group not
in the verified vocabulary.

This also means quick task `260707-ey1` was **right for the wrong reason**: `execute` is
canonical and worth emitting, but the seam it claimed to be repairing was never broken.

### Parallel fan-out is supported — the last conservative default is retired (BOB2-05)

Bob's own `spawn_subagent` tool description states that multiple calls in one turn run in
parallel. `parallelSubagentFanout` moves from an assumed `false` to an observed `true`. Nested
spawning stays forbidden (Bob enforces it), and no GSD workflow needs it.

Consequences: the roster's Unsupported set is now **empty** (28 supported, 0 withheld); the
synthetic `gsd-parallel-fanout` roster entry was removed rather than allowed to gate *supported*
and appear as an emitted skill with no source file; PAR-01 is unblocked.

### Declaration drift closed

`BOB_CAPABILITY_DECL` existed as four hand-copied literals — in the staging engine and all three
doc generators — each with a comment asserting it was the same declaration as the others. They
were one edit away from disagreeing, and this phase had to change the value in all four. It is
now exported once from `src/bob-adapter.cjs` and imported everywhere. The same class of drift was
found between the vendored descriptor and its patch-script source (see evidence, incidental #2).

## Changes

| File | Change |
|---|---|
| `src/bob-adapter.cjs` | `BOB_CAPABILITY_DECL` (single authority, fan-out `true`), `BOB_TOOL_GROUPS`, `BOB_LEGACY_TOOL_GROUP_ALIASES`, `modesRelPathForScope()`, `isModesRelPath()` |
| `src/installer/stage.cjs` | scope-correct modes path; parent-dir creation; imports the shared declaration; synthetic roster candidate dropped |
| `src/installer/config-merge.cjs` | context-window rationale corrected (no longer claims sequential-only subagents) |
| `bin/gsd-bob.cjs` | uninstall un-merges modes at either scope and at the legacy path |
| `gsd-core/bin/lib/capability-registry.cjs`, `scripts/apply-bob-patches.cjs` | `env: []`; description corrected; the two copies reconciled |
| `scripts/generate-support-roster.cjs`, `generate-command-reference.cjs`, `stamp-covers.cjs` | import the shared declaration; synthetic candidate dropped |
| `test/bob2-capability.test.cjs` | **new** — 11 tests pinning the verified facts |
| `test/descriptor.test.cjs` | env-override tests replaced with no-override assertions |
| `test/installer/{install-clean,uninstall}.test.cjs` | scope-correct paths + a guard against re-writing the ignored root file |
| `README.md`, `ARCHITECTURE.md`, `SUPPORT-ROSTER.md`, `COMMANDS.md`, covers | regenerated / corrected |

## Verification

- **334 tests, 334 pass, 0 fail.** The phase began at 320/323 with three long-standing failures
  and closed with the suite fully green — see "Pre-existing failures" below. 11 tests added.
- Clean global install to a scratch target: 462 files written, `settings/custom_modes.yaml`
  carries exactly one `slug: gsd` with groups `[read, edit, execute, mcp]`, and **no** root
  `custom_modes.yaml` is produced.
- Staged shim invoked out of tree returns real `.planning/` JSON at exit 0 (the `gsd_run` seam).
- `stamp-covers --check` green at *28 emitted, 0 withheld*.

## Pre-existing failures, cleared

Three tests had been failing since the v2.0 transition. They were carried as "known" through two
milestones; both causes turned out to be **stale derivation sources**, not broken behaviour.

**`CORE-02`** read `.planning/phases/04-core-loop-port/04-01-PLAN.md`. Commit `459d992` ("start
milestone v2.0") **deleted** the six v1 phase directories instead of archiving them — 69 files
that existed only in git history. They are now restored to
`.planning/milestones/v1.0-phases/`, and the test reads the archived path. This recovers the v1
planning record as a side benefit; the assertion is unchanged.

**Both `VERIFY-01` assertions** derived requirement IDs from `.planning/REQUIREMENTS.md`, but
v3.0 moved v1 + v2.0 requirements into `milestones/v2.0-REQUIREMENTS.md`. The live file no longer
contains the `## Milestone v2.0 Requirements` boundary, so SC derivation failed closed (correctly
— it is designed to), and every v1 `Confirms:` token read as a phantom reference. The derivation
now follows the archive: `canonicalSCs()` reads the archived v1 section, and
`declaredRequirementIds()` unions the declared sections of **every** milestone doc, archived and
live, each bounded by its own `## Future Requirements`. The anti-drift property is preserved —
still derived at run time, never a frozen ID list — and it now survives future milestone
archiving instead of breaking on it.

## Not done here, deliberately

- **`gsd_run` from inside a live Bob turn.** Needs an interactive session plus an approval, and
  needs the BOB2-04 fix installed first. Phase 17 / ACCEPT-04.
- **`structuredPrompts`.** Still a conservative `false`. It was not in this phase's scope and was
  not re-verified, so it keeps its default rather than acquiring false confidence.
- **The user's live `~/.bob`.** Still carries the broken v0.2.2 layout. Re-installing is an
  outward change to a real environment and belongs to the acceptance run, not to this phase.
- **2.0.1 approval prompts for Bob-home writes.** An acceptance-UX observation (Phase 17).
