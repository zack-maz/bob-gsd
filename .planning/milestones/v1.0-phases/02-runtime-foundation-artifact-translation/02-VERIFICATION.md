---
phase: 02-runtime-foundation-artifact-translation
verified: 2026-06-17T00:00:00Z
reverified: 2026-06-18T19:54:14Z
status: verified
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
resolution: >
  Both gaps below were closed by plan 02-04 (gap closure) and re-confirmed by
  the Phase 2 UAT (10/10 pass) and gsd-secure-phase (threats_open: 0). Gap 1
  (body-neutralization BLOCKER) closed by convertClaudeToBobContent wired into
  both Bob converters with golden tests asserting zero .claude/gsd: in emitted
  bodies (commits 3435622, 67f1338). Gap 2 (silent-failure edges) closed by
  loud-failure guards in src/bob-adapter.cjs — mergeCustomModes throws on a
  non-mapping root, gateArtifact rejects null/nameless candidates,
  buildSupportRoster never emits an `undefined:` line (commit 35300dd). Full
  suite 50/50 pass.
gaps:
  - truth: "A GSD command/skill emitted by the Bob converters is provably correct against Bob's documented contract and actually WORKS on the Bob runtime (parity-first)"
    status: resolved
    resolved_by: "02-04 (convertClaudeToBobContent + golden body-neutralization tests; commits 3435622, 67f1338)"
    reason: >
      The Bob converters satisfy the FRONTMATTER contract (name+description for
      skills; description+argument-hint for commands — golden tests pass) but pass
      the BODY through unneutralized. `.claude/`, `~/.claude/`, `$HOME/.claude/`
      and the `gsd:` colon form survive verbatim into emitted `.bob/` artifacts,
      while the bob registry declares configHome.name === ".bob". An emitted Bob
      skill whose body says `@$HOME/.claude/gsd-core/workflows/manager.md` points
      Bob at a path that does not exist under a `.bob` install, so the artifact is
      well-formed but does NOT work on the Bob runtime. Confirmed by execution:
      convertClaudeCommandToBobSkill / convertClaudeCommandToBobCommand emit
      `.claude`/`gsd:` unchanged; 59 skill+command files in the live payload carry
      `.claude/gsd` references. Every sibling converter in the same module
      (Antigravity line 632-655 "Applied to ALL content"; Cline line 1161-1185)
      neutralizes both paths and `gsd:`; Bob is the only one that does not.
      This defeats the phase goal's explicit "provably correct against Bob's
      documented contract" / parity-first intent even though the narrow 02-02
      must_haves (frontmatter strip + $ARGUMENTS→$1) were met.
    artifacts:
      - path: "gsd-core/bin/lib/runtime-artifact-conversion.cjs"
        issue: "convertClaudeCommandToBobSkill (line 695-701) returns ${fm}\\n${body} with body untouched; convertClaudeCommandToBobCommand (line 714-727) applies ONLY $ARGUMENTS→$1. No .claude→.bob path neutralization, no gsd:→gsd- conversion — unlike every peer converter in this module."
      - path: "test/fixtures/skill/input.md"
        issue: "Golden fixture bodies contain no .claude/ or gsd: references, so the golden tests green-light and lock in the buggy pass-through (WR-03)."
      - path: "test/fixtures/command/input.md"
        issue: "Same — command golden fixture has no .claude/gsd: body content to exercise neutralization."
    missing:
      - "A convertClaudeToBobContent(content, isGlobal) body pass mirroring convertClaudeToAntigravityContent: map $HOME/.claude/ ~/.claude/ ./.claude/ .claude/ to the .bob home, and gsd: → gsd-, applied to BOTH converters' bodies (command: neutralize THEN project $ARGUMENTS)."
      - "Update skill+command golden fixtures to include .claude/... and a /gsd:something reference and assert the .bob/ + gsd- rewrites, so the golden diff fails until the neutralization lands (WR-03)."
      - "Confirm the exact .bob home/path mapping (global vs local) against the Phase 3 install plan."
  - truth: "Unsupported / malformed artifacts and custom_modes inputs fail LOUD, never silently (parity-first / loud-failure intent of TRANS-04 and TRANS-05)"
    status: resolved
    resolved_by: "02-04 (loud-failure guards in src/bob-adapter.cjs; commit 35300dd)"
    reason: >
      Three silent-failure edges contradict the loud-failure intent these
      requirements are built on. (1) mergeCustomModes on a sequence-root YAML
      silently DROPS the gsd mode — verified: mergeCustomModes('- one\n- two\n',
      emitGsdMode()) returns '- one\n- two\n' with no gsd entry and no error
      (WR-01); a scalar root throws an opaque TypeError. (2) gateArtifact(null,
      decl) returns {supported:true} — a null/malformed candidate is silently
      ADMITTED to the loadable set rather than flagged (WR-04). (3)
      buildSupportRoster emits a malformed 'undefined: unsupported on Bob: ...'
      line for a nameless candidate. The happy-path TRANS-04/TRANS-05 invariants
      ARE proven (merge idempotency, slug-scoped preservation, representative
      gate + roster), so this is partial, not failed — but the loud-failure
      guarantee the requirements claim is not upheld on malformed input.
    artifacts:
      - path: "src/bob-adapter.cjs"
        issue: "mergeCustomModes (line 77-89) assumes an object root — no guard for scalar/array roots (WR-01); gateArtifact (line 127-141) admits a null candidate as supported; buildSupportRoster (line 152-161) emits 'undefined:' for a nameless candidate (WR-04)."
    missing:
      - "Guard the parsed YAML root in mergeCustomModes: if not a plain object (scalar/array), fail loudly or start from {} deliberately rather than silently dropping the gsd mode."
      - "Validate candidate shape in gateArtifact/buildSupportRoster: a null candidate or non-string/empty name must be excluded with a concrete reason or fail loud, never admitted-as-supported or emitted as 'undefined:'."
deferred: []
---

# Phase 2: Runtime Foundation & Artifact Translation Verification Report

**Phase Goal:** Stand up the backend-agnostic runtime spine and the Bob-native emitter — the irreducible core of the package — so a converted GSD command/skill is provably correct against Bob's documented contract and `gsd-tools.cjs` resolves a `bob` runtime home, all verifiable without a live Bob.
**Verified:** 2026-06-17 (initial, gaps_found) · **Re-verified:** 2026-06-18 (gaps closed)
**Status:** verified — 9/9
**Re-verification:** Yes — both gaps closed by plan 02-04, re-confirmed by Phase 2 UAT (10/10) + secure-phase (threats_open: 0). See `## Gap Resolution (2026-06-18)` below.

## Goal Achievement

This phase has two halves. The **runtime spine** (RUNTIME-01..04) is achieved cleanly and verifiably. The **Bob-native emitter** (TRANS-01..05) is mechanically present and the narrow per-plan must_haves were met, but a goal-backward read against the phase's *own stated* "provably correct against Bob's documented contract" / parity-first intent surfaces a parity-breaking gap (CR-01) and a cluster of silent-failure edges that contradict the loud-failure guarantee TRANS-04/05 are sold on.

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `gsd_run` resolves the bob config home to `~/.bob` by default and `$BOB_CONFIG_DIR` when set (RUNTIME-01) | ✓ VERIFIED | `resolveConfigHomeFromDescriptor({kind:'dot-home',name:'.bob',...})` → `/home/u/.bob` default, `/tmp/x` with override (executed). |
| 2   | A data-only `bob` runtime descriptor exists in gsd-core's vocabulary; alias registered; install plan valid (RUNTIME-02) | ✓ VERIFIED | `runtimes.bob` has configHome dot-home `.bob`, artifactLayout skills+commands, valid install axes; `resolveInstallPlan('bob')` returns clean; alias `["bob","bob-cli"]` in manifest + FALLBACK_ALIASES. |
| 3   | A `.planning/` artifact under bob config is byte-identical to one under claude config (RUNTIME-03) | ✓ VERIFIED | `planning-bytecompat.test.cjs` drives the real `stateReplaceField` write path under both runtime contexts and asserts byte-identity + config-home non-leak; structural invariant also asserted. Real hermetic golden diff (primary path), not the fallback. |
| 4   | Zero model-name literals (Claude/Gemini/Granite/GPT) in the bob adapter + registry core paths (RUNTIME-04) | ✓ VERIFIED | `backend-neutrality.test.cjs` passes; bob entry `description` and axes carry no brand; `hookEvents:'none'` chosen over the cursor template's `'claude'`. |
| 5   | A GSD command → `.bob/commands/<name>.md` with description+argument-hint only and `$ARGUMENTS`→`$1` (TRANS-01) | ⚠️ PARTIAL → see Gap 1 | Frontmatter contract met (golden test passes); BUT body `.claude`/`gsd:` references pass through unneutralized — emitted command does not work on a `.bob` runtime. |
| 6   | A GSD skill → `.bob/skills/<name>/SKILL.md` with name+description only (TRANS-02) | ⚠️ PARTIAL → see Gap 1 | Frontmatter contract met (golden test passes); same body-neutralization gap as #5. |
| 7   | `AskUserQuestion` degrades to numbered `text_mode` and captures a validated answer; no converter rewriting (TRANS-03) | ✓ VERIFIED | `text-mode-golden.test.cjs`: seam projects `workflow.text_mode:true` via real `loadConfig`, global default proven `false`, degradation contract (numbered list + validated typed choice) asserted, converter guard confirms no AskUserQuestion branch. Satisfied by reuse of the gsd-core seam. |
| 8   | A representative unsupported skill is omitted AND recorded `unsupported on Bob: <reason>` in a roster (TRANS-04) | ⚠️ PARTIAL → see Gap 2 | Happy path proven (gate + roster, SUPPORT-ROSTER.md has 2 loud markers); BUT a null/malformed candidate is silently admitted as supported (WR-04) — the loud-failure guarantee is not upheld on malformed input. |
| 9   | `custom_modes.yaml` merges idempotently, preserves user modes, replaces gsd slug in place (TRANS-05) | ⚠️ PARTIAL → see Gap 2 | Three happy-path invariants proven (idempotency, non-gsd preservation, replace-not-duplicate); BUT a sequence-root YAML silently DROPS the gsd mode and a scalar root throws (WR-01) — opposite of the loud-failure intent. |

**Score:** 7/9 truths verified (5 clean; 2 partial — TRANS-01/02 share Gap 1, TRANS-04/05 share Gap 2). Counting per-requirement, RUNTIME-01..04 + TRANS-03 fully verified (5); TRANS-01/02/04/05 are partial.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json` | CJS, engines node>=22.15.0, js-yaml 4.1.0 pinned | ✓ VERIFIED | `type` absent, engines `>=22.15.0`, `js-yaml` exact `4.1.0`, glob test script. |
| `gsd-core/bin/lib/capability-registry.cjs` | `runtimes['bob']` data entry | ✓ VERIFIED | Full bob descriptor dumped; loads cleanly. |
| `gsd-core/bin/shared/runtime-aliases.manifest.json` | bob alias | ✓ VERIFIED | `["bob","bob-cli"]`. |
| `gsd-core/bin/lib/runtime-artifact-conversion.cjs` | both Bob converters exported | ⚠️ HOLLOW | Functions exist, exported, resolve via layout dispatch — but body neutralization missing (Gap 1). Wired but functionally incomplete for the goal. |
| `src/bob-adapter.cjs` | emitGsdMode, mergeCustomModes, gateArtifact, buildSupportRoster | ✓ VERIFIED (happy path) | All exported; js-yaml confined here. Edge-case robustness is Gap 2. |
| `SUPPORT-ROSTER.md` | generated roster with marker | ✓ VERIFIED | Generated, 2 `unsupported on Bob:` lines, caveat header. |
| `.planning/ACCEPTANCE-CHECKLIST.md` | AC-05+ for every Phase 2 req | ✓ VERIFIED | AC-05..AC-12 present; every RUNTIME-/TRANS- ID appears in a `Confirms:`; AC-01..AC-04 intact. |
| 8 `node:test` files | descriptor, backend-neutrality, planning-bytecompat, skill/command-golden, merge, unsupported-gate, text-mode-golden | ✓ VERIFIED | All present; `npm test` → 42/42 pass. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| capability-registry bob entry | runtime-homes.cjs | configHome dot-home resolution | ✓ WIRED | `resolveConfigHomeFromDescriptor` returns `~/.bob` / override. |
| capability-registry bob entry | runtime-artifact-conversion.cjs | converter STRINGS resolve to exports | ✓ WIRED | Both `convertClaudeCommandToBob*` resolve to exported functions (text-mode-golden test asserts wiring). |
| src/bob-adapter.cjs | js-yaml | yaml.load/yaml.dump | ✓ WIRED | Sole production importer; install path stays node:fs-only. |

### Backend-Neutrality / Byte-Compat Notes

- RUNTIME-03 used the **real hermetic golden diff** (primary path), not the structural fallback — confirmed in `planning-bytecompat.test.cjs`. The on-device end-to-end byte diff is queued as AC-05.
- RUNTIME-04 grep is correctly scoped to the bob entry + adapter; the `convertClaude*ToBob*` converter-name prefix (a universal gsd-core source-format token, not a backend selection) is stripped before brand matching.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full Phase 2 suite | `npm test` | 42 pass / 0 fail | ✓ PASS |
| Descriptor default + override | `resolveConfigHomeFromDescriptor(...)` | `/home/u/.bob`, `/tmp/x` | ✓ PASS |
| Bob skill body neutralization | converter on `.claude`/`gsd:` body | `.claude` & `gsd:` survive | ✗ FAIL (Gap 1) |
| mergeCustomModes on sequence root | `mergeCustomModes('- one\n- two\n', emitGsdMode())` | gsd mode silently dropped | ✗ FAIL (Gap 2) |
| gateArtifact(null) | `gateArtifact(null, {})` | `{supported:true}` | ✗ FAIL (Gap 2) |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| RUNTIME-01 | 02-01 | ✓ SATISFIED | Descriptor resolution test + execution. |
| RUNTIME-02 | 02-01 | ✓ SATISFIED | Registry entry + alias + valid install plan. |
| RUNTIME-03 | 02-01 | ✓ SATISFIED | Real hermetic byte diff. |
| RUNTIME-04 | 02-01 | ✓ SATISFIED | Backend-neutrality test, scoped grep. |
| TRANS-01 | 02-02 | ⚠️ PARTIAL | Frontmatter+`$1` met; body not neutralized → not working on `.bob` (Gap 1). |
| TRANS-02 | 02-02 | ⚠️ PARTIAL | Frontmatter met; body not neutralized (Gap 1). |
| TRANS-03 | 02-03 | ✓ SATISFIED | text_mode seam reuse, golden test. |
| TRANS-04 | 02-02 | ⚠️ PARTIAL | Happy-path gate/roster proven; null candidate silently admitted (Gap 2). |
| TRANS-05 | 02-02 | ⚠️ PARTIAL | Happy-path merge invariants proven; non-mapping root silently drops gsd mode (Gap 2). |

All 9 declared requirement IDs are accounted for. No orphaned requirements (REQUIREMENTS.md maps exactly RUNTIME-01..04 + TRANS-01..05 to Phase 2).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| runtime-artifact-conversion.cjs | 695-727 | Body pass-through omitting peer neutralization | 🛑 Blocker | Emitted Bob artifacts reference `.claude`/`gsd:` — broken on `.bob` runtime. |
| src/bob-adapter.cjs | 77-89, 127-141, 152-161 | Silent drop / silent admit on malformed input | ⚠️ Warning | Contradicts loud-failure intent of TRANS-04/05. |
| test/fixtures/{skill,command}/input.md | — | Golden fixtures omit `.claude`/`gsd:` body | ⚠️ Warning | Tests bake in the buggy pass-through; no regression guard. |

No `TODO`/`FIXME`/`XXX` debt markers found in phase-modified files.

### Gaps Summary

The runtime foundation (RUNTIME-01..04) is solid, verifiable without a live Bob, and matches the phase goal's "spine" half precisely. The translation half is where goal-backward analysis diverges from task-completion.

**Central question (CR-01): does body-path non-neutralization defeat the phase goal?**

My reasoning, stated explicitly:

- **Against the narrow must_haves: NO defect.** The 02-02 must_haves specify only frontmatter whitelisting + `$ARGUMENTS`→`$1`. Both converters do exactly that, and the golden tests pass. Success criterion #2 is phrased as the *"documented file/frontmatter contract"* — and the emitted SKILL.md / command.md are well-formed and loadable. On a literal reading of SC#2, the converters conform.

- **Against the phase GOAL and its parity-first principle: this IS a defect.** The goal is that "a converted GSD command/skill is **provably correct against Bob's documented contract**" and the verification mandate states "the phase's stated parity-first principle requires that emitted artifacts actually **WORK** against Bob's documented contract." An emitted Bob skill whose body instructs the model to read `@$HOME/.claude/gsd-core/workflows/manager.md` (a real line in `gsd-manager/SKILL.md`) directs Bob to a path that does not exist under a `.bob` install — the artifact loads but does not function. The registry in this very phase declares `configHome.name === ".bob"`, so the converter output is internally inconsistent with the runtime the phase stood up.

- **The "looks deliberate vs overlooked" tell points to overlooked.** Every sibling converter in the same module neutralizes the body: Antigravity (line 632-655, doc-comment "Applied to ALL content (skills, agents, engine files)") and Cline (line 1161-1185, `.claude/→.cline/` + `gsd:→gsd-`). Bob is the *only* converter that omits this. The presence of the `$ARGUMENTS`→`$1` body transform shows the author knew bodies need transforming — they simply did not port the path/command neutralization. The golden fixtures contain no `.claude`/`gsd:` content, so the test suite cannot catch it (WR-03).

- **Magnitude is real, not latent.** 59 skill+command files in the live payload reference `.claude/gsd`; 2 reference `~/.claude`/`$HOME/.claude`. These are the exact artifacts the converters will process when Phase 3 wires staging. (Colon-form `gsd:` is 0 in the current payload, so that half is presently latent but still a missing guard.)

**Verdict:** This is a BLOCKER against the phase goal, not merely a code-review nit. Task completion ≠ goal achievement: the converters were *built* (tasks done) but do not *deliver* "provably-correct, parity-first" Bob artifacts (goal missed). It is correctly out of scope of the literal 02-02 must_have wording — which is itself the finding: the must_haves under-specified the body contract relative to the phase goal. Routing this back to `/gsd-plan-phase --gaps` (or accepting an override if the maintainer decides body-neutralization legitimately belongs to Phase 3 staging) is the right next step.

**Override note (if intentional):** If the maintainer's intent is that body neutralization is owned by the Phase 3 install/staging path rather than the converters, this can be accepted by adding an `overrides:` entry to this file's frontmatter with a reason and acceptance metadata — but the current code places neutralization in the converters for every other runtime, so deferring it for Bob alone would need a deliberate, documented decision and a guard ensuring Phase 3 actually applies it.

Gap 2 (silent-failure edges) is a WARNING-grade robustness gap against TRANS-04/05's loud-failure framing; the happy paths those requirements assert are genuinely proven.

---

## Gap Resolution (2026-06-18)

Both gaps were closed by **plan 02-04 (Phase 2 Gap Closure)** and re-confirmed by the Phase 2 UAT (10/10 pass, `02-UAT.md`) and `gsd-secure-phase` (`02-SECURITY.md`, threats_open: 0). Final suite: **50/50 pass**.

| Gap | Was | Resolution | Evidence | Commit |
| --- | --- | ---------- | -------- | ------ |
| 1 — body neutralization (BLOCKER, TRANS-01/02) | `.claude`/`gsd:` survived verbatim into emitted `.bob/` bodies | `convertClaudeToBobContent(content, isGlobal)` mirrors the Antigravity body pass retargeted to the `.bob` home (global `~/.bob`, local `.bob`) + `gsd:`→`gsd-`, wired into BOTH converters (command: neutralize THEN `$ARGUMENTS`→`$1`). Golden fixtures now carry `.claude`/`/gsd:` input and assert zero `.claude`/`gsd:` + presence of `.bob`/`gsd-` in output. | `skill-golden.test.cjs`, `command-golden.test.cjs` (byte-identity + negative assertions) | `3435622`, `67f1338` |
| 2 — silent-failure edges (WARNING, TRANS-04/05) | seq-root YAML silently dropped the gsd mode; `gateArtifact(null)` returned `{supported:true}`; `buildSupportRoster` emitted `undefined:` | `mergeCustomModes` throws a concrete error on a non-mapping root (null/comment-only still → `{}`); `gateArtifact` rejects null/non-string/empty-name candidates with a reason; `buildSupportRoster` uses an `<unnamed candidate>` placeholder. | `merge.test.cjs`, `unsupported-gate.test.cjs` (loud-failure + exclusion regressions) | `35300dd` |

Updated truths #5/#6 (TRANS-01/02) and #8/#9 (TRANS-04/05): ⚠️ PARTIAL → ✓ VERIFIED. Score 7/9 → **9/9**.

_Verified: 2026-06-17 · Re-verified: 2026-06-18_
_Verifier: Claude (gsd-verifier; re-verification via gsd-verify-work + gsd-secure-phase)_
