# GSD for IBM Bob (gsd-bob)

## What This Is

A standalone, installable adapter package that makes **open-gsd** — the GSD ("Getting Stuff Done") spec-driven planning framework, today a Claude Code skill/agent system — run natively inside **IBM Bob** (bob.ibm.com). It audits GSD's primitives (slash commands, subagents, workflows, templates), maps Bob's extension architecture, and translates GSD into Bob-native artifacts that work regardless of which model backend Bob routes to (Claude Code CLI, Gemini, etc.). It ships with a one-line npx installer (local/global scope, update/clean modes) and is built clean enough to eventually be contributed upstream as a first-class Bob runtime in gsd-core.

## Core Value

A Bob user can install via a single command and run the full GSD planning loop — new-project → plan-phase → execute-phase → verify — natively, producing the same `.planning/` artifacts GSD produces in Claude Code.

## Current State

**Shipped:** v2.0 — 1.6.1 Sync & Command Expansion (2026-07-06). Published to npm as `@zack-maz/gsd-bob@0.2.1`; the current released version is `0.2.3`.

**In progress (uncommitted, branch `update/bob-latest-gsd-core`):** gsd-bob now vendors gsd-core **1.14.0** on one consistent version, emits **31** model-neutral commands (grown from 10 → 28 → 31), and targets **Bob 2.0.x**. It is documented to a maintainer standard (README, generated per-command `COMMANDS.md`, `ARCHITECTURE.md`, a `MAINTAINING.md` runbook corrected from the real replay, and an `UPSTREAM.md` 9-artifact inventory). The installer seeds three adapter-owned keys into `.planning/config.json` — `workflow.text_mode`, `workflow.use_worktrees: false` (1.14.0's isolation gate is FATAL without it) and Bob's real **270k** `context_window` — and global installs now emit absolute payload references. The consolidated on-device acceptance checklist (AC-01..AC-50) is assembled for the single unattended pass on Bob 2.x hardware.

**Milestones shipped:**
- **v1.0 — Bob Runtime & Core Loop** (Phases 1–6): install one-liner + full planning loop native in Bob, upstream-ready.
- **v2.0 — 1.6.1 Sync & Command Expansion** (Phases 7–11): 1.6.1 re-vendor, model neutralization, 10→28 command expansion, maintainer docs, acceptance delta.

## Current Milestone: v3.0 Bob 2.0 & gsd-core 1.14 Re-baseline

**Goal:** Re-baseline gsd-bob onto both upstreams at once — gsd-core **`1.14.0`** and **Bob 2.0.x** (Bob Shell 2.0.0–2.0.4, Bob IDE 2.x) — and settle the assumptions v1/v2 could only defer. The milestone opened against gsd-core `1.10.0`; upstream shipped 1.11.0–1.14.0 before the re-sync ran, so Phase 13 re-baselined onto 1.14.0 (Phase 13 D-01) and narrowed the host target to Bob 2.0.x only, since 1.0.x has neither skills nor subagents (D-05, user decision 2026-09-16).

**Target features:**
- Re-verify every Bob surface assumption against a **live Bob Shell 2.x** install, resolving the `command`-vs-`execute` tool-group contradiction that gates the `gsd_run` seam
- Re-vendor the gsd-core payload `1.6.1 → 1.14.0` (**nine** Bob deltas re-applied with a preflight and a post-verify, the descriptor re-shaped to what 1.14.0's own validator requires, neutrality invariant re-run, MAINTAINING runbook rewritten from the real replay)
- Adopt the Bob 2.0 surfaces that did not exist before: `AGENTS.md` context and lifecycle hooks — *`.bob/agents/` personas are blocked: the Bob page documenting them was withdrawn (404), so there is no persona contract to emit against*
- Wire gsd-core's companion MCP server into Bob via `bob mcp add` as a second integration surface
- Spike whether `bob` can become an **external/pluggable runtime descriptor** under 1.14.0's trust gate, retiring the vendored `capability-registry.cjs` hand-edit — *answered **NO-GO** in Phase 13: every runtime-resolving module reads the frozen registry directly*
- Run the deferred on-device acceptance pass for real, and re-baseline the checklist for Bob 2.0

**Key context:** Bob Shell 2.0.0 is a major release requiring a fresh install (no 1.0.x upgrade path). Most of the emission contract survives it — `.bob/skills/<name>/SKILL.md` and `.bob/commands/*.md` are unchanged — so this is a re-baseline, not a rewrite. Two exceptions were found and fixed: the **global** custom-modes file moved to `~/.bob/settings/custom_modes.yaml` (Phase 12 — every global install through v0.2.2 wrote a mode Bob silently ignored), and global installs were emitting workspace-relative `.bob/gsd-core/...` references that do not exist under `~/.bob` (Phase 13, RESYNC-06). Verified deltas and citations: the four 2026-09-16 reports in [`research/`](./research/), which supersede [`research/v3.0-UPSTREAM-DELTA.md`](./research/v3.0-UPSTREAM-DELTA.md).

## Requirements

### Validated

- [x] Port quality-gate skills to Bob: review, debug, audit (the daily-driver subset beyond the core loop) — *Validated in Phase 5: Quality Gates & Upstream Readiness (QUAL-01/02/03)*
- [x] Keep the adapter contribution-ready so it can later be proposed upstream to open-gsd/gsd-core as a supported Bob runtime — *Validated in Phase 5 (UP-01/UP-02: README + UPSTREAM.md 5-artifact move inventory, backend-neutrality grep green, gsd-core 1.5.0 recorded)*
- [x] Audit open-gsd/gsd-core primitives and define a backend-agnostic translation layer — *Validated across Phases 1–2 (SPIKE/RUNTIME/TRANS)*
- [x] Port the core planning loop to Bob (new-project, plan-phase, execute-phase, verify, progress) — *Validated in Phase 4 (CORE-01..05)*
- [x] Parity-first primitive mapping with explicit flag/skip for unsupported primitives — *Validated in Phase 2 (TRANS-04) and enforced through Phase 5*
- [x] One-line npx/Node installer with local/global scope and clean/update modes; standalone `gsd-bob` package with own versioning — *Validated in Phase 3 (INSTALL-01..05)*
- [x] End-to-end: install one-liner + full planning loop native in Bob + upstream-ready — *v1.0 milestone complete (Phases 1–6, 15 plans); on-device acceptance checklist assembled in Phase 6 (VERIFY-01/02)*
- [x] Re-vendor the gsd-core payload to 1.6.1 on one consistent version and re-validate the Bob integration against the new bin layer — *Validated in Phase 7 (SYNC-01/02/03)*
- [x] Neutralize all model references in emitted artifacts (structural directives + inline prose), verified by an invariant assertion — *Validated in Phase 8 (NEUTRAL-01/02/03)*
- [x] Expand the curated emitted command set from 10 to 28, each capability-map-gated — *Validated in Phase 9 (CMD-01/02/03)*
- [x] Document the adapter to a maintainer standard: README, per-command reference, architecture (Bob vs open-gsd), and a gsd-core version-bump runbook — *Validated in Phase 10 (DOCS-01/02/03/04)*
- [x] Extend the on-device acceptance checklist to cover the new commands and the model-neutrality invariant — *Validated in Phase 11 (ACCEPT-01/02)*

### Active (v3.0)

- [x] Re-verify all Bob surface assumptions against a live Bob Shell 2.x install; resolve the custom-mode tool-group contradiction and pin the verified set by test — *Validated in Phase 12 (BOB2-01..05)*
- [x] Re-vendor the gsd-core payload to 1.14.0 on one consistent version, re-applying the (now nine) Bob deltas and re-running the model-neutrality invariant — *Validated in Phase 13 (RESYNC-01..06, UP-03, DOCS-05)*
- [ ] Emit Bob 2.0 agent personas so subagent-dispatching workflows run isolated instead of inline — *NATIVE-02..05*
- [ ] Register gsd-core's companion MCP server in Bob and decide its relationship to the skills/commands surface — *MCP-01..03*
- [ ] Determine whether `bob` can become an external/pluggable runtime descriptor, retiring the vendored registry hand-edit — *DESC-01 (verdict NO-GO recorded in Phase 13; an upstream proposal is what remains)*
- [ ] Run the acceptance checklist against live Bob 2.x and re-baseline it for 2.0 — *DOCS-06, ACCEPT-03..05 (blocked: the dev device is back on Bob Shell 1.0.4)*
- [ ] Extend the neutrality invariant to agent/product brand names and selection prompts — *NEUTRAL-04, moved to its own Phase 18*

Still deferred beyond v3.0: the `transition` lifecycle command, `ai-integration-phase`, the knowledge-graph/mempalace cluster, and the actual upstream PR to open-gsd/gsd-core (MERGE-01 — v3.0's descriptor spike is groundwork for it, not the PR itself).

### Out of Scope

- Multi-backend-specific tuning per model (Gemini-specific, Claude-specific behavior) — v1 core is backend-agnostic; per-backend richness is deferred
- Rich "map to Bob-native equivalents" for primitives Bob lacks (e.g. deep mode/agent re-modeling of interactive prompts and subagents) — held as a later-milestone enhancement; v1 flags these gaps instead
- "Text mode" graceful-degradation fallback — not the v1 strategy (parity-first instead); may be revisited if parity proves too restrictive
- Full parity of all ~70 GSD skills — v1 is core loop + quality gates only; the long tail is deferred
- Merging upstream during v1 — the package ships standalone first; the actual PR/merge to gsd-core is a follow-on activity

## Context

- **GSD is self-hosting here**: this project is being planned *by* GSD running in Claude Code, so the source framework is directly inspectable at `~/.claude/gsd-core/` (skills, workflows, templates, agents, the `gsd-tools.cjs` CLI shim) and on GitHub at https://github.com/open-gsd/gsd-core.
- **gsd-core already abstracts runtimes**: its installer and shim already detect/support Claude, Codex, Gemini, Cursor, OpenCode, and others, and it has a `text_mode` concept for runtimes lacking `AskUserQuestion`. This is the existing seam a Bob runtime would plug into — useful both as a model for the standalone package and for the eventual upstream contribution.
- **IBM Bob** (bob.ibm.com) is the target host. Its extension/command/mode/agent architecture is the primary unknown and must be researched fresh from its docs before the translation design is locked.
- **Backend neutrality is a design principle**: Bob can drive multiple model CLIs; the GSD logic should not branch on which one. We emit Bob-native artifacts and let Bob route.
- **Open-source contribution is an explicit goal**, so naming, structure, and code quality should anticipate maintainer review from day one.
- **Development was test-deferred through v2.0**: with no Bob install on the dev device, v1/v2 leaned on Bob's official docs (bob.ibm.com) plus the close mapping to gsd-core's Cline/Cursor-family converters, choosing conservative lower-bound assumptions.
- **(v3.0) A live Bob Shell 2.0.1 install was available for Phase 12**, which is how the custom-mode tool group, subagent parallel fan-out and the absence of any `BOB_CONFIG_DIR` override were settled by observation rather than left as doc-derived defaults.
- **(2026-09-16) That install is gone — the dev device is back on Bob Shell 1.0.4**, the generation gsd-bob declares unsupported. Phase 12's findings stand (they were read out of the shipped 2.0.1 bundle and are recorded in `12-BOB2-EVIDENCE.md`), but Phase 13 was verified hermetically and the live-Bob acceptance pass is deferred again to Phase 17. `structuredPrompts: false` remains the one primitive never observed either way.
- **(v3.0) Bob Shell 2.0 is a major release** (fresh install required; no 1.0.x upgrade path) that nonetheless leaves gsd-bob's emission contract intact: `.bob/skills/<name>/SKILL.md` and `.bob/commands/*.md` are unchanged. What moved is settings (`~/.bob/settings/settings.json`), the **global** custom-modes file (`~/.bob/settings/custom_modes.yaml` — the project path is unchanged), the stock mode set (Code+Advanced → one Agent mode), and the addition of new surfaces (`AGENTS.md`, lifecycle hooks, `bob mcp add`).
- **(2026-09-16) `.bob/agents/` personas are undocumented.** The persona page was withdrawn (404) and no Bob page describes the directory, a persona format, or its frontmatter — so Phase 14 stays deferred rather than guessing a contract.
- **(2026-09-16) Bob 2.0.x is the only supported host.** Bob Shell 1.0.x has no skills and no subagents, so only `.bob/commands/` and the `gsd` mode would load. There is no installer version probe and no 1.0.x test matrix.

## Constraints

- **Compatibility**: Must produce the same `.planning/` artifact contract GSD produces today (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json, phase plans) so the two runtimes stay interchangeable.
- **Tech stack**: Installer is npx/Node, mirroring gsd-core's `npx @opengsd/...` pattern — cross-platform, familiar to existing GSD users.
- **Dependencies**: Bound to IBM Bob's actual extension capabilities (unknown until researched) and to gsd-core's evolving structure (it is the upstream source of truth).
- **Contribution-readiness**: Adapter must be structured and documented to a standard the open-gsd maintainers would plausibly accept.
- **~~No local Bob for testing~~ (lifted in v3.0)**: through v2.0, IBM Bob was unavailable on the development device, so all work was built against documented behavior plus conservative lower-bound assumptions, with device-runnable verification steps accruing to one deferred acceptance pass. **As of v3.0 a live Bob Shell 2.x install is available** — phases verify empirically, and any v1/v2 default that observation refutes is corrected rather than carried.
- **Two moving upstreams**: gsd-bob is pinned to both gsd-core (vendored payload) *and* Bob's documented surface. Either can move independently; drift on either side is a correctness risk, so re-baselining both together is the maintenance rhythm (v2.0 did 1.5.0→1.6.1; v3.0 does 1.6.1→1.14.0 plus Bob 1.0.x→2.0.x). Eight upstream minors in one jump also showed the cost of waiting: a patch anchor had been deleted five versions earlier and the descriptor had gone schema-invalid, both silently.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ship a standalone `gsd-bob` package first, upstream to gsd-core later | Move fast and prove the translation before negotiating a maintainer merge | — Pending |
| Research Bob's architecture fresh from its docs | Its internals aren't known; the translation design depends on them | — Pending |
| v1 scope = core loop + quality gates (not full parity) | Prove the pattern end-to-end on a useful subset before scaling to ~70 skills | — Pending |
| Backend-agnostic core; Bob owns model routing | Avoids per-model branching; keeps GSD logic portable | — Pending |
| Parity-first; flag gaps rather than degrade | Keep a high "native" fidelity bar for v1; defer rich Bob-native re-modeling | — Pending |
| npx/Node installer (local/global, clean/update) | Matches existing GSD install UX; lowest friction for current users | — Pending |
| Develop test-deferred against docs + conservative defaults; verify once on-device | No Bob on the dev device; assume the constrained lower bound (no isolated subagents, no structured prompts) so it runs anywhere, then validate on a Bob machine | — Pending |
| (v2.0) Full re-vendor to gsd-core 1.6.1 rather than cherry-picking content | One consistent payload version; curated commands and bin layer stay in lockstep; avoids a franken-version | ✓ Good — Phase 7 shipped a single-version 1.6.1 payload |
| (v2.0) Verify model-neutrality by invariant assertion (zero model literals in emitted `.bob/`), not byte-golden | Prose rewriting is fuzzy; absence-of-X is a cleaner, more durable contract than exact bytes | ✓ Good — NEUTRAL-03 zero-literal invariant holds over the full 28-command emission |
| (v2.0) Expand emitted commands 10 → 28 via curated high-value tier, not emit-all | Keeps the roster meaningful and lets each command earn a hand-written doc entry; parity-first gate preserved | ✓ Good — 28 commands emit, each rostered + doc'd |
| (v2.0) Author a MAINTAINING runbook sourced from Phase-1's real re-vendor | The vendoring model requires this dance every gsd-core release; a battle-tested playbook beats aspirational docs | ✓ Good — MAINTAINING.md distilled from the real 1.5.0→1.6.1 re-vendor |
| (v2.0 close) Seed Bob's real 270k `context_window` into `.planning/config.json` at install | Under sequential-inline execution the whole loop shares one window; gsd-core read-depth scaling defaulted to a too-low 200k | ✓ Good — installer seeds `context_window: 270000` (quick 260706-j81) |
| (v2.0 close) Publish under `@zack-maz/gsd-bob`; no `v2.0` git tag (release tags stay npm-aligned) | npm package is 0.2.1; a `v2.0` tag would imply a nonexistent 2.0.0 release | ✓ Good — milestone recorded in MILESTONES.md; release tag is `v0.2.1` |
| (v3.0) Re-baseline both upstreams in one milestone rather than splitting gsd-core and Bob into separate cycles | The two interact: what the 1.14.0 payload emits must satisfy Bob 2.0's actual surface. Syncing one against a stale model of the other is how the `command`/`execute` regression happened | — Pending |
| (v3.0) Verify Bob's surface **empirically first** (Phase 12), before the re-vendor | A live Bob 2.x is finally available; re-vendoring onto an unverified capability model would repeat v2.0's doc-derived mistakes at four versions' scale | — Pending |
| (v3.0) Treat the external/pluggable descriptor as a **spike with a go/no-go**, not a committed migration | Upstream's descriptor architecture moved substantially (ADR-1239, capability.json, agent-converter cutover); whether `bob` fits it is unknown until tested, and a failed migration would block the whole re-baseline | ✓ Good — answered **NO-GO** from source in Phase 13 without spending a migration; the hand-patch stays and `UPSTREAM.md` records the evidence |
| (Phase 13) Target **gsd-core 1.14.0**, not the roadmap's 1.10.0 | Latest is what users actually get, and nothing in 1.11–1.14 removes a surface gsd-bob uses | ✓ Good — one consistent 1.14.0 payload, idempotency proven |
| (Phase 13) **Bob 2.0.x is the only supported target**; 1.0.x is documented as unsupported (user decision, 2026-09-16) | 1.0.x has no skills and no subagents, so only commands + the mode would load, and leaving 1.0.x requires a fresh install anyway. Supporting it would buy a version matrix and an installer probe for a dead generation | ✓ Good — single-target artifact set, no probe, README says so plainly |
| (Phase 13) Keep `engines.node >= 22.15.0` despite upstream's `>= 24` | The only Node-24 API the payload reaches for (`RegExp.escape`) is feature-detected with an in-file fallback, and the vendored `bin` was executed on Node 22.15.0. `>=22.15.0` is the union with Bob Shell's own documented floor | ✓ Good — re-verified empirically; MAINTAINING makes it a standing step |
| (Phase 13) Seed `workflow.use_worktrees: false` at install rather than declaring `orchestrator-worktree` | 1.14.0's isolation gate exits FATAL on `dispatch.isolation: "none"`; Bob has no git-worktree primitive, and declaring `orchestrator-worktree` would need a verified headless-Bob `orchestratorExec` | ✓ Good — preserves 1.6.1 behaviour; the spike is recorded, not assumed |
| (Phase 13) Keep `commands/gsd/*.md` as the conversion source rather than switching to upstream's `skills/` tree | `argument-hint` parity and zero churn to goldens, roster and all three doc generators; upstream's pre-hyphenated skills are a future simplification | — Recorded, not adopted |
| (Phase 13) **Defer NEUTRAL-04 to its own phase** rather than bundling it into the re-sync | Fuzzy prose rewriting across 31 commands under a brand-new invariant, not required for 1.14.0 correctness, and easy to half-do inside a compatibility task | — Pending (Phase 18); recorded, not dropped |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-16 — Phase 13 closed. The milestone is re-targeted to gsd-core **1.14.0** (from 1.10.0) and to **Bob 2.0.x only**; the payload, installer, tests and docs are all on that baseline. NEUTRAL-04 split out into a new Phase 18. The "no local Bob" constraint is partially back: the dev device is on Bob Shell 1.0.4, so the live-Bob acceptance pass is deferred again to Phase 17. Delta research: the four `research/260916-*.md` reports.*
