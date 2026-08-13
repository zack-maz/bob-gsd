---
status: complete
phase: 03-installer
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-06-19T19:36:17Z
updated: 2026-06-19T19:42:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Help banner
expected: `node bin/gsd-bob.cjs --help` prints the seven-flag usage banner, exits 0, and shows NO --clean/--update flag.
result: pass

### 2. Unknown flag rejected
expected: `node bin/gsd-bob.cjs --bob --clean` fails with a concrete error naming `--clean` as unrecognized/non-existent and exits non-zero (no silent absorption).
result: pass

### 3. Dry-run writes nothing
expected: From a fresh scratch dir, `node <repo>/bin/gsd-bob.cjs --local --dry-run` prints the resolved absolute target and a `PLAN (dry-run — nothing written)` line, and creates NO `.bob/` directory on disk.
result: pass

### 4. Clean install produces a working .bob/ layout
expected: `node <repo>/bin/gsd-bob.cjs --local` prints `Installing into: <scratch>/.bob` BEFORE any write, then creates `.bob/custom_modes.yaml` (exactly one `slug: gsd`), `.bob/gsd-core/bin/gsd-tools.cjs`, `SUPPORT-ROSTER.md`, and a `.gsd-bob-manifest.json` dotfile.
result: pass

### 5. Idempotent re-run preserves user customizations
expected: After seeding a user-authored mode and an untracked user file, re-running `--local` keeps the gsd slug count at exactly 1 (no duplication) and leaves the user mode + user file untouched.
result: pass

### 6. Uninstall preserves user data
expected: `node <repo>/bin/gsd-bob.cjs --local --uninstall` un-merges the gsd slug (user mode kept), deletes the tracked gsd files, removes the manifest dotfile, and leaves the user file and any `.planning/` intact.
result: pass

### 7. AC-13..AC-16 on a real Bob machine
expected: On a live Bob runtime with a real ~/.bob, AC-13..AC-16 pass on-device (print-before-write install, idempotent re-run, manifest-as-truth uninstall, dry-run writes nothing). Deferred to Phase 6 per VERIFY-01/02 — no live Bob on the dev device.
result: skipped
reason: "Deferred by user decision to the end-of-project / Phase 6 on-device acceptance pass (VERIFY-01/02). Not run on-device here — no live Bob on the dev machine. The installer mechanics behind AC-13..AC-16 are all verified green locally against a simulated .bob/ target (Tests 1-6); the only unconfirmed item is Bob actually loading the generated .bob/ layout, which will be exercised at the end via the AC-13..AC-16 script. Recorded as skipped-deferred (not pass) because it has not yet been executed on a device."

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[none yet]
