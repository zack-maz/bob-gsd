# Phase 6: On-Device Acceptance Verification - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

> **Discussion mode:** `--auto --chain`. User delegated every decision. The decisions below are Claude's recommendations, grounded in the locked Phase 1–5 decisions (the D-07 append convention, the SPIKE defaults, the test-deferred cross-cutting principle) and the already-accumulated `.planning/ACCEPTANCE-CHECKLIST.md` (AC-01..AC-26). Each is a confirm-or-adjust point; none re-litigate the Phase 1–5 locks.

<domain>
## Phase Boundary

The **final empirical gate**: compensate for the total absence of a local Bob throughout development by (1) **proving** that the single consolidated `.planning/ACCEPTANCE-CHECKLIST.md` covers every v1 success criterion across Phases 1–5, (2) **structuring** that file so the user can run it **unattended** on a real Bob-enabled machine and record an **unambiguous pass/fail** per item without interpreting or improvising, and (3) standing up a **mechanism to log any capability assumption that proved wrong on-device** (e.g. Bob actually supports isolated subagents, or a structured-choice prompt primitive exists) as a **tracked follow-up enhancement** rather than a silent gap.

This is a **verification / assembly phase, not a build phase.** The checklist already exists and is fully accumulated (AC-01..AC-26, appended phase-by-phase via the Phase 1 **D-07** convention). Phase 6 does **not** author new on-device `AC-NN` steps — it consolidates, completeness-proves, run-structures, and adds the follow-up log. The actual physical "run it on hardware" is the user's single unattended pass; gsd-bob's deliverable is the **runnable, complete, self-recording artifact set** plus the **coverage proof** that nothing is missing.

**In scope (VERIFY-01, VERIFY-02):**
1. A single consolidated acceptance checklist exists with exact commands + expected outputs for **every** v1 success criterion across Phases 1–5, assembled from each phase's contributed device-runnable steps (VERIFY-01) — **prove completeness**, don't re-author.
2. The checklist is structured so the user can run it **unattended** and record an **unambiguous pass/fail** per item without interpreting or improvising (VERIFY-02).
3. A **mechanism** exists to log any capability assumption that proved wrong on-device as a **tracked follow-up enhancement** rather than a silent gap (VERIFY-02).

**Locked upstream — do NOT re-decide:**
- **D-07 append convention (Phase 1):** `.planning/ACCEPTANCE-CHECKLIST.md` is the **single root-anchored** checklist, the append target for Phases 2–6, and the **run target for Phase 6**. It already holds AC-01..AC-26. Phase 6 **runs the entire accumulated file once**, unattended, on real hardware.
- **AC schema (D-05, Phase 1):** every step = stable ID + `Cmd:` / `Expect:` / `Confirms:` / `Result: [ ] pass [ ] fail`. This schema is **frozen**; Phase 6 adds scaffolding around it, not a new per-step shape.
- **Safety invariant (T-01-SC):** every `Cmd:` line is read-only / side-effect-free **except** the explicitly-marked mutating steps (install/loop/gate runs in AC-13..AC-26), which are the intended Phase-6 actions. Phase 6 must **not** loosen this — any new preamble/order text preserves the read-only-by-default posture.
- **Test-deferred cross-cutting principle (Roadmap):** no live Bob on the dev device, ever. Phase 6's own dev-time deliverables (coverage proof, run structure, follow-up log) must themselves be verifiable **without** a live Bob — i.e. by a hermetic test/doc-review, exactly as every prior phase.
- **The watch-list assumptions (SPIKE-01/02/04):** the conservative lower-bound defaults (no isolated subagents → sequential inline; no structured prompts → `text_mode`; config home `~/.bob` fixed, override unverified). These are the **primary candidates** for the wrong-assumption follow-up log — but they are NOT relitigated here; Phase 6 only builds the mechanism to record if hardware refutes them.

</domain>

<decisions>
## Implementation Decisions

### Completeness proof — coverage matrix + hermetic traceability test (VERIFY-01)
- **D-01:** **Prove coverage, don't re-author the checklist.** AC-01..AC-26 already map onto every Phase 1–5 success criterion (Phase 1 SPIKE-01..04 → AC-01..04; Phase 2 RUNTIME/TRANS → AC-05..12; Phase 3 INSTALL → AC-13..16; Phase 4 CORE → AC-17..21; Phase 5 QUAL/UP → AC-22..26). VERIFY-01's deliverable is a **coverage matrix** that makes this mapping explicit and a **hermetic test** that mechanically asserts it. The matrix is a table (`SC / requirement → AC-ID(s)`) sourced from the checklist's `Confirms:` lines so it **cannot drift** from the actual file. **Researcher confirm-item:** enumerate every v1 success criterion from ROADMAP.md Phases 1–5 (and each maps to a `Requirements:` ID in REQUIREMENTS.md) and confirm each has ≥1 `Confirms:`-tagged AC step; flag any orphan SC (no AC) or orphan AC (no SC).
- **D-02:** **The coverage assertion is a `node:test` that parses both sides** — extract every success criterion / requirement ID referenced in the checklist's `Confirms:` lines, cross-reference against the canonical SC list (ROADMAP.md / REQUIREMENTS.md traceability), and fail if any v1 SC across Phases 1–5 is unreferenced. This is the test-deferred, no-live-Bob proof of VERIFY-01 (the hermetic analog of "the checklist is complete"). Mirrors the Phase 5 `roster-vs-capmap` inspection style (parse-and-assert against a frozen contract).

### Unattended-run structure — preamble + ordered execution + results roll-up (VERIFY-02)
- **D-03:** **Add a run-scaffolding preamble to the existing checklist; leave the AC bodies untouched.** VERIFY-02 ("run unattended, record unambiguous pass/fail without interpreting or improvising") is satisfied by wrapping the frozen AC list with: (a) a **"How to run"** preamble — prerequisites (a real Bob install, Node ≥22.15.0, a throwaway/scratch workspace), the `gsd-bob` install step, and an explicit statement that the user only types numbered answers / runs the listed `Cmd:` lines verbatim; (b) an **execution order** that runs the **read-only AC steps first** (AC-01..AC-12 doc/observation + greps) and then the **mutating AC steps in dependency order** (AC-13 install → AC-14 re-run → AC-15 uninstall; AC-17..21 the core loop in sequence; AC-22..26 the gates), so prerequisites are always satisfied before a dependent step; (c) a **results roll-up table** at the top (`AC-ID → pass/fail → notes`) the user fills as a single unambiguous record. No `Cmd:`/`Expect:` text is rewritten — only ordering/preamble/summary scaffolding is added.
- **D-04:** **Keep the per-step `Result: [ ] pass [ ] fail` AND add the roll-up** — the inline checkboxes stay for in-place recording; the top roll-up table is the at-a-glance summary the user reports. Unambiguous = a literal checkbox per step + a single summary table, never a free-text "did it work?" judgment. The preamble explicitly states: if `Expect:` does not match observed output, mark **fail** and (if it concerns a watch-list assumption) record it in the follow-up log (D-05).

### Wrong-assumption follow-up mechanism (VERIFY-02 SC#3) — dedicated root-anchored log, pre-seeded
- **D-05:** **Stand up `.planning/ACCEPTANCE-FOLLOWUPS.md`, a dedicated root-anchored log with a fixed schema, pre-seeded with the watch-list rows.** When an `Expect:` is refuted on-device — especially a conservative lower-bound being **too** conservative (Bob actually supports isolated subagents, or a structured-choice prompt primitive, or a config-home override var) — the user records it here as a **tracked follow-up enhancement**, never a silent gap. Fixed schema per entry: `ID` (e.g. `FU-01`), `Assumption` (the SPIKE/AC default that was refuted), `Observed on-device` (what Bob actually did), `Impact` (what becomes possible / what was over-constrained), `Proposed enhancement` (the v2 work), `Links` (→ the v2 requirement ID + the refuted AC-ID + the CAPABILITY-MAP row). **Pre-seed** the three primary watch-list candidates as **"unconfirmed" rows the user flips to "refuted" or "confirmed-as-assumed"** after the pass:
  - SPIKE-01 (no isolated subagents → sequential inline) → if refuted, links **PAR-01** (worktree-isolated parallel execution) + **NATIVE-01**.
  - SPIKE-02 (no structured prompts → `text_mode`) → if refuted, links **NATIVE-01** (rich Bob-native prompt re-modeling).
  - SPIKE-04 (config home `~/.bob` fixed; env override unverified) → if a real `BOB_CONFIG_DIR`/override is found, links a descriptor-override enhancement.
- **D-06:** **The follow-up log is a sibling of the checklist, not nested, and is itself doc-only.** It lives at `.planning/ACCEPTANCE-FOLLOWUPS.md` (root-anchored, parallel to `ACCEPTANCE-CHECKLIST.md`), is referenced from the checklist preamble (D-03), and ships **pre-seeded but empty of refutations** — its existence + schema + watch-list rows are the VERIFY-02 "mechanism," whose population is the user's on-device act. A `node:test` may assert the file exists with the three watch-list rows and the required columns (the hermetic proof the mechanism is in place).

### Phase footprint — doc-and-test-only, no runtime/adapter changes (VERIFY-01/02)
- **D-07:** **Phase 6 touches no runtime, adapter, installer, or converter code.** Its entire output is documentation + hermetic tests: the run-scaffolding preamble/order/roll-up added to `ACCEPTANCE-CHECKLIST.md` (D-03/D-04), the coverage matrix + traceability test (D-01/D-02), and the new `ACCEPTANCE-FOLLOWUPS.md` + its presence test (D-05/D-06). This matches the phase's nature (the empirical-gate / verification phase) and the test-deferred principle — every Phase-6 deliverable is provable without a live Bob; the only thing requiring hardware is the user's single unattended pass, which Phase 6 *enables* but does not perform.

### Claude's Discretion
- Exact filename/format of the coverage matrix — a standalone `.planning/phases/06-.../COVERAGE-MATRIX.md`, a section appended to the checklist preamble, or both — and the `node:test` file naming (consistent with Phase 2–5 `test/` conventions).
- The precise column order and `FU-NN` numbering scheme in `ACCEPTANCE-FOLLOWUPS.md`, and how the three pre-seeded watch-list rows render their initial "unconfirmed" state.
- Exact wording of the "How to run" preamble and the results roll-up table layout (within the D-03/D-04 required-content floor).
- Whether the traceability/presence tests live in one new `test/acceptance-coverage.test.cjs` or are split — mirror the prevailing `test/` fixture/helper layout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Project planning contract
- `.planning/ROADMAP.md` §"Phase 6: On-Device Acceptance Verification" — the 3 Success Criteria (consolidated checklist exists; unattended unambiguous pass/fail; wrong-assumption follow-up mechanism) + the test-deferred cross-cutting principle (every phase contributes device-runnable AC steps to ONE checklist run once on hardware in Phase 6).
- `.planning/REQUIREMENTS.md` §"Verification" (VERIFY-01, VERIFY-02) — the 2 requirements this phase covers; §"v2 Requirements" (LIFE-01, SHAPE-01, AUTO-01, NATIVE-01, PAR-01) — the targets the follow-up log links refuted assumptions to.
- `.planning/PROJECT.md` §Constraints, §Key Decisions — backend-agnostic core, no-local-Bob test-deferred development, the consolidated-acceptance-pass model.

### THE run target + append history (source of truth — already complete)
- `.planning/ACCEPTANCE-CHECKLIST.md` — **THE artifact this phase consolidates/structures/runs.** Already holds AC-01..AC-26 with the frozen `Cmd:`/`Expect:`/`Confirms:`/`Result:` schema, the D-07 append convention header, and the T-01-SC safety invariant. Phase 6 adds the run preamble + order + results roll-up (D-03/D-04) and proves its completeness (D-01/D-02) — it does NOT rewrite AC bodies. Read every `Confirms:` line to build the coverage matrix.
- `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` — the SPIKE-01/02/03/04 defaults the watch-list follow-up rows (D-05) reference; the source of the "conservative lower bound" each AC-01..04 tests.

### Phase 1–5 contributed AC ranges + their CONTEXT (the device-runnable steps assembled here)
- `.planning/phases/01-bob-capability-mapping/01-CONTEXT.md` — AC-01..04 (SPIKE defaults) + the D-07 append convention origin.
- `.planning/phases/02-runtime-foundation-artifact-translation/02-CONTEXT.md` — AC-05..12 (RUNTIME-01..04, TRANS-01..05); the byte-compat + backend-neutrality + text_mode seams the read-only AC steps observe.
- `.planning/phases/03-installer/03-CONTEXT.md` — AC-13..16 (INSTALL-01..05 + dry-run); the install/re-run/uninstall mutating-step dependency chain (D-03 ordering).
- `.planning/phases/04-core-loop-port/04-CONTEXT.md` — AC-17..21 (CORE-01..05); the new-project→plan→execute→verify→progress sequence the mutating steps must run in order.
- `.planning/phases/05-quality-gates-upstream-readiness/05-CONTEXT.md` — AC-22..26 (QUAL-01..03, UP-01..02); the gate runs + README/upstream doc checks.

### gsd-bob test/doc conventions Phase 6 mirrors (this repo)
- `test/backend-neutrality.test.cjs`, `test/roster-capmap.test.cjs` (or the Phase 5 roster inspection), `test/_helpers/vendor.cjs`, `test/fixtures/` — the `node:test` parse-and-assert-against-a-frozen-contract pattern the coverage/presence tests (D-02/D-06) follow.
- `SUPPORT-ROSTER.md` + `scripts/generate-support-roster.cjs` — the precedent for "generated/asserted from a source of truth, never hand-maintained" that the coverage matrix (D-01) follows relative to the checklist's `Confirms:` lines.
- `README.md`, `UPSTREAM.md` — the ship-ready docs (AC-26); the follow-up log + run preamble reference these for the on-device reader.

### gsd-core convention to mirror (documented, not branched on)
- CLAUDE.md §"How gsd-core Actually Works", §"Open Items / Assumptions to Validate in a Spike" — the exact list of unverified Bob assumptions (subagent isolation, structured prompts, `BOB_CONFIG_DIR` override, IDE-vs-Shell signal, max description length, headless skill activation) that seed the follow-up log watch-list beyond the three primary SPIKE rows.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`.planning/ACCEPTANCE-CHECKLIST.md`** — already complete (AC-01..AC-26). Phase 6 wraps it with run scaffolding and proves it, never rebuilds it. The single most important input.
- **`test/` `node:test` suites + `test/_helpers/vendor.cjs` + `test/fixtures/`** — the parse-and-assert pattern for the coverage traceability test (D-02) and the follow-up-log presence test (D-06). No live Bob needed.
- **The Phase 5 roster-vs-capmap inspection test** — the closest analog: it parses a generated doc and asserts every line traces to a contract; the coverage test mirrors it (parse `Confirms:` lines → assert against the SC list).
- **`SUPPORT-ROSTER.md` generation pattern** — the "derive from source of truth, don't hand-maintain" precedent the coverage matrix follows.

### Established Patterns
- **D-07 append-only checklist** (Phase 1) — ONE root-anchored file, accumulated phase-by-phase; Phase 6 is its run target. Phase 6 adds scaffolding, not a new file alongside it (except the sibling follow-up log).
- **Test-deferred / no-live-Bob** (Roadmap) — every Phase-6 deliverable provable hermetically; the hardware pass is the user's single act.
- **Frozen-contract parse-and-assert tests** (Phase 2–5) — the coverage + presence tests assert against the checklist / SC list, not against runtime behavior.
- **Conservative lower-bound watch-list** (SPIKE-01/02/04) — the assumptions most likely to be refuted on hardware; pre-seeded into the follow-up log.

### Integration Points
- `.planning/ACCEPTANCE-CHECKLIST.md` ← add run preamble + execution order + results roll-up (D-03/D-04); its `Confirms:` lines → the coverage matrix source.
- `.planning/ACCEPTANCE-FOLLOWUPS.md` (net-new, root-anchored sibling) ← the wrong-assumption log; referenced from the checklist preamble.
- `.planning/phases/06-.../COVERAGE-MATRIX.md` (or checklist section) ← the SC→AC traceability proof (VERIFY-01).
- `test/acceptance-coverage.test.cjs` (net-new) ← the hermetic completeness + follow-up-presence assertions (D-02/D-06).
- v2 requirement IDs (PAR-01, NATIVE-01, …) ← link targets for refuted-assumption follow-up rows.

</code_context>

<specifics>
## Specific Ideas

- **This phase verifies; it does not build.** The single biggest risk is treating it as "author more AC steps." The checklist is already complete (AC-01..AC-26 cover all Phase 1–5 SCs) — Phase 6's value is the *proof* of that completeness, the *run structure*, and the *follow-up mechanism*.
- **"Unambiguous pass/fail without interpreting or improvising"** is the VERIFY-02 acceptance bar: a literal checkbox per step + a top roll-up table + a preamble that says "run these `Cmd:` lines verbatim, mark fail if `Expect:` doesn't match." No judgment calls.
- **The follow-up log's whole point is to catch the case where we were *too* conservative** — Bob turning out to support isolated subagents or structured prompts is a *good* surprise that must become tracked v2 work (PAR-01 / NATIVE-01), not a forgotten note. Pre-seeding the watch-list rows guarantees the user is prompted to record the outcome of each key assumption.
- **Preserve the T-01-SC safety invariant**: read-only AC steps first, mutating steps (the intended install/loop/gate runs) clearly marked and dependency-ordered, so an unattended run never hits a step whose prerequisite hasn't run.

</specifics>

<deferred>
## Deferred Ideas

- **Actually running the on-device pass + populating the follow-up log with real refutations** — that is the *user's* single unattended act on a Bob machine, not a gsd-bob build deliverable. Phase 6 ships the runnable+complete artifact set and the empty-but-seeded follow-up log; the human pass fills it.
- **Acting on any refuted assumption** (building PAR-01 worktree-isolated parallelism, NATIVE-01 rich prompt re-modeling, a real config-home override) — explicitly **v2**. Phase 6 only *records* the refutation as a tracked follow-up; it never implements the enhancement.
- **CI / automated harness that runs the checklist** — out of scope; the checklist is a human-run unattended pass by design (no live Bob in CI either). A future enhancement once a Bob CI runner exists.
- **The upstream PR to open-gsd/gsd-core** (MERGE-01) — a follow-on activity beyond v1, unchanged from the Phase 5 deferral.

None beyond the above — discussion stayed within phase scope.

</deferred>

---

*Phase: 6-On-Device Acceptance Verification*
*Context gathered: 2026-06-19*
