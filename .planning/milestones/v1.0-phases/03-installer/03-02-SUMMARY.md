---
phase: 03-installer
plan: 02
subsystem: installer
status: complete
tags: [installer, cli, args, scope, report, dependency-free]
requires:
  - "gsd-core/bin/lib/runtime-homes.cjs (getGlobalConfigDir)"
provides:
  - "parseArgs(argv) — hand-parsed gsd-core-mirrored flag contract (INSTALL-02)"
  - "resolveTarget({scope, explicitDir}) — scope→absolute path via vendored resolver (INSTALL-01)"
  - "newReport()/printReport() — written/skipped/removed end-of-run buckets"
affects:
  - "src/installer/stage.cjs (Plan 03 consumes report buckets)"
  - "bin/gsd-bob entry (Plan 04 composes args + scope + report)"
tech-stack:
  added: []
  patterns:
    - "Hand-parsed process.argv (no CLI framework), mirroring gsd-core selectRuntimesFromArgs()"
    - "Scope resolution delegates to the vendored getGlobalConfigDir('bob', …) — never reimplements path math"
    - "Dependency-free: node builtins + vendored gsd-core resolver only"
key-files:
  created:
    - src/installer/args.cjs
    - src/installer/scope.cjs
    - src/installer/report.cjs
    - test/installer/args.test.cjs
    - test/installer/scope.test.cjs
  modified: []
decisions:
  - "No --clean/--update flag recognized — re-run = update, --uninstall + install = clean (UX parity with gsd-core)"
  - "Default scope is null when no scope flag present — the entry uses null to trigger the interactive prompt"
  - "local scope is always <cwd>/.bob (cwd-relative, never via the descriptor); global delegates entirely to the resolver"
metrics:
  duration: "~6 min"
  completed: 2026-06-18
  tasks: 3
  files: 5
---

# Phase 3 Plan 02: Installer CLI Plumbing (args / scope / report) Summary

Dependency-free CLI plumbing the installer entry composes: `args.cjs` hand-parses `process.argv` into a resolved options object mirroring gsd-core's flag convention exactly (and rejecting `--clean`/`--update`/unknown flags); `scope.cjs` resolves local/global scope to an absolute target path by CALLING the vendored `getGlobalConfigDir('bob', explicitDir)` rather than reimplementing path math; `report.cjs` exposes the written/skipped/removed end-of-run buckets. All three are pure transforms with no manifest/staging dependency, so they parallelized with Plan 01 in Wave 1.

## What Was Built

### Task 1 — args.cjs (TDD)
`parseArgs(argv)` recognizes exactly: `--bob` (UX-parity selector, no effect), `--local`/`-l`, `--global`/`-g`, `--config-dir`/`-c <path>`, `--uninstall`/`-u`, `--dry-run`, `--help`/`-h`. Default scope is `null` (signals the entry's interactive prompt). Every unrecognized token throws a concrete error naming the offending flag, with `--clean`/`--update` explicitly called out as non-existent. `-c`/`--config-dir` with no following token throws. No CLI framework — hand-rolled switch over the argv array.
- Commits: `63298a8` (RED test), `ed3d98d` (GREEN impl)

### Task 2 — scope.cjs (TDD)
`resolveTarget({scope, explicitDir})`: `local` → `path.join(process.cwd(), '.bob')`; `global` → `getGlobalConfigDir('bob', explicitDir)` (the vendored resolver owns the `~/.bob` default, `BOB_CONFIG_DIR` override, and tilde expansion). A `null`/unknown scope throws loud (the prompt resolves null before calling). Returns an absolute path — the value the entry prints before any write (INSTALL-01, T-03-05 mitigation).
- Commits: `2e3bded` (RED test), `50be237` (GREEN impl)

### Task 3 — report.cjs
`newReport()` returns a mutable `{written:[], skipped:[], removed:[]}` accumulator; `printReport(report, {dryRun})` prints the three labelled buckets and a one-line tally via `console.log`, with the dry-run header reading `PLAN (dry-run — nothing written)`. No file IO, no third-party deps. No dedicated test (output glue — covered indirectly by the Plan 04 dry-run integration test).
- Commit: `d6d71e8`

## Verification

- `node --test test/installer/args.test.cjs` → 9 pass / 0 fail
- `node --test test/installer/scope.test.cjs` → 5 pass / 0 fail
- `grep -ciE "commander|yargs|oclif" src/installer/args.cjs` → 0
- `grep -c "getGlobalConfigDir('bob'" src/installer/scope.cjs` → 2 (key_link satisfied; calls the resolver)
- `grep -cE "homedir\(\)|os\.homedir" src/installer/scope.cjs` → 0 (no hand-rolled home resolution)
- Negative gate: `parseArgs(['--bob','--clean'])` and `--update` both throw
- No third-party `require` in any of the three modules (node: builtins + vendored runtime-homes only)
- Full suite `npm test` → 80 pass / 0 fail

## Threat Mitigations Applied

- **T-03-05** (target via `-c`/`BOB_CONFIG_DIR`): `resolveTarget` returns an absolute path delegated to the vetted resolver; the entry (Plan 04) prints it before any write so the user sees exactly where it lands.
- **T-03-06** (unknown flags): `parseArgs` throws a concrete error on any unrecognized token (incl. `--clean`/`--update`) — no silent absorption, no hidden behaviour surface.
- **T-03-07** (path traversal via `-c`): accepted per the threat register; symlink-hardening on writes is Plan 03/04's responsibility.

## Deviations from Plan

None — plan executed exactly as written. (Two cosmetic doc-comment rewordings in args.cjs and report.cjs to keep the prohibition-grep acceptance gates at 0; these renamed prohibited packages in prose without changing behaviour, not functional deviations.)

## Self-Check: PASSED

- src/installer/args.cjs — FOUND
- src/installer/scope.cjs — FOUND
- src/installer/report.cjs — FOUND
- test/installer/args.test.cjs — FOUND
- test/installer/scope.test.cjs — FOUND
- Commits 63298a8, ed3d98d, 2e3bded, 50be237, d6d71e8 — all FOUND in git log
