---
phase: 13-gsd-core-1-14-0-re-sync
plan: 01
type: execute
wave: 1
depends_on: ["12-01"]
autonomous: true
requirements: [RESYNC-01, RESYNC-02, RESYNC-03, RESYNC-04, RESYNC-05, RESYNC-06, DOCS-05, UP-03]
status: executed
planned: 2026-09-16
executed: 2026-09-16
branch: update/bob-latest-gsd-core
---

# Phase 13 — gsd-core 1.14.0 re-sync + Bob 1.0.x / 2.0.x compatibility

> Re-targeted on 2026-09-16. The v3.0 roadmap named this phase "gsd-core **1.10.0** Re-sync";
> upstream has since shipped 1.11.0 – 1.14.0 (latest, 2026-09-14) and Bob Shell has shipped
> 2.0.2 – 2.0.4. This plan re-baselines onto **gsd-core 1.14.0** and onto **both Bob generations
> that exist in the field** (Shell 1.0.x, Shell/IDE 2.0.x). The v3.0 record (ROADMAP, REQUIREMENTS,
> STATE, PROJECT) is updated in Task 9, not rewritten.

## Evidence (all sourced, all in `.planning/research/`)

| File | What it establishes |
|---|---|
| `260916-gsd-core-1.14.0-delta.md` | 1.6.1 → 1.14.0 code delta: registry schema, converter exports, resolver, Node floor, workflows, release notes 1.7–1.14, 14 ranked risks |
| `260916-bob-shell-docs.md` | Every Bob Shell docs page (40) read 2026-09-16, per-version table, 10 doc contradictions |
| `260916-bob-ide-docs.md` | Every Bob IDE docs page (98), Shell↔IDE sharing statements, withdrawn agent-personas page |
| `260916-bob-1.0.4-bundle.md` | The shipped Bob Shell 1.0.4 bundle read as code (this machine's install), vs the Phase 12 2.0.1 evidence |

## Facts that drive the design

**gsd-core 1.14.0 (target)**
- 72 commands (69 → 72): `next`, `onboard`, `quick-batch` added; 0 removed, 0 renamed. 15 of the 28 curated sources drifted.
- `engines.node` is `>=24` upstream **but** the vendored `gsd-core/bin` runs on Node 22.15 (verified: shim `query state.load` exit 0, all libs load). The only Node-24 API (`RegExp.escape`) is feature-detected.
- Patch step 4b's anchor `convertClaudeCommandToCursorCommand,` **no longer exists** → `apply-bob-patches.cjs` aborts half-applied.
- The `"bob"` registry block is **schema-invalid** for 1.14.0: missing `localConfigDir`, missing `hostIntegration` (required; every `dispatch-*` query reads it), and `hookEvents: "none"` was never a legal value. Nothing validates the frozen registry at load, so this fails late and silently.
- `VALID_CONVERTER_NAMES` (capability-validator.cjs) is a closed allowlist; the two Bob converters must be added for any registry-driven path and for the upstream PR.
- `resolveVersionFrom` now reads `gsd-core/VERSION` first; the synthetic sibling `package.json` is no longer load-bearing. `scripts/fix-slash-commands.cjs` sibling **is** still eagerly required.
- **`dispatch.isolation: 'none'` hard-blocks `/gsd-execute-phase`** (`FATAL: runtime declares no executor-isolation primitive`) unless `workflow.use_worktrees=false`. Bob's `spawn_subagent` is context isolation, not a git worktree.
- The `gsd_run` resolver preamble (now in 114 workflow files) probes 19 runtime homes and **none is `.bob`** — pre-existing in 1.6.1 too (a local `<repo>/.bob/gsd-core` install is unreachable from workflow bash unless `gsd_run` is on PATH).
- External/pluggable descriptor: **NO-GO** (every runtime-resolving module requires `capability-registry.cjs` directly). The hand-patch stays; the upstream PR shape shrinks to `capabilities/bob/capability.json` + regenerated registry + converter pair.

**Bob (both generations)**
- Global custom-modes path is `~/.bob/settings/custom_modes.yaml` on **both** 1.0.4 (with auto-migration from the root) and 2.0.x; project is `<ws>/.bob/custom_modes.yaml`. `modesRelPathForScope()` is already correct — no version branch.
- Emitted groups `['read','edit','execute','mcp']` resolve on both: 1.0.4 matches `execute` as a tool kind, 2.0.x as the canonical group. Vocabulary is an open string list at both versions (silent capability loss on typos).
- Skills: **2.0.x only** (1.0.4 bundle has zero `skills`/`SKILL.md` strings). Emitted `.bob/skills/` is inert but harmless on 1.0.x; `.bob/commands/` + the mode are the 1.0.x entry points.
- Subagents / `spawn_subagent` / parallel fan-out: 2.0.x only. No curated command `requires` fan-out, so the gate outcome is unchanged on 1.0.x.
- Slash-command args: 2.x docs show `$1`/`$2`; 1.0.4 substitutes only `{{args}}` and appends raw args after a blank line. Our `$ARGUMENTS → $1` projection is correct for 2.x and harmless on 1.0.x.
- Bob Shell 2.0.x requires Node 24; Bob Shell 1.0.x requires Node 20. Bob 2.0.1+ never auto-approves writes into `~/.bob` (install UX, not artifact contract). Commands/skills/modes from the project are not loaded in untrusted folders (`bob --trust`).
- Docs contradictions that matter are all settled by the shipped bundles (2.0.1 in Phase 12, 1.0.4 here): global modes under `settings/`, `execute` canonical, no config-home env override.
- Bob IDE reads the same `~/.bob` surfaces (skills, commands, `settings/custom_modes.yaml`, rules); no IDE-only write target is needed. `.bob/agents/` persona docs were withdrawn (404) — Phase 14 stays deferred.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D-01 | Target **gsd-core 1.14.0** (npm `latest`), not the roadmap's 1.10.0 | Latest is what users get; nothing in 1.11–1.14 removes a surface we use |
| D-02 | Keep `engines.node >=22.15.0` | Verified empirically on 22.15; Bob 2.x machines have Node 24 anyway; matches the documented Bob Shell floor the project already chose. Re-verify on every bump (runbook step) |
| D-03 | Keep `commands/gsd/*.md` as the conversion source (not upstream `skills/`) | `argument-hint` parity (63 vs 57 stems), zero churn to goldens/roster/doc generators; upstream's pre-hyphenated skills are a future simplification, recorded not adopted |
| D-04 | Seed `workflow.use_worktrees: false` into `.planning/config.json` at install (same mechanism as `text_mode` / `context_window`) | Without it `/gsd-execute-phase` exits FATAL on 1.14.0. Bob has no git-worktree primitive; executors ran unisolated in the main checkout under 1.6.1 too, so this preserves today's behaviour. Declaring `orchestrator-worktree` needs a headless-Bob `orchestratorExec` spike — deferred (Phase 14/16) |
| D-05 | **Bob 2.0.x is the supported target** (Shell 2.0.x and IDE 2.x). 1.0.x is documented as unsupported: it has no skills and no subagents, so only the commands + mode would load. No installer version probe, no 1.0.x tests. (User decision, 2026-09-16) | The artifact set is the same either way; supporting 1.0.x would only add a version matrix and a probe for a generation that requires a fresh reinstall to leave |
| D-06 | Vendor `next`, `onboard`, `quick-batch` (gate-decided; 28 → 31) | RESYNC-04. `quick-batch` is checked against `use_worktrees=false`; if it hard-requires worktrees it goes on `BOB_SKIP_LIST` with a loud reason instead |
| D-07 | Fix the global-scope path bug: converters receive `isGlobal`, and stage rewrites `~/.bob/` to the absolute install target for global installs | Today every install emits `.bob/gsd-core/...` relative refs, which do not exist under a global install |
| D-08 | New patch deltas: (7) `VALID_CONVERTER_NAMES` entries, (8) `.bob` probes in the `gsd_run` resolver preamble over the doc tree; drop the synthetic `package.json` sibling; add an all-deltas post-verify so a failed anchor can never leave a half-patched tree | Delta-report risks 2, 5, 7 |
| D-09 | Descriptor drift guard: a test parses `REGISTRY_BLOCK` and deep-equals it to `runtimes.bob`, and runs 1.14.0's own `capability-validator` over the bob entry | Roadmap SC7; Phase 12 found the two already disagreeing |
| D-10 | NEUTRAL-04 (no other agent/product names in the emitted set) is **deferred** to its own plan | Fuzzy prose rewriting across 31 commands with a new invariant; out of this compatibility task's scope and not required for correctness. Recorded, not silently dropped |
| D-11 | Version bumped to 0.3.0 in a separate `chore(release)` commit; `package.json` gains `repository`/`homepage`/`bugs`/`keywords`/`publishConfig`; `THIRD-PARTY-NOTICES.md` (upstream MIT) ships in the tarball. Tag, push and `npm publish` are confirmed with the user first | Original rule was "no bump on this branch"; the user asked on 2026-09-16 for the npm package to be updated and connected to the repo, and for the open-source licensing to be completed |

## Tasks

1. **Patch script** (`scripts/apply-bob-patches.cjs`): `TARGET_VERSION=1.14.0`; new `REGISTRY_BLOCK` (adds `version`, `engines`, `localConfigDir`, `triggerPrecedence`, `hostIntegration`; drops `hookEvents`); step 4b re-anchored on `extractFrontmatterField,`; new step 7 (`VALID_CONVERTER_NAMES`); new step 8 (resolver `.bob` probes, idempotent); `verifyAll()` post-check that throws unless every delta is present.
2. **Re-vendor** per MAINTAINING.md: nuke the five subdirs, restage from the immutable `@opengsd/gsd-core@1.14.0` tarball, run the patch script twice (idempotency proven by `git diff --quiet gsd-core/`). Re-sync the 28 drifted/unchanged command sources and add the 3 new ones from the same tarball.
3. **Installer**: `stage.cjs` (scope-aware converters + global absolute-path rewrite, drop `package.json` sibling, roster candidates from the source dir), `config-merge.cjs` (`use_worktrees:false` seed, un-merged on uninstall like `text_mode`), `bob-adapter.cjs` (skip-list entry for `quick-batch` only if Task 2's check demands it).
4. **Tests**: update pins (`1.6.1`→`1.14.0`, `28`→`31`, sibling `package.json` removal); regenerate goldens for drifted stems with a one-line justification each (never blanket); new tests — patch-drift guard + validator run (D-09), converter allowlist, resolver `.bob` probe in every preamble file, global-scope absolute refs, `use_worktrees` seed/unmerge, Bob 2.0.x facts re-frozen (modes path, `execute`, skills present).
5. **Generated docs**: `SUPPORT-ROSTER.md`, `COMMANDS.md`, cover stamps (`scripts/stamp-covers.cjs`), README skill list.
6. **Hand docs**: README (Bob 2.0.x requirement + 1.0.x unsupported note, Node floor, worktree seed, global-path fix, `--trust`), ARCHITECTURE (eight deltas, descriptor shape, resolver probe, scope-aware emission), MAINTAINING (the real 1.6.1 → 1.14.0 replay: broken anchor, post-verify, eight deltas, Node-24 grep step), UPSTREAM (1.14.0 pointers, `capability.json` contribution shape, NO-GO verdict for the external descriptor, 8-artifact inventory), `.claude/CLAUDE.md` project facts.
7. **Acceptance checklist**: insert-only steps for the 3 new commands and a `bob run --mode gsd` probe; follow-ups log entries for the assumptions this phase refuted (1.0.x has no skills; the 1.6.1 resolver never probed `.bob`).
8. **Verify**: `npm test` green; staged shim runs out of tree on Node 25 **and** Node 22.15 (downloaded binary); `apply-bob-patches.cjs` idempotent; `grep -rn '1\.6\.1'` clean outside `legacy-cleanup.cjs` and the planning archive.
9. **Planning record**: ROADMAP/REQUIREMENTS/STATE/PROJECT/MILESTONES re-targeted 1.10.0 → 1.14.0, Phase 13 summary, phase directory of the v2.0 phases left as-is.

## Verification (must-haves)

- `gsd-core/VERSION` = `1.14.0`; second patch run is a byte-identical no-op.
- `require('gsd-core/bin/lib/capability-validator.cjs')` validates `runtimes.bob` with zero errors.
- `resolveInstallPlan('bob')`, `resolveConfigHomeFromDescriptor`, `getGlobalConfigDir('bob')` all resolve; `gsd_run query dispatch-isolation` on a scratch project returns `none` and `execute-phase`'s gate passes with the seeded config.
- Real install into a scratch `.bob/` (local and global): 31 commands + 31 skills, shim loads out of tree with no sibling `package.json`, `custom_modes.yaml` at the scope-correct path.
- Test suite: baseline 334/334 → all green at the new count; every changed golden has a justification line in `13-REVENDOR-NOTES.md`.

## Out of scope (recorded)

NEUTRAL-04 (D-10); `.bob/agents/` personas and lifecycle hooks (Phase 14 — persona docs withdrawn); MCP server registration (Phase 15); external descriptor (Phase 16 — verdict already NO-GO, recorded in UPSTREAM.md); live-Bob acceptance run (Phase 17 — this machine has Shell 1.0.4 only, SSO-authenticated).
