---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Bob 2.0 & gsd-core 1.14 Re-baseline
status: in-progress
last_updated: "2026-09-16T00:00:00.000Z"
last_activity: 2026-09-16
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 43
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-16)

**Core value:** A Bob user installs via a single command and runs the full GSD planning loop (new-project → plan-phase → execute-phase → verify) natively, producing the same `.planning/` artifacts GSD produces in the reference runtime.
**Current focus:** Phases 13 and 18 complete — next up is Phase 15 (MCP); Phases 14 and 17 are blocked

## Current Position

Phase: 13 complete (both passes) — gsd-core 1.14.0 Re-sync; Phase 18 (NEUTRAL-04) complete, executed as its second pass
Plan: 13-01 complete · 13-02 complete (agent-neutrality)
Status: Phases 13 and 18 closed. **Phase 15 (MCP) is the one clearly runnable phase left** — Phase 14 is blocked on missing Bob docs, Phase 17 on missing Bob 2.x hardware, Phase 16's verdict is already recorded.
Last activity: 2026-09-16 — Phase 13 second pass (NEUTRAL-04): stage-time agent-neutralization of every markdown the model reads (converted commands/skills **and** the vendored `gsd-core` doc tree) via `bobifyRuntimeDoc`; the config seeds grew to four with `context_window` moved 270000 → 200000 and `resolve_model_ids: "omit"` added; `test/agent-neutrality.test.cjs` added; every human-facing doc and cover neutralized. Suite 389/389 green. First pass, earlier the same day: payload re-vendored 1.6.1 → 1.14.0, nine deltas (was six) with preflight + verify, descriptor re-shaped and validated by 1.14.0's own validator, 28 → 31 commands, `use_worktrees` seed + `.gsd-runtime` marker, global installs made absolute, resolver `.bob` probe, docs + planning record rewritten

**Decisions taken in Phase 13 (D-01..D-11):**

| # | Decision |
|---|---|
| D-01 | Target **gsd-core 1.14.0** (npm `latest`), not the roadmap's 1.10.0 — nothing in 1.11–1.14 removes a surface gsd-bob uses |
| D-02 | Keep `engines.node >= 22.15.0` despite upstream's `>= 24` — the only Node-24 API (`RegExp.escape`) is feature-detected and the payload was executed on Node 22.15.0. Re-verify on every bump |
| D-03 | Keep `commands/gsd/*.md` as the conversion source, not upstream's pre-hyphenated `skills/` — `argument-hint` parity and zero churn to goldens/roster/generators. Recorded as a future simplification, not adopted |
| D-04 | Seed `workflow.use_worktrees: false` into `.planning/config.json` at install (same mechanism as `text_mode` / `context_window`) — without it `/gsd-execute-phase` exits FATAL on 1.14.0. Declaring `orchestrator-worktree` instead needs a headless-Bob `orchestratorExec` spike (deferred) |
| D-05 | **Bob 2.0.x is the supported target** (Shell 2.0.x, IDE 2.x); 1.0.x is documented as unsupported — no skills, no subagents, and 2.0.0 needs a fresh install anyway. No installer version probe, no 1.0.x tests. **(User decision, 2026-09-16)** |
| D-06 | Vendor `next`, `onboard`, `quick-batch` (gate-decided; 28 → 31). `quick-batch` was checked against `use_worktrees=false` and passed |
| D-07 | Fix the global-scope path bug: converters receive `isGlobal`, and stage rewrites `~/.bob/` to the absolute install target for global installs |
| D-08 | Three new patch deltas — `VALID_CONVERTER_NAMES` entries, `.bob` probes in the `gsd_run` resolver preamble, the `.gsd-runtime` marker — plus a `preflight()` and an all-deltas `verifyAll()` so a failed anchor can never leave a half-patched tree |
| D-09 | Descriptor drift guard: a test parses `REGISTRY_BLOCK`, deep-equals it to `runtimes.bob`, and runs 1.14.0's own `capability-validator` over the entry |
| D-10 | **NEUTRAL-04 is deferred to its own phase (18)** — fuzzy prose rewriting across 31 commands under a new invariant, out of this compatibility task's scope. Recorded, not silently dropped |
| D-11 | Version bumped to **0.3.0** in a separate `chore(release)` commit, with `package.json` wired to the GitHub repo (`repository`/`homepage`/`bugs`) and `THIRD-PARTY-NOTICES.md` carrying the upstream MIT notice (user instruction, 2026-09-16, superseding the original no-bump rule). Tag, push and `npm publish` remain user-confirmed |

## Performance Metrics

**Velocity:**

- Total plans completed: 21
- Average duration: 2 min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 1 | - | - |
| 02 | 4 | - | - |
| 04 | 2 | - | - |
| 5 | 3 | - | - |
| 6 | 1 | - | - |
| 07 | 3 | - | - |
| 8 | 1 | - | - |
| 9 | 2 | - | - |
| 10 | 3 | - | - |
| 11 | 1 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01 | 2 | 2 tasks | 2 files |
| Phase 02 P01 | 4 | 3 tasks | 10 files |
| Phase 02 P02 | 4min | 3 tasks | 12 files |
| Phase 02 P03 | 3min | 3 tasks | 5 files |
| Phase 02 P04 | 3min | 3 tasks | 10 files |
| Phase 03 P01 | 2 min | 2 tasks | 4 files |
| Phase 03 P02 | 6min | 3 tasks | 5 files |
| Phase 03 P03 | 3min | 2 tasks | 4 files |
| Phase 03 P04 | 6min | 3 tasks | 7 files |
| Phase 05 P01 | 3min | 2 tasks | 6 files |
| Phase 05 P02 | ~6min | 2 tasks | 12 files |
| Phase 05 P03 | 4min | 2 tasks | 3 files |
| Phase 06 P01 | 4 | 3 tasks | 4 files |
| Phase 07 P01 | 25m | 2 tasks | 2 files |
| Phase 07 P02 | ~15m | 2 tasks | 3 files |
| Phase 07 P03 | ~20m | 3 tasks | 5 files |
| Phase 08 P01 | 9 min | 3 tasks | 5 files |
| Phase 09 P01 | ~15m | 2 tasks | 31 files |
| Phase 09 P01 | ~15m | 2 tasks | 31 files |
| Phase 09 P02 | 8min | 2 tasks | 1 files |
| Phase 10 P01 | 10min | 3 tasks | 4 files |
| Phase 10 P02 | 6m | 1 tasks | 1 files |
| Phase 10 P03 | 5m | 1 tasks | 1 files |
| Phase 11 P01 | 18min | 3 tasks | 5 files |
| Phase 12 P01 | ~50m | 5 reqs | 17 files |
| Phase 13 P01 | — | 8 reqs | ~600 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap v2.0]: v2.0 continues phase numbering at 7 (does NOT reset) — Phases 7–11 map one REQ-category each: SYNC→7, NEUTRAL→8, CMD→9, DOCS→10, ACCEPT→11. Strict dependency chain: 1.6.1 re-vendor (7) is the foundation; model neutralization (8) lands before command expansion so new commands emit clean; expansion (9) grows the roster through the same capability-map gate; docs (10) are written only once the final command set + neutralization exist (MAINTAINING runbook sourced from Phase 7's real re-vendor); the acceptance delta (11) is insert-only over the frozen v1 AC-01..AC-26. All v1 cross-cutting principles carry forward unchanged.
- [Roadmap v2.0]: Model-neutrality is verified by a zero-literal INVARIANT assertion (zero model literals per regex across the whole emitted `.bob/` set), NOT byte-golden — absence-of-X is a cleaner, more durable contract than exact bytes. The ~231 model mentions live in the vendored 1.6.1 payload and flow through the converter; gsd-bob's own code already carries zero model literals.
- [Roadmap]: Test-deferred model — no live Bob exists on the dev device (and never will). Every phase's success criteria must be verifiable WITHOUT a live Bob (doc-conformance, golden/unit tests against the artifact contract, or Claude-runtime equivalence), and every phase contributes device-runnable steps to one consolidated acceptance checklist run once on hardware in Phase 6.
- [Roadmap]: Phase 1 reframed from an empirical "Bob Capability Spike" to a documentation-grounded "Bob Capability Mapping" — it can no longer demonstrate anything against a live Bob, so for each primitive it reviews the docs, records a conservative lower-bound default (assume NO isolated subagents → sequential inline; assume NO structured prompts → text_mode), and authors a device-runnable verification step.
- [Roadmap]: New final Phase 6 "On-Device Acceptance Verification" owns VERIFY-01/02 — the consolidated acceptance checklist plus the single unattended pass the user runs on a real Bob machine, including a mechanism to log assumptions that proved wrong as follow-ups.
- [Roadmap]: Runtime foundation and artifact translation combined into Phase 2 (coarse granularity) — the runtime descriptor is part of the same emitter component, so they ship together as the irreducible core.
- [Roadmap]: Upstream-readiness (UP-01/UP-02) folded into Phase 5 alongside the quality gates rather than given its own phase — it is a cross-cutting final audit that reads cleanest as the ship-ready close.
- [Phase 1]: Resolved all four Bob SPIKEs from live bob.ibm.com/docs into CAPABILITY-MAP.md (fixed-schema rows: citation + verbatim quote + confidence + state per row). Locked SPIKE-01 (sequential inline) and SPIKE-02 (text_mode) defaults recorded and sourced, not relitigated.
- [Phase 1]: SPIKE-04 split into 3 sub-findings: config home ~/.bob (Documented/HIGH), config-home env override dropped (UNKNOWN/LOW), IDE-vs-Shell via BOB_SHELL_CLI_IDE_SERVER_PORT (MEDIUM). No machine-readable bob descriptor built (D-03 deferred to Phase 2).
- [Phase 1]: Established D-07 cross-phase append convention — .planning/ACCEPTANCE-CHECKLIST.md at planning root, seeded read-only AC-01..AC-04, append target for Phases 2-6, run target for Phase 6.
- [Phase ?]: Bob skill converter never early-returns on missing frontmatter (emits empty description) so Bob does not silently ignore the skill
- [Phase 02]: mergeCustomModes filter is slug-equality scoped — a differently-named gsd-* slug is retained, not blanket-wiped
- [Phase ?]: bob runtime defaults workflow.text_mode:true via install-written .planning/config.json (Phase 3 installer must write it); TRANS-03 by reuse of gsd-core config+workflow seam, no converter rewriting
- [Phase ?]: SUPPORT-ROSTER.md generated from the bob-adapter gate (scripts/generate-support-roster.cjs), never hand-maintained (T-02-10)
- [Phase 02]: convertClaudeToBobContent mirrors the Antigravity content pass retargeted to the .bob home (global ~/.bob, local .bob) and translates gsd:->gsd-; backend-agnostic (no neutralizeAgentReferences); applied to both Bob converters — closes the TRANS-01/02 BLOCKER.
- [Phase 02]: bob-adapter fails loud: mergeCustomModes throws on a non-mapping YAML root (never drops the gsd mode); gateArtifact rejects null/nameless candidates; buildSupportRoster never emits an undefined: line (TRANS-04/05).
- [Phase 03]: Installer CLI plumbing (args/scope/report) is dependency-free — args.cjs hand-parses argv with no --clean/--update flag; scope.cjs delegates global resolution to the vendored getGlobalConfigDir('bob', …) and never reimplements path math.
- [Phase ?]: [Phase 03]: stage.cjs sources the vendored gsd-core/ payload exclusively from repoRoot (the gsd-bob package root), never cwd/workspaceRoot; a missing payload fails loud (cwd-independent under npx)
- [Phase ?]: [Phase 03]: config-merge.mergeTextMode is the SOLE text_mode guarantee; MERGEs into root-anchored .planning/config.json, never clobbers an unparseable user config
- [Phase ?]: [Phase 03]: orphan prune only touches installer-created dirs; untracked user paths and .planning/ are never removed
- [Phase ?]: [Phase 03]: bin/gsd-bob.cjs gates the text_mode merge on an existing workspace .planning/; a global install in a non-project cwd skips the write and emits a KNOWN-LIMITATION note (no stray .planning/, D-14/Q1)
- [Phase ?]: [Phase 03]: uninstall is manifest-driven — un-merge merged slices (custom_modes via adapter, config.json inline JSON), hash-match delete file entries, never delete .planning/ (D-06/D-07)
- [Phase 05]: Phase 5 quality gates port by conversion (D-01) — vendor 4 command sources; unchanged installer auto-emits commands+skills
- [Phase 05]: Roster candidate set derived from commands/gsd/*.md (D-06) — drift-proof, matches installer renderRoster; 4 quality gates Supported, zero new skip (D-03)
- [Phase ?]: [Phase 05]: UP-01 discharged as audit-not-refactor (D-07); UPSTREAM.md records the 5-artifact move inventory with verified file:line pointers + gsd-core 1.5.0; no code moved
- [Phase ?]: [Phase 05]: README skill list sourced from generated SUPPORT-ROSTER.md (never hand-typed); AC-22..26 appended one-per-SC in the AC-17..21 schema, AC-01..21 untouched
- [Phase 06]: Coverage matrix is a standalone phase-dir file (D-01) keeping the frozen checklist untouched; a hermetic acceptance-coverage.test.cjs re-derives REQUIREMENTS v1 IDs + checklist Confirms family-regex tokens at run time and fails on any orphan SC/AC (no frozen ID list).
- [Phase 06]: AC-15 uninstall ordered LAST as teardown (D-03); FU-03 SPIKE-04 config-home links a descriptive proposed enhancement (no invented v2 ID, Pitfall 5); followups presence test is structural only (does not assert rows stay 'unconfirmed').
- [Phase 07]: 07-01: apply-bob-patches.cjs embeds bob blocks as per-line JSON.stringify arrays (byte-perfect, readable); six-delta model confirmed correcting D-01
- [Phase ?]: Phase 07-02 re-vendor: nuke-and-restage curated gsd-core/ subset from immutable 1.6.1 tarball; re-inject six deltas via apply-bob-patches.cjs; preserve stock upstream 1.5.0 comment in legacy-cleanup.cjs to keep idempotency + restage integrity
- [Phase ?]: UPSTREAM.md inventory grew 5 to 6 artifacts: documented the runtime-name-policy.cjs FALLBACK_ALIASES bob entry; corrected the converter framing to reflect a vendored hand-edit not stock upstream
- [Phase ?]: Phase 8 model-neutralization: one shared SOURCE regex in bob-adapter.cjs powers both neutralizeModelReferences and the NEUTRAL-03 invariant (D-03); scope locked to emitted converted set, raw payload excluded (D-01)
- [Phase ?]: acceptance-coverage.test.cjs Open Q1 resolved via option (a): fixed boundary to '## Milestone v2.0 Requirements' and added a declared-id (v1+v2.0) phantom-ref set so AC-27 -> NEUTRAL-03 is admitted while typos still fail
- [Phase ?]: Two-roster divergence Option A: CMD-02 verified against repo-root generated SUPPORT-ROSTER.md + count==28, not the installed 5-entry renderRoster list; stage.cjs untouched
- [Phase ?]: [Phase 10-01]: COMMANDS.md is generated (scripts/generate-command-reference.cjs) from commands/gsd/*.md frontmatter, never hand-authored — blurbs trace verbatim to source and the D-03 conformance guard keeps README + COMMANDS pinned to the generated SUPPORT-ROSTER Supported set.
- [Phase ?]: [Phase 10-01]: README cluster subheads are h3 so ## Flagged gaps stays the first h2 after ## Supported skills; package.json files allowlist untouched (D-07) — COMMANDS/ARCHITECTURE/MAINTAINING stay repo-only.
- [Phase ?]: ARCHITECTURE.md cites live src/bob-adapter.cjs + stage.cjs symbols; deleted CAPABILITY-MAP.md referenced only as git-recovered history (D-05)
- [Phase ?]: Authored MAINTAINING.md as a replayable version-bump checklist (D-06); kept <old>/<new> placeholders; excluded from package.json files allowlist (D-07)
- [Phase 12]: Bob's shipped 2.0.1 bundle is the authority over its own docs. Where the two conflict, the bundle wins — it is what runs. Two of Phase 12's findings contradicted the docs and one contradicted a July correction; all three were settled by reading the shipped code, not by re-reading pages.
- [Phase 12]: The global/local custom-modes path is ASYMMETRIC (global `settings/custom_modes.yaml`, local `.bob/custom_modes.yaml`) and owned solely by `modesRelPathForScope()`. Never re-inline the literal — writing the global mode to the home root yields a file Bob silently ignores.
- [Phase 12]: Bob validates mode `groups` as an OPEN string union, not an enum. Invalid group names load without error and grant no tool, so the emitted set must be pinned by test — a schema error will never catch it.
- [Phase 12]: `BOB_CAPABILITY_DECL` is exported once from `src/bob-adapter.cjs` and imported by the staging engine and all three generators. It was previously four hand-copied literals whose comments each claimed to be the same declaration.
- [Phase 13]: Target gsd-core **1.14.0**, not the roadmap's 1.10.0 — latest is what users get, and nothing in 1.11–1.14 removes a surface gsd-bob uses (D-01).
- [Phase 13]: **Bob 2.0.x only** (user decision). 1.0.x has no skills and no subagents, so only `.bob/commands/` + the mode would load; 2.0.0 requires a fresh install anyway. No installer version probe and no 1.0.x test matrix (D-05).
- [Phase 13]: The six-delta model is now **nine** — `VALID_CONVERTER_NAMES` allowlist entries, `.bob` probes in the `gsd_run` resolver preamble, and the per-install `gsd-core/.gsd-runtime` marker. `apply-bob-patches.cjs` gained `preflight()` (before the first write) and `verifyAll()` (after the run) because the 1.6.1-era script aborted half-applied on an anchor upstream had deleted in 1.7.0 (D-08).
- [Phase 13]: `workflow.use_worktrees: false` is seeded at install alongside `text_mode` and `context_window`, from one `BOB_OWNED_CONFIG` declaration, and un-merged on uninstall. 1.14.0's execute-phase isolation gate exits FATAL on `dispatch.isolation: "none"` without it; Bob has no git-worktree primitive, so this preserves 1.6.1 behaviour rather than changing it (D-04).
- [Phase 13]: Runtime identity lives in the payload marker `gsd-core/.gsd-runtime`, **never** in `.planning/config.json` — that file is the cross-runtime interchange surface and must not pin a runtime.
- [Phase 13]: Global installs emit absolute `<target>/gsd-core/...` refs (converters take `isGlobal`; `absolutizeGlobalHome()` rewrites `~/.bob/`), local installs keep the workspace-relative form (D-07).
- [Phase 13]: Keep `commands/gsd/*.md` as the conversion source rather than switching to upstream's pre-hyphenated `skills/` tree — `argument-hint` parity, zero churn to goldens/roster/generators. Recorded as a future simplification (D-03).
- [Phase 13]: NEUTRAL-04 is deferred to its own Phase 18, recorded rather than silently dropped (D-10) — **then executed the same day as Phase 13's second pass**, once it became clear the fix was one stage-time transform rather than 31 prose rewrites.
- [Phase 18]: **`context_window` is seeded at 200000, not 270000 — the FLOOR of Bob's own range, not the ceiling.** Bob's 2.0.0 release notes give the runtime window as *"200,000 to 270,000 tokens"*; which end applies depends on the backend Bob routes the session to, and Bob owns that routing, so the adapter cannot know it at install time. gsd-core keys read-depth and advisory scaling on this integer, so seeding the floor is correct on every backend while the ceiling overflows on the smaller ones. Supersedes the v0.2.x–v0.3.0 value.
- [Phase 18]: **`resolve_model_ids: "omit"` is seeded** — Bob owns model routing, and gsd-core's own installer writes this for every non-reference runtime. With it, workflow dispatches carry **no** model parameter (a capability-tier alias would 404 on a host with no native tier names) and no flow asks the user to pick a model. This is the config half of NEUTRAL-04; the seeds are now FOUR keys from one `BOB_OWNED_CONFIG` declaration.
- [Phase 18]: **Neutralization happens at STAGE time, not in the vendored tree.** `bobifyRuntimeDoc` rewrites every markdown the model reads — converted commands/skills *and* the vendored `gsd-core/{workflows,references,templates,contexts}` tree — as it is copied: upstream host paths re-pointed at this install (scope-aware, which is *why* it cannot live in the tracked payload: only the copy knows the scope), the 19-runtime `gsd_run` resolver preamble replaced by a Bob-only one, upstream's `filterRuntimeNotesForTarget(…, 'bob')` dropping other hosts' notes, and agent/vendor/model names neutralized in prose and in every non-shell fenced block. Keeping the tracked tree upstream-shaped also keeps the re-vendor replay small.
- [Phase 18]: **The shell-fence residual is deliberate and bounded by test.** Inside a shell fenced block only comment and `echo`/`printf` lines are neutralized; ~130 bare identifiers (`case … in <runtime-id>)` arms, dead env-var probes, `--<runtime>` tokens in a command line) are left exactly as upstream wrote them, because renaming them could **activate another host's branch** on Bob or leave a live arm under a misleading name. `test/agent-neutrality.test.cjs` counts the residual and fails if it grows, so a transform that silently stops running is caught.
- [Phase 18]: **Every name table in the adapter is base64-decoded at load**, so the neutral module carries no bare brand literal in source — the same discipline as the model-tier tokens. A new upstream runtime/vendor/model name must be added to those tables or it passes straight through to the model; `MAINTAINING.md` step 11 carries that as a standing bump step.
- [Phase 18]: **gsd-bob's own docs follow the same rule**, with exactly two declared exceptions: `UPSTREAM.md`'s inventory tables and `MAINTAINING.md`'s anchor table may quote upstream symbol names, registry keys and grep anchors verbatim, because they exist to point a gsd-core maintainer at gsd-core's own code (and `preflight()` greps those anchors byte-for-byte). Each file says so once. Historical planning records — phase summaries, research, quick-task records, ACCEPTANCE-* — are **not** rewritten; history stays as written.
- [Phase 13]: External/pluggable runtime descriptors are a verified **NO-GO** — every module that resolves a runtime requires the frozen `capability-registry.cjs` directly and never calls `capability-loader.cjs`'s `loadRegistry`. The vendored hand-patch stays; the upstream contribution shape is `capabilities/bob/capability.json` + a regenerated registry.
- [Phase 12]: Roster candidates must all be real emitted artifacts — the synthetic `gsd-parallel-fanout` exemplar was removed. The gate's flag/skip path is proven by unit tests, not by a fictional roster row.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- **No live Bob 2.x on the dev device — AGAIN, as of 2026-09-16.** The machine now carries Bob Shell **1.0.4**, the generation gsd-bob declares unsupported (no skills, no subagents); the 2.0.1 install Phase 12 verified against is gone. Phase 12's findings stand — they were read out of the shipped 2.0.1 bundle and are recorded in `12-BOB2-EVIDENCE.md` — but **live 2.x verification is deferred again** (Phase 17 / ACCEPT-04), and Phase 13 was verified hermetically. `structuredPrompts: false` remains the one primitive that has never been observed either way. The 1.0.4 install is SSO-authenticated, so headless `bob run` probes would need `BOB_API_KEY`.
- Backend-neutrality, the flag-gap contract, and `.planning/` root-anchoring are cross-cutting constraints established in Phase 2 and enforced through every later phase — including all of v3.0.
- ~~**v3.0 P0 — tool-group contradiction.**~~ **RESOLVED in Phase 12.** Both doc pages describe real behaviour: `command` is a back-compat alias Bob 2.0.1 normalizes to `execute`. `260707-ey1`'s change was correct but its rationale was wrong — the seam was never dead (FU-06). The real hazard found underneath it: `groups` validates as an open string union, so a genuinely invalid group is accepted silently and grants no tool.
- **NEW P0 found and fixed in Phase 12 — global installs emitted an invisible mode.** Bob 2.0 reads `~/.bob/settings/custom_modes.yaml`; gsd-bob wrote `~/.bob/custom_modes.yaml` (FU-05). Every global install through v0.2.2 is affected: the GSD mode never appeared and no error was raised. **The dev machine's own `~/.bob` still carries the broken v0.2.2 layout** — it needs a re-install before any live-session verification (BOB2-03's in-session leg, ACCEPT-04) can run.
- **v3.0 constraint (2026-08-13, operator):** gsd-bob must never mention any model *or agent* other than Bob, and must not ask the user to select a model during GSD configuration. Tracked as NEUTRAL-04 → **Phase 18** (moved out of Phase 13 as D-10, 2026-09-16). The offending text lives in the vendored payload, so it had to wait for the 1.14.0 re-vendor; that is now done, and the 2026-08-13 inventory should be re-measured against the 1.14.0 emission before any rewriting starts.
- ~~**v3.0 dependency risk:** Phase 13's re-vendor is the payload foundation for Phases 14–17~~ **DISCHARGED 2026-09-16** — the payload is on one consistent `1.14.0` (`gsd-core/VERSION`; no `1.6.1` residue outside the stock `legacy-cleanup.cjs` comment), with idempotency proven by a second patch-script run leaving the tree byte-identical.
- **Phase 14 is blocked on missing documentation.** `.bob/agents/` persona files are not documented anywhere — the page was withdrawn (404) — and no page describes a persona format or its frontmatter. Emitting into that directory would be guessing. Also unresolved: 34 `gsd-*.md` persona files dated 2026-06-17 sit in `~/.bob/agents/` and are not in any gsd-bob manifest.
- **Phase 17 is blocked on hardware** — see the Bob 1.0.4 note above.
- **v3.0 two-upstream drift:** gsd-bob is pinned to both gsd-core and Bob's documented surface, and both moved (4 minor versions and 1 major respectively). Syncing one against a stale model of the other is exactly how the `command`/`execute` regression happened — hence Bob verification (12) precedes the re-vendor (13).
- Several repo citations still point at `bob.ibm.com/docs/ide/...` pages for claims about Shell behavior. Bob 2.0 now publishes Shell-specific equivalents; Phase 12 should re-point them.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260619-ncs | Fix installer to stage gsd-core siblings (scripts/fix-slash-commands.cjs + synthesized package.json) so the staged `.bob/` shim loads out-of-tree; out-of-tree regression test added. On-device find during the Phase 6 acceptance pass. | 2026-06-19 | be4002a | [260619-ncs](./quick/260619-ncs-fix-gsd-bob-installer-to-stage-gsd-core-/) |
| 260619-ou0 | Prepare first npm publish: add `package.json` `files` allowlist (bin/, src/, gsd-core/, commands/, scripts/, README.md, LICENSE) + MIT LICENSE file. `npm pack` verified clean (no .planning/, test/, or .tgz; 405 files, 1.3 MB). Does not publish (login user-driven). | 2026-06-20 | 5e5686b | [260619-ou0](./quick/260619-ou0-npm-publish-packaging/) |
| 260704-gmp | Bump version 0.1.2 → 0.2.0 for the milestone v2.0 release (1.6.1 sync, model neutralization, 28-command expansion, docs). `npm pack --dry-run` verified clean (0 .planning/test/.tgz entries; 445 files, 1.5 MB). Does not publish (user-driven `npm publish`). | 2026-07-04 | c18a156 | [260704-gmp](./quick/260704-gmp-bump-version-0-1-2-to-0-2-0-and-verify-n/) |
| 260706-j81 | Seed Bob's 270k context window into the installer config + document it. `mergeTextMode` now seeds top-level `context_window: 270000` (alongside `text_mode:true`) into `.planning/config.json` so gsd-core's read-depth/advisory scaling matches Bob's real shared window under sequential-inline execution (was silently defaulting to 200k). ARCHITECTURE.md (Axis 2) + README.md (Flagged gaps) updated. Tests 7/7. | 2026-07-06 | 4d25e93 | [260706-j81](./quick/260706-j81-seed-bob-270k-context-window/) |
| 260706-jwe | **Deliberate v2.0 re-baseline of the Phase 11 frozen AC-01..26 snapshot** (governance amend). Corrected the stale install package name `@opengsd/gsd-bob` → `@zack-maz/gsd-bob` in ACCEPTANCE-CHECKLIST.md (1 preamble + 4 in frozen steps AC-13..16) and regenerated the byte-exact freeze fixture in lockstep so the insert-only guard passes against the NEW baseline. Knowingly moves the frozen baseline — accountability is this task + commit, not the byte-freeze. All 3 acceptance guards green; full suite 321/1 (only pre-existing CORE-02). | 2026-07-06 | 0f1f0e2 | [260706-jwe](./quick/260706-jwe-rebaseline-frozen-ac13-16/) |
| 260707-ey1 | **Fix two P0 Bob-adapter bugs from HANDOFF-bob-docs-verification.md (full correction).** BUG 1: `emitGsdMode()` emitted invalid tool group `command` → `execute` (Bob has no `command` group; the gsd_run seam was dead) + valid-group-set freeze test. BUG 2: refuted "Bob runs subagents sequentially inline" — renamed primitive `isolatedSubagents` → `parallelSubagentFanout` (kept false) across all 12 coupling sites, un-gated `gsd-autonomous` (Bob HAS isolated subagents), regenerated SUPPORT-ROSTER (1 unsupported, 28 supported), re-baselined frozen AC-01+AC-10 in lockstep. Doc-model corrections folded into CLAUDE.md/README/ARCHITECTURE. Tests 323/320/3 (same 3 pre-existing fails, none new). Released as v0.2.2. | 2026-07-07 | 5019e6f..af6e5c1 | [260707-ey1](./quick/260707-ey1-fix-two-p0-bob-adapter-bugs-invalid-comm/) |
| 260707-fast | Update IBM-themed cover (covers/gsd-bob-architecture-ibm.svg) to the v0.2.2 capability model, two passes. Pass 1: "28 emitted · 1 withheld", corrected the refuted subagent claims. Pass 2 (info redesign): dropped the synthetic `gsd-parallel-fanout` exemplar chip from the cover (test fixture, not a real skill — misleading on a hero image); withheld nuance moved into a one-line gate caption; freed row now carries the byte-identical `.planning/` artifact-contract chip + solo isolation-confirmed chip; added `v0.2.2` version stamp; removed orphaned red legend/class. Claims verified against live bob.ibm.com/docs/ide/features/subagents. SVG well-formed. (gsd-fast, no plan dir) | 2026-07-07 | 45951e4, bb267aa | — |
| 260708-cvr | Full IBM cover redesign (covers/gsd-bob-architecture-ibm.svg) per improving-covers-plan.md: newcomer explainer strip + de-jargoned labels; 3-tier hierarchy (one 20px hero per band, 11px type floor); Carbon 8px-grid pass. New scripts/render-covers.cjs (PNG export with locally installed IBM Plex → covers/png/, fixes GitHub `<img>` font fallback) + scripts/stamp-covers.cjs (version + gate-derived emitted/withheld stamped into data-stamp tspans, --check drift mode — cover facts generated, never hand-kept). Removed stale tactical-HUD variants (gsd-bob-architecture.svg, -mono.svg): refuted "2 withheld / no isolated subagents" claims, v0.1.1 stamp. IBM cover is now the single maintained cover. | 2026-07-08 | 7a42bc1 | — |
| 260708-exec | New executive companion cover (covers/gsd-bob-executive-ibm.svg + rendered PNG) for IBM-side stakeholders: same Carbon system as the architecture cover (masthead, 8-bar motif, palette, 3-band layout) with content swapped for business value + strategic story — three value cards (plans-before-code audit trail, one-command adoption, zero lock-in), plain-language 3-step install flow (playbook → automatic conversion → native in Bob; only tech residue is the npx pill + one `/gsd-new-project` example), and an upstream-path timeline (shipped adapter → upstream contribution → first-class Bob runtime) replacing the 6-piece merge inventory. Version + emitted/withheld are data-stamp tspans (stamp-covers --check green); PNG via render-covers.cjs; xmllint clean. Architecture cover untouched. (gsd-fast, no plan dir) | 2026-07-08 | fb0bf91 | — |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-13
Stopped at: Milestone v3.0 defined (requirements + roadmap written, uncommitted)
Resume file: .planning/ROADMAP.md

## Session Continuity (v3.0)

Last session: 2026-09-16 — Phase 13 executed end to end (re-vendor + installer + tests + docs + planning record), on branch `update/bob-latest-gsd-core`, **uncommitted**.
Resume file: `.planning/phases/13-gsd-core-1-14-0-re-sync/13-01-SUMMARY.md`
Also read: `13-REVENDOR-NOTES.md` (the real replay log + every golden justification) and the four `research/260916-*.md` reports (they supersede `research/v3.0-UPSTREAM-DELTA.md`).

## Operator Next Steps

- **Review the Phase 13 branch** (`update/bob-latest-gsd-core`, six local commits ending in `chore(release): v0.3.0`) and decide on tag / push / `npm publish` (npm login is required on this machine — `npm whoami` returned E401)
- **Publish 0.3.0** — the RESYNC-06 global-path fix and the `use_worktrees` seed both affect real installs (without the seed, `/gsd-execute-phase` is dead on 1.14.0); npm still serves 0.2.2 (0.2.3 was never published)
- **Get a Bob 2.0.x install back on the device** to unblock Phase 17 / ACCEPT-04. The current Bob Shell is 1.0.4, which gsd-bob does not support
- **Re-install gsd-bob into the live `~/.bob` once Bob 2.x is back** — the existing global install predates both the BOB2-04 modes-path fix and the RESYNC-06 absolute-path fix: `node bin/gsd-bob.cjs --bob --global`. Expect a Bob-home approval prompt (2.0.1+ never auto-approves `~/.bob` writes)
- `/gsd-plan-phase 18` for NEUTRAL-04, or `/gsd-plan-phase 15` for the MCP seam — those are the two unblocked phases
- Resolve the provenance of the 34 `gsd-*.md` persona files already in `~/.bob/agents/` (dated 2026-06-17, not in the gsd-bob manifest) before Phase 14 emits into that directory
- Planning docs are **uncommitted** (`commit_docs: false` in config) — commit them by hand
- Outstanding (housekeeping, no longer blocking): v2.0's phase directories (`.planning/phases/07-…` through `11-…`) are still in the live phase tree rather than archived under `.planning/milestones/v2.0-phases/`. Nothing is lost — unlike v1's, they were never deleted
