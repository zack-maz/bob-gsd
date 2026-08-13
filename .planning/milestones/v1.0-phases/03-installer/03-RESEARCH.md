# Phase 3: Installer - Research

**Researched:** 2026-06-18
**Domain:** Net-new Node CLI installer (npx) orchestrating an already-built Bob emitter; idempotent manifest-tracked file staging into a simulated `.bob/` target
**Confidence:** HIGH (codebase grounded — every load-bearing claim verified by reading the live vendored source)

## Summary

Phase 3 builds a dependency-free Node CLI (`gsd-bob` bin) that stages whatever the `bob` runtime currently emits into a chosen scope (`<project>/.bob/` or `~/.bob/`), tracks every file it writes in a JSON manifest, and supports idempotent re-run (update) plus `--uninstall` (clean) without ever destroying user files. The emitter surface it orchestrates — `src/bob-adapter.cjs` (mode merge + gate + roster) and the vendored `gsd-core` converters/descriptor — is fully built and verified. The installer is a thin orchestrator: arg-parse, scope/path resolution, source enumeration, converter dispatch, manifest read/write/diff, and an end-of-run report. It never reimplements `mergeCustomModes`, `gateArtifact`, the path resolver, or the converters.

Two CONTEXT.md confirm-items resolved against live code, and **both invert an assumption in the locked design** — the planner must account for these:

1. **D-09 (vendored payload):** The full GSD Claude-command payload is **NOT vendored yet.** gsd-core's stagers (`stageCommandsForRuntimeFlat`, `stageSkillsForRuntimeAsSkills` in `install-profiles.cjs`) read from a `commands/gsd/` source directory (`DEFAULT_COMMANDS_DIR` = `<pkg-root>/commands/gsd`). **That directory does not exist in this repo.** What IS vendored is `gsd-core/workflows/` (upstream monorepo *workflow* source — `<purpose>`-tagged, no Claude command frontmatter), plus `templates/`, `references/`, `contexts/`. So in v1, Phase 3 has **no convertible command/skill roster to stage** beyond the structural pieces (the `gsd` mode + the vendored `gsd-core/` shim payload). The installer must be roster-agnostic (D-08) and stage what exists; the convertible-artifact roster lands when Phases 4–5 vendor `commands/gsd/` (or a workflow→command projection). **This is the single biggest planning input.**

2. **D-14 (descriptor text_mode):** The `bob` descriptor does **NOT** force `workflow.text_mode` at the runtime level. The descriptor (`capability-registry.cjs` `runtimes.bob`) has `configFormat: "none"` and declares no config-defaults override; the global default for `workflow.text_mode` is hard-coded `false` (`config-defaults.manifest.json:38`), and `config-loader.cjs` has no per-runtime text_mode override path. **Therefore the installer's `.planning/config.json` `text_mode:true` write is the SOLE guarantee, not reinforcement.** For global installs with no project `.planning/`, there is currently **no** text_mode default at all — a real gap the planner must surface (see Open Questions Q1).

**Primary recommendation:** Build the installer as a small CJS module set (arg-parse / scope-resolve / stage / manifest) using `node:fs`/`node:path`/`node:os` only, mirroring gsd-core's flag convention. Stage the three structural pieces (gsd mode merge, vendored `gsd-core/` payload, `.planning/config.json` text_mode). Drive the convertible-artifact loop off the descriptor's `artifactLayout` + a roster source that, in v1, is empty/minimal — and prove it scales by enumerating whatever source directory is configured. Treat the manifest as the sole source of truth for update/clean. Flag the D-14 global-scope text_mode gap to the user before locking.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Arg parsing (`--bob`/`--local`/`--global`/`-c`/`-u`/`--dry-run`/`--help`) | Installer CLI (net-new) | — | Hand-parsed `process.argv`, no framework (CLAUDE.md) |
| Scope → absolute path resolution | gsd-core descriptor (`runtime-homes.cjs`) | Installer (calls it) | Reuse `resolveConfigHomeFromDescriptor`/`getGlobalConfigDir`, never bespoke path math |
| Source-artifact enumeration | Installer (net-new) | gsd-core stagers (optional) | Installer reads source dir; converters are pure string→string |
| Claude→Bob conversion | gsd-core converters (`runtime-artifact-conversion.cjs`) | — | `convertClaudeCommandToBobSkill/Command` already built |
| `gsd` mode merge into `custom_modes.yaml` | adapter (`mergeCustomModes`) | Installer (calls it, reads/writes file) | Adapter owns merge; installer owns file IO + manifest entry |
| Gate/roster (unsupported flag-skip) | adapter (`gateArtifact`/`buildSupportRoster`) + `scripts/generate-support-roster.cjs` | Installer (invokes) | Roster generated, never hand-maintained (T-02-10) |
| `.planning/config.json` text_mode write | Installer (net-new merge logic) | — | Phase 2 handed this to Phase 3; sole text_mode guarantee (D-14) |
| Manifest read/write/diff (hash, kind, orphan) | Installer (net-new) | — | The linchpin; entirely new code |
| End-of-run report (written/skipped/removed) | Installer (net-new) | — | Plain `console.log` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in (Node ≥22.15.0) | All file staging: `readFileSync`/`writeFileSync`/`mkdirSync`/`rmSync`/`readdirSync`/`existsSync`/`cpSync` | gsd-core install/staging path is `node:fs`-only; dependency-free is the contribution-readiness + audit win (CLAUDE.md) `[CITED: CLAUDE.md "What NOT to Use"]` |
| `node:path` | built-in | Path join/resolve/relative; manifest paths relative to configHome | gsd-core `runtime-homes.cjs` uses only built-ins `[VERIFIED: gsd-core/bin/lib/runtime-homes.cjs]` |
| `node:os` | built-in | `homedir()`, `tmpdir()` for scratch tests | Same `[VERIFIED: runtime-homes.cjs:45]` |
| `node:crypto` | built-in | `createHash('sha256')` for the mandatory per-entry hash (D-02) | Built-in; no dependency. Hash the **bytes as written** `[ASSUMED — crypto API standard]` |
| `node:readline` (or `node:readline/promises`) | built-in | No-flag interactive scope prompt (D-11) | Installer is a plain Node CLI, not a Bob skill — readline is allowed (D-11) `[CITED: 03-CONTEXT.md D-11]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/bob-adapter.cjs` | in-repo | `emitGsdMode()`, `mergeCustomModes(existingText, entry)` | The installer **calls** these for the mode merge — never reimplements `[VERIFIED: src/bob-adapter.cjs]` |
| `gsd-core/bin/lib/runtime-homes.cjs` | vendored | `resolveConfigHomeFromDescriptor(configHome, {env,home,existsSync})`, `getGlobalConfigDir(runtime, explicitDir)` | Scope→path resolution for global scope + `-c`/`BOB_CONFIG_DIR` override `[VERIFIED: runtime-homes.cjs]` |
| `gsd-core/bin/lib/capability-registry.cjs` | vendored | `runtimes.bob.runtime` — the descriptor (`configHome`, `artifactLayout.{local,global}[]`) | Source of truth for `.bob` home + converter dispatch `[VERIFIED: capability-registry.cjs:3045-3108]` |
| `gsd-core/bin/lib/runtime-artifact-conversion.cjs` | vendored | `convertClaudeCommandToBobSkill`, `convertClaudeCommandToBobCommand` (pure string→string) | Convert-at-install (D-09) when a convertible source exists `[VERIFIED]` |
| `scripts/generate-support-roster.cjs` | in-repo | Regenerate `SUPPORT-ROSTER.md` from the gate | Roster step of the install flow; never hand-maintain `[VERIFIED]` |
| `js-yaml` | 4.1.0 (dep) | Confined to `bob-adapter.cjs` `mergeCustomModes` only | The installer entry MUST NOT require js-yaml (D, CLAUDE.md) `[VERIFIED: package.json + bob-adapter.cjs:19]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-parse `process.argv` | `commander`/`yargs`/`oclif` | NEVER for v1 — adds deps, diverges from gsd-core, hurts upstreamability `[CITED: CLAUDE.md]` |
| Installer's own enumeration loop | Reuse gsd-core `stageCommandsForRuntimeFlat(srcDir, profile, converter, prefix)` | gsd-core stagers expect a `commands/gsd/` source that is NOT vendored (see Pitfall 1); reusing them requires first vendoring that source. v1 likely rolls a tiny enumerator |
| Single JSON manifest (D-01) | Per-file sidecar hashes | D-01 locks single manifest at `<configHome>/.gsd-bob-manifest.json` `[CITED: 03-CONTEXT.md D-01]` |
| `node:crypto` sha256 | Store mtime/size | Hash of bytes-as-written is the only reliable "we own it, untouched" signal (D-02) `[CITED: D-02]` |

**Installation:**
```bash
# No new runtime deps to install — installer path is node built-ins only.
# js-yaml@4.1.0 is already a dependency (confined to bob-adapter).
# Phase 3 adds the bin map to package.json; end-user UX:
npx -y --package=@opengsd/gsd-bob@latest -- gsd-bob --bob --local
```

**Version verification:** No new third-party packages are introduced by this phase. `js-yaml@4.1.0` is already pinned in `package.json` and confined to the adapter. Node engine floor `>=22.15.0` is already set `[VERIFIED: package.json:6-9]`.

## Package Legitimacy Audit

This phase installs **no new external packages.** The installer path is `node:`-builtins-only by hard constraint (CLAUDE.md "What NOT to Use"); the only third-party dependency in the repo (`js-yaml@4.1.0`) was vetted in Phase 2 and is confined to `src/bob-adapter.cjs`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| js-yaml | npm | 10+ yrs | ~90M/wk | github.com/nodeca/js-yaml | OK | Pre-existing (Phase 2); not added by Phase 3 |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                          ┌──────────────────────────────┐
   npx gsd-bob --bob ...  │   bin/gsd-bob.cjs (entry)     │
   ───────────────────────▶  hand-parse process.argv     │
                          │  --bob/--local/--global/-c/   │
                          │  -u/--dry-run/--help          │
                          └───────────────┬──────────────┘
                                          │ resolved {scope, configHome, mode}
                          ┌───────────────▼──────────────┐
                          │  scope-resolve                │
                          │  global → runtime-homes.cjs   │
                          │   getGlobalConfigDir('bob',-c)│
                          │  local  → cwd/.bob            │
                          │  PRINT absolute target path   │◀── INSTALL-01 (always print)
                          └───────────────┬──────────────┘
                                          │
            ┌─────────────────────────────┼──────────────────────────────┐
            │ INSTALL / UPDATE (re-run)    │            UNINSTALL (-u)     │
            ▼                              │                               ▼
  ┌───────────────────┐                   │                  ┌──────────────────────────┐
  │ read manifest      │                  │                  │ read manifest             │
  │ (.gsd-bob-         │                  │                  │ for each entry:           │
  │  manifest.json)    │                  │                  │  file: hash match→delete  │
  └─────────┬─────────┘                   │                  │        differ→keep+warn   │
            │                             │                  │  merged: un-merge slice   │
  ┌─────────▼──────────────────────────┐  │                  │  delete manifest, prune   │
  │ STAGE structural (always):         │  │                  └──────────────────────────┘
  │  1. gsd mode → mergeCustomModes()  │  │
  │     → custom_modes.yaml  [merged]  │  │
  │  2. vendored gsd-core/ payload     │  │
  │     → cpSync               [file]  │  │
  │  3. .planning/config.json          │  │
  │     text_mode:true (MERGE) [merged]│◀─┼── D-13/D-14: SOLE text_mode guarantee
  └─────────┬──────────────────────────┘  │
  ┌─────────▼──────────────────────────┐  │
  │ STAGE convertible roster (D-08):   │  │
  │  enumerate source artifacts →      │  │
  │   gateArtifact() supported? →      │  │
  │    convertClaudeCommandToBob*()    │  │
  │     → .bob/{skills,commands} [file] │  │
  │   unsupported → buildSupportRoster │  │
  │     → SUPPORT-ROSTER.md            │  │
  │  (v1: source roster is empty/min — │  │
  │   Pitfall 1)                       │  │
  └─────────┬──────────────────────────┘  │
            │ per file entry: hash-collision policy (D-04)        │
            ▼                                                     │
  ┌─────────────────────────────────────┐                        │
  │ write/refresh manifest entries       │                        │
  │ orphan sweep (D-05) + prune empty    │                        │
  │ end-of-run report:                   │                        │
  │   written / skipped(user) / removed  │                        │
  └─────────────────────────────────────┘                        │
            │  --dry-run: print plan, write NOTHING ──────────────┘
```

### Recommended Project Structure
```
bin/
└── gsd-bob.cjs            # npx entry; arg-parse + dispatch (install/uninstall) + readline prompt
src/
├── bob-adapter.cjs        # EXISTING — emitGsdMode/mergeCustomModes/gate/roster (called, not edited)
└── installer/             # net-new (internal module layout is Claude's discretion, D-64)
    ├── args.cjs           # parseArgs(argv) → {scope, configHome, explicitDir, dryRun, uninstall, help}
    ├── scope.cjs          # resolveTarget(scope, explicitDir) via runtime-homes.cjs; cwd/.bob for local
    ├── manifest.cjs       # read/write/diff; sha256 of bytes; entry {path, sha256, kind}
    ├── stage.cjs          # structural + roster staging; collision policy (D-04); orphan sweep (D-05)
    ├── config-merge.cjs   # .planning/config.json deep-merge text_mode, parse-fail→warn (D-13)
    └── report.cjs         # written/skipped/removed buckets
test/
└── installer/             # node:test scratch-tmpdir .bob/ targets (D-15), mirrors test/_helpers/vendor.cjs
```

### Pattern 1: Scope → absolute path via the descriptor (never bespoke)
**What:** Resolve the install target through gsd-core's descriptor resolver so the installer's path logic == the runtime's path logic.
**When to use:** Resolving global scope and honoring `-c`/`BOB_CONFIG_DIR`.
**Example:**
```javascript
// Source: VERIFIED gsd-core/bin/lib/runtime-homes.cjs
const { getGlobalConfigDir } = require('../../gsd-core/bin/lib/runtime-homes.cjs');
// global scope: env override (BOB_CONFIG_DIR) → -c explicitDir → ~/.bob
const globalTarget = getGlobalConfigDir('bob', explicitDir /* from -c, or undefined */);
// → returns absolute path; honors BOB_CONFIG_DIR via the dot-home descriptor (verified)
// local scope: workspace .bob (NOT via descriptor — local is always cwd-relative)
const localTarget = require('node:path').join(process.cwd(), '.bob');
```
Note: `getGlobalConfigDir('bob', dir)` returns `expandTilde(dir)` immediately when `explicitDir` is truthy, else reads `runtimes.bob.runtime.configHome` (`dot-home`, name `.bob`, env `BOB_CONFIG_DIR`) `[VERIFIED: runtime-homes.cjs:215-232, capability-registry.cjs:3053-3059]`.

### Pattern 2: gsd mode merge — call the adapter, do the file IO yourself
**What:** Read existing `custom_modes.yaml` text, hand it to `mergeCustomModes`, write the result; record a `merged` manifest entry.
**Example:**
```javascript
// Source: VERIFIED src/bob-adapter.cjs (mergeCustomModes signature + semantics)
const { emitGsdMode, mergeCustomModes } = require('../bob-adapter.cjs');
const fs = require('node:fs');
const modesPath = path.join(configHome, 'custom_modes.yaml'); // confirm Bob's exact filename/location
let existing = '';
try { existing = fs.readFileSync(modesPath, 'utf8'); } catch { /* missing → '' */ }
// mergeCustomModes(existingYamlText, gsdModeEntry) → merged YAML text.
// - empty/undefined/null-root/comment-only → single gsd entry
// - preserves every non-gsd slug; replaces ONLY the slug === entry.slug ('gsd')
// - a differently-named gsd-* slug is RETAINED (slug-equality scoped)
// - THROWS (loud) if root parses to a sequence/scalar (non-mapping)
const merged = mergeCustomModes(existing, emitGsdMode());
fs.writeFileSync(modesPath, merged);
// manifest entry: { path: 'custom_modes.yaml', sha256: sha256(merged), kind: 'merged' }
```
`[VERIFIED: src/bob-adapter.cjs:77-111, test/merge.test.cjs]`

### Pattern 3: config.json text_mode MERGE (parse-fail → warn, never clobber)
**What:** Deep-merge only `workflow.text_mode: true` into the workspace-root `.planning/config.json`; preserve all user keys; on JSON parse failure warn and leave the file untouched (anti-pattern #22 / Phase 2 fail-loud).
**Example:**
```javascript
// Source: D-13 + VERIFIED gsd-core config-defaults.manifest.json (default text_mode:false)
const planningCfg = path.join(workspaceRoot, '.planning', 'config.json'); // ROOT-anchored (CORE-05)
let cfg = {};
let existedAndParsed = false;
try {
  const raw = fs.readFileSync(planningCfg, 'utf8');
  cfg = JSON.parse(raw); existedAndParsed = true;     // parse failure → catch → warn, do not write
} catch (e) {
  if (e.code !== 'ENOENT') { console.warn(`gsd-bob: ${planningCfg} did not parse — preserving as-is, not writing text_mode`); return; }
}
cfg.workflow = cfg.workflow && typeof cfg.workflow === 'object' ? cfg.workflow : {};
cfg.workflow.text_mode = true;       // gsd-owned key
fs.mkdirSync(path.dirname(planningCfg), { recursive: true });
fs.writeFileSync(planningCfg, JSON.stringify(cfg, null, 2) + '\n');
// manifest entry: { path: '<workspaceRoot>/.planning/config.json', sha256, kind: 'merged' }
```
Landmine: `.planning/` is **root-anchored at the workspace root** (CORE-05), NOT nested inside the scope dir — even for a global `~/.bob` install, `.planning/config.json` is the project's. `[CITED: 03-CONTEXT.md D-13, CORE-05]`

### Anti-Patterns to Avoid
- **Blindly scanning `.bob/` to decide what to remove:** D-03 — the manifest is the SOLE source of truth; anything absent from the manifest is a user file and is never touched.
- **Overwriting a user-edited tracked file on update:** D-04 — recompute on-disk hash; differ → skip + warn (no `.bak` in v1; `--force` deferred).
- **Deleting a `merged` entry on uninstall:** D-06 — `merged` entries are un-merged (slug/key slice removed), never deleted.
- **Pruning `.planning/`:** D-07 — uninstall NEVER touches `.planning/` except the gsd-owned key-slice of `config.json`.
- **Requiring `js-yaml` in the installer entry:** keep YAML strictly inside `bob-adapter.mergeCustomModes`; the installer reads/writes `custom_modes.yaml` as opaque text via the adapter.
- **Reusing gsd-core stagers against a non-existent source:** `stageCommandsForRuntimeFlat` expects `commands/gsd/` which is not vendored (Pitfall 1) — calling it with a missing dir is a silent no-op (`existsSync` guard returns the dir unchanged), masking the gap.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `custom_modes.yaml` slug-scoped merge | A YAML merge in the installer | `bob-adapter.mergeCustomModes` | Built, tested, fail-loud, slug-equality scoped (D-06) `[VERIFIED]` |
| `.bob` home resolution + `BOB_CONFIG_DIR`/tilde | Bespoke `path.join(homedir(), '.bob')` | `runtime-homes.getGlobalConfigDir('bob', dir)` | Descriptor-driven; honors override + tilde expansion (verified) |
| Claude→Bob frontmatter reduction + path/dialect neutralization | A new converter | `convertClaudeCommandToBob{Skill,Command}` | Built, golden-tested, strips unsupported keys, neutralizes `.claude`→`.bob` + `gsd:`→`gsd-` `[VERIFIED]` |
| Unsupported flag/skip + roster | Hardcoded skip list in installer | `gateArtifact` + `buildSupportRoster` + `scripts/generate-support-roster.cjs` | Generated, never hand-maintained (T-02-10) `[VERIFIED]` |
| Recursive copy of vendored payload | Manual walk | `fs.cpSync(src, dst, {recursive:true})` | Node built-in; gsd-core stages with `cpSync` |

**Key insight:** The hard logic (merge, gate, conversion, path resolution) is already built and tested. The genuinely net-new code is the **manifest** (read/write/diff/hash/orphan) and the **arg-parse + scope-resolve + report** shell. Keep the net-new surface small and let the verified pieces do the load-bearing work.

## Runtime State Inventory

Not a rename/refactor/migration phase. **Omitted** — this is a net-new installer building new code, not mutating existing runtime state. The closest analog (the manifest's job of tracking on-disk state) is the phase's core deliverable, fully covered in the patterns above.

## Common Pitfalls

### Pitfall 1: There is no convertible command/skill source vendored yet (D-09 reality)
**What goes wrong:** The plan assumes the installer enumerates a full GSD command/skill roster and converts it. In this repo there is **no `commands/gsd/`, no `agents/`, no `skills/` source.** Only `gsd-core/workflows/` (upstream workflow *source*, `<purpose>`-tagged, no Claude command frontmatter), `templates/`, `references/`, `contexts/` are vendored.
**Why it happens:** gsd-core's own stagers resolve `DEFAULT_COMMANDS_DIR = <pkg-root>/commands/gsd` (`install-profiles.cjs:114`); that directory is produced upstream from the workflows at publish time and is absent from the vendored payload here. `gsd-core/workflows/*.md` are NOT the same artifact — they have no `---` frontmatter (verified: `workflows/help.md` opens with `<purpose>`).
**How to avoid:** Plan the installer as roster-agnostic (D-08): drive the convertible loop off the descriptor's `artifactLayout` against a **configurable source directory**, and in v1 accept that the convertible roster is empty or minimal. The three structural pieces (gsd mode merge, vendored `gsd-core/` payload copy, `.planning/config.json` text_mode) are what v1 actually stages and what the SC#2 "working `.bob/` layout end-to-end" test asserts. Phases 4–5 vendor `commands/gsd/` (or add a workflow→command projection); the same install path then picks them up with zero installer changes. **The planner MUST NOT write a task that depends on converting a roster that does not exist.**
**Warning signs:** A staging step that calls `stageCommandsForRuntimeFlat(srcCommandsDir, ...)` and silently stages nothing because `existsSync(srcCommandsDir)` is false.
`[VERIFIED: install-profiles.cjs:114,585-587; absence of commands/agents/skills dirs confirmed by find]`

### Pitfall 2: The bob descriptor does NOT enforce text_mode (D-14 inverted)
**What goes wrong:** The plan treats the `.planning/config.json` text_mode write as belt-and-suspenders reinforcement of a descriptor-level default. It is not — it is the **only** mechanism.
**Why it happens:** `runtimes.bob.runtime` has `configFormat: "none"` and no config-defaults block; `config-defaults.manifest.json` hard-codes `workflow.text_mode: false`; `config-loader.cjs` resolves text_mode from project/global config.json with that `false` fallback and has **no per-runtime override path** (verified all four `text_mode` references). For a **global** `~/.bob` install with no project `.planning/`, text_mode currently defaults to `false` everywhere.
**How to avoid:** Make the `.planning/config.json` write load-bearing and unconditional for local installs. For global installs, **surface the gap to the user** (Open Question Q1) — options: (a) accept text_mode is only guaranteed per-project (document it), or (b) add a `bob`-runtime config default upstream (out of v1 installer scope). Do NOT claim the descriptor guarantees text_mode in any plan or AC step.
**Warning signs:** An AC step or plan note asserting "text_mode holds even with no project config.json via the descriptor."
`[VERIFIED: capability-registry.cjs:3052-3108, config-defaults.manifest.json:38, config-loader.cjs:107/557/663]`

### Pitfall 3: sha256 must hash bytes-as-written, not the source
**What goes wrong:** Hashing the pre-conversion source (or a normalized form) means a re-run recomputes a different on-disk hash than what was recorded, falsely flagging gsd-bob's own files as "user-modified" and skipping them forever.
**How to avoid:** Compute the manifest hash from the exact byte buffer passed to `writeFileSync` (post-conversion, post-merge). On update, recompute the hash by reading the file back and comparing to the recorded value (D-04). Be deterministic: `JSON.stringify(cfg, null, 2) + '\n'` and `yaml.dump(...)` must be byte-stable across runs (they are — verified merge idempotency in `test/merge.test.cjs`).
`[CITED: 03-CONTEXT.md D-02]`

### Pitfall 4: `merged` vs `file` distinction drives uninstall correctness
**What goes wrong:** Treating `custom_modes.yaml` or `.planning/config.json` as a `file` entry and deleting it on uninstall destroys user modes/keys.
**How to avoid:** Two and only two `merged` targets (D-06): `custom_modes.yaml` (un-merge gsd/gsd-* slugs — the adapter would need an un-merge counterpart to `mergeCustomModes`; **note: `bob-adapter.cjs` exports a merge but NO un-merge function today** — see Open Question Q2) and `.planning/config.json` (remove only gsd-owned keys). Everything else gsd-bob writes is a `file`.
**Warning signs:** Uninstall test shows a user mode or user config key missing after `--uninstall`.
`[VERIFIED: bob-adapter.cjs exports — no removeCustomModes/un-merge present]`

### Pitfall 5: js-yaml drops comments on re-emit
**What goes wrong:** Users expect comments in `custom_modes.yaml` preserved across a merge; `yaml.dump` drops them.
**How to avoid:** This is a documented, accepted invariant (SUPPORT-ROSTER.md caveat) — slug-level idempotency, not comment fidelity. Don't write a test asserting comment preservation. Surface in the README (UP-02, Phase 5).
`[VERIFIED: SUPPORT-ROSTER.md, bob-adapter.cjs:71-73]`

### Pitfall 6: prune only directories the installer created, and never `.planning/`
**What goes wrong:** Pruning a now-empty `~/.bob/` directory that the user created, or pruning `.planning/`.
**How to avoid:** D-05/D-06 — after removing files, prune empty dirs the installer created (track created dirs, or only prune dirs under the scope target that contain solely installer-tracked paths). `.planning/` is never pruned (D-07).
`[CITED: 03-CONTEXT.md D-05/D-06/D-07]`

## Code Examples

### sha256 of bytes-as-written (the manifest hash)
```javascript
// Source: node:crypto standard API
const crypto = require('node:crypto');
function sha256(buf) {                       // buf = exact bytes passed to writeFileSync
  return crypto.createHash('sha256').update(buf).digest('hex');
}
const bytes = Buffer.from(convertedContent, 'utf8');
fs.writeFileSync(destPath, bytes);
const entry = { path: relPath, sha256: sha256(bytes), kind: 'file' };
```

### Update collision policy (D-04) per `file` entry
```javascript
// Source: D-04 (03-CONTEXT.md)
function classifyOnUpdate(entry, freshBytes) {
  if (!fs.existsSync(entry.absPath)) return 'rewrite';           // missing → rewrite
  const onDisk = sha256(fs.readFileSync(entry.absPath));
  if (onDisk === entry.sha256) return 'overwrite';              // we own it, unchanged
  return 'skip-warn';                                           // user edited → preserve + warn
}
```

### Manifest shape (D-01/D-02)
```jsonc
{
  "schemaVersion": 1,
  "gsdBobVersion": "0.1.0",
  "scope": "local",                              // "local" | "global"
  "configHome": "/abs/path/.bob",
  "generatedAt": "2026-06-18T00:00:00.000Z",
  "entries": [
    { "path": "custom_modes.yaml", "sha256": "…", "kind": "merged" },
    { "path": "skills/gsd-help/SKILL.md", "sha256": "…", "kind": "file" }
    // .planning/config.json entry path is workspace-root-anchored, not under configHome
  ]
}
```
`[CITED: 03-CONTEXT.md D-01/D-02; field names are Claude's discretion]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gsd-core legacy `/gsd:<cmd>` colon command form | `gsd-<cmd>` hyphen form | #2808 | Converters already translate `gsd:`→`gsd-` (verified); installer inherits hyphen form |
| Separate `--clean`/`--update` flags (hypothetical) | re-run = update; `--uninstall`+install = clean | gsd-core convention | No new flags; mirror exactly (CLAUDE.md) |
| Hand-maintained support roster | Generated from the gate (T-02-10) | Phase 2 | Install flow regenerates `SUPPORT-ROSTER.md` |

**Deprecated/outdated:**
- The legacy `/gsd:<cmd>` colon dialect — emitted artifacts must use the hyphen form (converters enforce this).

## Project Constraints (from CLAUDE.md)

- **Dependency-free install/staging path:** `node:fs`/`node:path`/`node:os` only; CJS. No `fs-extra`/`copyfiles`/`cpy`/`chalk`/`ora`.
- **No CLI framework:** hand-parse `process.argv` exactly as gsd-core's `selectRuntimesFromArgs()` does. No `commander`/`oclif`/`yargs`.
- **No `js-yaml` in the installer entry:** YAML stays confined to `bob-adapter.cjs`.
- **No new `--clean`/`--update` flags:** re-run = update; `--uninstall`+install = clean.
- **Hyphen command form only** (`gsd-<cmd>`); never the colon form.
- **Backend-agnostic:** no Claude/Gemini/Granite/model references; never depend on `@anthropic-ai/claude-agent-sdk` in the Bob path.
- **Engines:** `node >=22.15.0`, `npm >=10` (already set).
- **Mirror gsd-core flags:** `--bob`, `--local`/`-l`, `--global`/`-g`, `--config-dir`/`-c`, `--uninstall`/`-u`, `--dry-run`, `--help`.
- **`.planning/` root-anchored** (CORE-05), never nested in the scope dir.
- **Fail-loud, never silent** (Phase 2 D-12 / TRANS-04/05): invalid config.json or non-mapping YAML → warn and preserve, never clobber.
- **GSD workflow enforcement:** route file-changing work through a GSD command.

## Validation Architecture

> `workflow.nyquist_validation` defaults to `true` (config-defaults.manifest.json:31) and is not disabled in this repo — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in) + `node:assert/strict` |
| Config file | none — `package.json` script `"test": "node --test \"test/**/*.test.cjs\""` `[VERIFIED: package.json:11]` |
| Quick run command | `node --test test/installer/manifest.test.cjs` |
| Full suite command | `npm test` |

House style (verified from `test/`): require vendored gsd-core modules through `test/_helpers/vendor.cjs` (`requireVendor`, `repoRoot`); fixtures under `test/fixtures/<area>/`; hermetic — inject `{env, home, existsSync}` into resolvers, use `os.tmpdir()`/`fs.mkdtempSync` for scratch `.bob/`; golden byte-equality assertions; `assert.throws(/regex/)` for fail-loud paths. Transient test output goes to `test/.tmp/` (gitignored) `[VERIFIED: test/_helpers/vendor.cjs, test/merge.test.cjs, test/command-golden.test.cjs, .gitignore]`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INSTALL-01 | Single install command stages into resolved target; absolute path printed before write | unit | `node --test test/installer/install-clean.test.cjs` | ❌ Wave 0 |
| INSTALL-02 | local vs global scope resolution (`getGlobalConfigDir('bob', -c)`, cwd/.bob); `BOB_CONFIG_DIR` honored | unit | `node --test test/installer/scope.test.cjs` | ❌ Wave 0 |
| INSTALL-03 | Clean install onto fresh scratch `.bob/` produces working layout end-to-end (gsd mode + payload + config.json) | unit | `node --test test/installer/install-clean.test.cjs` | ❌ Wave 0 |
| INSTALL-04 | Re-run idempotent: pre-seeded user command/rule/`gsd-*` mode preserved, no duplication | unit | `node --test test/installer/idempotent-update.test.cjs` | ❌ Wave 0 |
| INSTALL-05 | Manifest tracks every written file; update/clean only touch tracked files; user files never orphaned/overwritten | unit | `node --test test/installer/manifest.test.cjs` | ❌ Wave 0 |
| (D-06) | Uninstall un-merges `merged` slices, deletes only matching `file` entries, leaves user data + `.planning/` | unit | `node --test test/installer/uninstall.test.cjs` | ❌ Wave 0 |
| (D-12) | `--dry-run` prints plan, writes nothing | unit | `node --test test/installer/dry-run.test.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the specific `node --test test/installer/<file>.test.cjs` for the task
- **Per wave merge:** `npm test` (full suite, includes Phase 2 golden/equivalence tests — must stay green)
- **Phase gate:** `npm test` green + appended AC steps before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/installer/scope.test.cjs` — INSTALL-02 (scope/path resolution, BOB_CONFIG_DIR, -c)
- [ ] `test/installer/install-clean.test.cjs` — INSTALL-01/03 (clean layout, path-printed)
- [ ] `test/installer/idempotent-update.test.cjs` — INSTALL-04 (pre-seeded user files preserved)
- [ ] `test/installer/manifest.test.cjs` — INSTALL-05 (hash/kind/orphan, manifest-vs-filesystem)
- [ ] `test/installer/uninstall.test.cjs` — D-06/D-07 (un-merge, leave user data + `.planning/`)
- [ ] `test/installer/dry-run.test.cjs` — D-12 (no writes)
- [ ] Shared scratch-`.bob/` fixture helper (extends `test/_helpers/vendor.cjs` pattern) — tmpdir seed/teardown
- [ ] Framework install: none — `node:test` is built-in

## Security Domain

> `workflow.security_enforcement` defaults to `true` (config-defaults.manifest.json) — section included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local install tool; no auth surface |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Operates on the invoking user's own filesystem |
| V5 Input Validation | yes | Validate/sanitize `-c`/`BOB_CONFIG_DIR` paths; reject path traversal escaping the scope target; parse-fail on config.json → warn, never clobber (D-13) |
| V6 Cryptography | yes (non-secret) | sha256 via `node:crypto` for integrity/ownership detection only — NOT a security primitive; do not hand-roll a hash |
| V12 File/Resource | yes | Only write under the resolved scope target + workspace `.planning/`; never delete untracked files (manifest-as-truth, D-03); prune only installer-created dirs |

### Known Threat Patterns for a filesystem installer
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `-c`/`BOB_CONFIG_DIR` writing outside intended scope | Tampering | Resolve to absolute, validate target is a directory the user owns; print target before writing (INSTALL-01) so the user sees where it lands |
| Clobbering user-authored modes/config | Tampering / Repudiation | Slug/key-scoped merge (D-06), hash-gated overwrite (D-04), manifest-as-truth (D-03) |
| Orphaning/deleting user files on uninstall | Tampering | Only `file` entries with matching hash deleted; `merged` un-merged; `.planning/` untouched (D-06/D-07) |
| Arbitrary-tag YAML execution | Tampering | js-yaml v4 SAFE schema (default) — does not execute tags (verified Phase 2 control, confined to adapter) |
| Symlink in scope target redirecting a write | Tampering | Consider `fs` writes that don't follow malicious symlinks for tracked paths (low risk for a user-local tool; note for hardening) |

## Sources

### Primary (HIGH confidence — read directly this session)
- `src/bob-adapter.cjs` — `emitGsdMode`, `mergeCustomModes(existingText, entry)` semantics (slug-equality scoped, fail-loud non-mapping), `gateArtifact`, `buildSupportRoster`, no un-merge export.
- `gsd-core/bin/lib/capability-registry.cjs:3045-3108` — `runtimes.bob` descriptor: `configHome {dot-home, .bob, BOB_CONFIG_DIR}`, `configFormat:"none"`, `artifactLayout` (skills+commands, converters, `gsd-` prefix), `installSurface: profile-marker-only`. NO config-defaults/text_mode.
- `gsd-core/bin/lib/runtime-homes.cjs` — `resolveConfigHomeFromDescriptor`, `getGlobalConfigDir('bob', explicitDir)`, tilde expansion, dot-home env-override resolution.
- `gsd-core/bin/lib/runtime-artifact-conversion.cjs:674-803` — bob converters (pure string→string; frontmatter whitelist; `.claude`→`.bob` + `gsd:`→`gsd-` neutralization).
- `gsd-core/bin/lib/install-profiles.cjs:109-114,585-618` — `DEFAULT_COMMANDS_DIR = <pkg>/commands/gsd`; `stageCommandsForRuntimeFlat(srcDir, profile, converter, prefix)` reads a `commands/gsd/` source (absent from vendored payload).
- `gsd-core/bin/shared/config-defaults.manifest.json:38` — `workflow.text_mode: false` (global default).
- `gsd-core/bin/lib/config-loader.cjs:107,557,663` — text_mode resolved from config.json with `false` fallback; no per-runtime override.
- `gsd-core/bin/lib/runtime-config-adapter-registry.cjs` — `resolveInstallPlan('bob')` (profile-marker-only, no settings file).
- `package.json` — engines `>=22.15.0`, CJS, `js-yaml@4.1.0` sole dep, no `bin` map (Phase 3 adds it), test script.
- `test/_helpers/vendor.cjs`, `test/merge.test.cjs`, `test/command-golden.test.cjs`, `test/descriptor.test.cjs` — house test style (vendor resolver, fixtures, hermetic env injection, golden byte-equality, fail-loud `assert.throws`).
- `.planning/ACCEPTANCE-CHECKLIST.md` — AC-NN schema (`Cmd:`/`Expect:`/`Confirms:`/`Result:`), read-only safety invariant, append convention (currently AC-01..AC-06).
- Repo `find` — confirmed NO `commands/`, `agents/`, or `skills/` source dirs.

### Secondary (MEDIUM confidence)
- `.planning/phases/03-installer/03-CONTEXT.md` (locked D-01..D-15) and `.planning/REQUIREMENTS.md` (INSTALL-01..05), `.planning/STATE.md`.

### Tertiary (LOW confidence)
- CLAUDE.md Bob docs synthesis for exact `custom_modes.yaml` on-disk filename/location under a global `.bob` (assumed `~/.bob/settings/custom_modes.yaml` per CLAUDE.md table vs `~/.bob/custom_modes.yaml` elsewhere — see Open Question Q3).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact on-disk path of `custom_modes.yaml` under a `.bob` home is `<configHome>/custom_modes.yaml` (CLAUDE.md table says `~/.bob/settings/custom_modes.yaml`) | Pattern 2, Q3 | Mode merge writes to the wrong path → Bob ignores the gsd mode; planner must pin this against CAPABILITY-MAP §2 |
| A2 | The v1 convertible roster source is empty/minimal (no `commands/gsd/`), so SC#2 "working layout" = structural pieces only | Pitfall 1, Summary | If a roster source IS expected to exist, the staging loop has more to do; verified absent, so risk low |
| A3 | sha256 of post-conversion bytes is byte-stable across runs (yaml.dump/JSON.stringify deterministic) | Pitfall 3 | False "user-modified" skips on every update; merge idempotency test supports stability |
| A4 | `node:crypto` sha256 is acceptable for the manifest hash | Code Examples | None material — standard built-in |
| A5 | Local install's `.planning/config.json` lives at `process.cwd()/.planning/` (workspace root == cwd) | Pattern 3 | For nested invocations, workspace root detection may be needed (gsd-core has `project-root.cjs`); planner may reuse it |

## Open Questions (RESOLVED)

1. **Global-scope text_mode has no default (D-14 gap).**
   - What we know: descriptor declares no text_mode; manifest default is `false`; the only write is the per-project `.planning/config.json`. A global `~/.bob` install with no project `.planning/` gets `text_mode:false`.
   - What's unclear: whether v1 accepts "text_mode guaranteed per-project only" or wants a runtime-level default (would touch the descriptor/config-loader — beyond the installer's net-new scope and arguably an upstream change).
   - Recommendation: Confirm with the user. Default stance: document that text_mode is enforced per-project via the installer's config.json write; a descriptor-level default is a follow-up (possibly the upstream PR, MERGE-01). Do NOT assert descriptor-level enforcement in any AC step.
   - **RESOLVED (Plan 04, Task 1):** Accepted "per-project only." The installer's `.planning/config.json` text_mode write is the SOLE guarantee and is written ONLY when `<workspaceRoot>/.planning/` already exists; a global install in a non-project cwd SKIPS the write (no stray `.planning/config.json`) and emits a KNOWN-LIMITATION note. No AC asserts descriptor-level enforcement (Plan 04 Task 3 negative gate). A descriptor-level default is deferred to the upstream PR (MERGE-01), out of v1 installer scope.

2. **No un-merge function exists in `bob-adapter.cjs` for `custom_modes.yaml` uninstall.**
   - What we know: the adapter exports `mergeCustomModes` but no `removeCustomModes`/un-merge. D-06 requires uninstall to remove gsd/gsd-* slugs while preserving everything else.
   - What's unclear: whether the un-merge belongs in the adapter (consistent with "merge lives in adapter, installer calls it", Phase 2 D-06) or is new installer code.
   - Recommendation: Add an `unmergeCustomModes(existingText, ownedSlugs)` to `bob-adapter.cjs` (mirror the merge's fail-loud + slug-equality semantics) so the installer calls it rather than reimplementing YAML handling. The planner should scope a small adapter addition, keeping YAML confined to the adapter.
   - **RESOLVED (Plan 01, Task 1):** `unmergeCustomModes(existingYamlText, ownedSlugs)` is added to `src/bob-adapter.cjs` as the slug-removing sibling of `mergeCustomModes` (same fail-loud non-mapping discipline, slug-equality scoping, user-slug preservation, idempotency), keeping YAML strictly inside the adapter. Plan 04's uninstall path calls it (`key_links: bin/gsd-bob.cjs → unmergeCustomModes`).

3. **Exact `custom_modes.yaml` location/filename under a `.bob` home.**
   - What we know: CLAUDE.md's Bob table says `~/.bob/settings/custom_modes.yaml` (IDE); CONTEXT.md canonical refs cite `bob.ibm.com/docs/ide/configuration/custom-modes`.
   - What's unclear: whether it is `<configHome>/custom_modes.yaml` or `<configHome>/settings/custom_modes.yaml`, and the local-scope equivalent.
   - Recommendation: Pin against `01-CAPABILITY-MAP.md` §2 (adjacent-surface contract) during planning; the merge path must match Bob's documented location exactly or Bob ignores the mode.
   - **RESOLVED (Plans 03 & 04):** Pinned to `<configHome>/custom_modes.yaml` (i.e. `<target>/custom_modes.yaml`) per `01-CAPABILITY-MAP.md` §2 (HIGH confidence — at the `.bob` home root, NOT under `settings/`). The CLAUDE.md `settings/` form is superseded by the CAPABILITY-MAP contract. Plan 03's stage writes/reads exactly this path; the clean-stage AC asserts `<target>/custom_modes.yaml` exists with one `slug: gsd`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Installer runtime + tests | ✓ (engines ≥22.15.0) | per dev machine | — |
| `node:test` | Dev verification (D-15) | ✓ built-in | — | — |
| `node:crypto` | Manifest sha256 | ✓ built-in | — | — |
| js-yaml | Adapter merge (already present) | ✓ | 4.1.0 | — |
| Live IBM Bob | Real install verification | ✗ (never on dev device) | — | Scratch tmpdir `.bob/` tests (D-15) + appended AC steps run in Phase 6 |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Live Bob — fully covered by the test-deferred model (scratch `.bob/` + Phase 6 on-device AC).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every recommended module read directly from the vendored source this session.
- Architecture / orchestration contract: HIGH — converter, merge, gate, and path-resolver signatures verified against live code and tests.
- D-09 payload reality: HIGH — absence of `commands/gsd/` confirmed by `find` + `DEFAULT_COMMANDS_DIR` read.
- D-14 text_mode: HIGH — descriptor + manifest default + config-loader all read; conclusively the sole guarantee.
- Open Questions (custom_modes.yaml path, un-merge, global text_mode policy): MEDIUM — require user/CAPABILITY-MAP confirmation, flagged.

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stable — vendored payload is committed and not fast-moving; revalidate if the vendored `gsd-core/` is bumped or `commands/gsd/` is added)
