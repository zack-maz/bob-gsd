# Phase 3: Installer - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A single `npx` command stages gsd-bob into a Bob environment at a chosen scope, with update and clean operations that never destroy user customizations — all verifiable against a simulated/scratch `.bob/` target without a live Bob (test-deferred principle).

**In scope (INSTALL-01..05):**
1. A single `npx` command installs gsd-bob; user selects **local** (`<project>/.bob/`) vs **global** (`~/.bob/`) scope; the resolved absolute target path is **printed before writing** (INSTALL-01, INSTALL-02).
2. A clean install onto a fresh scratch environment produces a working `.bob/` GSD layout matching the emitter contract end-to-end (INSTALL-03).
3. Re-running the installer **updates** idempotently, preserving user-authored commands, rules, and `gsd-*` mode entries without duplication (INSTALL-04).
4. The installer tracks **every file it writes via a manifest**, so update/clean only ever touch tracked files and never blindly overwrite or orphan user files (INSTALL-05).

**This phase builds the staging machinery**, not the full skill roster (Phase 4 = core loop, Phase 5 = quality gates). The installer is roster-agnostic: it stages whatever the `bob` runtime currently emits and scales automatically as later phases port more artifacts.

**Locked upstream — do NOT re-decide:**
- **Flag convention** (CLAUDE.md): mirror gsd-core exactly — `--bob`, `--local`/`-l`, `--global`/`-g`, `--config-dir`/`-c`, `--uninstall`/`-u`, `--dry-run`, `--help`. **No** `--clean`/`--update` flags. Re-run = update; `--uninstall` then install = clean.
- **Dependency-free install/staging path**: `node:fs`/`node:path`/`node:os` only; CJS. `js-yaml` stays confined to the adapter's `mergeCustomModes`, never the installer entry.
- **`custom_modes.yaml` merge is already built** (Phase 2 D-04/D-05): slug-scoped, preserves non-`gsd`/`gsd-*` modes, fails loud on non-mapping YAML root. The installer **calls** `mergeCustomModes`, never reimplements it.
- **The `gsd` mode + converters live in the adapter/gsd-core layer** (Phase 2 D-06/D-07). The installer orchestrates and stages; the adapter emits.
- **`.planning/` is root-anchored** at the workspace root next to `.bob/` (CORE-05) — never nested inside the scope dir.

</domain>

<decisions>
## Implementation Decisions

> **Discussion mode:** User selected all four gray areas and delegated every decision ("auto for everything"). The decisions below are Claude's recommendations, grounded in the locked Phase 1/2 decisions, CLAUDE.md constraints, and gsd-core conventions. Each is a confirm-or-adjust point for the user; none re-litigate Phase 1/2 locks.

### Manifest design (INSTALL-05 — the linchpin)
- **D-01:** **Single JSON manifest** written to the install-target root as a hidden dotfile: project scope → `<project>/.bob/.gsd-bob-manifest.json`; global scope → `~/.bob/.gsd-bob-manifest.json`. Top-level schema: `{ schemaVersion, gsdBobVersion, scope, configHome, generatedAt, entries[] }`.
- **D-02:** Each entry is `{ path, sha256, kind }`. `sha256` is the hash of the **bytes as written** and is **MANDATORY** — it is the mechanism that distinguishes "gsd-bob wrote this and it is untouched" from "the user edited it." `kind` ∈:
  - **`file`** — fully owned; safe to overwrite on update and delete on uninstall (subject to the hash check).
  - **`merged`** — gsd-bob owns only a *slice* of the file (the `gsd`/`gsd-*` slugs of `custom_modes.yaml`; the gsd-owned keys of `.planning/config.json`). **Never deleted**; un-merged on uninstall.
- **D-03:** The manifest is the **single source of truth** for update/clean. The filesystem is never scanned blindly. Anything absent from the manifest is, by definition, a user file → **never touched**.

### Update / uninstall safety (INSTALL-04 + clean = uninstall+install)
- **D-04:** **Update (re-run) collision policy** per tracked `file` entry — recompute the on-disk hash:
  - on-disk hash **matches** manifest → gsd-bob owns it, unchanged → **overwrite** with freshly converted content, refresh the recorded hash.
  - on-disk hash **differs** → user edited it → **skip and warn** (collect into an end-of-run "preserved (user-modified)" report). No `.bak` proliferation in v1; `--force` to override is a **deferred idea**.
  - on-disk **missing** → rewrite. New emitted artifacts absent from the manifest → write + add entry.
- **D-05:** **Orphan handling on update** — entry in the manifest but no longer emitted by the current converter: if the on-disk hash still matches (we own it, now orphaned) → remove + drop the entry; if it differs (user adopted/edited it) → leave + warn. Prune now-empty directories the installer created.
- **D-06:** **Uninstall (`--uninstall`)** removes only `file` entries whose hash matches; user-modified tracked files are left + warned. `merged` entries are **un-merged, never deleted**: `custom_modes.yaml` → adapter removes `gsd`/`gsd-*` slugs and rewrites preserving everything else; `.planning/config.json` → remove only gsd-owned keys, preserve user keys. Then delete the manifest and prune empty installer-created dirs.
- **D-07:** **`.planning/` is NEVER deleted or pruned by uninstall** — it is user/project artifact data (the entire point of GSD), not gsd-bob program files. Uninstall touches only `.bob/` program artifacts plus the `.planning/config.json` key-slice.

### What v1 stages (INSTALL-03, SC#2 "working `.bob/` layout end-to-end")
- **D-08:** The installer is **roster-agnostic**: it enumerates whatever the `bob` runtime currently emits (gsd-core command/skill roster → bob converter → `gateArtifact` gate), stages the **supported** artifacts, and routes the skipped ones to `SUPPORT-ROSTER.md` (`buildSupportRoster`). No hardcoded skeleton, no Phase-4 dependency — as Phases 4–5 mature the converter/roster, the same install path picks up more artifacts with **zero installer changes**.
- **D-09:** **Convert at install time** from the vendored GSD payload (mirrors gsd-core) — do **not** vendor pre-converted `.bob/` artifacts. Single source of truth, decoupled from publish, keeps the vendored install diff equal to the future upstream PR diff (UP-01 "move, not a rewrite"). **Researcher confirm-item:** confirm exactly which GSD payload (skill/command/workflow source) is vendored under gsd-bob today and how the `bob` runtime enumerates it; if the full payload is not vendored yet, Phase 3 stages what exists and the mechanism scales.
- **D-10:** **Structural pieces the installer always stages** regardless of roster size: (1) the `gsd` custom mode merged into `custom_modes.yaml` via `mergeCustomModes`; (2) the vendored gsd-core payload so `node gsd-core/bin/gsd-tools.cjs` resolves under Bob (the SPIKE-03 shell-out seam); (3) `.planning/config.json` text_mode (see D-13).

### Install UX + config.json (INSTALL-01/02 + Phase 2 handoff)
- **D-11:** **No-flag scope → interactive readline prompt** (mirrors gsd-core "no runtime flag → interactive prompt"). The installer is a plain Node CLI, **not** a Bob skill, so Bob's no-structured-prompts constraint does **not** apply to the installer process — readline is fine. Default-highlighted choice = **local** (project-scoped, least invasive). `--local`/`--global` skip the prompt.
- **D-12:** **Always print the resolved absolute target path before any write** (INSTALL-01 explicit). `--dry-run` prints the full staging plan (files to write/skip/remove, mode merge, config merge) and exits without writing. Print-then-proceed for explicit-flag runs; the interactive scope prompt is the gate for no-flag runs — no extra confirmation prompt beyond that.
- **D-13:** **config.json ownership** — the installer writes `workflow.text_mode: true` into the **project-root** `.planning/config.json` (Phase 2 explicitly handed this to Phase 3), by **MERGE not overwrite**: read existing JSON, set only gsd-bob-owned keys, preserve all user keys; on parse failure **warn and do not clobber** (anti-pattern #22). Tracked as a `merged` manifest entry. `.planning/` is written at the **workspace root** (CORE-05), not inside the scope dir.
- **D-14:** **text_mode belt-and-suspenders for global scope** — the **primary** mechanism is the `bob` descriptor declaring no structured-prompt capability (Phase 2 D-09), so text_mode holds even for a global install with no project `config.json`; the per-project `.planning/config.json` write (D-13) is explicit local reinforcement. **Researcher confirm-item:** confirm the `bob` descriptor already forces text_mode at the runtime level; if so the config.json write is reinforcement, not the sole guarantee. (Global installs have no single project `.planning/`, so the descriptor-level default is load-bearing there.)

### Verification approach (cross-cutting, no live Bob)
- **D-15:** Dev-time verification = `node:test` against a **scratch tmpdir `.bob/` target**: clean-install layout assertion (SC#2), idempotent re-run preserving pre-seeded user files — commands, rules, `gsd-*` modes (SC#3 / INSTALL-04), manifest-vs-filesystem assertions (SC#4 / INSTALL-05), and uninstall-leaves-user-data assertions. Append device-runnable AC steps to `.planning/ACCEPTANCE-CHECKLIST.md` per the Phase 1 D-07 convention (real `npx` install onto a real `~/.bob`).

### Claude's Discretion
- Exact manifest schema field names and the dotfile name (`.gsd-bob-manifest.json` proposed).
- Internal installer module layout (arg-parse / scope-resolve / stage / manifest-write separation).
- Readline prompt copy and the format of the end-of-run "preserved / written / removed" report.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Project planning contract
- `.planning/ROADMAP.md` §"Phase 3: Installer" — the 4 Success Criteria and the test-deferred cross-cutting principle.
- `.planning/REQUIREMENTS.md` §"Installer" (INSTALL-01..05) — the 5 requirements this phase covers.
- `.planning/PROJECT.md` §Constraints, §Key Decisions — dependency-free install path, vendoring-then-upstream, parity-first, no-local-Bob test-deferred development.

### Phase 1/2 input contract (source of truth for what the installer stages and calls)
- `.planning/phases/02-runtime-foundation-artifact-translation/02-CONTEXT.md` — **MUST read.** D-04/D-05 (`mergeCustomModes` slug-scoped preservation), D-06 (merge lives in adapter, installer calls it), D-07 (~5-touchpoint upstream-parity wiring), D-08 (`bob` `dot-home` descriptor + `BOB_CONFIG_DIR`), D-09 (text_mode via descriptor/config seam), D-10 (`gateArtifact` + `SUPPORT-ROSTER.md`).
- `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` — **INPUT CONTRACT.** §1 SPIKE defaults (config home `~/.bob`, env-override status, IDE-vs-Shell signal, `command` shell-out seam); §2 adjacent-surface contracts (SKILL.md, slash-command, custom-mode `groups`).
- `.planning/ACCEPTANCE-CHECKLIST.md` — **append target** for this phase's device-runnable AC steps, same AC-ID + `Cmd/Expect/Confirms/Result` schema (Phase 1 D-07 convention).

### gsd-bob code the installer orchestrates (this repo)
- `src/bob-adapter.cjs` — **the module the installer calls.** Exports `emitGsdMode`, `mergeCustomModes`, `gateArtifact`, `buildSupportRoster`, `UNSUPPORTED_MARKER`, `BOB_SKIP_LIST`. Installer stages the emitter's output; it does not reimplement any of these.
- `scripts/generate-support-roster.cjs` — existing `SUPPORT-ROSTER.md` generator (T-02-10); the install flow's roster step builds on this, never hand-maintains the roster.
- `gsd-core/bin/gsd-tools.cjs` + `gsd-core/bin/lib/runtime-homes.cjs` — the vendored shim + `dot-home` descriptor resolution the installer stages so `gsd_run` resolves the `bob` home.
- `package.json` — currently has **no `bin` map**; Phase 3 adds the `gsd-bob` bin entry (the npx installer entry point).

### gsd-core install convention to mirror (documented, not vendored)
- CLAUDE.md §"How gsd-core Actually Works" + §"Installation" — the flag set, scope resolution, and the re-run=update / uninstall+install=clean convention. **Note:** gsd-core's `bin/install.js` is **not vendored** (confirmed: absent from `gsd-core/bin/`) — the installer is net-new code mirroring the documented convention, not a copy.

### Bob documentation (citation-grade — from CAPABILITY-MAP)
- `https://bob.ibm.com/docs/shell/configuration/configuring` — `~/.bob` config home, setting precedence (scope resolution, D-08).
- `https://bob.ibm.com/docs/ide/configuration/custom-modes` — `custom_modes.yaml` location/shape (the merge target, D-10/D-13).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/bob-adapter.cjs`** — fully built emitter surface (`emitGsdMode`, `mergeCustomModes`, `gateArtifact`, `buildSupportRoster`). The installer is a thin orchestrator over these; net-new installer code is arg-parsing, scope/path resolution, file staging, and the manifest.
- **Vendored `gsd-core/` payload** — staged wholesale so `node gsd-core/bin/gsd-tools.cjs` resolves the `bob` runtime home under Bob (SPIKE-03 shell-out seam).
- **`scripts/generate-support-roster.cjs`** — the roster generator; the install flow reuses it rather than emitting an ad-hoc roster.
- **gsd-core `dot-home` descriptor + `BOB_CONFIG_DIR`** (Phase 2 D-08) — the installer resolves global/local target paths through the same descriptor, not bespoke path logic.

### Established Patterns
- **`node:fs`-only install/staging path** (CLAUDE.md) — `cpSync`/`mkdirSync`/`writeFileSync`/`rmSync`; no third-party fs libs in the installer.
- **Hand-parse `process.argv`** exactly as gsd-core's `selectRuntimesFromArgs()` does — no CLI framework (CLAUDE.md "What NOT to Use").
- **Fail-loud, never silent** (Phase 2 D-12 / TRANS-04/05 pattern) — invalid config.json or non-mapping YAML → warn and preserve, never clobber.
- **Slug-scoped preservation** (Phase 2 D-05) — `gsd`/`gsd-*` modes are gsd-bob's; everything else in `custom_modes.yaml` is the user's and is preserved.

### Integration Points
- The `bob` descriptor (Phase 2) is the seam the installer **stages into**; the staged `.bob/` is what Phase 4 (core loop) runs against.
- `.planning/ACCEPTANCE-CHECKLIST.md` → append AC steps here (Phase 1 D-07 convention).
- `package.json` `bin` → the npx entry point added this phase; `engines` already `node >=22.15.0` (satisfies Bob Shell + gsd-core).

</code_context>

<specifics>
## Specific Ideas

- Manifest dotfile literal (D-01): `<configHome>/.gsd-bob-manifest.json` with entries `{ path, sha256, kind: 'file' | 'merged' }`.
- Two `merged` (slice-owned, never-deleted) targets: `custom_modes.yaml` (gsd/gsd-* slugs) and `.planning/config.json` (gsd-owned keys, incl. `workflow.text_mode: true`).
- End-of-run report buckets: **written**, **skipped (user-modified)**, **removed (orphaned)** — surfaced after every update/uninstall.

</specifics>

<deferred>
## Deferred Ideas

- **`--force`** to overwrite user-modified tracked files on update — v1 default is skip+warn (D-04).
- **`--profile=<core|standard|full>`** profile selection (gsd-core has it) — premature for v1's partial roster; v1 stages everything the emitter supports. Reconsider once the full roster lands (Phases 4–5).
- **Backup-on-overwrite (`.bak` files)** — rejected for v1 in favor of skip+warn (D-04).
- **Multi-mode staging** — already a Phase 2 / CLAUDE.md v2 deferral; v1 stages the single `gsd` mode.

None beyond the above — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Installer*
*Context gathered: 2026-06-18*
