# Requirements: GSD for IBM Bob (gsd-bob)

**Defined:** 2026-06-17 (v1) · **Current milestone defined:** 2026-08-13 (v3.0)
**Core Value:** A Bob user installs via a single command and runs the full GSD planning loop (new-project → plan-phase → execute-phase → verify) natively, producing the same `.planning/` artifacts GSD produces in Claude Code.

Shipped requirement sets are archived, not repeated here:
v1 (30 reqs, Phases 1–6) and v2.0 (15 reqs, Phases 7–11) → [`milestones/v2.0-REQUIREMENTS.md`](./milestones/v2.0-REQUIREMENTS.md).

## Milestone v3.0 Requirements

Re-baseline gsd-bob onto both upstreams at once: gsd-core `1.6.1 → 1.10.0` and Bob Shell `1.0.x → 2.x`.
Grounded in [`research/v3.0-UPSTREAM-DELTA.md`](./research/v3.0-UPSTREAM-DELTA.md), where every claim below is sourced.

**Cross-cutting principles carried forward:** backend-neutrality (Bob owns model routing; zero brand
literals in the descriptor and adapter), the capability-map flag-gap contract (parity-first — flag or
skip, never silently break), `.planning/` root-anchoring, and byte-compatible Claude↔Bob artifact
interchange.

**Principle that CHANGES in v3.0:** the test-deferred model. A live Bob Shell 2.x install is now
available, so success criteria are verified **empirically against real Bob** rather than by
doc-conformance plus a deferred pass. Doc-derived defaults from v1/v2 are treated as hypotheses to
confirm or refute, not as settled facts.

### Bob 2.0 Capability Re-verification

Re-ground the capability model on observation before anything is built on top of it. Bob Shell 2.0 is
a major release; v1/v2's model was derived from 1.0.x docs, some of it from the IDE docs rather than
Shell's.

- [x] **BOB2-01**: Every Bob surface gsd-bob writes to (`~/.bob` config home, `.bob/skills/`, `.bob/commands/`, `custom_modes.yaml`, `settings/settings.json`) is confirmed against a live Bob Shell 2.x install, with observed evidence recorded alongside the doc citation
- [x] **BOB2-02**: The custom-mode tool-group contradiction is resolved empirically — the docs disagree (`read/edit/browser/command/mcp` per `custom-modes-bobshell` vs `read/edit/execute/mcp/skill/todo/subagent/mode` per `core-concepts/tools`) — and the emitted gsd mode's `groups` are pinned to the verified set by a test that fails on any unverified group
- [x] **BOB2-03**: The `gsd_run` shell seam is demonstrated working inside a live Bob 2.x session (the emitted mode can shell out to `node gsd-tools.cjs` and get a result back), closing the risk that `260707-ey1`'s `command` → `execute` change broke it — *shell-level seam proven out-of-tree; the in-session invocation is carried to ACCEPT-04, as it needs an interactive approval and the BOB2-04 fix installed first*
- [x] **BOB2-04**: The installer and adapter are correct for Bob 2.0's relocated settings (`~/.bob/settings/settings.json`) and consolidated Agent mode — no writes to paths 2.0 no longer reads, and the 2.0.1 approval rules for Bob-home writes are accounted for — *found and fixed a P0: global installs wrote a `custom_modes.yaml` Bob 2.0 never reads. Approval-prompt behaviour is an acceptance-UX observation (Phase 17)*
- [x] **BOB2-05**: Subagent isolation and parallel fan-out are determined empirically on live Bob 2.x, replacing the doc-derived `parallelSubagentFanout` default with an observed value — *observed `true`; unblocks PAR-01*

### gsd-core 1.10.0 Re-sync

Bring the vendored payload forward four minor versions on one consistent version.

- [ ] **RESYNC-01**: The vendored `gsd-core/` payload is fully replaced at `1.10.0` (workflows, templates, references, bin) — one consistent version, never a mixed payload
- [ ] **RESYNC-02**: The six Bob deltas are re-applied via `apply-bob-patches.cjs` and the descriptor/converter/golden/equivalence suites pass, or each diff is updated with a recorded justification; `MAINTAINING.md` is corrected from the real 1.6.1 → 1.10.0 replay
- [ ] **RESYNC-03**: The model-neutrality invariant is re-run over the 1.10.0 payload and holds at zero literals across the full emitted `.bob/` set, including model IDs added upstream since 1.6.1
- [ ] **RESYNC-04**: The two commands added upstream since 1.6.1 (`next`, `onboard`) are put through the capability gate and vendored if supported, with `SUPPORT-ROSTER.md`, `COMMANDS.md`, and `README.md` regenerated from the gate rather than hand-edited
- [ ] **NEUTRAL-04**: The emitted `.bob/` set names **no agent or assistant other than Bob**, and no emitted flow asks the user to choose a model or backend. This extends v2.0's NEUTRAL-03 (which forbade *model* literals) to **agent/product brand names and selection prompts**. Scoped to Phase 13 because the offending text lives in the vendored payload and flows through the converter — neutralizing 1.6.1 content would be discarded by the 1.10.0 re-vendor. Measured 2026-08-13 against the installed set: 18 emitted files mention one non-Bob agent, 12 another, 5 another, 5 another, 1 another; the surviving forms are external-runtime selector flags in `argument-hint` and body prose (e.g. `--<runtime>` reviewer/offload flags), one "…selects recommended defaults" self-reference, and one feature described as offloading to another product's cloud. Enforced by an invariant in the NEUTRAL-03 style (zero brand tokens across the emitted set), not by spot edits

### Native Bob 2.0 Surfaces

Adopt the surfaces that did not exist when v1 chose flag-and-skip. This retires the standing
NATIVE-01 deferral: gaps that were flagged because Bob lacked the primitive now have real targets.

- [ ] **NATIVE-02**: GSD's agent types are emitted as Bob agent personas under `.bob/agents/`, so subagent-dispatching workflows run as real isolated subagents instead of degrading to the inline fallback
- [ ] **NATIVE-03**: gsd-core 1.10.0's runtime-aware subagent dispatch is configured for the `bob` runtime (dispatch type resolution + the agent-skills fallback for non-dispatchable runtimes), so workflows select the correct path without Bob-specific branching in workflow bodies
- [ ] **NATIVE-04**: Project context is emitted to Bob's `AGENTS.md` surface via an idempotent merge that never clobbers or duplicates user-authored content (same guarantee `custom_modes.yaml` already has)
- [ ] **NATIVE-05**: Bob 2.0 lifecycle hooks are evaluated against GSD's state model and either adopted where they serve it, or flagged out with an explicit recorded reason

### Companion MCP Integration

gsd-core now ships an MCP server; Bob 2.0 ships `bob mcp add`. Establish whether this is a better
seam than artifact conversion, or a complement to it.

- [ ] **MCP-01**: gsd-core's companion MCP server is registered into a live Bob 2.x install via `bob mcp add` and reachable from a session
- [ ] **MCP-02**: The served catalog (resources + prompts) is exercised from Bob and its coverage compared against the converted skills/commands surface
- [ ] **MCP-03**: The relationship between the MCP surface and the skills/commands surface is decided and documented (complementary, alternative, or replacement) with no duplicate or ambiguous command exposure for the user

### External Descriptor Spike & Upstream Inventory

Upstream's runtime architecture moved under gsd-bob's feet. Find out whether the vendored hand-edit
is still necessary before committing to another version of it.

- [ ] **DESC-01**: A spike determines whether the `bob` runtime can be expressed as an external/pluggable descriptor (`capability.json` + registry loading under 1.10.0's configHome trust gate), retiring the hand-edit to vendored `capability-registry.cjs` — delivered as a go/no-go with working evidence either way, not a migration
- [ ] **UP-03**: `UPSTREAM.md` is rewritten against 1.10.0 — every file:line pointer re-verified, the converter framing updated for upstream's agent-converter descriptor cutover, and DESC-01's verdict recorded so a maintainer sees the current, not the 1.6.1, shape of the contribution

### Documentation & Live-Bob Acceptance

Close the loop: docs regenerated for the new baseline, and the acceptance pass that v1 and v2 could
only assemble finally executed.

- [ ] **DOCS-05**: `README.md`, `ARCHITECTURE.md`, `COMMANDS.md`, `MAINTAINING.md`, and `SUPPORT-ROSTER.md` are regenerated/updated for Bob 2.0 + gsd-core 1.10.0 + the new surfaces, with generated artifacts still sourced from their generators rather than hand-edited
- [ ] **DOCS-06**: Install and uninstall instructions are correct for Bob Shell 2.x, including the fresh-install requirement (no automated 1.0.x upgrade path) and any changed approval prompts
- [ ] **ACCEPT-03**: The acceptance checklist is re-baselined for Bob 2.0 — steps whose expected output is 1.0.x-specific are amended deliberately (with the frozen-slice guard re-baselined in lockstep), and new surfaces are appended insert-only
- [ ] **ACCEPT-04**: The full checklist is **run against live Bob 2.x** with pass/fail recorded per criterion — the deferred single pass, executed
- [ ] **ACCEPT-05**: Every v1/v2 assumption that live Bob refutes is logged as a follow-up in `ACCEPTANCE-FOLLOWUPS.md` with the observation that refuted it

## Future Requirements

Deferred beyond v3.0. Tracked but not in the current roadmap.

### Broader Skill Coverage

- **LIFE-01**: `transition` lifecycle command — *last un-vendored member of the lifecycle cluster*
- **SHAPE-01**: `ai-integration-phase` — *last un-vendored member of the phase-shaping cluster*
- **AUTO-01**: Autonomy cluster (`autonomous`, `manager`, `workstreams`) ported to Bob
- **PARITY-01**: Full parity with the upstream command set (71 at 1.10.0; 28 curated today)

### Richer Native Integration

- **PAR-01**: Worktree-isolated parallel execution — *UNBLOCKED 2026-08-13 by BOB2-05: Bob 2.0.1 confirms both isolation and parallel fan-out ("Multiple spawn_subagent calls in one turn run in parallel"). No longer gated; needs a phase*

### Upstream Merge

- **MERGE-01**: The actual PR merging the Bob runtime into open-gsd/gsd-core — *v3.0's DESC-01 spike and UP-03 inventory are its groundwork, not the PR itself*

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Per-backend (Gemini/Claude/Granite) behavior tuning | Core is backend-agnostic; Bob owns routing |
| Broad graceful-degradation as the porting philosophy | Parity-first (flag/skip gaps); only interactive prompts use text_mode out of necessity |
| Full 71-command parity | Curated roster only; the long tail stays deferred (PARITY-01) |
| Executing the upstream PR in v3.0 | v3.0 establishes what the contribution *is* post-1.10.0 (DESC-01/UP-03); the PR is MERGE-01 |
| Migrating to an external descriptor in v3.0 | DESC-01 is a spike with a go/no-go — committing to the migration before evidence would block the re-baseline |
| Knowledge graph / mempalace | Subagent-heavy, off the core loop; deferred |
| Bob IDE (as distinct from Bob Shell) | gsd-bob targets the Shell surface; IDE-only behavior is out of scope except where Shell docs are absent |

## Traceability

Which phases cover which requirements. v1 (Phases 1–6) and v2.0 (Phases 7–11) rows are in the
archived requirements file.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOB2-01 | Phase 12 | Complete |
| BOB2-02 | Phase 12 | Complete |
| BOB2-03 | Phase 12 | Complete (in-session leg → ACCEPT-04) |
| BOB2-04 | Phase 12 | Complete |
| BOB2-05 | Phase 12 | Complete |
| RESYNC-01 | Phase 13 | Pending |
| RESYNC-02 | Phase 13 | Pending |
| RESYNC-03 | Phase 13 | Pending |
| RESYNC-04 | Phase 13 | Pending |
| NEUTRAL-04 | Phase 13 | Pending |
| NATIVE-02 | Phase 14 | Pending |
| NATIVE-03 | Phase 14 | Pending |
| NATIVE-04 | Phase 14 | Pending |
| NATIVE-05 | Phase 14 | Pending |
| MCP-01 | Phase 15 | Pending |
| MCP-02 | Phase 15 | Pending |
| MCP-03 | Phase 15 | Pending |
| DESC-01 | Phase 16 | Pending |
| UP-03 | Phase 16 | Pending |
| DOCS-05 | Phase 17 | Pending |
| DOCS-06 | Phase 17 | Pending |
| ACCEPT-03 | Phase 17 | Pending |
| ACCEPT-04 | Phase 17 | Pending |
| ACCEPT-05 | Phase 17 | Pending |

**Coverage:**

- v3.0 requirements: 24 total (BOB2 5 + RESYNC 4 + NEUTRAL-04 + NATIVE 4 + MCP 3 + DESC/UP 2 + DOCS/ACCEPT 5 = 24) — all mapped to Phases 12–17; 24/24 mapped, no orphans
- v3.0 complete: 5/24 (BOB2-01…05, Phase 12, 2026-08-13)
- Shipped: v1 30/30 (Phases 1–6), v2.0 15/15 (Phases 7–11) — see the archive

---
*Requirements defined: 2026-06-17*
*Last updated: 2026-08-13 — defined the 23 Milestone v3.0 requirements and mapped them to Phases 12–17 (BOB2→12, RESYNC→13, NATIVE→14, MCP→15, DESC/UP→16, DOCS/ACCEPT→17). Shipped v1/v2.0 rows live in `milestones/v2.0-REQUIREMENTS.md`.*
