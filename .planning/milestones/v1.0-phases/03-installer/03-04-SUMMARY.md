---
phase: 03
plan: 04
subsystem: installer
status: complete
tags: [installer, entry, cli, install, update, uninstall, dry-run, manifest, INSTALL-01, INSTALL-02, INSTALL-03, INSTALL-04, INSTALL-05]
requires:
  - "src/installer/args.cjs (parseArgs — Plan 02)"
  - "src/installer/scope.cjs (resolveTarget — Plan 02)"
  - "src/installer/report.cjs (newReport/printReport — Plan 02)"
  - "src/installer/manifest.cjs (read/write/build + classifyOrphan + sha256 — Plan 01)"
  - "src/installer/stage.cjs (stage — Plan 03)"
  - "src/installer/config-merge.cjs (mergeTextMode — Plan 03)"
  - "src/bob-adapter.cjs (emitGsdMode, unmergeCustomModes — Plan 01)"
  - "node:fs, node:path, node:readline (builtins)"
provides:
  - "bin/gsd-bob.cjs — the npx/Node entry composing install/update/uninstall/dry-run"
  - "package.json bin map { gsd-bob: bin/gsd-bob.cjs } (no new dependency)"
  - "test/installer/{install-clean,idempotent-update,uninstall,dry-run}.test.cjs — INSTALL-01..05 end-to-end gate"
  - ".planning/ACCEPTANCE-CHECKLIST.md AC-13..AC-16 (device-runnable installer steps)"
affects:
  - "Phase 6 on-device acceptance pass runs AC-13..AC-16"
  - "Phases 4-5 vendor commands/gsd/ — the entry's stage() convertible loop picks it up with zero entry changes"
tech-stack:
  added: []
  patterns:
    - "Two distinct roots in the entry: repoRoot=path.resolve(__dirname,'..') (payload source) vs workspaceRoot=process.cwd() (.planning/ anchor) — never conflated"
    - "Every run prints the resolved absolute target BEFORE any write (INSTALL-01, D-12)"
    - "Manifest-as-truth uninstall: un-merge merged slices (never delete), hash-match delete file entries, never touch .planning/"
    - "YAML stays in the adapter — the entry un-merges custom_modes via bob-adapter.unmergeCustomModes; config.json un-merge is inline JSON"
    - "No-flag scope → node:readline prompt defaulting to local (D-11)"
key-files:
  created:
    - bin/gsd-bob.cjs
    - test/installer/install-clean.test.cjs
    - test/installer/idempotent-update.test.cjs
    - test/installer/uninstall.test.cjs
    - test/installer/dry-run.test.cjs
  modified:
    - package.json
    - .planning/ACCEPTANCE-CHECKLIST.md
decisions:
  - "text_mode merge gated on fs.existsSync(<workspaceRoot>/.planning) — global install in a non-project cwd skips the write and emits a KNOWN-LIMITATION note (D-14/Q1), no stray .planning/"
  - "config.json un-merge on uninstall is a tiny inline JSON delete of workflow.text_mode (anchored at workspaceRoot), preserving every user key and never deleting the file (D-07)"
  - "uninstall with no manifest is a clean no-op (manifest-as-truth — nothing tracked, nothing removed)"
  - "the entry uses async main() only for the readline prompt; all staging is synchronous"
metrics:
  duration: "~6 min"
  completed: "2026-06-18"
  tasks: 3
  files: 7
---

# Phase 3 Plan 04: Installer Entry Point Summary

Wired `bin/gsd-bob.cjs` — the single user-facing npx/Node command that composes the verified Plan 01-03 modules into the full install / update / uninstall / dry-run flow, added the `gsd-bob` bin map, proved the end-to-end behavior with four scratch-tmpdir integration tests driven through the real entry via `child_process`, and appended device-runnable AC-13..AC-16 to the consolidated acceptance checklist for the Phase 6 on-device pass.

## What Was Built

### Task 1 — `bin/gsd-bob.cjs` entry + `package.json` bin map
- `#!/usr/bin/env node`, `'use strict'`, requires node builtins (`fs`/`path`/`readline`) + `src/installer/*` + `src/bob-adapter.cjs` only. No YAML parser, no CLI framework, no Claude SDK in this file.
- Derives the TWO distinct roots once and keeps them separate: `repoRoot = path.resolve(__dirname, '..')` (the gsd-bob PACKAGE root, the payload source threaded into `stage()`) and `workspaceRoot = process.cwd()` (where `.planning/` is anchored). Under real npx these differ — proven by the cwd-independence test.
- Flow: `parseArgs(process.argv.slice(2))` → `--help` prints the seven-flag banner and exits 0 → null-scope `node:readline` prompt (default local; `--local`/`--global` skip it) → `resolveTarget(...)` → `console.log` the resolved ABSOLUTE target BEFORE any write on every path → dispatch install / uninstall.
- **Install/update (re-run):** `stage({ target, scope, workspaceRoot, dryRun, manifest, report, repoRoot })`, then the `text_mode` merge ONLY when `fs.existsSync(path.join(workspaceRoot, '.planning'))` — otherwise SKIP the write and emit a KNOWN-LIMITATION note (no stray `.planning/`, D-14/Q1). Records the merged config.json as a manifest entry. Writes the manifest unless dryRun.
- **Uninstall (`--uninstall`):** manifest-driven. `merged` `custom_modes.yaml` → `unmergeCustomModes(text, [gsd])` and rewrite (never delete); `merged` `.planning/config.json` → inline-JSON delete of `workflow.text_mode` preserving user keys (anchored at workspaceRoot, file never deleted); `file` entries → `classifyOrphan` hash-match delete, user-modified skip; deletes the manifest dotfile; prunes only installer-created empty dirs. Never touches `.planning/` (D-07).
- **Dry-run:** both branches compute the report and print `PLAN (dry-run — nothing written)` with zero fs mutation.
- `package.json`: added `"bin": { "gsd-bob": "bin/gsd-bob.cjs" }` additively; engines/scripts/dependencies unchanged (deps stay `{js-yaml}`). File made executable (`chmod +x`).

### Task 2 — Four end-to-end integration tests
House style (`node:test` + `node:assert/strict` + scratch `mkdtempSync` tmpdirs), driving the real entry by its ABSOLUTE package-root path with `cwd` set to a distinct scratch workspace via `execFileSync` — exactly the real-npx shape (cwd ≠ package root).
- `install-clean`: absolute target printed; full layout (one `slug: gsd`, payload `gsd-core/bin/gsd-tools.cjs`, roster, manifest `entries[]`); cwd-independence payload assertion; BOTH config.json predicate branches (project present → `workflow.text_mode:true` + merged manifest entry; no project → no stray `.planning/` + KNOWN-LIMITATION note in stdout).
- `idempotent-update`: pre-seeded `my-mode` survives, gsd slug count exactly 1, untracked user file untouched, user-edited tracked payload file skipped (not clobbered).
- `uninstall`: tracked file deleted, `custom_modes.yaml` un-merged (`my-mode` kept, no gsd), `config.json` un-merged (user key kept, `text_mode` gone), manifest dotfile gone, `.planning/` preserved.
- `dry-run`: byte-identical recursive snapshots before/after for both install and uninstall, PLAN marker present.

### Task 3 — AC-13..AC-16 appended to the acceptance checklist
Continued the `## AC-NN — Title` + `Cmd:`/`Expect:`/`Confirms:`/`Result:` schema after AC-12:
- AC-13: single-command install prints the resolved absolute target and produces a working `.bob/` layout (INSTALL-01/02/03, SC#1/SC#2).
- AC-14: idempotent re-run, `slug: gsd` count 1, user customizations preserved (INSTALL-04, SC#3).
- AC-15: manifest-as-truth uninstall un-merges slices and preserves `.planning/` (INSTALL-05/D-06/D-07, SC#4).
- AC-16: `--dry-run` writes nothing; `text_mode` framed as a per-project guarantee, explicitly NOT descriptor/runtime-enforced (RESEARCH Pitfall 2 / Q1).

## Verification Results

- `node bin/gsd-bob.cjs --help` exits 0, lists the seven flags; help output has no `--clean`/`--update` flag (grep 0).
- `node --test` on all four installer integration files → 7 pass / 0 fail (incl. cwd-independence + both config.json branches).
- `npm test` (full suite) → 104 pass / 0 fail (Phase 2 golden + Plans 01/02/03 stay green; +7 new).
- `node -e` bin-map check → exit 0; dependencies are exactly `{js-yaml}` → exit 0.
- `grep -cE "require\('js-yaml'\)|commander|yargs|oclif" bin/gsd-bob.cjs` → 0.
- `grep -c "unmergeCustomModes" bin/gsd-bob.cjs` → 4 (≥1).
- `grep -cE "path\.resolve\(__dirname" bin/gsd-bob.cjs` → 2 (repoRoot from the package root).
- `grep -cE "existsSync\([^)]*\.planning" bin/gsd-bob.cjs` → 1 (config.json merge gated on project `.planning/`).
- `grep -cE '^## AC-1[3-6]' .planning/ACCEPTANCE-CHECKLIST.md` → 4; total AC headers == 16; AC-01..12 intact.
- No AC line claims descriptor/runtime-level `text_mode` enforcement (the one match explicitly NEGATES enforcement, per Pitfall 2).

## Threat Mitigations Applied

- **T-03-13** (uninstall deleting user data / `.planning/`): un-merge merged slices, hash-match `file` deletes only, `.planning/` never deleted/pruned. Tested (uninstall).
- **T-03-14** (writing without showing where): absolute target printed before any mutation on every path; `--dry-run` shows the plan with zero writes. Tested (install-clean, dry-run).
- **T-03-14b** (stray `config.json` in a global cwd): merge gated on existing `<workspaceRoot>/.planning/`; non-project install skips + notes. Tested (both config.json branches).
- **T-03-14c** (payload from the wrong root): `repoRoot = path.resolve(__dirname,'..')` threaded into `stage`; payload never read relative to cwd. Tested (cwd-independence).
- **T-03-15** (un-merge clobbering user modes/keys): `custom_modes.yaml` via `unmergeCustomModes` (slug-scoped); `config.json` removes only `workflow.text_mode`, preserves user keys. Tested.
- **T-03-16** (manifest absent/corrupt): a missing manifest → clean no-op uninstall; a corrupt manifest throws loud via `readManifest` (Plan 01).
- **T-03-17** (Claude-coupled / framework dependency): entry requires builtins + in-repo modules only; deps stay `{js-yaml}`. Grep-asserted.

## Deviations from Plan

None — plan executed exactly as written. (The entry imports `manifestPath` instead of a literal manifest filename; the unused `MANIFEST_FILENAME` import was removed to keep the file clean. Behavior unchanged.)

## Known Stubs

None. The convertible-artifact loop in `stage.cjs` is intentionally inert for v1 (no `commands/gsd/` source is vendored — RESEARCH Pitfall 1); it activates automatically when Phases 4-5 vendor that source, with zero entry/stage changes. This is documented intent, not a stub blocking the plan's goal.

## Commits

- `7f4e161` feat(03-04): wire bin/gsd-bob.cjs entry + package.json bin map
- `b3f68de` test(03-04): four end-to-end installer integration tests (INSTALL-01..05)
- (Task 3 edited `.planning/ACCEPTANCE-CHECKLIST.md`, which is gitignored in this project — `commit_docs: false`; the edit is on disk, intentionally untracked.)

## Notes for Downstream Phases

- Phase 6 runs AC-13..AC-16 on a real Bob machine. AC-13/14/15 contain Phase-3-contributed mutating install/uninstall steps; their read-backs (`cat`/`grep`/`ls`/`diff`) are read-only.
- When Phases 4-5 vendor `commands/gsd/` under the package root, `bin/gsd-bob.cjs` needs no change — `stage()`'s convertible loop picks it up.

## Self-Check: PASSED

- FOUND: bin/gsd-bob.cjs
- FOUND: package.json (bin map)
- FOUND: test/installer/install-clean.test.cjs
- FOUND: test/installer/idempotent-update.test.cjs
- FOUND: test/installer/uninstall.test.cjs
- FOUND: test/installer/dry-run.test.cjs
- FOUND: .planning/ACCEPTANCE-CHECKLIST.md (AC-13..AC-16)
- FOUND commit: 7f4e161 (feat entry), b3f68de (tests)
- NOTE: Task 3 doc edit is in .planning/ (gitignored, commit_docs:false) — on disk, not in git history by design
