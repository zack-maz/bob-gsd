# Phase 5: Quality Gates & Upstream Readiness - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

> **Discussion mode:** `--auto --chain`. User delegated every decision. The decisions below are Claude's recommendations, grounded in the locked Phase 1/2/3/4 decisions (CAPABILITY-MAP SPIKE defaults, the built emitter/gate, the roster-agnostic installer, the Phase 4 port-by-conversion + sequential-inline + text_mode pattern), CLAUDE.md constraints, and gsd-core conventions. Each is a confirm-or-adjust point; none re-litigate the Phase 1–4 locks.

<domain>
## Phase Boundary

The **daily-driver review gates** — `code-review` (+ `--fix`), `debug` (with persistent debug state across resets), and `audit` (`audit-fix` / `audit-uat`) — are ported **parity-first** to run natively under Bob, **and** the whole adapter is audited to a standard a gsd-core maintainer could review and lift upstream **as a move, not a rewrite**. All dev-time verification is test-deferred: Claude-runtime equivalence, state-persistence tests, roster-vs-capability-map inspection, a backend-neutrality grep, and doc review — **no live Bob**. Each success criterion also contributes a device-runnable step to `.planning/ACCEPTANCE-CHECKLIST.md` (continuing from AC-21) for the Phase 6 on-device pass.

**In scope (QUAL-01..03, UP-01..02):**
1. `/gsd-code-review` (including `--fix`) reviews changed source under Bob — verified by Claude-runtime equivalence on a fixture diff (QUAL-01).
2. `/gsd-debug` debugs with **persistent debug state across resets** under Bob — verified by a state-persistence test (QUAL-02).
3. `/gsd-audit` (`audit-fix` / `audit-uat`) runs natively, and **every skill skipped under parity-first carries an explicit flagged reason** — verified by inspecting the emitted roster against the capability map (QUAL-03).
4. All Bob-specific code is isolated to **one adapter component** expressed in gsd-core's descriptor/converter vocabulary, a backend-neutrality grep finds **zero model-name literals** in core paths, and the **targeted gsd-core version is recorded** — so the work lifts upstream as a move (UP-01).
5. The package ships a **README** documenting install, scope/modes, supported skills, and flagged gaps, to a maintainer-reviewable standard (UP-02).

**Locked upstream — do NOT re-decide:**
- **SPIKE-01 (CAPABILITY-MAP):** sequential inline — assume **NO** isolated subagents. Orchestrator skills that fan out subagents degrade to sequential-inline execution by the single Bob agent.
- **SPIKE-02 (CAPABILITY-MAP):** `text_mode` — assume **NO** structured-choice prompt. `AskUserQuestion` degrades to numbered text choices via the **already-built TRANS-03 seam** (Phase 2).
- **Backend neutrality (RUNTIME-04):** no model-backend branching; no `Claude`/`Gemini`/`Granite`/`GPT` literals in core paths (already asserted by `test/backend-neutrality.test.cjs`).
- **`.planning/` root-anchoring (CORE-05):** workspace root next to `.bob/`, never nested in the scope dir.
- **The emitter, the parity gate, and the installer are already built and roster-agnostic** (Phase 2 `src/bob-adapter.cjs`; Phase 3 `src/installer/`). The installer stages whatever the `bob` runtime emits. Phase 5 does **not** rebuild any of these.
- **Port-by-conversion, not rewrite** (Phase 4 D-01): quality-gate artifacts are emitted through the existing `bob` converter from the vendored gsd-core payload — gsd-bob hand-rewrites nothing.
- **Parity-first; flag/skip gaps loudly** — a quality-gate artifact that genuinely cannot degrade is routed to `SUPPORT-ROSTER.md` with a concrete reason, never silently broken.

</domain>

<decisions>
## Implementation Decisions

### Port mechanism — same conversion pipeline as the core loop (QUAL-01..03, UP-01)
- **D-01:** **Port-by-conversion (reuse the Phase 4 mechanism verbatim).** The quality-gate commands/workflows/agents are emitted through the **existing `bob` converter** from the vendored `gsd-core/` payload — no hand-rewrite. Phase 5's deliverable is: (a) confirm the quality-gate artifacts and their transitive workflow/agent dependencies are present in the vendored payload and enumerated by the `bob` runtime; (b) ensure they convert and gate correctly; (c) build the equivalence/state-persistence/roster verification; (d) append device-runnable AC steps; (e) the UP-01/UP-02 audit + README. This keeps the install diff equal to the eventual upstream PR diff (UP-01 "move, not a rewrite"). **Researcher confirm-item:** enumerate exactly which workflow files + agent prompts `code-review` (+`code-review-fix`), `debug`, `audit-fix`, and `audit-uat` transitively pull in, and confirm each is in the vendored payload. (Vendored payload confirmed to contain `workflows/code-review.md`, `code-review-fix.md`, `debug.md`, `audit-fix.md`, `audit-uat.md`; agent prompts — `gsd-code-reviewer`, `gsd-code-fixer`, `gsd-debug-session-manager`, `gsd-debugger`, `gsd-executor` — live in gsd-core's installed tree; confirm the conversion source.)

### Subagent degradation — sequential-inline lower bound (SPIKE-01 lock, QUAL-01..03)
- **D-02:** **No isolated subagents → the single Bob agent performs each delegated step inline, sequentially.** All three gates use **sequential single-subagent** delegation, never concurrent fan-out: `code-review` spawns `gsd-code-reviewer`, then (with `--fix`) dispatches `code-review-fix` → `gsd-code-fixer`; `debug` delegates to `gsd-debug-session-manager` → `gsd-debugger`; `audit-fix` spawns `gsd-executor` one scoped fix at a time. Each collapses to sequential-inline with **identical output** (slower wall-clock only). The `bob` capability declaration already advertises `isolatedSubagents:false`, so the runtime selects this path.
- **D-03:** **Gate, don't break — expected outcome is NO new skips.** Because every quality gate is sequential single-subagent (no correctness dependence on *concurrent* subagent results), all three are expected to degrade cleanly. A quality-gate artifact is added to `BOB_SKIP_LIST` / routed to `SUPPORT-ROSTER.md` **only** if it has a hard dependency on isolation + completion-signals that cannot be expressed inline — the parity gate is the safety net, and any skip carries a concrete reason. **Researcher confirm-item:** verify no quality-gate command's correctness depends on *concurrent* subagent results (vs. merely faster); flag any that does. (Current `BOB_SKIP_LIST` holds only `gsd-autonomous`; `gsd-parallel-fanout` is gated by the `isolatedSubagents` primitive.)

### Debug persistent state (QUAL-02) — file-based, backend-neutral, reset-surviving
- **D-04:** **Persistence rides the existing `.planning/debug/{slug}.md` session file — no new state mechanism.** `/gsd-debug` already writes session state to `.planning/debug/{SLUG}.md` and resumes via `/gsd-debug continue <slug>` (reads the file back), with resolved sessions archived under `.planning/debug/resolved/`. This is plain on-disk markdown — **runtime-neutral and survives context resets by construction**, exactly what QUAL-02 requires. The slug is already sanitized (`^[a-z0-9][a-z0-9-]*$`, max 30 chars, rejects `..`/`/`/`\`). Under Bob the interactive checkpoints render as numbered `text_mode` choices via the TRANS-03 seam; the sequential-inline model (D-02) runs the session-manager/debugger steps in one context.
- **D-05:** **QUAL-02's "persistent across resets" is a verification obligation.** The state-persistence test MUST: start a debug session, assert `.planning/debug/{slug}.md` is written with the expected fields, simulate a reset (fresh invocation / new context), `continue <slug>`, and assert the session state is faithfully restored from disk — under the Claude/Node runtime as the backend-agnostic equivalence proxy. This is the explicit guard against a "starts but loses state on reset" false-positive (the QUAL-02 analog of Phase 4's D-05 real-answers guard).

### Audit native + roster reasons (QUAL-03) — every skip flagged loud
- **D-06:** **`audit-fix` and `audit-uat` port by conversion (D-01); the parity gate owns the "explicit flagged reason" half of QUAL-03.** QUAL-03 is satisfied when (a) the audit commands run natively (sequential-inline + text_mode), and (b) the **roster is inspected against the capability map** so every parity-first skip is recorded as an `unsupported on Bob: <reason>` line in `SUPPORT-ROSTER.md`. `SUPPORT-ROSTER.md` is generated from the `gateArtifact`/`buildSupportRoster` gate (`scripts/generate-support-roster.cjs`), **never hand-maintained** — a stale/silent roster would hide a parity gap. **Researcher confirm-item:** confirm the roster generator enumerates the full quality-gate candidate set (not just the Phase 2 representative subset) so any genuine skip surfaces; verify each roster line's reason traces to a CAPABILITY-MAP primitive default.

### Upstream isolation audit (UP-01) — lift as a move, not a rewrite
- **D-07:** **Audit, don't refactor — confirm the existing isolation holds and record the targeted version.** UP-01 is a verification/documentation obligation, not new code: (a) confirm all Bob-specific logic is confined to **one adapter component** — `src/bob-adapter.cjs` plus the `"bob"` entry in `gsd-core/bin/lib/capability-registry.cjs` and the `dot-home` descriptor / alias touchpoints expressed in gsd-core's existing vocabulary (the ~5-touchpoint "move" inventory from Phase 2); (b) the backend-neutrality grep (`test/backend-neutrality.test.cjs`) stays green — **zero** model-name literals in the bob entry + adapter; (c) **record the targeted gsd-core version = `1.5.0`** (confirmed: `gsd-core/VERSION` = `1.5.0`, matches CLAUDE.md "latest 1.5.0") in a durable, maintainer-visible place (README + an inventory doc). **Researcher confirm-item:** produce the exact "5 artifacts to upstream" inventory (registry entry, 2 converters, alias, configHome/getDirName + shim branch) with file:line pointers, so the upstream PR diff is pre-scoped.

### README to maintainer standard (UP-02)
- **D-08:** **Ship a net-new top-level `README.md`** (none exists today) covering, at minimum: the one-line `npx` install, **scope** (local `<project>/.bob/` vs global `~/.bob/`) and **modes** (re-run = update, `--uninstall` + install = clean — never invented `--clean`/`--update` flags), the **supported skills** list (sourced from `SUPPORT-ROSTER.md`, not hand-listed), the **flagged gaps** (`unsupported on Bob:` reasons), the **targeted gsd-core version** (1.5.0) and the test-deferred / no-local-Bob posture, and a pointer to `.planning/ACCEPTANCE-CHECKLIST.md` for the on-device pass. Written to the documentation standard a gsd-core maintainer could review (clear, accurate, no marketing fluff; mirrors gsd-core's own README conventions).

### Verification harness — equivalence + state-persistence + roster-inspection + grep + doc review (test-deferred principle)
- **D-09:** **Complementary checks, all runnable in the Claude/Node runtime without a live Bob:**
  1. **Claude-runtime equivalence** — run `code-review` (incl. `--fix`) against a frozen fixture diff and assert the produced `REVIEW.md`/`REVIEW-FIX.md` conform to the contract (QUAL-01); audit commands run natively against a fixture (QUAL-03).
  2. **State-persistence test** (`node:test`) — D-05's start → write → reset → `continue` → restore assertion (QUAL-02).
  3. **Roster-vs-capability-map inspection** — assert every `SUPPORT-ROSTER.md` skip line has a reason tracing to a capability-map primitive, and that no supported quality-gate artifact is missing (QUAL-03).
  4. **Backend-neutrality grep** (existing `test/backend-neutrality.test.cjs`) stays green (UP-01).
  5. **Doc/structure review** — README presence + required sections; the 5-artifact upstream inventory exists (UP-01/UP-02).
- **D-10:** **Append device-runnable AC steps** to `.planning/ACCEPTANCE-CHECKLIST.md` per the Phase 1 D-07 convention (AC-ID + `Cmd/Expect/Confirms/Result` schema) — continuing from **AC-21** (next is AC-22), one per Phase 5 success criterion (the in-Bob run of `code-review`, `debug` resume, `audit`, plus the upstream-readiness/README checks where device-runnable). Mirrors Phase 2/3/4 verification style (`node:test`, scratch fixtures).

### Claude's Discretion
- Fixture diff shape for the code-review equivalence test and how the golden `REVIEW.md` reference is frozen/stored.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11 / Phase 3 D-15 / Phase 4).
- Exact AC-ID numbering continuation and per-command checklist copy.
- README section ordering and depth (within the UP-02 required-content floor in D-08).
- The exact filename/location of the "5-artifact upstream inventory" doc (e.g., a dedicated `UPSTREAM.md` vs a README section) — both acceptable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Project planning contract
- `.planning/ROADMAP.md` §"Phase 5: Quality Gates & Upstream Readiness" — the 5 Success Criteria + the test-deferred cross-cutting principle (every SC verifiable without live Bob; every phase contributes device-runnable AC steps).
- `.planning/REQUIREMENTS.md` §"Quality Gates" (QUAL-01..03) + §"Upstream Readiness" (UP-01, UP-02) — the 5 requirements this phase covers.
- `.planning/PROJECT.md` §Constraints, §Key Decisions — backend-agnostic core, parity-first flag/skip, vendor-then-upstream, no-local-Bob test-deferred development, contribution-readiness.

### Phase 1/2/3/4 input contract (source of truth — do NOT rebuild)
- `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` — **INPUT CONTRACT.** SPIKE-01 (sequential inline), SPIKE-02 (text_mode), SPIKE-03 (`command` shell-out seam), SPIKE-04 (config home `~/.bob`). §2 adjacent contracts: SKILL.md (`name`+`description` only, strip extra keys), slash-command (`description`+`argument-hint`, `$1`/`$2`, hyphen form).
- `.planning/phases/02-runtime-foundation-artifact-translation/02-CONTEXT.md` — **MUST read.** The built emitter/converters, TRANS-03 text_mode seam, `gateArtifact` + `SUPPORT-ROSTER.md`, backend-neutrality, byte-compat contract, the ~5-touchpoint upstream-parity wiring (the UP-01 "move" inventory origin).
- `.planning/phases/03-installer/03-CONTEXT.md` — the roster-agnostic installer (D-08/D-09 convert-at-install — picks up quality-gate artifacts with zero installer changes), `.planning/config.json` text_mode merge, root-anchoring.
- `.planning/phases/04-core-loop-port/04-CONTEXT.md` — **MUST read.** The port-by-conversion mechanism (D-01), sequential-inline degradation (D-02/D-03), reuse-the-text_mode-seam (D-04), the equivalence/golden/structural verification pattern (D-06/D-07) and real-answers false-positive guard (D-05) that Phase 5 mirrors for state-persistence.
- `.planning/ACCEPTANCE-CHECKLIST.md` — **append target** for this phase's device-runnable AC steps (Phase 1 D-07 convention; continue AC-ID numbering from AC-21).

### gsd-bob code Phase 5 verifies/extends (this repo)
- `src/bob-adapter.cjs` — the built emitter/gate: `emitGsdMode`, `mergeCustomModes`, `gateArtifact`, `buildSupportRoster`, `BOB_SKIP_LIST` (currently `gsd-autonomous`), `PRIMITIVE_REASONS` (`isolatedSubagents`, `structuredPrompts`), `UNSUPPORTED_MARKER`. Phase 5 may **add** quality-gate skip entries only if a command proves un-degradable — otherwise untouched. **The single Bob-specific component for UP-01.**
- `gsd-core/bin/lib/capability-registry.cjs` §`"bob"` entry — the hand-edited bob capability declaration (`isolatedSubagents:false`, `text_mode`, `.bob` layout). Part of the UP-01 "move" inventory.
- `gsd-core/bin/gsd-tools.cjs` + `gsd-core/bin/lib/runtime-homes.cjs` — the vendored shim + `dot-home` descriptor that resolves the `bob` home; the `gsd_run query state.load` / `state.*` calls the quality gates use.
- `gsd-core/VERSION` — `1.5.0`, the targeted gsd-core version to record (UP-01).
- `gsd-core/workflows/code-review.md`, `code-review-fix.md`, `debug.md`, `audit-fix.md`, `audit-uat.md` — the vendored quality-gate workflow payload the commands transitively load (the conversion source). **Researcher must enumerate the exact transitive set incl. agent prompts.**
- `scripts/generate-support-roster.cjs` + `SUPPORT-ROSTER.md` — regenerated if any quality-gate artifact is gated; QUAL-03's "explicit flagged reason" surface.
- `test/backend-neutrality.test.cjs` — UP-01 zero-model-literal grep; must stay green.
- `test/core-loop-equivalence.test.cjs`, `test/core-loop-contract.test.cjs`, `test/_helpers/vendor.cjs`, `test/fixtures/` — the equivalence/golden/structural `node:test` pattern + fixture layout to mirror for the QUAL/UP tests.

### gsd-core convention to mirror (documented, not branched on)
- CLAUDE.md §"How gsd-core Actually Works", §"What gsd-bob Adds", §"Stack Patterns by Variant", §"What NOT to Use" — the converter-strips-unsupported-keys rule, the `gsd-<cmd>` hyphen form (never legacy `gsd:<cmd>`), the re-run=update / uninstall+install=clean convention (no invented flags), and the move-not-rewrite upstream posture (the 5-artifact PR shape for UP-01).

### Bob documentation (citation-grade — via CAPABILITY-MAP)
- `https://bob.ibm.com/docs/ide/core-concepts/tools` — tool catalog (no subagent-spawn API → SPIKE-01; `ask_followup_question` → SPIKE-02; `execute_command` → SPIKE-03).
- `https://bob.ibm.com/docs/ide/features/slash-commands` · `https://bob.ibm.com/docs/ide/features/skills` — the command/skill file+frontmatter contract the converted quality-gate artifacts must satisfy.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/bob-adapter.cjs`** — the full built emitter/gate. Phase 5 runs the quality-gate artifacts **through** it; no new converter code. Adds a `BOB_SKIP_LIST` entry only if a quality-gate command proves un-degradable. This is also the **single Bob-specific component** the UP-01 audit confirms.
- **`src/installer/` (Phase 3)** — roster-agnostic staging; auto-picks up the quality-gate artifacts with **zero installer changes** (Phase 3 D-08). No installer work in Phase 5.
- **Vendored `gsd-core/workflows/` quality-gate set** — `code-review.md`, `code-review-fix.md`, `debug.md`, `audit-fix.md`, `audit-uat.md`; the conversion source of truth.
- **`.planning/debug/{slug}.md` session model** (in `debug.md`) — the file-based, reset-surviving persistence QUAL-02 needs; resume via `continue <slug>`, archive under `resolved/`. Backend-neutral by construction.
- **`scripts/generate-support-roster.cjs` + `SUPPORT-ROSTER.md`** — the QUAL-03 flagged-reason surface; regenerate, never hand-edit.
- **`test/` `node:test` suites + `test/_helpers/vendor.cjs` + `test/fixtures/`** — the pattern for the equivalence/state-persistence/roster/grep tests.
- **`test/backend-neutrality.test.cjs`** — the UP-01 zero-model-literal assertion; already passing.

### Established Patterns
- **Port-by-conversion, not rewrite** (Phase 4 D-01) — quality gates flow through the same `bob` converter; the install diff equals the upstream PR diff.
- **Sequential-inline lower bound** (SPIKE-01) — fan-out subagent steps execute in-order in one context; output equivalence is the contract, wall-clock is not.
- **text_mode via the descriptor + config seam** (Phase 2 TRANS-03 / Phase 3 D-13/D-14) — no per-skill degradation code; debug checkpoints render as numbered choices.
- **Fail-loud parity gate** (Phase 2 D-12 / TRANS-04) — un-degradable artifact → `SUPPORT-ROSTER.md` line, never silent.
- **Append-only acceptance checklist** (Phase 1 D-07) — continue AC-ID numbering from AC-21.
- **Single-Bob-adapter isolation** (Phase 2 ~5-touchpoint inventory) — the UP-01 "move, not rewrite" shape.

### Integration Points
- The `bob` capability declaration (`capability-registry.cjs`) → the runtime branch that selects sequential-inline + text_mode for the quality-gate commands.
- The staged `.bob/commands` + `.bob/skills` (from the installer) → the runtime surface the equivalence/state-persistence tests exercise.
- `.planning/debug/` → the QUAL-02 persistence directory (created by the debug workflow at runtime).
- `.planning/ACCEPTANCE-CHECKLIST.md` → append the Phase 5 in-Bob AC steps (from AC-22).
- `SUPPORT-ROSTER.md` ← regenerated from the gate; the QUAL-03 inspection target.
- `README.md` (net-new) + optional `UPSTREAM.md` ← the UP-02 / UP-01 documentation surfaces.

</code_context>

<specifics>
## Specific Ideas

- Verification proxy: because gsd-bob is **backend-agnostic**, running the **converted** quality-gate artifacts under the Claude/Node runtime is the standing equivalence proxy for the Bob run.
- QUAL-02's single most important false-positive trap: a debug session that *starts* but loses state on reset. The state-persistence test must do a real reset → `continue <slug>` → restore-from-disk assertion (D-05).
- Expected outcome: **all three quality gates degrade to sequential-inline + text_mode with no skip** — `SUPPORT-ROSTER.md` gains no quality-gate line. Any exception is a flagged gap with a concrete reason, not a silent failure.
- UP-01 is a "prove the isolation already holds + record the version" audit, not a refactor — the backend-neutrality test already passes and the adapter is already a single component; Phase 5 confirms and documents it.
- README supported-skills list must be **sourced from the roster/gate output**, never hand-typed, so it can't drift from what actually installs.

</specifics>

<deferred>
## Deferred Ideas

- **Broader skill coverage** (`new-milestone`, `complete-milestone`, `transition`, `spec-phase`, `mvp-phase`, `ui-phase`, `ai-integration-phase`, `autonomous`, `manager`, `workstreams`) — v2 (REQUIREMENTS LIFE-01/SHAPE-01/AUTO-01); Phase 5 ports only the `code-review` / `debug` / `audit` daily-driver subset.
- **Other review/quality skills present in the vendored payload** (`eval-review`, `ui-review`, `plan-review-convergence`, `audit-milestone`, `secure-phase`, `validate-phase`) — out of the QUAL-01..03 v1 scope; not ported in Phase 5.
- **Actual upstream PR to open-gsd/gsd-core** — MERGE-01, a follow-on activity; Phase 5 makes the work *mergeable* (UP-01/UP-02) but does not open the PR (PROJECT.md: ships standalone first).
- **Rich Bob-native re-modeling of subagents/prompts** (modes/agents instead of sequential-inline/text_mode) — v2 NATIVE-01.
- **Worktree-isolated / concurrent execution** — v2 PAR-01; only revisited if Bob proves on-device it supports isolation + completion signals (Phase 6 watch-list).

None beyond the above — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Quality Gates & Upstream Readiness*
*Context gathered: 2026-06-19*
