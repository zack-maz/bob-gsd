---
phase: 03-installer
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - bin/gsd-bob.cjs
  - src/bob-adapter.cjs
  - src/installer/args.cjs
  - src/installer/config-merge.cjs
  - src/installer/manifest.cjs
  - src/installer/report.cjs
  - src/installer/scope.cjs
  - src/installer/stage.cjs
  - test/installer/args.test.cjs
  - test/installer/config-merge.test.cjs
  - test/installer/dry-run.test.cjs
  - test/installer/idempotent-update.test.cjs
  - test/installer/install-clean.test.cjs
  - test/installer/manifest.test.cjs
  - test/installer/scope.test.cjs
  - test/installer/stage.test.cjs
  - test/installer/uninstall.test.cjs
  - test/installer/unmerge.test.cjs
findings:
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-18
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the Phase-3 gsd-bob installer: the npx entry (`bin/gsd-bob.cjs`), four
single-responsibility installer modules (`args`, `scope`, `stage`, `config-merge`,
`manifest`, `report`), the isolated YAML adapter (`bob-adapter.cjs`), and nine test
files. All 54 tests pass. The module boundaries are disciplined, the dependency
constraints from CLAUDE.md are honored (node builtins + js-yaml-in-adapter only, no
CLI framework, no `--clean`/`--update` flags), and the fail-loud posture on corrupt
manifests / unparseable configs / non-mapping YAML is consistently applied.

The headline concern is **filesystem safety for destructive operations**. The
manifest is treated as fully trusted: there is NO containment check that the paths
it drives `fs.rmSync` against actually resolve inside `target`. A manifest whose
entry paths contain `..` segments (corruption, a partially-overwritten file, or a
manifest carried over from a differently-rooted prior install) would delete files
*outside* the install root during orphan-sweep and uninstall. For an installer
whose primary safety promise is "never touch user files / never touch `.planning/`,"
the absence of a `path.resolve`-based containment guard before every delete is the
one BLOCKER.

The remaining findings are robustness/maintainability issues: an asymmetry where the
merged `custom_modes.yaml` bypasses the D-04 collision policy that protects every
other file, symlink-following during payload copy, a dead/unused param, and a few
duplicated guard clauses that should be factored to avoid drift.

## Critical Issues

### CR-01: No path-containment guard before destructive `fs.rmSync` — manifest `..` segments delete outside `target`

**File:** `src/installer/stage.cjs:258-261`, `bin/gsd-bob.cjs:245-248`
**Issue:** Both the orphan sweep and the uninstall loop compute the absolute path to
delete with `path.join(target, entry.path)` and then call `fs.rmSync(abs)` with no
verification that `abs` is actually contained within `target`. `path.join` does NOT
neutralize `..` segments — `path.join('/home/u/.bob', '../../etc/x')` resolves to
`/home/etc/x`. The manifest is the sole authority for what gets deleted (D-03), and
nothing validates entry paths on read (`readManifest` only checks JSON validity, not
path safety). A manifest that is corrupted, hand-edited, merged from a prior install
under a different root, or otherwise carries a `..`/absolute segment will drive a
delete *outside the install directory*. The `.planning/` guard (`startsWith('.planning' + sep)`)
is also defeated by a leading `../.planning/...`, so the "never touch `.planning/`"
invariant is not robust against the same input. This is the core safety promise of
the installer and it is unguarded.
**Fix:** Add a containment helper and apply it before every delete (and ideally before
every write), refusing entries that escape `target`:
```js
function safeJoin(base, rel) {
  const abs = path.resolve(base, rel);
  const baseResolved = path.resolve(base);
  if (abs !== baseResolved && !abs.startsWith(baseResolved + path.sep)) {
    throw new Error(`refusing to operate outside install root: ${rel}`);
  }
  return abs;
}
// stage.cjs orphan sweep:
const abs = safeJoin(target, entry.path);
// gsd-bob.cjs uninstall:
const abs = safeJoin(target, rel);
```
Also normalize/validate `entry.path` in `readManifest` (reject absolute paths and any
path whose `path.normalize` still contains a leading `..`) so a poisoned manifest
fails loud instead of silently driving an out-of-tree delete.

## Warnings

### WR-01: Merged `custom_modes.yaml` bypasses the D-04 skip-warn collision policy applied to every other file

**File:** `src/installer/stage.cjs:190-211`
**Issue:** Every payload `file` entry goes through `stageFile` → `classifyOnUpdate`,
which reports `skip-warn` and refuses to overwrite a user-modified copy. The
structural `custom_modes.yaml` merge does NOT: it unconditionally reads, re-merges,
and rewrites the file every run, and always pushes it to `report.written`. The merge
preserves non-`gsd` user slugs, so this is not outright data loss, but: (a) comments
and formatting on the whole file are dropped on every run (documented for the gsd
entry, but here it affects the *entire* file including user-authored sections), and
(b) the report claims "written" even when the output is byte-identical, which is
misleading on idempotent re-runs. The asymmetry with the documented D-04 promise is a
maintainability and trust hazard.
**Fix:** Hash the merged bytes and apply the same classify/skip path, or at minimum
only report `written` when the bytes actually changed:
```js
const mergedEntry = manifest.entries.find((e) => e.path === modesRel && e.kind === 'merged');
const newHash = sha256(mergedBytes);
if (mergedEntry && mergedEntry.sha256 === newHash && fs.existsSync(modesAbs)) {
  // unchanged — record as skipped/unchanged, do not claim 'written'
} else {
  if (!dryRun) { fs.mkdirSync(target, { recursive: true }); fs.writeFileSync(modesAbs, mergedBytes); }
  report.written.push(modesRel);
}
```

### WR-02: `listFilesRel` follows symlinks via `statSync`, copying out-of-tree content into the install

**File:** `src/installer/stage.cjs:58-72`
**Issue:** The recursive walker uses `fs.statSync` (which follows symlinks) rather than
`fs.lstatSync`. A symlink in the vendored `gsd-core/` payload that points to a
directory is recursed into; a symlink to a file is read with `fs.readFileSync` (line
220) and copied as a regular file. If the payload ever contains a symlink (intentional
or accidental during the publish/vendor step), the installer silently dereferences it
and bakes external content into the user's `.bob/`. The payload is trusted today, but
the walker is the kind of primitive that should be safe by construction.
**Fix:** Use `fs.lstatSync` and explicitly skip (or fail loud on) symlinks:
```js
const st = fs.lstatSync(childAbs);
if (st.isSymbolicLink()) continue; // or throw — never silently dereference
if (st.isDirectory()) walk(childAbs, childRel);
else if (st.isFile()) out.push(childRel);
```

### WR-03: Uninstall classifies "any merged entry that isn't `custom_modes.yaml`" as config.json

**File:** `bin/gsd-bob.cjs:193-237`
**Issue:** The merged-entry branch dispatches on `rel === 'custom_modes.yaml'`; the
`else` arm assumes the entry is `.planning/config.json` and applies JSON-key removal
anchored at `workspaceRoot`. Today only two merged kinds exist, so this holds, but the
coupling is implicit — a future third merged artifact would be silently mis-handled as
a config.json un-merge (parsed as JSON, anchored at the wrong root). The dispatch
should be explicit on the known path, not "everything else."
**Fix:** Match the config path explicitly and fail loud on an unrecognized merged
entry:
```js
} else if (rel === path.join('.planning', 'config.json')) {
  // ... existing config.json un-merge ...
} else {
  report.skipped.push(`${rel} (unknown merged kind — left untouched)`);
  continue;
}
```

### WR-04: Orphan-sweep `.planning/` guard is separator-fragile and defeated by `..`

**File:** `src/installer/stage.cjs:254`, `bin/gsd-bob.cjs:191`, `bin/gsd-bob.cjs:265`
**Issue:** The "never touch `.planning/`" guard is `entry.path === '.planning' ||
entry.path.startsWith('.planning' + path.sep)`. This depends on the manifest having
stored the path with the current OS separator, and it is bypassed by any path that
reaches `.planning` through a `..` prefix or a mixed separator (e.g. a manifest
authored on POSIX and read on Windows, or vice versa). Combined with CR-01, the
`.planning/` protection is not robust against the exact malformed input it exists to
defend against.
**Fix:** Normalize before comparing and resolve against the anchor root, e.g. compute
the resolved absolute path and check `abs === path.join(root, '.planning')` or
`abs.startsWith(path.join(root, '.planning') + path.sep)` after `safeJoin` (CR-01)
guarantees containment.

### WR-05: `gsdBobVersion`/`emitGsdMode` are re-read/re-constructed but the install never records `gsdBobVersion` on an existing manifest update

**File:** `bin/gsd-bob.cjs:115-127`
**Issue:** On an update (`existing` manifest present), `runInstall` overwrites
`manifest.scope` and `manifest.configHome` but leaves `gsdBobVersion` and
`generatedAt` at their original install-time values. After upgrading gsd-bob and
re-running (the documented "update = re-run" path), the manifest still reports the
*old* version, so the manifest's `gsdBobVersion` field cannot be trusted to reflect
what is actually staged. This undermines the manifest's stated role as the source of
truth for "what gsd-bob owns."
**Fix:** Refresh the version (and a `lastUpdatedAt`) on every install:
```js
manifest.scope = scope;
manifest.configHome = target;
manifest.gsdBobVersion = gsdBobVersion();
manifest.generatedAt = new Date().toISOString();
```

### WR-06: `mergeTextMode` silently discards a non-object user `workflow` value

**File:** `src/installer/config-merge.cjs:74-78`
**Issue:** When the existing config has `workflow` set to a non-object (string,
number, array), the merge silently replaces it with `{ text_mode: true }`, destroying
whatever the user had there. The module's whole contract is "never clobber user data"
(it goes to great lengths to preserve an unparseable file byte-for-byte), yet a
parseable-but-oddly-typed `workflow` value is dropped without warning. The test at
`config-merge.test.cjs:64` asserts this discard as intended behavior, but discarding
user data should at least warn, consistent with the unparseable-file path.
**Fix:** Emit a warning naming the key when coercing a non-object `workflow`, mirroring
the unparseable-file warning, so the discard is loud rather than silent.

### WR-07: `printReport` skip/removed buckets carry suffixed strings, so `.some(s => s.includes(...))` is the only way to inspect outcomes

**File:** `bin/gsd-bob.cjs:206,227,235,241,251`, `src/installer/report.cjs`
**Issue:** The uninstall pushes human-annotated strings into the report buckets
(`` `${rel} (gsd slug un-merged)` ``, `` `${rel} (unparseable — preserved)` ``) while
`stage` pushes bare relative paths. The buckets are therefore a mix of machine paths
and prose, so any downstream consumer (or test) can only substring-match, never
compare exact paths. This is brittle and will silently break if the suffix wording
changes. The data model should separate the path from the annotation.
**Fix:** Store structured entries (`{ path, note }`) and let `printReport` format the
annotation, keeping the path machine-comparable.

## Info

### IN-01: Dead `explicitDir` parameter in `runInstall`

**File:** `bin/gsd-bob.cjs:115`
**Issue:** `runInstall({ target, scope, explicitDir, dryRun })` destructures
`explicitDir` but never uses it (the target was already resolved by `resolveTarget`
before the call). Dead parameter, mildly misleading.
**Fix:** Drop `explicitDir` from the `runInstall` signature and its call site
(`bin/gsd-bob.cjs:301`).

### IN-02: Redundant `planningDir` / `hasProject` computation

**File:** `bin/gsd-bob.cjs:137-138`
**Issue:** `planningDir = path.join(workspaceRoot, '.planning')` is computed, then the
very next line recomputes the same join inline for `hasProject` instead of reusing
`planningDir`.
**Fix:** `const hasProject = fs.existsSync(planningDir);`

### IN-03: Duplicated `recordDirsFor` / dir-prune logic across `stage.cjs` and `gsd-bob.cjs`

**File:** `src/installer/stage.cjs:143-149,276-288`, `bin/gsd-bob.cjs:180-186,262-273`
**Issue:** The "walk parent dirs into a set" helper and the "prune empty installer
dirs deepest-first, skipping `.planning/`" loop are copy-pasted between the staging
engine and the uninstall path. Divergence between the two copies (e.g. a fix applied
to one but not the other) is a real maintenance hazard given they enforce the same
safety invariant.
**Fix:** Extract `recordDirsFor` and `pruneEmptyDirs(target, installerDirs, dryRun)`
into a shared helper (e.g. in `manifest.cjs` or a new `fs-util.cjs`) and call it from
both.

### IN-04: `classifyOnUpdate` is exported but only the `'skip-warn'` vs. write distinction is used

**File:** `src/installer/manifest.cjs:138-143`, `src/installer/stage.cjs:166-178`
**Issue:** `classifyOnUpdate` returns three verdicts (`rewrite`/`overwrite`/`skip-warn`)
but the only consumer (`stageFile`) treats `rewrite` and `overwrite` identically.
The distinction is dead at the call site — fine for API symmetry with `classifyOrphan`,
but worth a comment so a future reader doesn't assume the two non-skip verdicts are
handled differently.
**Fix:** Add a one-line note at `stage.cjs:171` that `overwrite`/`rewrite` collapse to
the same write path intentionally.

### IN-05: `BOB_SKIP_LIST` / `ROSTER_CANDIDATES` are hardcoded representative stubs

**File:** `src/bob-adapter.cjs:173-177`, `src/installer/stage.cjs:50-56`
**Issue:** Both lists are explicitly "representative for v1" magic data embedded in
source. This is acknowledged in comments and deferred to Phases 4-5, so it is not a
defect — flagged only so it is not forgotten that the support roster currently
reflects a stub set, not the real GSD skill roster.
**Fix:** None for v1; ensure the Phase 4-5 work replaces these with the generated
roster as the comments promise.

---

_Reviewed: 2026-06-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
