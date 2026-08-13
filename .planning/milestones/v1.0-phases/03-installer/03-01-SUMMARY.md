---
phase: 03
plan: 01
subsystem: installer
status: complete
tags: [installer, manifest, sha256, bob-adapter, un-merge, INSTALL-05]
requires:
  - "js-yaml@4.1.0 (existing dependency, confined to bob-adapter.cjs)"
  - "node:crypto, node:fs, node:path (builtins)"
provides:
  - "src/installer/manifest.cjs — sha256, readManifest, writeManifest, buildManifest, classifyOnUpdate, classifyOrphan, MANIFEST_FILENAME"
  - "src/bob-adapter.cjs unmergeCustomModes export — slug-removing sibling of mergeCustomModes"
affects:
  - "Plan 03 (staging engine) consumes manifest build/classify primitives"
  - "Plan 04 (uninstall/entry wiring) consumes unmergeCustomModes + classifyOrphan"
tech-stack:
  added: []
  patterns:
    - "Manifest is the sole source of truth (D-03): no filesystem scan invents removable entries"
    - "Hash bytes-as-written, never the source (Pitfall 3)"
    - "YAML confined to bob-adapter.cjs; manifest module is node: builtins only"
key-files:
  created:
    - src/installer/manifest.cjs
    - test/installer/manifest.test.cjs
    - test/installer/unmerge.test.cjs
  modified:
    - src/bob-adapter.cjs
decisions:
  - "unmergeCustomModes scoping: ownedSlugs non-empty array scopes removal; omitted/empty falls back to all isOwnedSlug entries (uninstall default)"
  - "readManifest fails loud on corrupt JSON (T-03-01); ENOENT returns null"
metrics:
  duration: "~2 min"
  completed: "2026-06-18"
  tasks: 2
  files: 4
---

# Phase 3 Plan 01: Installer Linchpins (manifest + un-merge) Summary

Built the two no-/single-analog installer primitives ahead of the consumers: the INSTALL-05 manifest module (sha256 of bytes-as-written, D-01 schema read/write, D-04 update + D-05 orphan classification — the single source of truth) and the adapter's `unmergeCustomModes`, the slug-removing sibling of `mergeCustomModes` that keeps all YAML handling inside the adapter.

## What Was Built

### Task 1 — `unmergeCustomModes` (TDD)
- Added directly beneath `mergeCustomModes` in `src/bob-adapter.cjs`, mirroring its structure exactly: js-yaml SAFE `yaml.load`, `null`/`undefined` → `{}`, identical concrete non-mapping error for sequence/scalar roots, `yaml.dump(doc, { lineWidth: -1 })` re-emit.
- Removal rule: filter OUT entries that are `isOwnedSlug` AND (when `ownedSlugs` is a non-empty array) in that scope. Non-owned user slugs are always preserved. Omitted/empty `ownedSlugs` → remove all gsd-owned (uninstall default).
- D-06 honored: never deletes the file, never drops a non-owned user slug. Exported in `module.exports`.

### Task 2 — `src/installer/manifest.cjs` (TDD)
- Exports `MANIFEST_FILENAME` (`.gsd-bob-manifest.json`), `SCHEMA_VERSION`, `sha256`, `manifestPath`, `readManifest`, `writeManifest`, `buildManifest`, `classifyOnUpdate`, `classifyOrphan`.
- `sha256(buf)` = `createHash('sha256').update(buf).digest('hex')` over the exact byte buffer (Pitfall 3).
- `readManifest` returns `null` on ENOENT, throws loud on corrupt JSON (T-03-01).
- `writeManifest` byte-stable: `JSON.stringify(obj, null, 2) + '\n'`.
- `classifyOnUpdate` (D-04): missing→`rewrite`, hash-match→`overwrite`, differ→`skip-warn`.
- `classifyOrphan` (D-05): missing or hash-match→`remove`, differ→`keep-warn`.
- node: builtins only — no js-yaml, no third-party. Deliberately no "scan a directory" function (D-03 sole source of truth).

## Verification Results

- `node --test test/installer/unmerge.test.cjs` — 7 tests pass.
- `node --test test/installer/manifest.test.cjs` — 9 tests pass.
- `npm test` (full suite) — 66 tests pass (Phase 2 golden tests stay green).
- `grep -cE "require\('js-yaml'\)" src/installer/manifest.cjs` == 0 (YAML confined to adapter).
- `grep -c "createHash('sha256')" src/installer/manifest.cjs` == 1.
- `MANIFEST_FILENAME` prints `.gsd-bob-manifest.json`.

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

Both tasks followed RED → GREEN. Per task: a `test(...)` commit (RED, verified failing) precedes the `feat(...)` commit (GREEN). No REFACTOR commits were needed.

## Commits

- `2b162e2` test(03-01): add failing test for unmergeCustomModes (RED)
- `ef72761` feat(03-01): add unmergeCustomModes sibling to the bob adapter (GREEN)
- `df23971` test(03-01): add failing test for the manifest module (RED)
- `7454ee0` feat(03-01): build the install manifest module (GREEN)

## Notes for Downstream Plans

- Plan 03 (staging) should compute each entry's `sha256` from the exact bytes it passes to `writeFileSync`, then `buildManifest` + `writeManifest`. On update, call `classifyOnUpdate` per tracked entry.
- Plan 04 (uninstall) should call `classifyOrphan` per entry for `kind:'file'` targets, and route `kind:'merged'` `custom_modes.yaml` through `unmergeCustomModes` (never delete).

## Self-Check: PASSED

- FOUND: src/installer/manifest.cjs
- FOUND: src/bob-adapter.cjs (unmergeCustomModes export)
- FOUND: test/installer/manifest.test.cjs
- FOUND: test/installer/unmerge.test.cjs
- FOUND commit: 2b162e2, ef72761, df23971, 7454ee0
