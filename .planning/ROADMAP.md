# Roadmap: GSD for IBM Bob (gsd-bob)

gsd-bob makes the runtime-neutral GSD planning framework run natively inside IBM Bob, emitting the same `.planning/` artifact contract so Bob and Claude Code stay interchangeable. Backend-neutrality, the capability-map flag-gap contract, and `.planning/` root-anchoring hold across every milestone.

The **test-deferred principle** (no live Bob on the dev device; every criterion verified via doc-conformance, golden/unit tests, or Claude-runtime equivalence, with device-runnable steps accruing to one on-device acceptance checklist) governed v1.0 and v2.0. **It is lifted as of v3.0** — a live Bob Shell 2.x install is available, so criteria are verified empirically and the accrued checklist is finally run.

## Milestones

- ✅ **v1.0 — Bob Runtime & Core Loop** — Phases 1–6 (shipped 2026-06-19)
- ✅ **v2.0 — 1.6.1 Sync & Command Expansion** — Phases 7–11 (shipped 2026-07-06; npm `@zack-maz/gsd-bob@0.2.1`)
- 🔨 **v3.0 — Bob 2.0 & gsd-core 1.10 Re-baseline** — Phases 12–17 (started 2026-08-13)

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

### 🔨 v3.0 — Bob 2.0 & gsd-core 1.10 Re-baseline (Phases 12–17) — IN PROGRESS

**Goal:** Re-baseline onto both upstreams at once — gsd-core `1.6.1 → 1.10.0` and Bob Shell `1.0.x → 2.x` — using the newly available live Bob install to settle what v1/v2 could only defer.

Sequencing rationale: Bob 2.0 is re-verified **first** (Phase 12) because everything downstream is
emitted *for* Bob, and v2.0's `command`/`execute` regression came from building on a doc-derived
model. The re-vendor (13) is the payload foundation for the new surfaces (14) and the MCP seam (15);
the descriptor spike (16) needs 1.10.0 in hand to test against; docs and the acceptance run (17) come
last, once the final surface exists. Requirement detail: [`REQUIREMENTS.md`](./REQUIREMENTS.md).
Verified upstream deltas: [`research/v3.0-UPSTREAM-DELTA.md`](./research/v3.0-UPSTREAM-DELTA.md).

- [x] **Phase 12: Bob 2.0 Capability Re-verification** — BOB2-01..05 — completed 2026-08-13
- [ ] **Phase 13: gsd-core 1.10.0 Re-sync** — RESYNC-01..04, NEUTRAL-04
- [ ] **Phase 14: Native Bob 2.0 Surfaces** — NATIVE-02..05
- [ ] **Phase 15: Companion MCP Integration** — MCP-01..03
- [ ] **Phase 16: External Descriptor Spike & Upstream Inventory** — DESC-01, UP-03
- [ ] **Phase 17: Documentation & Live-Bob Acceptance** — DOCS-05/06, ACCEPT-03..05

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

#### Phase 13: gsd-core 1.10.0 Re-sync
**Goal:** One consistent 1.10.0 payload with the six Bob deltas re-applied and all invariants holding.
**Requirements:** RESYNC-01, RESYNC-02, RESYNC-03, RESYNC-04, NEUTRAL-04
**Success criteria:**
1. `gsd-core/VERSION` reads `1.10.0` and no 1.6.1 remnants survive the nuke-and-restage
2. All six Bob deltas re-apply cleanly; the descriptor/converter/golden/equivalence suites pass, or every changed fixture carries a recorded justification
3. The zero-model-literal invariant holds across the full emitted `.bob/` set on the new payload
4. `next` and `onboard` are gate-decided (vendored or flagged) and every generated doc/roster reflects the outcome without hand-editing
5. `MAINTAINING.md` matches the re-vendor that was actually performed, corrected where the runbook proved wrong
6. The emitted `.bob/` set names no agent or assistant other than Bob and asks the user to select no model or backend, enforced by an invariant in the NEUTRAL-03 style (NEUTRAL-04)
7. A guard prevents the vendored descriptor and its `apply-bob-patches.cjs` source block from drifting apart — Phase 12 found them already disagreeing on the descriptor `description`

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
**Goal:** Determine whether the vendored `capability-registry.cjs` hand-edit is still necessary under 1.10.0, and restate the upstream contribution accordingly.
**Requirements:** DESC-01, UP-03
**Success criteria:**
1. The spike produces a go/no-go on expressing `bob` as an external descriptor, backed by working evidence either way (a loading external descriptor, or the specific blocker that prevents one)
2. `UPSTREAM.md`'s inventory pointers all re-verify against the 1.10.0 source
3. The converter framing reflects upstream's agent-converter descriptor cutover rather than the 1.6.1 shape
4. A maintainer reading `UPSTREAM.md` sees the spike's verdict and what the contribution would now consist of

#### Phase 17: Documentation & Live-Bob Acceptance
**Goal:** Regenerate the docs for the new baseline and finally execute the acceptance pass on real hardware.
**Requirements:** DOCS-05, DOCS-06, ACCEPT-03, ACCEPT-04, ACCEPT-05
**Success criteria:**
1. Every generated doc (`SUPPORT-ROSTER`, `COMMANDS`, README skill list, covers' stamped facts) regenerates from its generator and matches the shipped state
2. Install/uninstall instructions work as written on Bob Shell 2.x, including the fresh-install requirement
3. The checklist's re-baselined slice is amended deliberately, with the frozen-snapshot guard re-baselined in lockstep and the insert-only guard still green
4. The full checklist is run on live Bob 2.x with pass/fail recorded per criterion
5. Every refuted v1/v2 assumption is logged in `ACCEPTANCE-FOLLOWUPS.md` with the observation that refuted it

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
| 13. gsd-core 1.10.0 Re-sync | v3.0 | 0/– | Not started | — |
| 14. Native Bob 2.0 Surfaces | v3.0 | 0/– | Not started | — |
| 15. Companion MCP Integration | v3.0 | 0/– | Not started | — |
| 16. External Descriptor Spike & Upstream Inventory | v3.0 | 0/– | Not started | — |
| 17. Documentation & Live-Bob Acceptance | v3.0 | 0/– | Not started | — |
