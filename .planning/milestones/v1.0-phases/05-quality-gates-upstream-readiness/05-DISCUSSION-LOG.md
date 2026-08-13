# Phase 5: Quality Gates & Upstream Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 5-Quality Gates & Upstream Readiness
**Mode:** `--auto --chain` — user delegated every decision; Claude selected the recommended default for each gray area, grounded in the Phase 1–4 locks. No interactive prompts.
**Areas discussed:** Quality-gate port mechanism, Subagent degradation for quality gates, Debug persistent state (QUAL-02), Audit roster reasons (QUAL-03), UP-01 upstream isolation audit, UP-02 README, Verification harness

---

## Quality-gate port mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Port-by-conversion (reuse Phase 4 pipeline) | Emit quality-gate artifacts through the existing `bob` converter from the vendored payload; no hand-rewrite | ✓ |
| Hand-rewrite each quality-gate skill for Bob | Author Bob-native versions directly | |

**Selected:** Port-by-conversion (D-01). Keeps the install diff equal to the upstream PR diff (UP-01 "move, not a rewrite"); identical to the Phase 4 mechanism.
**Notes:** Researcher must enumerate the exact transitive workflow + agent set for `code-review`/`code-review-fix`/`debug`/`audit-fix`/`audit-uat` and confirm presence in the vendored payload.

---

## Subagent degradation for quality gates

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential-inline (SPIKE-01 lower bound) | Single Bob agent runs each delegated step in-order; identical output, slower wall-clock | ✓ |
| Assume isolated subagents | Rely on concurrent fan-out | |

**Selected:** Sequential-inline (D-02/D-03). All three gates use sequential single-subagent delegation (reviewer→fixer, session-manager→debugger, executor-per-fix) with no concurrent-result dependency → degrade cleanly. Expected: no new skips.
**Notes:** Parity gate is the safety net; any skip carries a concrete `unsupported on Bob:` reason. Researcher confirm-item: flag any command whose correctness needs *concurrent* results.

---

## Debug persistent state (QUAL-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse `.planning/debug/{slug}.md` file model | Existing file-based session state; resume via `continue <slug>`; backend-neutral, reset-surviving | ✓ |
| Build a new Bob-specific persistence mechanism | Bespoke state store | |

**Selected:** Reuse the existing file-based session model (D-04). Plain on-disk markdown survives context resets by construction — exactly QUAL-02's requirement; slug already sanitized.
**Notes:** D-05 makes "persistent across resets" a verification obligation — start → write → reset → continue → restore-from-disk assertion (the QUAL-02 analog of Phase 4's real-answers guard).

---

## Audit roster reasons (QUAL-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Generated roster from the gate + roster-vs-map inspection | `gateArtifact`/`buildSupportRoster` produce `SUPPORT-ROSTER.md`; verify each skip reason traces to a capability-map primitive | ✓ |
| Hand-maintained skip list | Manually curate skipped skills | |

**Selected:** Generated + inspected (D-06). Roster is produced from the gate (`scripts/generate-support-roster.cjs`), never hand-edited — a stale/silent roster would hide a parity gap.
**Notes:** Researcher confirm-item: confirm the generator enumerates the full quality-gate candidate set, not just the Phase 2 representative subset.

---

## UP-01 upstream isolation audit

| Option | Description | Selected |
|--------|-------------|----------|
| Audit + record version (no refactor) | Confirm Bob code is one adapter component, neutrality grep stays green, record gsd-core 1.5.0, produce the 5-artifact move inventory | ✓ |
| Refactor toward isolation now | Restructure code to consolidate Bob logic | |

**Selected:** Audit + record (D-07). Isolation already holds (single `src/bob-adapter.cjs` + bob registry/descriptor touchpoints; `test/backend-neutrality.test.cjs` passing). gsd-core `VERSION` confirmed = 1.5.0.
**Notes:** Researcher confirm-item: produce the exact "5 artifacts to upstream" inventory with file:line pointers, pre-scoping the upstream PR diff.

---

## UP-02 README

| Option | Description | Selected |
|--------|-------------|----------|
| Net-new top-level README to maintainer standard | install / scope / modes / supported-skills (from roster) / flagged-gaps / gsd-core version / acceptance-checklist pointer | ✓ |
| Minimal stub README | Bare install line only | |

**Selected:** Full maintainer-standard README (D-08). None exists today. Supported-skills list sourced from the roster/gate output, never hand-typed (can't drift).
**Notes:** Mirrors gsd-core README conventions; no invented `--clean`/`--update` flags documented (re-run=update, uninstall+install=clean).

---

## Verification harness

| Option | Description | Selected |
|--------|-------------|----------|
| Equivalence + state-persistence + roster-inspection + neutrality grep + doc review | Five complementary checks, all runnable without a live Bob; append device-runnable AC from AC-22 | ✓ |
| Defer verification to the Phase 6 on-device pass | Skip dev-time checks | |

**Selected:** Five complementary checks (D-09/D-10). Test-deferred principle — every SC verifiable in the Claude/Node runtime; device-runnable AC steps appended from AC-22.

---

## Claude's Discretion

- Fixture diff shape + frozen golden `REVIEW.md` reference for the code-review equivalence test.
- `node:test` file naming and fixture layout (consistent with Phase 2/3/4).
- Exact AC-ID numbering continuation (from AC-22) and per-command checklist copy.
- README section ordering/depth (within the UP-02 required-content floor).
- Filename/location of the 5-artifact upstream inventory (dedicated `UPSTREAM.md` vs README section).

## Deferred Ideas

- Broader skill coverage (lifecycle / phase-shaping / autonomy clusters) — v2.
- Other vendored review/quality skills (`eval-review`, `ui-review`, `plan-review-convergence`, `audit-milestone`, `secure-phase`, `validate-phase`) — out of QUAL-01..03 v1 scope.
- Actual upstream PR to gsd-core — MERGE-01 follow-on; Phase 5 only makes the work mergeable.
- Rich Bob-native re-modeling of subagents/prompts — v2 NATIVE-01.
- Worktree-isolated / concurrent execution — v2 PAR-01 (Phase 6 watch-list).
