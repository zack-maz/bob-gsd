# Requirements: GSD for IBM Bob (gsd-bob)

**Defined:** 2026-06-17 (v1) · **Current milestone defined:** 2026-08-13 (v3.0) · **Re-targeted:** 2026-09-16 (1.10.0 → 1.14.0; Bob 2.0.x-only)
**Core Value:** A Bob user installs via a single command and runs the full GSD planning loop (new-project → plan-phase → execute-phase → verify) natively, producing the same `.planning/` artifacts GSD produces on the reference runtime.

Shipped requirement sets are archived, not repeated here:
v1 (30 reqs, Phases 1–6) and v2.0 (15 reqs, Phases 7–11) → [`milestones/v2.0-REQUIREMENTS.md`](./milestones/v2.0-REQUIREMENTS.md).

## Milestone v3.0 Requirements

Re-baseline gsd-bob onto both upstreams at once: gsd-core `1.6.1 → 1.14.0` and Bob `1.0.x → 2.0.x`.
Grounded in the four 2026-09-16 research reports (`research/260916-gsd-core-1.14.0-delta.md`,
`260916-bob-shell-docs.md`, `260916-bob-ide-docs.md`, `260916-bob-1.0.4-bundle.md`), which supersede
the milestone-opening [`research/v3.0-UPSTREAM-DELTA.md`](./research/v3.0-UPSTREAM-DELTA.md).

**Re-target (2026-09-16):** the milestone opened against gsd-core `1.10.0`. Upstream shipped
1.11.0–1.14.0 before Phase 13 ran, so the target is **1.14.0** — the RESYNC requirements below are
restated accordingly. The Bob target narrowed to **2.0.x only** (user decision): Bob Shell 1.0.x has
no skills and no subagents, so only commands and the mode would load, and 2.0.0 requires a fresh
install regardless.

**Cross-cutting principles carried forward:** backend-neutrality (Bob owns model routing; zero brand
literals in the descriptor and adapter), the capability-map flag-gap contract (parity-first — flag or
skip, never silently break), `.planning/` root-anchoring, and byte-compatible cross-runtime artifact
interchange.

**Principle that CHANGES in v3.0:** the test-deferred model. A live Bob Shell 2.0.1 install was
available for Phase 12, so its criteria were verified **empirically against real Bob**, and
doc-derived defaults from v1/v2 are treated as hypotheses to confirm or refute rather than settled
facts. **Partially reverted 2026-09-16:** the dev machine now carries Bob Shell 1.0.4 (the
unsupported generation), so Phase 13 was verified hermetically and the live-Bob run is deferred
again to Phase 17.

### Bob 2.0 Capability Re-verification

Re-ground the capability model on observation before anything is built on top of it. Bob Shell 2.0 is
a major release; v1/v2's model was derived from 1.0.x docs, some of it from the IDE docs rather than
Shell's.

- [x] **BOB2-01**: Every Bob surface gsd-bob writes to (`~/.bob` config home, `.bob/skills/`, `.bob/commands/`, `custom_modes.yaml`, `settings/settings.json`) is confirmed against a live Bob Shell 2.x install, with observed evidence recorded alongside the doc citation
- [x] **BOB2-02**: The custom-mode tool-group contradiction is resolved empirically — the docs disagree (`read/edit/browser/command/mcp` per `custom-modes-bobshell` vs `read/edit/execute/mcp/skill/todo/subagent/mode` per `core-concepts/tools`) — and the emitted gsd mode's `groups` are pinned to the verified set by a test that fails on any unverified group
- [x] **BOB2-03**: The `gsd_run` shell seam is demonstrated working inside a live Bob 2.x session (the emitted mode can shell out to `node gsd-tools.cjs` and get a result back), closing the risk that `260707-ey1`'s `command` → `execute` change broke it — *shell-level seam proven out-of-tree; the in-session invocation is carried to ACCEPT-04, as it needs an interactive approval and the BOB2-04 fix installed first*
- [x] **BOB2-04**: The installer and adapter are correct for Bob 2.0's relocated settings (`~/.bob/settings/settings.json`) and consolidated Agent mode — no writes to paths 2.0 no longer reads, and the 2.0.1 approval rules for Bob-home writes are accounted for — *found and fixed a P0: global installs wrote a `custom_modes.yaml` Bob 2.0 never reads. Approval-prompt behaviour is an acceptance-UX observation (Phase 17)*
- [x] **BOB2-05**: Subagent isolation and parallel fan-out are determined empirically on live Bob 2.x, replacing the doc-derived `parallelSubagentFanout` default with an observed value — *observed `true`; unblocks PAR-01*

### gsd-core 1.14.0 Re-sync

Bring the vendored payload forward eight minor versions on one consistent version.

- [x] **RESYNC-01**: The vendored `gsd-core/` payload is fully replaced at `1.14.0` (workflows, templates, references, bin, contexts) — one consistent version, never a mixed payload
- [x] **RESYNC-02**: The Bob deltas are re-applied via `apply-bob-patches.cjs` and the descriptor/converter/golden/equivalence suites pass, or each diff is updated with a recorded justification; `MAINTAINING.md` is corrected from the real 1.6.1 → 1.14.0 replay — *the six-delta model grew to **nine** (`VALID_CONVERTER_NAMES` allowlist, `.bob` resolver probes, the `.gsd-runtime` marker), the script gained a `preflight()` and a `verifyAll()` after its 4b anchor turned out to have been deleted upstream in 1.7.0, and the descriptor itself had to change (`localConfigDir`, `hostIntegration`, `version`, `engines` added; illegal `hookEvents` removed) to validate against 1.14.0's own validator*
- [x] **RESYNC-03**: The model-neutrality invariant is re-run over the 1.14.0 payload and holds at zero literals across the full emitted `.bob/` set, including model IDs added upstream since 1.6.1
- [x] **RESYNC-04**: The commands added upstream since 1.6.1 (`next`, `onboard`, `quick-batch`) are put through the capability gate and vendored if supported, with `SUPPORT-ROSTER.md`, `COMMANDS.md`, and `README.md` regenerated from the gate rather than hand-edited — *all three emit; 28 → 31, 0 unsupported*
- [x] **RESYNC-05**: The installer seeds `workflow.use_worktrees: false` (alongside `text_mode` and `context_window`, un-merged on uninstall) and the payload ships the per-install `gsd-core/.gsd-runtime` marker, so 1.14.0's dispatch-isolation gate passes and the runtime ladder resolves `bob` — *without the seed, `execute-phase` exits `FATAL: runtime declares no executor-isolation primitive` on `dispatch.isolation: "none"`; without the marker every `dispatch-*` query answered for the reference runtime's descriptor. `.planning/config.json` deliberately gets no `runtime` key — it is the cross-runtime interchange surface*
- [x] **RESYNC-06**: Global installs emit **absolute** `<target>/gsd-core/...` references — in both converted artifact sets and in the `gsd` mode's `customInstructions` shell-out — while local installs keep the workspace-relative `.bob/gsd-core/...` form; the `gsd_run` resolver preamble probes `<root>/.bob/gsd-core` and `$HOME/.bob/gsd-core` — *through v0.2.3 every install emitted the workspace-relative form, which does not exist under `~/.bob`, and the preamble had never probed `.bob` at all*


- [x] **NEUTRAL-04**: The emitted `.bob/` set names **no agent or assistant other than Bob**, and no emitted flow asks the user to choose a model or backend. This extends v2.0's NEUTRAL-03 (which forbade *model* literals) to **agent/product brand names and selection prompts**. Originally scoped to Phase 13, deferred to its own Phase 18 (Phase 13 D-10), and **executed 2026-09-16 as a second pass on Phase 13** (`phases/13-gsd-core-1-14-0-re-sync/13-02-SUMMARY.md`).

  **Scope achieved — a stage-time transform, not spot edits.** `bobifyRuntimeDoc` in `src/bob-adapter.cjs` Bob-ifies every markdown the model reads: the converted `commands/`/`skills/` **and** the vendored `gsd-core/{workflows,references,templates,contexts}` tree. Four composed transforms: upstream config-home paths re-pointed at this install (scope-aware — workspace-relative for `--local`, absolute for `--global`) and the upstream project-instruction filename → `AGENTS.md`; the 19-runtime `gsd_run` resolver preamble replaced wholesale by a Bob-only probe; upstream's own `filterRuntimeNotesForTarget(…, 'bob')` dropping notes addressed to other hosts; and agent/vendor/model-name neutralization (reference runtime → "Bob", any other runtime → "another runtime", vendors → "the model vendor", model products/tiers → capability-neutral phrases). Every name table in the adapter is base64-decoded at load, so the adapter source itself carries no bare brand literal.

  **Exact scope:** **zero** tokens anywhere in `commands/`, `skills/`, `custom_modes.yaml` and `SUPPORT-ROSTER.md`; **zero** in doc-tree **prose and every non-shell fenced block**; **no** upstream config-home path or instruction filename surviving anywhere, shell fences included; every resolver preamble the Bob one, pointing at this install. **Deliberate residual:** inside **shell** fences only comment and `echo`/`printf` lines are neutralized — bare identifiers (`case … in <runtime-id>)` arms, dead env-var probes, `--<runtime>` tokens in a command line) are left as upstream wrote them, because renaming them could activate another host's branch on Bob or leave a live arm under a misleading name. ~130 such identifiers remain tree-wide; the count is **bounded by test**, so a transform that stops running fails loud.

  **Config half:** the seeds became FOUR adapter-owned keys — `workflow.text_mode: true`, `workflow.use_worktrees: false`, `context_window: 200000` (the **floor** of Bob's documented "200,000 to 270,000 tokens", down from the 270000 ceiling v0.2.x–v0.3.0 seeded), and `resolve_model_ids: "omit"` (Bob owns model routing; dispatches carry no model parameter and no flow asks the user to pick one).

  **Enforced by** `test/agent-neutrality.test.cjs` over **both** install scopes (real installs into mkdtemp targets), with its forbidden-word table derived from the adapter's own tables so the test and the transform cannot drift. gsd-bob's own human-facing docs were neutralized in the same pass; `UPSTREAM.md`'s inventory tables and `MAINTAINING.md`'s anchor table are the only places that still quote upstream symbol names verbatim, each saying so once, because they exist to point a gsd-core maintainer at gsd-core's own code.

### Native Bob 2.0 Surfaces

Adopt the surfaces that did not exist when v1 chose flag-and-skip. This retires the standing
NATIVE-01 deferral: gaps that were flagged because Bob lacked the primitive now have real targets.

- [ ] **NATIVE-02**: GSD's agent types are emitted as Bob agent personas under `.bob/agents/`, so subagent-dispatching workflows run as real isolated subagents instead of degrading to the inline fallback
- [ ] **NATIVE-03**: gsd-core 1.14.0's runtime-aware subagent dispatch is configured for the `bob` runtime (dispatch type resolution + the agent-skills fallback for non-dispatchable runtimes), so workflows select the correct path without Bob-specific branching in workflow bodies
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

- [ ] **DESC-01**: A spike determines whether the `bob` runtime can be expressed as an external/pluggable descriptor (`capability.json` + registry loading under 1.14.0's configHome trust gate), retiring the hand-edit to vendored `capability-registry.cjs` — delivered as a go/no-go with working evidence either way, not a migration — *answered **NO-GO** by Phase 13's delta research (§2.6): `capability-loader.cjs` would compose an external descriptor into `registry.runtimes.bob`, but every module that resolves a runtime `require`s the frozen `capability-registry.cjs` directly and never calls `loadRegistry`. What remains for Phase 16 is an upstream proposal to route `runtime-homes` / `runtime-artifact-layout` through the loader*
- [x] **UP-03**: `UPSTREAM.md` is rewritten against 1.14.0 — every file:line pointer re-verified, the converter framing updated for upstream's generated-registry cutover, and DESC-01's verdict recorded so a maintainer sees the current, not the 1.6.1, shape of the contribution — *discharged in Phase 13: the inventory grew from 6 to 9 artifacts (adding the `VALID_CONVERTER_NAMES` entries, the resolver-preamble line and the runtime marker) and the contribution shape is restated as `capabilities/bob/capability.json` + a regenerated registry*

### Documentation & Live-Bob Acceptance

Close the loop: docs regenerated for the new baseline, and the acceptance pass that v1 and v2 could
only assemble finally executed.

- [x] **DOCS-05**: `README.md`, `ARCHITECTURE.md`, `COMMANDS.md`, `MAINTAINING.md`, and `SUPPORT-ROSTER.md` are regenerated/updated for Bob 2.0.x + gsd-core 1.14.0, with generated artifacts still sourced from their generators rather than hand-edited — *discharged in Phase 13, ahead of Phase 17; `UPSTREAM.md`, `.claude/CLAUDE.md` and the cover stamps were updated in the same pass. The Phase 14/15 surfaces are not documented because they are not built*
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
- **PARITY-01**: Full parity with the upstream command set (72 at 1.14.0; 31 curated today)

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
| Executing the upstream PR in v3.0 | v3.0 establishes what the contribution *is* post-1.14.0 (DESC-01/UP-03); the PR is MERGE-01 |
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
| RESYNC-01 | Phase 13 | Complete |
| RESYNC-02 | Phase 13 | Complete |
| RESYNC-03 | Phase 13 | Complete |
| RESYNC-04 | Phase 13 | Complete |
| RESYNC-05 | Phase 13 | Complete |
| RESYNC-06 | Phase 13 | Complete |
| NEUTRAL-04 | Phase 18 (executed as Phase 13's second pass) | Complete — prose + non-shell fences zero; shell identifiers a bounded residual |
| NATIVE-02 | Phase 14 | Pending |
| NATIVE-03 | Phase 14 | Pending |
| NATIVE-04 | Phase 14 | Pending |
| NATIVE-05 | Phase 14 | Pending |
| MCP-01 | Phase 15 | Pending |
| MCP-02 | Phase 15 | Pending |
| MCP-03 | Phase 15 | Pending |
| DESC-01 | Phase 16 | Answered NO-GO in Phase 13; upstream proposal pending |
| UP-03 | Phase 13 | Complete (was Phase 16) |
| DOCS-05 | Phase 13 | Complete (was Phase 17) |
| DOCS-06 | Phase 17 | Pending |
| ACCEPT-03 | Phase 17 | Pending |
| ACCEPT-04 | Phase 17 | Pending |
| ACCEPT-05 | Phase 17 | Pending |

**Coverage:**

- v3.0 requirements: **26** total (BOB2 5 + RESYNC 6 + NEUTRAL-04 + NATIVE 4 + MCP 3 + DESC/UP 2 + DOCS/ACCEPT 5 = 26) — all mapped to Phases 12–18; 26/26 mapped, no orphans. RESYNC grew from 4 to 6 (RESYNC-05, RESYNC-06 added 2026-09-16 for findings Phase 13 made rather than inherited)
- v3.0 complete: **14/26** — BOB2-01…05 (Phase 12, 2026-08-13); RESYNC-01…06 + UP-03 + DOCS-05 (Phase 13, 2026-09-16); NEUTRAL-04 (Phase 18, executed 2026-09-16 as Phase 13's second pass)
- v3.0 pending: 12/26 — NATIVE-02…05 (Phase 14, blocked: personas undocumented), MCP-01…03 (Phase 15), DESC-01 (Phase 16, verdict recorded), DOCS-06 + ACCEPT-03…05 (Phase 17, blocked: no Bob 2.x on the dev device)
- Shipped: v1 30/30 (Phases 1–6), v2.0 15/15 (Phases 7–11) — see the archive

---
*Requirements defined: 2026-06-17*
*Last updated: 2026-09-16 — Phase 13 closed, then its second pass (Phase 18 / NEUTRAL-04) executed. RESYNC-01…04 re-targeted 1.10.0 → 1.14.0 and ticked; RESYNC-05 (worktree seed + runtime marker) and RESYNC-06 (absolute global refs) added for findings the phase made rather than inherited; UP-03 and DOCS-05 discharged early in Phase 13; DESC-01 answered NO-GO with evidence; NEUTRAL-04 executed as Phase 13's second pass (stage-time agent-neutralization + the four config seeds). Shipped v1/v2.0 rows live in `milestones/v2.0-REQUIREMENTS.md`.*
