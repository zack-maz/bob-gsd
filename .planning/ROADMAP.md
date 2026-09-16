# Roadmap: GSD for IBM Bob (gsd-bob)

gsd-bob makes the runtime-neutral GSD planning framework run natively inside IBM Bob, emitting the same `.planning/` artifact contract so Bob and Claude Code stay interchangeable. Backend-neutrality, the capability-map flag-gap contract, and `.planning/` root-anchoring hold across every milestone.

The **test-deferred principle** (no live Bob on the dev device; every criterion verified via doc-conformance, golden/unit tests, or Claude-runtime equivalence, with device-runnable steps accruing to one on-device acceptance checklist) governed v1.0 and v2.0. It was lifted at the start of v3.0, when a live Bob Shell 2.0.1 install was available for Phase 12. **As of 2026-09-16 it is partially back in force:** the dev machine now carries Bob Shell **1.0.4** (the unsupported generation), so Phase 13 was verified hermetically and the live-Bob acceptance run is again deferred to Phase 17 on 2.x hardware.

## Milestones

- ✅ **v1.0 — Bob Runtime & Core Loop** — Phases 1–6 (shipped 2026-06-19)
- ✅ **v2.0 — 1.6.1 Sync & Command Expansion** — Phases 7–11 (shipped 2026-07-06; npm `@zack-maz/gsd-bob@0.2.1`)
- 🔨 **v3.0 — Bob 2.0 & gsd-core 1.14 Re-baseline** — Phases 12–18 (started 2026-08-13)

Full phase detail for shipped milestones is archived under `.planning/milestones/`.

## Phases

<details>
<summary>✅ v1.0 — Bob Runtime & Core Loop (Phases 1–6) — SHIPPED 2026-06-19</summary>

- [x] Phase 1: Bob Capability Mapping (1/1 plans) — completed 2026-06-18
- [x] Phase 2: Runtime Foundation & Artifact Translation (4/4 plans) — completed 2026-06-18
- [x] Phase 3: Installer (4/4 plans) — completed 2026-06-18
- [x] Phase 4: Core-Loop Port (2/2 plans) — completed 2026-06-19
- [x] Phase 5: Quality Gates & Upstream Readiness (3/3 plans) — completed 2026-06-19
- [x] Phase 6: On-Device Acceptance Verification (1/1 plans) — completed 2026-06-19

Detail: v1.0 was carried into v2.0 via `new-milestone` without a separate archive — its full phase detail is captured in the all-11-phase snapshot at [`milestones/v2.0-ROADMAP.md`](./milestones/v2.0-ROADMAP.md).

</details>

<details>
<summary>✅ v2.0 — 1.6.1 Sync & Command Expansion (Phases 7–11) — SHIPPED 2026-07-06</summary>

- [x] Phase 7: gsd-core 1.6.1 Sync (3/3 plans) — completed 2026-07-03
- [x] Phase 8: Model Neutralization (1/1 plans) — completed 2026-07-03
- [x] Phase 9: Command Expansion (2/2 plans) — completed 2026-07-04
- [x] Phase 10: Documentation (3/3 plans) — completed 2026-07-04
- [x] Phase 11: On-Device Acceptance Delta (1/1 plans) — completed 2026-07-04

Detail: [`milestones/v2.0-ROADMAP.md`](./milestones/v2.0-ROADMAP.md)

</details>

### 🔨 v3.0 — Bob 2.0 & gsd-core 1.14 Re-baseline (Phases 12–18) — IN PROGRESS

**Goal:** Re-baseline onto both upstreams at once — gsd-core `1.6.1 → 1.14.0` and Bob `1.0.x → 2.0.x` — using the live Bob install to settle what v1/v2 could only defer.

> Re-targeted 2026-09-16: the milestone was scoped as `1.6.1 → 1.10.0`, but upstream shipped 1.11.0–1.14.0 (latest 2026-09-14) before Phase 13 ran, and Bob shipped Shell 2.0.2–2.0.4. Phase 13 re-baselined onto **1.14.0** and onto **Bob 2.0.x only** (a user decision — 1.0.x has no skills and no subagents). Phase 18 is new: it carries NEUTRAL-04, which Phase 13 deliberately did not do.

Sequencing rationale: Bob 2.0 is re-verified **first** (Phase 12) because everything downstream is
emitted *for* Bob, and v2.0's `command`/`execute` regression came from building on a doc-derived
model. The re-vendor (13) is the payload foundation for the new surfaces (14) and the MCP seam (15);
the descriptor spike (16) needed the new payload in hand to test against — and was answered
early, as a NO-GO, by Phase 13's delta research; docs and the acceptance run (17) come
last, once the final surface exists; the agent/product-name neutralization (18) is split out of 13. Requirement detail: [`REQUIREMENTS.md`](./REQUIREMENTS.md).
Verified upstream deltas: the four 2026-09-16 reports in [`research/`](./research/) — `260916-gsd-core-1.14.0-delta.md`, `260916-bob-shell-docs.md`, `260916-bob-ide-docs.md`, `260916-bob-1.0.4-bundle.md` (they supersede `research/v3.0-UPSTREAM-DELTA.md`).

- [x] **Phase 12: Bob 2.0 Capability Re-verification** — BOB2-01..05 — completed 2026-08-13
- [x] **Phase 13: gsd-core 1.14.0 Re-sync** — RESYNC-01..06, DOCS-05, UP-03 — completed 2026-09-16
- [ ] **Phase 14: Native Bob 2.0 Surfaces** — NATIVE-02..05 *(blocked on documentation: `.bob/agents/` personas are undocumented — the page was withdrawn)*
- [ ] **Phase 15: Companion MCP Integration** — MCP-01..03
- [ ] **Phase 16: External Descriptor Spike & Upstream Inventory** — DESC-01 *(verdict already recorded NO-GO by Phase 13)*
- [ ] **Phase 17: Documentation & Live-Bob Acceptance** — DOCS-06, ACCEPT-03..05
- [ ] **Phase 18: Agent/Product-Name Neutralization** — NEUTRAL-04 *(moved out of Phase 13, D-10)*

#### ✅ Phase 12: Bob 2.0 Capability Re-verification — COMPLETE 2026-08-13
**Goal:** Replace the 1.0.x doc-derived capability model with one confirmed against a live Bob Shell 2.x install.
**Requirements:** BOB2-01, BOB2-02, BOB2-03, BOB2-04, BOB2-05
**Success criteria:**
1. ✅ Every Bob surface gsd-bob writes to is confirmed on live Bob 2.x, each with observed evidence next to its doc citation
2. ✅ The emitted gsd mode's tool groups are the empirically-verified set, pinned by a test that fails on any unverified group — the `command` vs `execute` contradiction resolved: `command` is a back-compat alias Bob normalizes to `execute`, and `groups` is an open string union, so an invalid token is accepted silently
3. ⚠️ `gsd_run` proven at the shell level (staged shim runs out-of-tree, returns real `.planning/` JSON, exit 0); the in-session invocation needs an interactive approval and the SC4 fix installed → carried to ACCEPT-04
4. ✅ **Found and fixed a P0** — global installs wrote `~/.bob/custom_modes.yaml`, which Bob 2.0 never reads (it resolves `~/.bob/settings/custom_modes.yaml`); the two scopes are asymmetric. Verified by a real scratch install
5. ✅ `parallelSubagentFanout` is an observed `true` — Bob's own `spawn_subagent` description states multiple calls in one turn run in parallel. Unblocks PAR-01

**Evidence:** [`phases/12-bob-2-0-capability-re-verification/12-BOB2-EVIDENCE.md`](./phases/12-bob-2-0-capability-re-verification/12-BOB2-EVIDENCE.md) ·
**Refutations:** FU-05…FU-09 in [`ACCEPTANCE-FOLLOWUPS.md`](./ACCEPTANCE-FOLLOWUPS.md)

#### ✅ Phase 13: gsd-core 1.14.0 Re-sync — COMPLETE 2026-09-16
**Goal:** One consistent 1.14.0 payload with every Bob delta re-applied, the descriptor valid against 1.14.0's own validator, and all invariants holding.
**Requirements:** RESYNC-01, RESYNC-02, RESYNC-03, RESYNC-04, RESYNC-05, RESYNC-06, DOCS-05, UP-03
**Success criteria:**
1. ✅ `gsd-core/VERSION` reads `1.14.0` and no `1.6.1` remnants survive the nuke-and-restage (the stock `legacy-cleanup.cjs` `1.5.0` comment stays, as documented)
2. ✅ **Nine** Bob deltas (was six) re-apply cleanly through `apply-bob-patches.cjs`, now with a `preflight()` before the first write and a `verifyAll()` after the run; the second run is a byte-identical no-op. Every changed golden carries a one-line justification in `13-REVENDOR-NOTES.md`
3. ✅ The zero-model-literal invariant holds across the full emitted `.bob/` set on the new payload
4. ✅ Three new upstream commands (`next`, `onboard`, `quick-batch`) are gate-decided and vendored — 28 → **31** emitted, 0 unsupported — with every generated doc/roster regenerated from its generator
5. ✅ `MAINTAINING.md` is rewritten from the real 1.6.1 → 1.14.0 replay, including the anchor that had been deleted upstream, the validator check, the Node-24 grep and the Node 22.15 smoke run
6. ➡️ **Moved to Phase 18 (D-10):** the emitted set naming no agent or assistant other than Bob (NEUTRAL-04). Fuzzy prose rewriting across 31 commands with a new invariant is out of this compatibility task's scope — recorded, not dropped
7. ✅ A drift guard (`test/patch-drift.test.cjs`) holds the vendored descriptor, its `apply-bob-patches.cjs` source block and the loaded `runtimes.bob` in three-way identity, and runs 1.14.0's own `capability-validator` over the entry (0 errors)
8. ✅ The descriptor gained the fields 1.14.0 requires (`localConfigDir`, `hostIntegration`, `version`, `engines`) and lost the illegal `hookEvents`
9. ✅ The installer seeds `workflow.use_worktrees: false` alongside `text_mode` and `context_window` (1.14.0's isolation gate exits FATAL on `dispatch.isolation=none` without it) and un-merges all three on uninstall
10. ✅ The payload ships a per-install `gsd-core/.gsd-runtime` marker (`bob`), so every `dispatch-*` query resolves the `bob` descriptor instead of falling back to `claude`; `.planning/config.json` is deliberately left without a `runtime` key
11. ✅ Global installs emit **absolute** `<target>/gsd-core/...` references, including the mode's shell-out instruction — through v0.2.3 they emitted a workspace-relative `.bob/gsd-core/...` that does not exist under `~/.bob`
12. ✅ The `gsd_run` resolver preamble probes `<root>/.bob/gsd-core` and `$HOME/.bob/gsd-core` — neither was probed at any point since 1.6.1, so a `.bob` install was unreachable from workflow bash

**Evidence:** [`phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md`](./phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md) ·
**Research:** the four `research/260916-*.md` reports ·
**Refutations:** FU-10…FU-14 in [`ACCEPTANCE-FOLLOWUPS.md`](./ACCEPTANCE-FOLLOWUPS.md)

#### Phase 14: Native Bob 2.0 Surfaces
**Goal:** Use Bob 2.0's new surfaces to retire the flag-and-skip compromises v1 made for primitives Bob then lacked.
**Requirements:** NATIVE-02, NATIVE-03, NATIVE-04, NATIVE-05
**Success criteria:**
1. GSD agent types emit as `.bob/agents/` personas and a subagent-dispatching workflow runs isolated on live Bob rather than falling back to inline
2. Runtime-aware dispatch resolves correctly for `bob` with no Bob-specific branching added to workflow bodies
3. Re-running the installer over user-authored `AGENTS.md` content neither clobbers nor duplicates it
4. Lifecycle hooks are either adopted with a working integration or flagged out with a recorded reason — no silent omission
5. `SUPPORT-ROSTER.md` reflects any capability that moved from flagged to supported

#### Phase 15: Companion MCP Integration
**Goal:** Establish whether gsd-core's MCP server is a better seam into Bob than artifact conversion, or a complement to it.
**Requirements:** MCP-01, MCP-02, MCP-03
**Success criteria:**
1. The companion MCP server registers via `bob mcp add` and is reachable from a live Bob session
2. The served catalog's resources and prompts are exercised from Bob, with coverage compared against the converted skills/commands surface
3. A documented decision records the relationship between the two surfaces, and a user sees no duplicate or ambiguous commands

#### Phase 16: External Descriptor Spike & Upstream Inventory
**Goal:** Close out the external-descriptor question and keep the upstream contribution statement current.
**Requirements:** DESC-01 *(UP-03 was discharged in Phase 13)*
**Success criteria:**
1. ✅ (answered in Phase 13) The verdict is **NO-GO** with named evidence: `capability-loader.cjs` would compose an external `capability.json` into `registry.runtimes.bob`, but every module that resolves a runtime `require`s the frozen `capability-registry.cjs` directly and never calls `loadRegistry`
2. ✅ (Phase 13) `UPSTREAM.md`'s inventory pointers all re-verify against the 1.14.0 source, with real line numbers
3. ✅ (Phase 13) The contribution shape is restated as `capabilities/bob/capability.json` + a regenerated registry + the converter trio + the two allowlist entries + the resolver line
4. What remains for this phase: a working proof-of-concept (or an upstream proposal) for routing `runtime-homes` / `runtime-artifact-layout` through `loadRegistry`, which is the only change that would flip the verdict

#### Phase 17: Documentation & Live-Bob Acceptance
**Goal:** Regenerate the docs for the new baseline and finally execute the acceptance pass on real hardware.
**Requirements:** DOCS-06, ACCEPT-03, ACCEPT-04, ACCEPT-05 *(DOCS-05 was discharged in Phase 13)*
**Success criteria:**
1. Every generated doc (`SUPPORT-ROSTER`, `COMMANDS`, README skill list, covers' stamped facts) regenerates from its generator and matches the shipped state
2. Install/uninstall instructions work as written on Bob Shell 2.x, including the fresh-install requirement
3. The checklist's re-baselined slice is amended deliberately, with the frozen-snapshot guard re-baselined in lockstep and the insert-only guard still green
4. The full checklist is run on live Bob 2.x with pass/fail recorded per criterion
5. Every refuted v1/v2 assumption is logged in `ACCEPTANCE-FOLLOWUPS.md` with the observation that refuted it

**Blocked:** the dev machine carries Bob Shell 1.0.4 as of 2026-09-16, not a 2.x install. This phase needs Bob 2.0.x hardware.

#### Phase 18: Agent/Product-Name Neutralization
**Goal:** Extend v2.0's model-literal invariant to agent and product brand names, and to selection prompts, across the emitted set.
**Requirements:** NEUTRAL-04
**Success criteria:**
1. The emitted `.bob/` set names **no agent or assistant other than Bob**, and no emitted flow asks the user to choose a model or backend
2. Enforced by an invariant in the NEUTRAL-03 style (zero brand tokens across the full emitted set, failing with every `file:line:token`), not by spot edits
3. The surviving 1.14.0 forms are handled deliberately: external-runtime selector flags in `argument-hint` and body prose (`--<runtime>` reviewer/offload flags), one "…selects recommended defaults" self-reference, and one feature described as offloading to another product's cloud
4. Whatever cannot be neutralized without breaking a command is flagged in `SUPPORT-ROSTER.md` rather than shipped

**Why it is its own phase (Phase 13 D-10):** it is fuzzy prose rewriting across 31 commands under a new invariant, it is not required for 1.14.0 correctness, and neutralizing the 1.6.1 content would have been discarded by the re-vendor anyway.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bob Capability Mapping | v1.0 | 1/1 | Complete | 2026-06-18 |
| 2. Runtime Foundation & Artifact Translation | v1.0 | 4/4 | Complete | 2026-06-18 |
| 3. Installer | v1.0 | 4/4 | Complete | 2026-06-18 |
| 4. Core-Loop Port | v1.0 | 2/2 | Complete | 2026-06-19 |
| 5. Quality Gates & Upstream Readiness | v1.0 | 3/3 | Complete | 2026-06-19 |
| 6. On-Device Acceptance Verification | v1.0 | 1/1 | Complete | 2026-06-19 |
| 7. gsd-core 1.6.1 Sync | v2.0 | 3/3 | Complete | 2026-07-03 |
| 8. Model Neutralization | v2.0 | 1/1 | Complete | 2026-07-03 |
| 9. Command Expansion | v2.0 | 2/2 | Complete | 2026-07-04 |
| 10. Documentation | v2.0 | 3/3 | Complete | 2026-07-04 |
| 11. On-Device Acceptance Delta | v2.0 | 1/1 | Complete | 2026-07-04 |
| 12. Bob 2.0 Capability Re-verification | v3.0 | 1/1 | Complete | 2026-08-13 |
| 13. gsd-core 1.14.0 Re-sync | v3.0 | 1/1 | Complete | 2026-09-16 |
| 14. Native Bob 2.0 Surfaces | v3.0 | 0/– | Not started (blocked: personas undocumented) | — |
| 15. Companion MCP Integration | v3.0 | 0/– | Not started | — |
| 16. External Descriptor Spike & Upstream Inventory | v3.0 | 0/– | Not started | — |
| 17. Documentation & Live-Bob Acceptance | v3.0 | 0/– | Not started (blocked: no Bob 2.x on device) | — |
| 18. Agent/Product-Name Neutralization | v3.0 | 0/– | Not started (NEUTRAL-04, moved from 13) | — |
