---
phase: 03-installer
verified: 2026-06-18T16:00:00Z
status: human_needed
score: 4/4 success criteria verified; SC#4 robustness gap (CR-01) now closed and re-verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/4 normal-op; 1 robustness gap on SC#4
  gaps_closed:
    - "SC#4 / INSTALL-05 robustness: manifest path-containment — a poisoned `..`/absolute manifest entry no longer drives an out-of-root delete; the run now fails LOUD (exit 1). Closed by commits df622d2 (RED regression) + dd71762 (GREEN guards)."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "AC-13..AC-16 on a real Bob machine with a real ~/.bob (Phase 6 on-device pass): single real `npx` install prints the absolute target before writing and produces a working .bob/ layout; re-run is idempotent (slug count 1); manifest exists and uninstall leaves user files + .planning/ intact; --dry-run writes nothing."
    expected: "Each AC step passes on a live Bob install (deferred to Phase 6 per VERIFY-01/02 — no live Bob on the dev device)."
    why_human: "Requires a real Bob runtime; all dev-time verification is doc-conformance/golden/equivalence per the project's no-live-Bob constraint."
---

# Phase 3: Installer Verification Report (Re-verification)

**Phase Goal:** A single npx command installs gsd-bob into a Bob environment at the chosen scope, with update/clean operations that never destroy user customizations — all verifiable against a simulated `.bob/` target without a live Bob.
**Verified:** 2026-06-18 (re-verification after CR-01 gap closure)
**Status:** human_needed (CR-01 RESOLVED; only the Phase-6 live-Bob on-device pass remains, deferred by VERIFY-01/02)
**Re-verification:** Yes — after gap closure (prior status: gaps_found)

## Re-verification Summary

The single prior gap was **CR-01**: the manifest is the sole source of truth (D-03) but `readManifest` validated JSON only — not path safety — and both destructive loops used `path.join(target, entry.path)`, which does not neutralize `..`. A poisoned manifest with a `../../victim` (or absolute) entry drove an out-of-root `fs.rmSync`, partially failing SC#4's "never touch user files / never orphan" promise.

**The fix is real, wired into every destructive path, and independently re-verified:**

- `src/installer/manifest.cjs` adds `assertSafeRelpath(relPath)` (rejects empty/absolute paths and any path that normalizes to a leading `..`, folding `\\`→`/` so a `..\\` segment is caught on POSIX too) and `safeJoin(base, rel)` (resolve-based containment, refuses anything that escapes the root). `readManifest` now calls `assertSafeRelpath` on **every** entry at load time, so a poisoned manifest fails LOUD before any consumer reads it.
- `src/installer/stage.cjs:261` orphan sweep — `const abs = safeJoin(target, entry.path)` before `fs.rmSync`.
- `bin/gsd-bob.cjs:249` uninstall file delete, `:197` custom_modes un-merge, `:214` config un-merge — all resolve through `safeJoin` (containment, defense-in-depth alongside the load-time validation).
- The remaining two unguarded `path.join(target, rel)` calls (stage.cjs:284, gsd-bob.cjs:270) are `rmdirSync`-only on dirs derived from manifest entries that already passed `assertSafeRelpath`, and `rmdirSync` removes only EMPTY dirs — doubly safe.
- The entry point's top-level `.catch` sets `process.exitCode = 1`, so a thrown `readManifest` surfaces as a loud non-zero exit.

**Independent exploit re-attempt (not via the test's wiring):** Hand-crafted a manifest with a `../victim-secret.txt` entry (hash matching a real file two levels above the install root) and ran `--uninstall`. Result: refused with `entry.path "../victim-secret.txt" escapes the install root after normalization … — refusing (CR-01 guard)`, **exit 1**, victim file intact. Repeated with an **absolute** entry path → refused with `is absolute … refusing`, victim intact. The exploit is closed on both vectors.

**Happy-path regression check (install → update → dry-run → uninstall, simulated `.bob/`, no live Bob):** all four SCs still hold — see Observable Truths. The guard did NOT break normal operation.

**Full suite:** `npm test` → **110 pass / 0 fail** (104 prior + 6 new CR-01 regression tests). The new `test/installer/manifest-path-safety.test.cjs` exercises `safeJoin` refusal, `readManifest` LOUD-throw on `..` and absolute entries, acceptance of a clean manifest, and the end-to-end `--uninstall` out-of-tree-delete refusal.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | Single `npx`/`node` command installs; local vs global scope selectable; resolved absolute target printed BEFORE any write (INSTALL-01/02) | ✓ VERIFIED | Re-run lifecycle printed `Installing into: /tmp/lifecycle-.../.bob` as first line before any fs write; `-c <path>` global override honored. |
| 2 | Clean install onto fresh scratch env produces working `.bob/` layout (INSTALL-03) | ✓ VERIFIED | Clean install into empty scratch `.bob/`: manifest 385 entries, exactly 1 `slug: gsd`, `gsd-core/bin/gsd-tools.cjs` present, `.planning/config.json` gained `workflow.text_mode` while keeping the seeded `my_user_key`. |
| 3 | Re-run updates idempotently, preserving user commands/rules/`gsd-*` modes without duplication (INSTALL-04) | ✓ VERIFIED | After seeding `my-mode` + `MY-NOTES.txt` + `my-stuff/notes.txt`, second install kept gsd slug at 1 (no dup), kept `my-mode` (1), left both untracked user file and dir intact. |
| 4 | Manifest tracks every file so update/clean only touch tracked files and never blindly overwrite or orphan user files (INSTALL-05) — robustly, including against a corrupt/cross-rooted manifest | ✓ VERIFIED | NORMAL: uninstall removed manifest, un-merged gsd slug (→0) and `text_mode` (→0), preserved `my-mode`, `MY-NOTES.txt`, user config key, and `.planning/`. ADVERSARIAL (CR-01 closed): poisoned `..` and absolute manifest entries are REFUSED by `assertSafeRelpath`/`safeJoin` — uninstall exits 1, the out-of-root victim file is NOT deleted. Independently reproduced refusal on both vectors. |

**Score:** 4/4 success criteria verified (SC#4 robustness gap CR-01 closed and re-verified).

### Required Artifacts (re-verified deltas)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/installer/manifest.cjs` | + path validation | ✓ VERIFIED | `assertSafeRelpath` + `safeJoin` added and exported; `readManifest` validates every entry path on load; node:fs/path/crypto only, no js-yaml. |
| `src/installer/stage.cjs` | orphan sweep guarded | ✓ VERIFIED | Orphan `fs.rmSync` resolves via `safeJoin(target, entry.path)`; dir-prune is `rmdirSync` on already-validated entries (empty-only). |
| `bin/gsd-bob.cjs` | uninstall + un-merge guarded | ✓ VERIFIED | File delete, custom_modes un-merge, and config un-merge all route through `safeJoin`; top-level `.catch` → `process.exitCode = 1` (fail loud). |
| `test/installer/manifest-path-safety.test.cjs` | CR-01 regression | ✓ VERIFIED | 6 tests, all green; covers helper refusal, load-time LOUD throw (`..` + absolute), clean-manifest acceptance, and end-to-end out-of-tree-delete refusal. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `npm test` | 110 pass / 0 fail | ✓ PASS |
| CR-01 regression (isolated) | `node --test test/installer/manifest-path-safety.test.cjs` | 6 pass / 0 fail | ✓ PASS |
| CR-01 exploit (`..` entry) | crafted manifest + `--uninstall` | REFUSED, exit 1, victim intact | ✓ PASS (now defended) |
| CR-01 exploit (absolute entry) | crafted manifest + `--uninstall` | REFUSED, victim intact | ✓ PASS (now defended) |
| Clean install layout | end-to-end scratch run | 385 entries, 1 gsd slug, gsd-tools.cjs, config text_mode + user key | ✓ PASS |
| Idempotent re-run | install x2 + seeded user data | gsd slug 1, my-mode kept, untracked file+dir survive | ✓ PASS |
| Uninstall preserves | `--uninstall` scratch run | manifest gone, my-mode kept, gsd+text_mode un-merged, .planning/ + user file kept | ✓ PASS |
| Dry-run writes nothing | `--dry-run` | target dir NOT created | ✓ PASS |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| INSTALL-01 | ✓ SATISFIED | Single command install; print-before-write verified end-to-end. |
| INSTALL-02 | ✓ SATISFIED | local vs global scope; `-c` override. |
| INSTALL-03 | ✓ SATISFIED | Working `.bob/` layout against scratch target. |
| INSTALL-04 | ✓ SATISFIED | Idempotent re-run; user mode/file/dir preserved. |
| INSTALL-05 | ✓ SATISFIED | Manifest-as-truth in normal use AND now robust against corrupt/cross-rooted manifests (CR-01 closed). |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (CR-01 resolved) | unguarded `fs.rmSync(path.join(target, entry.path))` | ✅ FIXED | All destructive deletes now route through `safeJoin`; load-time `assertSafeRelpath` rejects poisoned manifests. |
| src/installer/stage.cjs | `listFilesRel` uses `fs.statSync` (follows symlinks) | ⚠️ Warning (WR-02, unchanged) | Payload trusted today; symlink dereference is a separate hardening item, not part of CR-01. |
| (no TBD/FIXME/XXX markers) | — | ℹ️ Info | Clean — no unreferenced debt markers in phase-modified source. |

### Human Verification Required

1. **AC-13..AC-16 on real Bob** — deferred to Phase 6 on-device pass (VERIFY-01/02); no live Bob on the dev device. This is the ONLY remaining item; it is a pre-existing, intentionally-deferred milestone gate, not a Phase-3 defect.

### Gaps Summary

The phase goal is **achieved**. All four success criteria are verified end-to-end against a simulated `.bob/` target with no live Bob, the full 110-test suite is green, and the single prior gap (CR-01) is **closed and independently re-verified**: a poisoned `..`/absolute manifest entry can no longer drive an out-of-root delete — the installer refuses it loudly (exit 1) at manifest load time, and every destructive `fs.rmSync` is additionally wrapped in a `safeJoin` containment guard. The happy path (install → idempotent update → dry-run → uninstall) was re-run after the fix and remains fully intact, preserving every user file, user mode, untracked dir, user config key, and `.planning/`.

Status is `human_needed` rather than `passed` only because of the pre-existing AC-13..AC-16 live-Bob on-device pass, which the project's no-live-Bob constraint defers to Phase 6 (VERIFY-01/02). No code-level gaps remain for Phase 3.

---

_Re-verified: 2026-06-18_
_Verifier: Claude (gsd-verifier)_
