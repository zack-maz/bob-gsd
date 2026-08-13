# Phase 4: Core-Loop Port - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

> **Discussion mode:** `--auto --chain`. User delegated every decision. The decisions below are Claude's recommendations, grounded in the locked Phase 1/2/3 decisions (CAPABILITY-MAP SPIKE defaults, the built emitter/gate, the roster-agnostic installer), CLAUDE.md constraints, and gsd-core conventions. Each is a confirm-or-adjust point; none re-litigate the Phase 1/2/3 locks.

<domain>
## Phase Boundary

The essential GSD planning spine — `new-project` → `plan-phase` (+ transitive `discuss-phase`) → `execute-phase` (+ `execute-plan`) → `verify` (`verify-work`/`verify-phase`) → `progress` — is made to run natively under Bob, producing a `.planning/` tree **byte-compatible** with a Claude run. This is the **Core Value gate**. All dev-time verification is test-deferred: Claude-runtime equivalence, golden diff against the artifact contract, and structural assertions — **no live Bob**. Each success criterion also contributes a device-runnable step to `.planning/ACCEPTANCE-CHECKLIST.md` for the Phase 6 on-device pass.

**In scope (CORE-01..05):**
1. `/gsd-new-project` produces PROJECT.md → REQUIREMENTS.md → ROADMAP.md with **real validated `text_mode` answers (not placeholders)** (CORE-01).
2. `/gsd-plan-phase` (and transitive `discuss-phase`) produces a contract-conformant PLAN.md (CORE-02).
3. `/gsd-execute-phase` (and `execute-plan`) executes plans with atomic commits under the **sequential-inline** model (CORE-03).
4. `/gsd-verify` validates the completed phase against its goals (CORE-04).
5. `/gsd-progress` reports status and advances the workflow; `.planning/` sits at the **workspace root next to `.bob/` with no nested second `.planning/`** (CORE-05).

**Locked upstream — do NOT re-decide:**
- **SPIKE-01 (CAPABILITY-MAP):** sequential inline — assume **NO** isolated subagents. Orchestrator skills that fan out subagents degrade to sequential-inline execution by the single Bob agent.
- **SPIKE-02 (CAPABILITY-MAP):** `text_mode` — assume **NO** structured-choice prompt. `AskUserQuestion` degrades to numbered text choices via the **already-built TRANS-03 seam** (Phase 2).
- **Backend neutrality (RUNTIME-04):** no model-backend branching; no `Claude`/`Gemini`/`Granite` literals in core paths.
- **`.planning/` root-anchoring (CORE-05):** workspace root next to `.bob/`, never nested in the scope dir.
- **The emitter, the parity gate, and the installer are already built** (Phase 2 `src/bob-adapter.cjs`; Phase 3 `src/installer/`). The installer is **roster-agnostic** — it stages whatever the `bob` runtime emits. Phase 4 does **not** rebuild any of these.
- **Parity-first; flag/skip gaps loudly** — a core-loop artifact that genuinely cannot degrade is routed to `SUPPORT-ROSTER.md` with a concrete reason, never silently broken.

</domain>

<decisions>
## Implementation Decisions

### Port mechanism — conversion, not rewrite (CORE-01..05, UP-01)
- **D-01:** **Port-by-conversion.** The core-loop commands/skills/workflows/agents are emitted through the **existing `bob` converter** (Phase 2) from the vendored gsd-core payload — gsd-bob does **not** hand-rewrite any GSD skill. Phase 4's deliverable is: (a) confirm the core-loop artifacts and their transitive workflow/agent dependencies are present in the vendored `gsd-core/` payload and enumerated by the `bob` runtime; (b) ensure they convert and gate correctly; (c) build the equivalence/golden verification; (d) append device-runnable AC steps. This keeps the install diff equal to the eventual upstream PR diff (UP-01 "move, not a rewrite"). **Researcher confirm-item:** enumerate exactly which workflow files + agent prompts the five core-loop commands transitively pull in, and confirm each is in the vendored payload (the payload has `workflows/`, `contexts/`, `references/`, `templates/`, `bin/` — skill/agent definitions live in gsd-core's installed tree; confirm the conversion source).

### Subagent degradation — sequential-inline lower bound (SPIKE-01 lock, CORE-03)
- **D-02:** **No isolated subagents → the single Bob agent performs each delegated step inline, sequentially**, in the order the orchestrator workflow specifies. `new-project`'s 4 parallel researchers + synthesizer + roadmapper run sequentially → same SUMMARY.md/ROADMAP.md. `plan-phase`'s researcher → pattern-mapper → planner → plan-checker run sequentially → same PLAN.md. `execute-phase`'s wave-based parallelization collapses to sequential waves → same atomic commits, same artifacts (slower wall-clock, identical output). The `bob` capability declaration already advertises `isolatedSubagents:false` (capability-registry bob entry) so the runtime selects this path.
- **D-03:** **Gate, don't break.** A core-loop artifact is added to `BOB_SKIP_LIST`/routed to `SUPPORT-ROSTER.md` **only** if it has a hard dependency on isolation + completion-signals that cannot be expressed inline (the `gsd-autonomous` precedent). The expectation is that **all five core-loop commands degrade cleanly** to sequential-inline and none need skipping — but the parity gate is the safety net, and any skip carries a concrete reason. **Researcher confirm-item:** verify no core-loop command's correctness depends on *concurrent* subagent results (vs. merely faster); flag any that does.

### text_mode interaction fidelity — reuse the built seam (SPIKE-02 lock, CORE-01, CORE-02)
- **D-04:** **Reuse the TRANS-03 text_mode seam (Phase 2); no new degradation code.** `new-project` (deep context gathering) and `discuss-phase` are `AskUserQuestion`-heavy; under Bob these render as numbered `text_mode` choices via the descriptor-level default + gsd-core's existing text_mode rendering. The installer already writes `workflow.text_mode: true` to root `.planning/config.json` (Phase 3 D-13) and the `bob` descriptor forces it at runtime (Phase 3 D-14).
- **D-05:** **CORE-01's "real validated answers, not placeholders" is a verification obligation.** The equivalence test MUST drive **actual** answers through the text_mode flow and assert the produced PROJECT.md/REQUIREMENTS.md/ROADMAP.md contain those validated answers — not stub/placeholder text. This is the explicit guard against a "passes structurally but is empty" false-positive.

### Verification harness — equivalence + golden diff + structural (test-deferred principle)
- **D-06:** **Three complementary checks, all runnable in the Claude/Node runtime without a live Bob:**
  1. **Claude-runtime equivalence + golden diff** — run each core-loop command against a frozen fixture project, capture the produced `.planning/` subtree, and assert a byte-level golden diff against the contract reference (CORE-01/02/04). Because gsd-bob is backend-agnostic, the converted-artifact run under Claude is the equivalence proxy for the Bob run.
  2. **Artifact-contract structural tests** (`node:test`) — PLAN.md/PROJECT.md/etc. match the documented section/frontmatter contract (CORE-02), atomic-commit assertions for execute (CORE-03).
  3. **Root-anchoring assertion** — see D-07 (CORE-05).
- **D-07:** **Root-anchoring (CORE-05) is a dedicated structural assertion:** exactly one `.planning/` at the workspace root, adjacent to `.bob/`, with **no nested second `.planning/`** anywhere under the scope dir, after a full loop run. Reuses the root-anchoring already established in Phase 2/3.
- **D-08:** **Append device-runnable AC steps** to `.planning/ACCEPTANCE-CHECKLIST.md` per the Phase 1 D-07 convention (AC-ID + `Cmd/Expect/Confirms/Result` schema) — one per core-loop success criterion (the in-Bob run of each command), continuing from the highest existing AC-ID. Mirrors Phase 2/3 verification style (`node:test`, scratch fixtures).

### Claude's Discretion
- Fixture project shape and how the golden `.planning/` reference tree is frozen/stored.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11 / Phase 3 D-15).
- Exact AC-ID numbering continuation and per-command checklist copy.
- Whether equivalence is asserted per-command or as one end-to-end loop run (or both).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Project planning contract
- `.planning/ROADMAP.md` §"Phase 4: Core-Loop Port" — the 5 Success Criteria + the test-deferred cross-cutting principle (every SC verifiable without live Bob; every phase contributes device-runnable AC steps).
- `.planning/REQUIREMENTS.md` §"Core Loop Port" (CORE-01..05) — the 5 requirements this phase covers.
- `.planning/PROJECT.md` §Constraints, §Key Decisions — backend-agnostic core, parity-first flag/skip, vendor-then-upstream, no-local-Bob test-deferred development.

### Phase 1/2/3 input contract (source of truth — do NOT rebuild)
- `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` — **INPUT CONTRACT.** SPIKE-01 (sequential inline), SPIKE-02 (text_mode), SPIKE-03 (`command` shell-out seam), SPIKE-04 (config home `~/.bob`). §2 adjacent contracts: SKILL.md (`name`+`description` only, strip extra keys), slash-command (`description`+`argument-hint`, `$1`/`$2`, hyphen form), custom-mode `groups`.
- `.planning/phases/02-runtime-foundation-artifact-translation/02-CONTEXT.md` — **MUST read.** The built emitter/converters, TRANS-03 text_mode seam, `gateArtifact` + `SUPPORT-ROSTER.md`, backend-neutrality, byte-compat contract.
- `.planning/phases/03-installer/03-CONTEXT.md` — the roster-agnostic installer (D-08/D-09 convert-at-install), `.planning/config.json` text_mode merge (D-13), text_mode belt-and-suspenders (D-14), `.planning/` root-anchoring (D-13/CORE-05).
- `.planning/ACCEPTANCE-CHECKLIST.md` — **append target** for this phase's device-runnable AC steps (Phase 1 D-07 convention; continue AC-ID numbering).

### gsd-bob code Phase 4 verifies/extends (this repo)
- `src/bob-adapter.cjs` — the built emitter surface: `emitGsdMode`, `mergeCustomModes`, `gateArtifact`, `buildSupportRoster`, `BOB_SKIP_LIST` (currently only `gsd-autonomous`), `UNSUPPORTED_MARKER`. Phase 4 may **add** core-loop skip entries only if a command proves un-degradable — otherwise untouched.
- `gsd-core/bin/lib/capability-registry.cjs` §`"bob"` entry (~line 3045) — the hand-edited bob capability declaration (`isolatedSubagents:false`, `text_mode`, `.bob` layout). The runtime reads this to select the sequential-inline + text_mode paths.
- `gsd-core/bin/gsd-tools.cjs` + `gsd-core/bin/lib/runtime-homes.cjs` — the vendored shim + `dot-home` descriptor that resolves the `bob` home (SPIKE-03 shell-out seam) under Bob.
- `gsd-core/workflows/` — the vendored workflow payload the core-loop commands transitively load (`new-project`, `plan-phase`, `discuss-phase`, `execute-phase`, `execute-plan`, `verify-*`, `progress`). **Researcher must enumerate the exact transitive set.**
- `scripts/generate-support-roster.cjs` + `SUPPORT-ROSTER.md` — regenerated if any core-loop artifact is gated.
- `test/` — existing `node:test` suites + fixture layout to mirror for the equivalence/golden tests.

### gsd-core convention to mirror (documented, not branched on)
- CLAUDE.md §"How gsd-core Actually Works", §"Stack Patterns by Variant" — the converter-strips-unsupported-keys rule, the `gsd-<cmd>` hyphen form (never legacy `gsd:<cmd>`), and the move-not-rewrite upstream posture.

### Bob documentation (citation-grade — via CAPABILITY-MAP)
- `https://bob.ibm.com/docs/ide/core-concepts/tools` — tool catalog (no subagent-spawn API → SPIKE-01; `ask_followup_question` → SPIKE-02; `execute_command` → SPIKE-03).
- `https://bob.ibm.com/docs/ide/features/slash-commands` · `https://bob.ibm.com/docs/ide/features/skills` — the command/skill file+frontmatter contract the converted core-loop artifacts must satisfy.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/bob-adapter.cjs`** — the full built emitter/gate. Phase 4 runs the core-loop artifacts **through** it; no new converter code. Adds a `BOB_SKIP_LIST` entry only if a core-loop command proves un-degradable.
- **`src/installer/` (Phase 3)** — roster-agnostic staging; the staged `.bob/` is the surface Phase 4's loop runs against. The installer auto-picks up the core-loop artifacts with **zero installer changes** (Phase 3 D-08).
- **Vendored `gsd-core/workflows/`** — the workflow definitions the five core-loop commands load; the conversion source of truth.
- **`gsd-core/bin/gsd-tools.cjs`** — `gsd_run query` (init, state, commit) is what the core-loop workflows call; resolves the `bob` home via the `dot-home` descriptor.
- **`test/` `node:test` suites + fixtures** — the pattern for the equivalence/golden/structural tests (mirror Phase 2 D-11 / Phase 3 D-15).

### Established Patterns
- **Sequential-inline lower bound** (SPIKE-01) — fan-out subagent steps execute in-order in one context; output equivalence is the contract, wall-clock is not.
- **text_mode via the descriptor + config seam** (Phase 2 TRANS-03 / Phase 3 D-13/D-14) — no per-skill degradation code.
- **Fail-loud parity gate** (Phase 2 D-12 / TRANS-04) — un-degradable artifact → `SUPPORT-ROSTER.md` line, never silent.
- **`.planning/` root-anchored** at workspace root (Phase 3 D-13 / CORE-05) — the single structural invariant Phase 4 asserts.
- **Append-only acceptance checklist** (Phase 1 D-07) — continue AC-ID numbering.

### Integration Points
- The `bob` capability declaration (`capability-registry.cjs`) → the runtime branch that selects sequential-inline + text_mode for the core-loop commands.
- `.planning/ACCEPTANCE-CHECKLIST.md` → append the five core-loop in-Bob AC steps.
- The staged `.bob/commands` + `.bob/skills` (from the installer) → the runtime surface the equivalence test exercises.

</code_context>

<specifics>
## Specific Ideas

- Verification proxy: because gsd-bob is **backend-agnostic**, running the **converted** core-loop artifacts under the Claude/Node runtime is the standing equivalence proxy for the Bob run — the golden `.planning/` produced must byte-match the contract reference.
- The CORE-01 "real validated answers, not placeholders" guard is the single most important false-positive trap: the equivalence test must thread genuine `text_mode` answers and assert they land in the artifacts.
- Expected outcome: **all five core-loop commands degrade to sequential-inline + text_mode with no skip** — `SUPPORT-ROSTER.md` gains no core-loop line. Any exception is a flagged gap with a concrete reason, not a silent failure.

</specifics>

<deferred>
## Deferred Ideas

- **Worktree-isolated / concurrent execution of the core loop** — explicitly v2 (PAR-01); only revisited if Bob proves on-device that it supports isolation + completion signals (Phase 6 watch-list).
- **Quality-gate skills** (`code-review`, `debug`, `audit`) — Phase 5, not Phase 4.
- **Lifecycle / phase-shaping / autonomy clusters** — out of v1 scope (REQUIREMENTS v2 LIFE-01/SHAPE-01/AUTO-01).
- **Rich Bob-native re-modeling of subagents/prompts** (modes/agents instead of sequential-inline/text_mode) — v2 NATIVE-01.

None beyond the above — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Core-Loop Port*
*Context gathered: 2026-06-19*
