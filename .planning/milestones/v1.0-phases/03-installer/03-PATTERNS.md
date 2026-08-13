# Phase 3: Installer - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 11 (8 net-new + 1 adapter modification + package.json + AC checklist append)
**Analogs found:** 9 / 11 (2 net-new "manifest"/"report" modules have no in-repo analog — gsd-core's installer is NOT vendored)

> **Reading note for the planner:** the genuinely net-new, no-analog surface is the **manifest** (hash/kind/orphan diff) and the **report/arg-parse shell**. The load-bearing logic (mode merge, gate, conversion, path resolution) is already built and tested — the installer CALLS it. Do NOT write tasks that reimplement those. Two confirm-items inverted in RESEARCH.md drive scope: (1) no convertible `commands/gsd/` source is vendored — v1 stages only the 3 structural pieces; (2) the bob descriptor does NOT enforce text_mode — the `.planning/config.json` write is the SOLE guarantee.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` (add `bin: { "gsd-bob": "bin/gsd-bob.cjs" }`) | config | — | existing `package.json` (engines/scripts already set) | exact (additive) |
| `bin/gsd-bob.cjs` (npx entry; arg-parse + dispatch + readline) | route/entry | request-response | `scripts/generate-support-roster.cjs` (CJS script shape, `#!/usr/bin/env node`, `node:fs`+`node:path`, requires `src/bob-adapter.cjs`) | role-match (script-entry shape only; arg-parse convention is external — gsd-core `selectRuntimesFromArgs()`) |
| `src/installer/args.cjs` (`parseArgs(argv)`) | utility | transform | gsd-core documented `selectRuntimesFromArgs()` (CLAUDE.md) — hand-parsed argv | external-convention (no in-repo argv parser) |
| `src/installer/scope.cjs` (`resolveTarget(scope, explicitDir)`) | utility | transform | `gsd-core/bin/lib/runtime-homes.cjs` `getGlobalConfigDir('bob', explicitDir)` (CALLED, not reimplemented) | exact (integration analog) |
| `src/installer/manifest.cjs` (read/write/diff, sha256, kind) | service/store | CRUD + transform | _none in-repo_ — net-new; sha256 via `node:crypto`; JSON via `JSON.parse`/`JSON.stringify` | no-analog (linchpin) |
| `src/installer/stage.cjs` (structural + roster staging; collision policy; orphan sweep) | service | file-I/O | `scripts/generate-support-roster.cjs` (fs.writeFileSync + adapter `gateArtifact`/`buildSupportRoster` orchestration); merge call mirrors `test/merge.test.cjs` Pattern 2 | role-match |
| `src/installer/config-merge.cjs` (`.planning/config.json` text_mode MERGE) | utility | transform | adapter `mergeCustomModes` fail-loud pattern (parse-fail → warn, never clobber); RESEARCH.md Pattern 3 | role-match (mirrors fail-loud, different format: JSON not YAML) |
| `src/installer/report.cjs` (written/skipped/removed buckets) | utility | transform | _none in-repo_ — plain `console.log`; closest is roster script's `process.stdout.write` summary line | no-analog |
| `src/bob-adapter.cjs` **MODIFY**: add `unmergeCustomModes(existingText, ownedSlugs)` | service | transform | EXISTING `mergeCustomModes` (same file, lines 77-111) — mirror its fail-loud + slug-equality semantics | exact (sibling function) |
| `test/installer/*.test.cjs` (scope, install-clean, idempotent-update, manifest, uninstall, dry-run) | test | — | `test/merge.test.cjs` + `test/descriptor.test.cjs` (house style; hermetic env injection; scratch tmpdir) | exact |
| `.planning/ACCEPTANCE-CHECKLIST.md` (append AC steps) | config/doc | — | existing AC-01..AC-06 entries (`Cmd:`/`Expect:`/`Confirms:`/`Result:` schema) | exact (append) |

## Pattern Assignments

### `bin/gsd-bob.cjs` (route/entry, request-response)

**Analog:** `scripts/generate-support-roster.cjs` (script shape + adapter wiring), gsd-core `selectRuntimesFromArgs()` convention (arg-parse, documented not vendored).

**Script header + require pattern** (`scripts/generate-support-roster.cjs:1-20`):
```javascript
#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const adapter = require(path.join(__dirname, '..', 'src', 'bob-adapter.cjs'));
```
Mirror this for the entry: `#!/usr/bin/env node`, `'use strict'`, `node:`-builtins only, require `src/bob-adapter.cjs` + the `src/installer/*` modules. The bin must be executable and listed in `package.json` `bin`.

**Arg-parse rule (external convention — CLAUDE.md "What NOT to Use"):** hand-parse `process.argv` exactly as gsd-core's `selectRuntimesFromArgs()` does — NO `commander`/`yargs`/`oclif`. Flags: `--bob`, `--local`/`-l`, `--global`/`-g`, `--config-dir`/`-c <path>`, `--uninstall`/`-u`, `--dry-run`, `--help`. NO `--clean`/`--update` (re-run = update; `--uninstall`+install = clean).

**No-flag scope → readline (D-11):** installer is a plain Node CLI, not a Bob skill, so `node:readline`/`node:readline/promises` is allowed; default-highlighted choice = local.

---

### `src/installer/scope.cjs` (utility, transform) — INTEGRATION ANALOG, do not reimplement

**Analog (CALL, never rewrite):** `gsd-core/bin/lib/runtime-homes.cjs` `getGlobalConfigDir(runtime, explicitDir)`.

**Verified signature** (`runtime-homes.cjs:215-232`):
```javascript
function getGlobalConfigDir(runtime, explicitDir) {
    if (explicitDir) return expandTilde(explicitDir);     // -c / BOB_CONFIG_DIR explicit path, tilde-expanded
    // descriptor-driven: reads runtimes.bob.runtime.configHome { kind:'dot-home', name:'.bob', env:['BOB_CONFIG_DIR'] }
    ...
}
```

**Call pattern (RESEARCH.md Pattern 1, verified):**
```javascript
const { getGlobalConfigDir } = require('../../gsd-core/bin/lib/runtime-homes.cjs');
const globalTarget = getGlobalConfigDir('bob', explicitDir /* from -c, or undefined */);
const localTarget = require('node:path').join(process.cwd(), '.bob'); // local is ALWAYS cwd-relative, NOT via descriptor
```
`BOB_CONFIG_DIR` env override + leading-tilde expansion are handled inside the resolver (verified in `test/descriptor.test.cjs:32-50`). Always PRINT the resolved absolute path before any write (INSTALL-01).

**Test analog for this module:** `test/descriptor.test.cjs` — hermetic, injects `{env, home}`, asserts exact resolved paths; requires the vendored module via `requireVendor('runtime-homes.cjs')`.

---

### `src/installer/stage.cjs` (service, file-I/O)

**Analog:** `scripts/generate-support-roster.cjs` (adapter gate/roster orchestration + `fs.writeFileSync`), and RESEARCH.md Pattern 2 (mode merge) backed by `test/merge.test.cjs`.

**Mode-merge pattern (CALL the adapter, do file IO yourself)** — adapter exports verified at `src/bob-adapter.cjs:35-111`, `197-204`:
```javascript
const { emitGsdMode, mergeCustomModes } = require('../bob-adapter.cjs');
let existing = '';
try { existing = fs.readFileSync(modesPath, 'utf8'); } catch { /* missing → '' */ }
const merged = mergeCustomModes(existing, emitGsdMode());  // slug-scoped, idempotent, THROWS on non-mapping root
fs.writeFileSync(modesPath, merged);
// manifest entry: { path, sha256: sha256(Buffer.from(merged)), kind: 'merged' }
```
`mergeCustomModes` semantics (verified `bob-adapter.cjs:77-111`): empty/undefined/null-root → single gsd entry; preserves every non-gsd slug; replaces ONLY `slug === entry.slug` ('gsd'); a differently-named `gsd-*` slug is RETAINED; THROWS loud on sequence/scalar root. `custom_modes.yaml` exact on-disk path is an OPEN QUESTION (RESEARCH Q3 / A1) — pin against `01-CAPABILITY-MAP.md` §2.

**Roster pattern (CALL the gate, never hardcode a skip list)** — mirror `scripts/generate-support-roster.cjs:39-42`:
```javascript
const supported = candidates.filter((c) => adapter.gateArtifact(c, bobCapabilityDecl).supported).map((c) => c.name);
const unsupportedLines = adapter.buildSupportRoster(candidates, bobCapabilityDecl);
```
Reuse `scripts/generate-support-roster.cjs` for the `SUPPORT-ROSTER.md` step; never hand-maintain the roster (T-02-10).

**Recursive payload copy:** `fs.cpSync(src, dst, { recursive: true })` for the vendored `gsd-core/` payload (node built-in; gsd-core stages this way).

**Pitfall 1 (RESEARCH):** there is NO `commands/gsd/` convertible source vendored — v1 stages ONLY the 3 structural pieces (gsd mode merge, vendored `gsd-core/` copy, `.planning/config.json` text_mode). The convertible-roster loop must be roster-agnostic (D-08) and tolerate an empty/minimal source. Do NOT write a task that depends on converting a roster that does not exist.

**Collision policy (D-04) + orphan sweep (D-05):** RESEARCH Code Examples — per `file` entry recompute on-disk sha256: match→overwrite+refresh; differ→skip+warn; missing→rewrite. Orphan: in-manifest but no longer emitted → hash-match remove+drop entry, differ leave+warn. Prune only installer-created dirs; NEVER `.planning/` (D-07).

---

### `src/installer/config-merge.cjs` (utility, transform)

**Analog:** the fail-loud / never-clobber discipline of `mergeCustomModes` (`bob-adapter.cjs:82-95`), re-expressed for JSON. RESEARCH Pattern 3 is the concrete template.

**Pattern (RESEARCH Pattern 3, verified against D-13):**
```javascript
const planningCfg = path.join(workspaceRoot, '.planning', 'config.json'); // ROOT-anchored (CORE-05), NOT under scope dir
let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(planningCfg, 'utf8'));      // parse-fail → catch → warn, DO NOT write
} catch (e) {
  if (e.code !== 'ENOENT') { console.warn(`gsd-bob: ${planningCfg} did not parse — preserving as-is`); return; }
}
cfg.workflow = (cfg.workflow && typeof cfg.workflow === 'object') ? cfg.workflow : {};
cfg.workflow.text_mode = true;                                 // sole gsd-owned key
fs.writeFileSync(planningCfg, JSON.stringify(cfg, null, 2) + '\n'); // byte-stable for sha256
// manifest entry: { path: '<workspaceRoot>/.planning/config.json', sha256, kind: 'merged' }
```
**Pitfall 2 (RESEARCH):** the bob descriptor does NOT enforce text_mode — this write is the SOLE guarantee, load-bearing and unconditional for local installs. Global installs with no project `.planning/` have NO text_mode default (Open Question Q1 — surface to user, do not claim descriptor-level enforcement in any plan/AC step).

---

### `src/installer/manifest.cjs` (service/store, CRUD) — NO IN-REPO ANALOG

Net-new linchpin. sha256 via `node:crypto`, JSON via `JSON.parse`/`JSON.stringify`.

**sha256 of bytes-as-written (RESEARCH Code Examples — Pitfall 3):**
```javascript
const crypto = require('node:crypto');
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
const bytes = Buffer.from(convertedContent, 'utf8');
fs.writeFileSync(destPath, bytes);
const entry = { path: relPath, sha256: sha256(bytes), kind: 'file' };
```
Hash the EXACT bytes passed to `writeFileSync` (post-conversion/post-merge), not the source. On update recompute by reading back. Schema (D-01/D-02): `{ schemaVersion, gsdBobVersion, scope, configHome, generatedAt, entries[] }`; entry `{ path, sha256, kind: 'file' | 'merged' }`. Manifest at `<configHome>/.gsd-bob-manifest.json`. The manifest is the SOLE source of truth (D-03) — never scan the filesystem blindly.

---

### `src/bob-adapter.cjs` MODIFY — add `unmergeCustomModes(existingText, ownedSlugs)`

**Analog:** the EXISTING `mergeCustomModes` in the same file (`bob-adapter.cjs:77-111`). Mirror its structure exactly: js-yaml SAFE load, null/comment-only → `{}`, non-mapping root → THROW loud, `isOwnedSlug` filter (`bob-adapter.cjs:62-64`), `yaml.dump(doc, { lineWidth: -1 })`. The un-merge removes gsd/gsd-* slugs and re-emits, preserving every user slug. Keep YAML strictly confined to the adapter (D-04 / CLAUDE.md) — the installer calls this, never reimplements YAML. Add to `module.exports` (`bob-adapter.cjs:197-204`). RESEARCH Open Question Q2 confirms no un-merge exists today.

---

### `test/installer/*.test.cjs` (test)

**Analog:** `test/merge.test.cjs` + `test/descriptor.test.cjs` (verified house style).

House-style elements to copy:
- Header: `'use strict'`; `require('node:test')`, `require('node:assert/strict')`, `node:fs`/`node:path`/`node:os`.
- Vendor resolution: `const { requireVendor, repoRoot } = require('../_helpers/vendor.cjs')` (path is `../` from `test/installer/`, so confirm relative depth — `vendor.cjs` computes `repoRoot` two levels up from `test/_helpers/`; a `test/installer/` file requires it as `require('../_helpers/vendor.cjs')`).
- Hermetic env injection: `descriptor.test.cjs:26-50` injects `{ env, home }` into resolvers — no live Bob.
- Scratch tmpdir: `os.tmpdir()` / `fs.mkdtempSync` for the `.bob/` target; transient output to `test/.tmp/` (gitignored).
- Golden byte-equality + `assert.deepEqual`; fail-loud via `assert.throws(/regex/)` (`merge.test.cjs:84-96`).
- Pre-seeded user fixtures (mirror `test/fixtures/custom_modes/user-seeded.yaml`) to assert idempotent-update preservation (`merge.test.cjs:48-53`).

---

### `package.json` MODIFY (config) + `.planning/ACCEPTANCE-CHECKLIST.md` (append)

`package.json`: add `bin: { "gsd-bob": "bin/gsd-bob.cjs" }`. `engines` (`node >=22.15.0`, `npm >=10`) and `test` script already set — do not change. No new runtime deps (installer path is `node:`-builtins only; `js-yaml` stays confined to the adapter).

`.planning/ACCEPTANCE-CHECKLIST.md`: append device-runnable AC steps (real `npx` install onto real `~/.bob`) using the existing `Cmd:`/`Expect:`/`Confirms:`/`Result:` schema, continuing the AC-NN numbering after AC-06.

## Shared Patterns

### Fail-loud, never silent (parity-first)
**Source:** `src/bob-adapter.cjs:82-95` (non-mapping root throws), RESEARCH Pattern 3 (parse-fail → warn, never clobber).
**Apply to:** `config-merge.cjs` (JSON parse failure → warn + skip), `stage.cjs` (mode merge propagates the adapter's throw), the new `unmergeCustomModes`.

### node:fs-only staging (dependency-free)
**Source:** CLAUDE.md "What NOT to Use"; `scripts/generate-support-roster.cjs:17-18`.
**Apply to:** every `src/installer/*` module. `readFileSync`/`writeFileSync`/`mkdirSync`/`rmSync`/`cpSync`/`existsSync`/`readdirSync` only. No `fs-extra`/`copyfiles`/`chalk`. `node:crypto` for sha256; `node:readline` for the prompt.

### Call the verified pieces, never reimplement
**Source:** RESEARCH "Don't Hand-Roll" + Architectural Responsibility Map.
**Apply to:** `mergeCustomModes`/`unmergeCustomModes`, `gateArtifact`/`buildSupportRoster` (`src/bob-adapter.cjs`), `getGlobalConfigDir` (`gsd-core/bin/lib/runtime-homes.cjs`), the bob converters (`gsd-core/bin/lib/runtime-artifact-conversion.cjs`), `scripts/generate-support-roster.cjs`.

### Hermetic, golden, scratch-tmpdir tests
**Source:** `test/_helpers/vendor.cjs`, `test/merge.test.cjs`, `test/descriptor.test.cjs`.
**Apply to:** all `test/installer/*.test.cjs` — inject env/home, scratch `.bob/` under `os.tmpdir()`, byte-equality + `assert.throws` for fail-loud paths.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/installer/manifest.cjs` | service/store | CRUD | gsd-core's installer is NOT vendored; no existing manifest/hash-diff code in-repo. Net-new linchpin — use `node:crypto` + JSON, RESEARCH Code Examples as the template. |
| `src/installer/report.cjs` | utility | transform | No in-repo reporting module; plain `console.log` buckets (written/skipped/removed). Closest is the `process.stdout.write` summary at `scripts/generate-support-roster.cjs:82`. |
| `src/installer/args.cjs` | utility | transform | No in-repo argv parser; convention is external (gsd-core `selectRuntimesFromArgs()`, documented in CLAUDE.md, not vendored). Hand-parse `process.argv`. |

## Metadata

**Analog search scope:** `src/`, `scripts/`, `test/`, `test/_helpers/`, `gsd-core/bin/lib/runtime-homes.cjs`, `package.json`.
**Files scanned:** `src/bob-adapter.cjs`, `scripts/generate-support-roster.cjs`, `test/_helpers/vendor.cjs`, `test/merge.test.cjs`, `test/descriptor.test.cjs`, `gsd-core/bin/lib/runtime-homes.cjs` (targeted), `package.json`.
**Pattern extraction date:** 2026-06-18
