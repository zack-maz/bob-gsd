# Phase 4: Core-Loop Port - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 4-Core-Loop Port
**Mode:** `--auto --chain` (all gray areas auto-selected; recommended option chosen per question)
**Areas discussed:** Port mechanism, Subagent degradation, text_mode fidelity, Verification harness, Root-anchoring

---

## Port mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Port-by-conversion | Emit core-loop artifacts through the already-built `bob` converter; no rewrite. Install diff == upstream PR diff (UP-01). | ✓ |
| Hand-rewrite core-loop skills | Author Bob-specific versions of each core-loop skill | |

**User's choice:** Port-by-conversion (auto, recommended)
**Notes:** Phase 4 confirms/converts/gates/verifies; it does not rebuild the emitter or installer (both built Phase 2/3). Researcher must enumerate the exact transitive workflow/agent set.

---

## Subagent degradation

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential-inline lower bound | Single Bob agent performs each delegated step inline, in order (SPIKE-01 lock); gate only hard-isolation skills | ✓ |
| Skip all subagent-spawning skills | Flag every orchestrator skill as unsupported | |
| Assume Bob isolation | Bet on undocumented isolated subagents | |

**User's choice:** Sequential-inline (auto, recommended)
**Notes:** Output equivalence is the contract, not wall-clock. `gsd-autonomous` precedent is the only current skip. Expectation: all five core-loop commands degrade cleanly; gate is the safety net.

---

## text_mode fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse built TRANS-03 seam | Descriptor + config text_mode default; no new degradation code; verify real validated answers | ✓ |
| New per-skill degradation code | Author bespoke text rendering per core-loop skill | |

**User's choice:** Reuse the seam (auto, recommended)
**Notes:** CORE-01 "real validated answers, not placeholders" becomes a verification obligation — the equivalence test threads genuine answers and asserts they land in the artifacts.

---

## Verification harness

| Option | Description | Selected |
|--------|-------------|----------|
| Equivalence + golden diff + structural | Claude-runtime equivalence proxy, byte golden diff vs frozen fixture, `node:test` contract assertions, root-anchoring assertion, append AC steps | ✓ |
| Structural-only | Section/frontmatter checks without golden diff | |
| Defer all verification to on-device | Rely solely on Phase 6 | |

**User's choice:** Equivalence + golden diff + structural (auto, recommended)
**Notes:** Mirrors Phase 2/3 (`node:test`, scratch fixtures). Backend-agnostic ⇒ Claude run is the standing proxy for the Bob run.

---

## Root-anchoring

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated structural assertion | Exactly one `.planning/` at workspace root next to `.bob/`, no nested second `.planning/` after a full loop run | ✓ |
| Trust Phase 3 wiring implicitly | No explicit Phase 4 assertion | |

**User's choice:** Dedicated assertion (auto, recommended)
**Notes:** Satisfies CORE-05 explicitly; reuses the root-anchoring established in Phase 2/3.

---

## Claude's Discretion

- Fixture project shape and how the golden `.planning/` reference tree is frozen/stored.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11 / Phase 3 D-15).
- Exact AC-ID numbering continuation and per-command checklist copy.
- Whether equivalence is asserted per-command or as one end-to-end loop run (or both).

## Deferred Ideas

- Worktree-isolated / concurrent core-loop execution → v2 PAR-01 (Phase 6 watch-list).
- Quality-gate skills (code-review, debug, audit) → Phase 5.
- Lifecycle / phase-shaping / autonomy clusters → v2 (LIFE-01 / SHAPE-01 / AUTO-01).
- Rich Bob-native re-modeling of subagents/prompts → v2 NATIVE-01.
