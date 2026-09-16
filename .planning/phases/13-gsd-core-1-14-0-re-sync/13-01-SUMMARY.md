# Phase 13 — Plan 01 Summary

**Phase:** 13 — gsd-core 1.14.0 Re-sync
**Requirements:** RESYNC-01 … RESYNC-06, DOCS-05, UP-03 (NEUTRAL-04 deferred to Phase 18)
**Status:** Complete
**Date:** 2026-09-16
**Branch:** `update/bob-latest-gsd-core` (six local commits; version bumped to 0.3.0 per the revised D-11 — tag, push and publish are user-confirmed)
**Evidence:** [`13-REVENDOR-NOTES.md`](./13-REVENDOR-NOTES.md) · [`13-PLAN.md`](./13-PLAN.md) · the four `../../research/260916-*.md` reports

## What this phase was for

Bring the vendored payload forward from gsd-core 1.6.1 to the current release so the rest of
v3.0 builds on one consistent version — and find out what eight upstream minors had quietly
broken underneath the adapter while it sat at 1.6.1.

The answer was: more than the plan expected. The re-vendor was the smallest part of it.

## Outcome

Eight requirements closed, three new local deltas, two shipped bugs fixed, one requirement
deliberately split out, and one milestone premise refuted.

### The re-target: 1.10.0 → 1.14.0, and Bob 2.0.x only (D-01, D-05)

The v3.0 roadmap named this phase "gsd-core **1.10.0** Re-sync". Upstream had since shipped
1.11.0 – 1.14.0 (latest 2026-09-14), and nothing in that range removes a surface gsd-bob uses,
so the phase re-baselined onto **1.14.0** — latest is what users get.

The host target narrowed the other way. The plan had scoped both Bob generations that exist in
the field; the user's decision (2026-09-16) was **Bob 2.0.x only**. Bob Shell 1.0.4's shipped
bundle has zero `skills` / `SKILL.md` strings and no subagent tool, so of what gsd-bob emits
only `.bob/commands/` and the `gsd` mode would ever load there — and leaving 1.0.x requires a
fresh install anyway. Supporting it would have bought a version matrix and an installer probe
for a generation users must abandon to get skills at all. No probe was added; README says why.

### The patch script aborted half-applied — and that is the phase's headline (D-08)

Step 4b of `apply-bob-patches.cjs` anchored its converter-export insertion on
`convertClaudeCommandToCursorCommand,`. Upstream **deleted** that symbol in 1.7.0. So on the
1.14.0 tree, step 4a wrote the ~105-line converter block and step 4b then threw — leaving a
payload with the Bob converters present and **unexported**, which is exactly the state where
`stage.cjs` destructures `undefined`.

Two structural fixes, both of which are now the runbook's spine:

- **`preflight()`** validates every anchor *before the first write*. A moved anchor aborts with
  nothing touched.
- **`verifyAll()`** re-checks every delta after the run and throws on any gap.

And 4b was re-anchored on `extractFrontmatterField,` — a helper the Bob converters *call*, so
anchor loss and real breakage now coincide instead of diverging. Never anchor on a per-runtime
converter name again.

### The six-delta model is nine

Three new local deltas, each load-bearing and each invisible until looked for:

| # | Delta | What it fixes |
|---|---|---|
| 7 | the two Bob converter names in `VALID_CONVERTER_NAMES` (`capability-validator.cjs`) | 1.14.0 made that a **closed allowlist**, enforced on every registry-driven staging path — a descriptor naming a converter absent from it is refused |
| 8 | `.bob` probes in the `gsd_run` resolver preamble (114 workflow files + `references/gsd-run-resolver.md`) | the preamble probes 19 runtime homes and **none was `.bob`** — a `.bob` install has been unreachable from workflow bash since 1.6.1 (FU-10) |
| 9 | the per-install marker `gsd-core/.gsd-runtime` = `bob` | gsd-core resolves the runtime as `GSD_RUNTIME` > `config.runtime` > this marker > `claude`; with no marker, every `dispatch-*` query answered for the **Claude-runtime** descriptor (FU-12) |

Delta 9 is deliberately *not* a `runtime` key in `.planning/config.json`: that file is the
Claude↔Bob interchange surface and must not pin a runtime.

### The descriptor had gone schema-invalid, silently

Nothing validates the frozen registry at load, so the 1.6.1-era `"bob"` block had been wrong
for versions without a symptom. 1.14.0 requires `localConfigDir` (since 1.7.0 — `getDirName`
derives from it) and `hostIntegration` (since ADR-1239 — every `dispatch-*` query reads it),
and `hookEvents: "none"` was **never** a legal value: "emits none" is expressed by omission.

The entry now carries `version`, `engines`, `localConfigDir`, `triggerPrecedence` and a full
`hostIntegration` body, and has lost `hookEvents`. Running 1.14.0's own
`validateCapability(runtimes.bob,'bob')` and `validateRuntimeBody(runtimes.bob)` over it returns
`[]`. `test/patch-drift.test.cjs` now holds `canonicalBobEntry()`, `readVendoredBobEntry()` and
the loaded `runtimes.bob` in three-way identity and runs that validator on every test run —
closing the drift Phase 12 had already caught once.

### A new behavioural gate: `use_worktrees` (D-04)

`hostIntegration.dispatch.isolation` is about **git worktrees**, not context isolation. Bob's
`spawn_subagent` gives an isolated context window; it does not check out a worktree. So the
descriptor declares `isolation: "none"` — and since 1.14.0,
`workflows/execute-phase/steps/executor-isolation-dispatch.md` **fails closed** on that value:
`FATAL: runtime declares no executor-isolation primitive … Set workflow.use_worktrees=false.`

The installer now seeds `workflow.use_worktrees: false` alongside `text_mode` and
`context_window`, from one `BOB_OWNED_CONFIG` declaration, and un-merges all three on
uninstall. Executors then run in the main checkout — which is exactly how they ran under 1.6.1.
**The gate is new; the behaviour is not.** Declaring `orchestrator-worktree` instead would need
a valid headless-Bob `orchestratorExec`, which is plausible but unverified — recorded as a
spike, not assumed.

### Global installs had been emitting paths that do not exist (D-07)

Through v0.2.3, *every* install — global included — emitted workspace-relative
`.bob/gsd-core/...` references, and the `gsd` mode's `customInstructions` named
`.bob/gsd-core/bin/gsd-tools.cjs`. Under a global install the payload lives at
`~/.bob/gsd-core/...`, so that path resolves against the user's cwd and is simply absent.

Fixed: the converters take `isGlobal`, `absolutizeGlobalHome()` rewrites `~/.bob/` (and the bare
`~/.bob`) to the absolute install target, and `stage()` names `<target>/gsd-core` in the mode at
global scope. Local installs keep the relative form. This is the second global-scope bug in two
phases, after Phase 12's modes-path P0 — global scope is where this adapter goes wrong.

### 28 → 31 commands, 0 unsupported (D-06)

`next`, `onboard` and `quick-batch` were added upstream since 1.6.1. All three passed the gate
and are vendored. `quick-batch` was specifically checked against `use_worktrees=false`: on
`isolation: none` its wave caps to concurrency 1 rather than failing, so it emits.

One converter bug surfaced doing it: `convertClaudeCommandToBobCommand` neutralized the body but
not the frontmatter, so `quick-batch`'s *description* shipped the unroutable colon dialect
(`/gsd:quick-shaped tasks`). It now converts the full document before slicing frontmatter, as
the skill converter always did.

15 of the 28 pre-existing command sources had also drifted upstream. All 31 were re-synced from
the same immutable tarball, so no fixture diff can be a vendoring artifact.

### The Node floor was re-earned, not assumed (D-02)

Upstream's `engines.node` is now `>=24.0.0` and its Node 22 CI lane is retired. gsd-bob stays at
`>=22.15.0`: the only Node-24 API the payload reaches for (`RegExp.escape`) is feature-detected
with an in-file fallback — upstream re-shimmed it in #3499 *after* raising the floor — and the
vendored `bin` was executed on a downloaded Node 22.15.0 (`--help`, `query state.load` at exit
0, all three patched libs loading). `>=22.15.0` is the union of that and Bob Shell's own
documented floor. It is an untested configuration *upstream*, so it is now a standing
MAINTAINING step rather than a one-off finding.

### The external descriptor: NO-GO, answered without spending a migration

DESC-01 (Phase 16) asked whether `bob` could live outside the generated registry. The answer came
out of this phase's delta research, from source: `capability-loader.cjs` *would* compose an
external `capability.json` into `registry.runtimes.bob`, but **every** module that resolves a
runtime — `runtime-homes`, `runtime-artifact-layout`, `runtime-config-adapter-registry`,
`runtime-name-policy`, `install-engine`, `runtime-slash` and the rest — `require`s the frozen
`capability-registry.cjs` directly and never calls the loader. The overlay path serves *feature*
and *reviewer* capabilities only.

So the hand-patch stays, and the upstream contribution shape shrinks and clarifies:
`capabilities/bob/capability.json` (byte-identical to the registry entry, because the generator
copies a `role: "runtime"` capability verbatim) plus a regenerated registry, the converter trio,
the two allowlist entries, and the resolver line. `UPSTREAM.md` records the verdict and grew from
a 6- to a 9-artifact inventory.

## Changes

| File | Change |
|---|---|
| `gsd-core/**` (five subdirs) | nuked and restaged from the immutable `@opengsd/gsd-core@1.14.0` tarball |
| `gsd-core/VERSION`, `gsd-core/.gsd-runtime` | `1.14.0`; new marker `bob` |
| `scripts/apply-bob-patches.cjs` | `TARGET_VERSION` 1.14.0; new `REGISTRY_BLOCK` (adds `version`, `engines`, `localConfigDir`, `triggerPrecedence`, `hostIntegration`; drops `hookEvents`); 4b re-anchored on `extractFrontmatterField,`; new deltas 7/8/9; `preflight()` + `verifyAll()`; `readVendoredBobEntry()` / `canonicalBobEntry()` exported for the drift guard |
| `commands/gsd/*.md` | all 31 sources re-synced from the tarball; `next`, `onboard`, `quick-batch` added |
| `gsd-core/bin/lib/runtime-artifact-conversion.cjs` | the command converter now converts the full document before slicing frontmatter |
| `src/installer/stage.cjs` | scope-aware converter calls + `absolutizeGlobalHome()`; absolute `gsdCoreDir` for global scope; roster candidates derived from the source dir; synthetic sibling `package.json` no longer staged |
| `src/installer/config-merge.cjs` | `BOB_OWNED_CONFIG` grows `workflow.use_worktrees: false`; `unmergeOwnedKeys` drops it too |
| `bin/gsd-bob.cjs` | uninstall un-merge follows `BOB_OWNED_CONFIG` |
| `test/patch-drift.test.cjs`, `test/installer/global-scope-paths.test.cjs`, `test/bob2-surfaces.test.cjs` | **new** — descriptor drift + validator, global-scope absolutization, the 2026-09-16 Bob 2.0.x surface facts |
| `test/installer/{staged-shim-loads,config-merge,uninstall,stage}.test.cjs`, `test/core-loop-contract.test.cjs`, `test/{docs-conformance,command-expansion}.test.cjs`, `test/fixtures/**` | pins bumped 1.6.1→1.14.0 and 28→31; goldens regenerated for the five drifted stems, each justified in `13-REVENDOR-NOTES.md` |
| `README.md`, `ARCHITECTURE.md`, `MAINTAINING.md`, `UPSTREAM.md`, `.claude/CLAUDE.md` | rewritten for 1.14.0 + Bob 2.0.x; MAINTAINING corrected from the real replay; UPSTREAM re-verified with real line numbers |
| `SUPPORT-ROSTER.md`, `COMMANDS.md`, `covers/**` | regenerated from their generators (31 emitted, 0 withheld) |
| `.planning/{ROADMAP,REQUIREMENTS,STATE,PROJECT,ACCEPTANCE-CHECKLIST,ACCEPTANCE-FOLLOWUPS}.md` | re-targeted 1.10.0 → 1.14.0; RESYNC-05/06 added; NEUTRAL-04 moved to Phase 18; AC-46..AC-50 appended insert-only; FU-10..FU-14 logged |

## Verification

- `apply-bob-patches.cjs` run twice: RUN 2 is a byte-identical no-op (`git diff --quiet gsd-core/`).
- `validateCapability(runtimes.bob,'bob')` + `validateRuntimeBody(runtimes.bob)` → `[]` on
  1.14.0's own validator.
- Staged shim loads **out of tree** with no sibling `package.json`; `runtime-identity --raw`
  agrees with `gsd-core/VERSION`; a real project-scoped install answers
  `query dispatch-isolation --json` with runtime `bob` / isolation `none`.
- Vendored `bin` executed on a downloaded **Node 22.15.0**: `--help` and `query state.load` at
  exit 0, all three patched libs loading.
- `grep -rn '1\.6\.1'` clean outside the stock `legacy-cleanup.cjs` comment and the planning
  archive.
- `stamp-covers --check` green at **31 emitted, 0 withheld**.
- Suite: 334/334 before the re-vendor → **376 tests** after, with the goldens and pins updated
  and every change justified in `13-REVENDOR-NOTES.md`.

## Not done here, deliberately

- **NEUTRAL-04 (D-10).** Extending the neutrality invariant from *model* literals to *agent and
  product* names, and to selection prompts, is fuzzy prose rewriting across 31 commands under a
  brand-new invariant. It is not required for 1.14.0 correctness and is easy to half-do inside a
  compatibility task. **Moved to its own Phase 18** — recorded, not dropped. The 2026-08-13
  inventory should be re-measured against the 1.14.0 emission before any rewriting starts.
- **`.bob/agents/` personas and lifecycle hooks (Phase 14).** The Bob page documenting personas
  was **withdrawn (404)**; no page describes the directory, a persona format, or its frontmatter.
  Emitting into it would be guessing at a contract. Phase 14 stays deferred on missing docs, not
  on effort.
- **MCP server registration (Phase 15).** Untouched.
- **The external-descriptor migration (Phase 16).** The verdict is recorded; what remains is an
  upstream proposal to route `runtime-homes` / `runtime-artifact-layout` through `loadRegistry`,
  which is the only change that would flip it.
- **The live-Bob acceptance run (Phase 17 / ACCEPT-04).** The dev machine is back on Bob Shell
  **1.0.4** — the unsupported generation — so this phase was verified hermetically and the
  deferred pass needs Bob 2.0.x hardware (FU-14).
- **Release.** Version bumped to 0.3.0 with repo metadata and third-party notices (revised D-11); tag, push and `npm publish` are user-confirmed. The RESYNC-06 path fix and the
  `use_worktrees` seed both affect real installs, so the release is user-driven and deliberate.

## What the next maintainer should read first

1. [`13-REVENDOR-NOTES.md`](./13-REVENDOR-NOTES.md) — the verbatim command log, the seven things
   the old runbook got wrong, and a one-line justification for every changed golden.
2. `MAINTAINING.md` — rewritten from that log; the anchors table is the part that would have
   saved this phase a day.
3. `../../research/260916-gsd-core-1.14.0-delta.md` — §2 (registry schema), §2.4 (the dispatch
   gate), §2.6 (the NO-GO), §3.2 (the deleted anchor), §5 (the Node floor).
