# Phase 13 — live re-vendor notes: gsd-core 1.6.1 → 1.14.0

**Date:** 2026-09-16 · **Branch:** `update/bob-latest-gsd-core` · **Pre-vendor HEAD:** `2d4c78c` (v0.2.3)
**Baseline (step 1):** `npm test` → 334 tests / 334 pass / 0 fail (after `npm ci` — the fresh clone had no `node_modules`).
**Machine:** Node 25.6.1 (dev), Node 22.15.0 downloaded to scratch for the floor check; Bob Shell 1.0.4 installed (not 2.0.x — the Phase 12 machine state is gone).

This is the raw as-it-happened log the MAINTAINING runbook is corrected from. Commands are verbatim.

## Command log

```bash
# step 2 — immutable tarballs (both, for the diff)
npm pack @opengsd/gsd-core@1.6.1 && npm pack @opengsd/gsd-core@1.14.0     # in scratch
tar -xzf opengsd-gsd-core-1.14.0.tgz -C v1140
ls v1140/package/gsd-core/            # bin contexts references templates workflows  (same five; NO VERSION — expected)

# step 3/4 — nuke + restage the same five subdirs
rm -rf gsd-core/{bin,contexts,references,templates,workflows}
for d in bin contexts references templates workflows; do cp -R "$SRC/gsd-core/$d" "gsd-core/$d"; done

# step 6 (moved BEFORE the patch run — the sources feed nothing in the script, but keep them in lockstep)
for s in $(ls commands/gsd) next.md onboard.md quick-batch.md; do cp "$SRC/commands/gsd/$s" commands/gsd/$s; done   # 28 → 31

# step 5 — patch script, twice
node scripts/apply-bob-patches.cjs      # RUN 1: [1] 134 files, [2] 88 files, [3]..[7] applied, [8] 115 files (114 probe .bob), [9] wrote bob, verify ✓
git add gsd-core/
node scripts/apply-bob-patches.cjs      # RUN 2: every step "no-op" / 0 changed
git diff --quiet gsd-core/ && echo IDEMPOTENT      # IDEMPOTENT
```

## What the runbook got wrong (corrections folded into MAINTAINING.md)

1. **Step 5's anchor list was stale.** `convertClaudeCommandToCursorCommand,` (the 4b export anchor) was deleted upstream in 1.7.0. The 1.6.1-era script aborted at 4b **after** 4a had already written — a half-patched tree with the converter block present and its exports missing (`stage.cjs` destructures `undefined`). Fixed by re-anchoring 4b on `extractFrontmatterField,` (a helper the converters call, so anchor loss and real breakage coincide) and by adding a **preflight** that checks every anchor before the first write, plus a **post-verify** of all deltas.
2. **The six-delta model is now nine.** New: (7) `VALID_CONVERTER_NAMES` allowlist entries in `capability-validator.cjs`; (8) `.bob` probes in the `gsd_run` resolver preamble (114 workflow files + `references/gsd-run-resolver.md`) and the gsd-bob install one-liner in its error hint; (9) the per-install `gsd-core/.gsd-runtime` marker (`bob`) — without it every `dispatch-*` query resolved the `claude` descriptor.
3. **The registry block itself had to change**, not just be re-injected: `localConfigDir` (required since 1.7.0), `hostIntegration` (required since ADR-1239), `version`/`engines`, and `hookEvents: "none"` removed (never a legal value — omission is the "none"). Verified: `validateCapability(runtimes.bob,'bob')` and `validateRuntimeBody(runtimes.bob)` both return `[]` on 1.14.0's own validator.
4. **The synthetic sibling `package.json` is dead weight** since 1.7.0 (`resolveVersionFrom` reads `gsd-core/VERSION` first). Removed from `stage.cjs`; the staged shim still loads out of tree (`runtime-identity` → `{"packageName":"@opengsd/gsd-core","version":"1.14.0"}`). `scripts/fix-slash-commands.cjs` is still an EAGER sibling require (`command-roster.cjs:36`) and stays.
5. **The Node floor.** Upstream `engines.node` is `>=24.0.0`; the vendored `bin` was executed on a downloaded Node 22.15.0 (`gsd-tools.cjs query state.load` exit 0, `--help` ok, all three patched libs load). The only Node-24 API used (`RegExp.escape`, `pattern.cjs`) is feature-detected. `engines.node >=22.15.0` kept. Re-run this check on every bump; upstream retired its Node 22 CI lane.
6. **New behavioural gate.** `workflows/execute-phase/steps/executor-isolation-dispatch.md` (and `quick-batch`) exit `FATAL` on `dispatch.isolation=none` unless `workflow.use_worktrees=false`. The installer now seeds that key (with `text_mode` and `context_window`) and un-merges it on uninstall. Verified with the staged shim: `query dispatch-isolation --json` → `{"runtime":"bob","isolation":"none"}`.
7. **The converter needed one fix.** `convertClaudeCommandToBobCommand` neutralized the body but not the frontmatter, so `quick-batch`'s description shipped `/gsd:quick-shaped`. It now converts the full content first (as the skill converter always did). The re-vendor was re-run from the tarball so the "already applied" guard could not mask the stale block.

## Suite after re-vendor + installer edits (before fixture/pin updates)

Recorded below by the test pass; every changed golden carries its justification here.

## Fixture / pin justifications

**Classification method (MAINTAINING D-08), run before touching a single fixture.** The current
converters were applied to the **1.6.1** sources for all eight equivalence stems and diffed against
the frozen 1.6.1-era fixtures: **all 16 outputs (8 command + 8 skill) came back byte-identical.**
That isolates the variable — converter behaviour is unchanged, so every golden diff below is
upstream source content flowing through an unchanged converter. (The one intentional converter
change — the command converter now neutralizes frontmatter too — is a no-op on these eight stems:
none carried a colon-dialect ref in its frontmatter. It bites only `quick-batch`, which has no
frozen fixture.) The 31 curated `commands/gsd/*.md` sources were also confirmed byte-identical to
the pristine 1.14.0 tarball, so no fixture diff can be a vendoring artifact. **No regression found —
nothing was stopped and escalated.**

| Fixture (both `.command.expected.md` + `.skill.expected.md`) | One-line justification |
|---|---|
| `core-loop/discuss-phase` | upstream added `--raw` to the `config-get workflow.discuss_mode` bash call. |
| `core-loop/execute-phase` | upstream rewrote the `description` (SDD/dependency-aware wording) and renamed the delegation block `<files_to_read>` → `<required_reading>`. |
| `core-loop/plan-phase` | upstream added `--skip-ui`, `--no-tracer` and `--no-reversibility-gates` (tracer-first default), reworded `--mvp`, and corrected the auto-detect prose. |
| `core-loop/verify-work` | upstream renamed the delegation block `<files_to_read>` → `<required_reading>`. |
| `quality-gates/code-review` | upstream added the reviewer-lane flags (#4209) to `argument-hint` + body and renamed `<files_to_read>` → `<required_reading>`. |

Untouched on purpose: `quality-gates/{debug,audit-fix,audit-uat}` and `test/fixtures/{command,skill,text-mode,custom_modes}` — their sources/emissions are unchanged in 1.14.0 and every one of those goldens stayed green.

**Pins bumped 28 → 31** (the source count grew by `next`, `onboard`, `quick-batch`), keeping the
"single pinned literal per file" discipline each file documents:
`test/docs-conformance.test.cjs` (one literal, every other count derived) and
`test/command-expansion.test.cjs` (Group C's `stems.length` guard). `test/bob2-surfaces.test.cjs`
adds one more pinned `31` under the same discipline.

## Suite after the test pass

`npm test` → **376 tests / 375 pass / 1 fail** (up from 346/327/19). The single remaining failure is
`ACCEPT-01` in `test/acceptance-delta-coverage.test.cjs` ("no AC `Cmd:` line references
`gsd-next.md`") — it needs AC steps for the three new stems in the ACCEPTANCE doc, which the docs
pass owns.

Test-side changes made in this pass:
- `test/patch-drift.test.cjs` (NEW) — the D-09 descriptor drift guard: three-way identity between
  `canonicalBobEntry()`, `readVendoredBobEntry()` and the loaded `runtimes.bob`; 1.14.0's own
  validator returning `[]`; the converter allowlist; the load-bearing descriptor facts; VERSION +
  `.gsd-runtime`; the resolver-probe sweep over the doc tree; `verifyAll()`/`preflight()` clean; and
  `patchResolverContent` idempotency + Bob-probe-first ordering.
- `test/installer/global-scope-paths.test.cjs` (NEW) — global-scope absolutization at both scopes
  plus `absolutizeGlobalHome` as a unit.
- `test/bob2-surfaces.test.cjs` (NEW) — the 2026-09-16 Bob 2.0.x surface facts frozen (modes-path
  asymmetry, mode `groups` ⊆ the IDE vocabulary, both surfaces per stem, and the absence of any
  `bob --version` probe, since 1.0.x is unsupported rather than degraded).
- `test/installer/staged-shim-loads.test.cjs` — now asserts staged `gsd-core/VERSION` is `1.14.0`,
  `.bob/package.json` is ABSENT and untracked, `scripts/fix-slash-commands.cjs` +
  `gsd-core/.gsd-runtime` (`bob`) are staged and manifest-tracked, `runtime-identity --raw` agrees
  with VERSION, and a real project-scoped install answers `query dispatch-isolation --json --phase 1`
  with runtime `bob` / isolation `none`.
- `test/core-loop-contract.test.cjs` — `verify-phase.md` was REMOVED upstream in 1.14.0 (with
  `discovery-phase` and `plan-milestone-gaps`). The workflow-only pair is now **execute-plan**
  (reached from `execute-phase`) + **transition** (reached from `verify-work`); the test now also
  asserts the reaching workflow really references it, and that `verify-phase.md` does NOT reappear.
- `test/installer/config-merge.test.cjs` — expected shapes derived from `BOB_OWNED_CONFIG` (so
  `use_worktrees:false` is covered), plus five `unmergeOwnedKeys` cases and an install→uninstall
  round-trip.
- `test/installer/uninstall.test.cjs` — un-merge assertions now iterate `BOB_OWNED_CONFIG` and check
  that the emptied `workflow` object is dropped.
- `test/installer/stage.test.cjs` — the STAGED `SUPPORT-ROSTER.md` must list all 31 `gsd-<stem>`
  names (and `rosterCandidates()` must derive the same set), not the old representative subset.
