# Phase 6: On-Device Acceptance Verification - Research

**Researched:** 2026-06-19
**Domain:** Documentation assembly + hermetic `node:test` traceability proofs (no live Bob; doc-and-test-only)
**Confidence:** HIGH

## Summary

Phase 6 is a **verification/assembly phase, not a build phase**. The on-device checklist (`.planning/ACCEPTANCE-CHECKLIST.md`) already exists and is fully accumulated (AC-01..AC-26, appended phase-by-phase via the Phase 1 D-07 convention). Phase 6's three deliverables are: (1) a **coverage matrix** proving every v1 success criterion across Phases 1–5 is confirmed by ≥1 AC step, backed by a hermetic `node:test` that parses the checklist's `Confirms:` lines and fails on any orphan SC or orphan AC (VERIFY-01); (2) **run scaffolding** added around the frozen AC bodies — a "How to run" preamble, an execution order (read-only AC-01..12 first, then mutating AC-13..26 in dependency order), and a results roll-up table (VERIFY-02); (3) a new root-anchored `.planning/ACCEPTANCE-FOLLOWUPS.md` pre-seeded with the watch-list rows, plus a presence test (VERIFY-02 SC#3). Phase 6 touches **no runtime/adapter/installer/converter code** (D-07).

I enumerated all 28 v1 success criteria (Phases 1–5) from ROADMAP.md and REQUIREMENTS.md and cross-referenced them against all 26 AC steps' `Confirms:` lines. **Result: full coverage with no orphan SC and no orphan AC.** Every Phase 1–5 requirement ID is referenced by at least one AC step, and every AC step references at least one requirement/SPIKE ID. The single subtlety is that `Confirms:` strings use **two encoding forms** (`SPIKE-NN — …` for AC-01..04, `REQ-ID — …` / `REQ-ID (…)` with optional ` / SC#N` suffixes for AC-05..26), and some AC steps reference multiple IDs on one line. The traceability test must tolerate both forms and the multi-ID case.

**Primary recommendation:** Write one coarse PLAN.md producing four artifacts — (a) the checklist preamble/order/roll-up appended in place; (b) `.planning/phases/06-.../COVERAGE-MATRIX.md`; (c) `.planning/ACCEPTANCE-FOLLOWUPS.md` pre-seeded with 4 watch-list rows; (d) one new `test/acceptance-coverage.test.cjs` holding both the coverage traceability assertion and the followups-presence assertion. Mirror `test/roster-capmap.test.cjs` exactly (the closest parse-and-assert-against-frozen-contract analog) and `test/_helpers/vendor.cjs` for repo-root resolution.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Coverage proof (SC→AC mapping) | Doc (COVERAGE-MATRIX.md) | Test (`acceptance-coverage.test.cjs`) | The matrix is human-readable; the test is the machine guard that it can't drift from the checklist's `Confirms:` lines |
| Unattended run structure | Doc (ACCEPTANCE-CHECKLIST.md preamble) | — | Pure documentation scaffolding wrapped around frozen AC bodies; no code |
| Wrong-assumption logging mechanism | Doc (ACCEPTANCE-FOLLOWUPS.md) | Test (presence assertion) | The file + schema + seed rows ARE the mechanism; the test proves the mechanism is in place |
| Hermetic verifiability (no live Bob) | Test (`node:test`) | — | Both proofs run with `node --test` against on-disk docs — never against Bob runtime behavior |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | built-in (Node ≥22.15.0) | Test runner for both hermetic assertions | `[VERIFIED: package.json]` Repo's sole test framework; `"test": "node --test \"test/**/*.test.cjs\""` |
| `node:assert/strict` | built-in | Assertions | `[VERIFIED: test/roster-capmap.test.cjs]` Every existing test uses `require('node:assert/strict')` |
| `node:fs` / `node:path` | built-in | Read+parse the checklist and SC sources, resolve paths | `[VERIFIED: test/backend-neutrality.test.cjs]` Standard parse pattern across the suite |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `test/_helpers/vendor.cjs` | repo-local | `repoRoot` resolution for path joins | `[VERIFIED: test/_helpers/vendor.cjs]` Every parse test imports `{ repoRoot }` from here — reuse, do not re-derive `path.resolve` |

**Installation:** No installation. Zero new dependencies — Phase 6 is doc + built-in-`node:test` only (D-07). Do NOT add a markdown parser, YAML lib, or any package; all parsing is line-based regex over plain markdown, exactly as `roster-capmap.test.cjs` and `backend-neutrality.test.cjs` do.

## Package Legitimacy Audit

Not applicable — Phase 6 installs **no external packages**. All code uses Node built-ins (`node:test`, `node:assert/strict`, `node:fs`, `node:path`) plus the repo-local `test/_helpers/vendor.cjs`. No registry lookup required.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VERIFY-01 | Each phase contributes device-runnable steps to a consolidated checklist; nothing depends on live testing during dev | Coverage matrix + traceability test (§"SC→AC Coverage Matrix", §"Traceability test shape"). Verified: AC-01..26 already cover all 28 v1 SCs — zero orphans. |
| VERIFY-02 | A final on-device pass runs the full checklist, records pass/fail per SC, and logs wrong assumptions as follow-ups | Run scaffolding (§"Unattended run structure"), dependency ordering (§"Mutating-step dependency order"), and `ACCEPTANCE-FOLLOWUPS.md` schema + seed rows (§"Follow-up log schema") |

## SC→AC Coverage Matrix (THE verified mapping — VERIFY-01)

Enumerated from ROADMAP.md "Success Criteria" blocks + REQUIREMENTS.md requirement IDs (Phases 1–5), cross-referenced against the 26 `Confirms:` lines in `.planning/ACCEPTANCE-CHECKLIST.md`. **The canonical SC unit is the requirement ID** (SPIKE-NN / RUNTIME-NN / TRANS-NN / INSTALL-NN / CORE-NN / QUAL-NN / UP-NN) — REQUIREMENTS.md §Traceability lists exactly 28 for Phases 1–5, and ROADMAP.md success criteria each cite their requirement IDs in parentheses. Use the requirement ID as the join key (the `SC#N` suffixes in `Confirms:` are secondary phase-local numbering, not the canonical unit — see §"How `Confirms:` lines encode SC identity").

| Phase | Requirement ID (canonical SC) | Confirmed by AC | Notes |
|-------|------------------------------|-----------------|-------|
| 1 | SPIKE-01 | AC-01 | `Confirms: SPIKE-01 — …` |
| 1 | SPIKE-02 | AC-02 | `Confirms: SPIKE-02 — …` |
| 1 | SPIKE-03 | AC-03 | `Confirms: SPIKE-03 — …` |
| 1 | SPIKE-04 | AC-04 | `Confirms: SPIKE-04 — …` (covers 04(a)/(b)/(c) sub-rows) |
| 2 | RUNTIME-01 | AC-06 | `Confirms: RUNTIME-01 (…), RUNTIME-02 (…)` — multi-ID line |
| 2 | RUNTIME-02 | AC-06 | same line as RUNTIME-01 |
| 2 | RUNTIME-03 | AC-05 | `Confirms: RUNTIME-03 — …` |
| 2 | RUNTIME-04 | AC-12 | `Confirms: RUNTIME-04 — …` |
| 2 | TRANS-01 | AC-07 | `Confirms: TRANS-01 — …` |
| 2 | TRANS-02 | AC-08 | `Confirms: TRANS-02 — …` |
| 2 | TRANS-03 | AC-09 | `Confirms: TRANS-03 — …` |
| 2 | TRANS-04 | AC-10 | `Confirms: TRANS-04 — …` |
| 2 | TRANS-05 | AC-11 | `Confirms: TRANS-05 — …` |
| 3 | INSTALL-01 | AC-13, AC-16 | AC-13 `INSTALL-01 (…)`; AC-16 `INSTALL-01/05 dry-run safety` |
| 3 | INSTALL-02 | AC-13 | `INSTALL-02 (…)` on the multi-ID AC-13 line |
| 3 | INSTALL-03 | AC-13 | `INSTALL-03 (…)` on the AC-13 line |
| 3 | INSTALL-04 | AC-14 | `Confirms: INSTALL-04 — …` |
| 3 | INSTALL-05 | AC-15, AC-16 | AC-15 `INSTALL-05 — …`; AC-16 `INSTALL-01/05` |
| 4 | CORE-01 | AC-17 | `Confirms: CORE-01 — …` |
| 4 | CORE-02 | AC-18 | `Confirms: CORE-02 — …` |
| 4 | CORE-03 | AC-19 | `Confirms: CORE-03 — …` |
| 4 | CORE-04 | AC-20 | `Confirms: CORE-04 — …` |
| 4 | CORE-05 | AC-21 | `Confirms: CORE-05 — …` |
| 5 | QUAL-01 | AC-22 | `Confirms: QUAL-01 — …` |
| 5 | QUAL-02 | AC-23 | `Confirms: QUAL-02 — …` |
| 5 | QUAL-03 | AC-24, AC-25 | both `Confirms: QUAL-03 — …` (audit-fix + audit-uat) |
| 5 | UP-01 | AC-26 | AC-26 multi-ID `UP-01 — …; UP-02 — …` |
| 5 | UP-02 | AC-26 | same AC-26 line |

**Orphan SC (requirement with no AC):** NONE. All 28 Phase 1–5 requirement IDs are referenced.
**Orphan AC (AC referencing no requirement ID):** NONE. All 26 AC steps carry ≥1 ID.

**Coverage tallies (for the test's sanity asserts):**
- 28 canonical SCs (4 SPIKE + 4 RUNTIME + 5 TRANS + 5 INSTALL + 5 CORE + 3 QUAL + 2 UP). `[VERIFIED: REQUIREMENTS.md §Coverage — "30 total … VERIFY 2"; 30 − 2 VERIFY = 28 for Phases 1–5]`
- 26 AC steps (AC-01..AC-26).
- AC steps referencing >1 ID: AC-06 (RUNTIME-01+02), AC-13 (INSTALL-01+02+03), AC-26 (UP-01+02). The test's extraction must collect ALL IDs per `Confirms:` line, not just the first.
- AC steps that are not 1:1 with a single requirement but valid: AC-16 references INSTALL-01/05 plus a phase-local D-12 dry-run note — it is NOT an orphan (it cites real requirement IDs).

## How `Confirms:` lines encode SC identity (parse target — critical for D-02)

`[VERIFIED: grep "^Confirms:" .planning/ACCEPTANCE-CHECKLIST.md]` — all 26 lines inspected. The parse target is the **leading line of each AC block that begins with `Confirms:`**. Two string forms exist:

1. **SPIKE form (AC-01..04):** `Confirms: SPIKE-01 — conservative default "…".`
2. **Requirement form (AC-05..26):** `Confirms: <REQ-ID> — <prose>` OR `Confirms: <REQ-ID> (<prose>), <REQ-ID2> (<prose2>)` with optional ` / SC#N` suffixes and trailing parentheticals like `(on-device complement to test/…)`.

**The reliable extraction is a single regex matching all requirement-family IDs anywhere on the `Confirms:` line:**

```js
// Matches SPIKE-01, RUNTIME-02, TRANS-03, INSTALL-04, CORE-05, QUAL-03, UP-01, etc.
const ID_RE = /\b(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-\d{2}\b/g;
```

Apply `String.prototype.matchAll(ID_RE)` to each `Confirms:` line and collect **every** match (so AC-06 yields `[RUNTIME-01, RUNTIME-02]`, AC-13 yields `[INSTALL-01, INSTALL-02, INSTALL-03]`, AC-26 yields `[UP-01, UP-02]`). De-dup into a Set.

**Inconsistencies the matrix/test must reconcile (do NOT key on these):**
- The ` / SC#N` suffixes are **phase-local** success-criterion numbers (e.g. AC-13 says `/ SC#1 / SC#2`), not the canonical requirement IDs. They drift from ROADMAP's per-phase SC numbering and must NOT be the join key. Key on the `(FAMILY)-\d{2}` requirement ID only.
- The `(on-device complement to test/…)` parentheticals name hermetic test files — informational, not IDs. The regex above naturally ignores them.
- SPIKE-04 in the checklist covers CAPABILITY-MAP sub-rows 04(a)/(b)/(c) under one `SPIKE-04` token. REQUIREMENTS.md lists only `SPIKE-04` (no sub-IDs), so `SPIKE-04` is the correct single canonical unit — do not expect `SPIKE-04(b)` tokens in the requirement source.
- `INSTALL-01/05` (AC-16) is a slash-joined pair; the regex `\b(...)-\d{2}\b` matches `INSTALL-01` but `/05` lacks the family prefix. **Mitigation:** AC-16 already independently matches `INSTALL-01`, and INSTALL-05 is independently covered by AC-15, so coverage is not lost. If you want AC-16 to credit INSTALL-05 too, extend the regex to also catch `/\bINSTALL-0[15]\b/` style or a `FAMILY-\d{2}(?:/\d{2})*` form. Not required for the orphan-SC proof (every ID is covered elsewhere), but document the choice.

## Traceability test shape (D-02 — the hermetic VERIFY-01 proof)

Mirror `test/roster-capmap.test.cjs` (parse a doc, derive the contract from a source of truth, assert no drift). Concrete shape:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { repoRoot } = require('./_helpers/vendor.cjs');

const ID_RE = /\b(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-\d{2}\b/g;

// Source of truth #1: the canonical Phase 1–5 requirement IDs from REQUIREMENTS.md
// (parse the v1 Requirements section ONLY — exclude the v2 block and VERIFY-01/02).
function canonicalSCs() { /* read REQUIREMENTS.md, extract IDs above "## v2 Requirements", drop VERIFY-* */ }

// Source of truth #2: the IDs each AC step's `Confirms:` line references.
function checklistRefs() {
  const md = fs.readFileSync(path.join(repoRoot, '.planning', 'ACCEPTANCE-CHECKLIST.md'), 'utf8');
  const confirms = md.split('\n').filter((l) => l.startsWith('Confirms:'));
  // collect AC-id (from preceding `## AC-NN` header) + the Set of referenced IDs per line
}

test('VERIFY-01: every v1 SC (Phases 1–5) is referenced by ≥1 AC Confirms line (no orphan SC)', () => { /* setdiff canonical − referenced === ∅ */ });
test('VERIFY-01: every AC step references ≥1 canonical requirement ID (no orphan AC)', () => { /* each AC block has ≥1 ID match */ });
```

**Conventions to mirror exactly** `[VERIFIED: test/roster-capmap.test.cjs, test/backend-neutrality.test.cjs]`:
- `'use strict';` first line; `require('node:test')`, `require('node:assert/strict')`.
- Import `{ repoRoot }` from `./_helpers/vendor.cjs` — never hand-roll `path.resolve(__dirname, ...)`.
- File name kebab-case ending `.test.cjs`, placed directly in `test/` (matched by the `test/**/*.test.cjs` glob).
- One `test('<REQ-ID>: <assertion prose>', () => {...})` per assertion; assertion messages name the failing AC/SC explicitly (e.g. `` `orphan SC: ${id} has no AC` ``).
- Derive the contract from the live source files at test time (read REQUIREMENTS.md + ACCEPTANCE-CHECKLIST.md), never freeze a hand-list of IDs — this is the anti-drift property `roster-capmap.test.cjs` and the `SUPPORT-ROSTER.md` generator establish (`[VERIFIED: scripts/generate-support-roster.cjs]` "GENERATED … never hand-maintained").

## Follow-up log schema + seed rows (D-05/D-06 — VERIFY-02 SC#3)

**File:** `.planning/ACCEPTANCE-FOLLOWUPS.md` — root-anchored sibling of `ACCEPTANCE-CHECKLIST.md` (NOT nested under a phase dir). `[VERIFIED: ls .planning/*.md]` confirms the root-anchored doc convention (PROJECT/REQUIREMENTS/ROADMAP/STATE/ACCEPTANCE-CHECKLIST all live at `.planning/` root).

**Fixed column schema (per D-05):** `ID | Assumption | Observed on-device | Impact | Proposed enhancement | Links`. Add a `Status` column to render the pre-seeded "unconfirmed → confirmed-as-assumed / refuted" state the user flips after the pass (D-05 calls for "unconfirmed rows the user flips"). Recommended column order:

`| ID | Status | Assumption | Observed on-device | Impact | Proposed enhancement | Links |`

- `ID`: `FU-01`, `FU-02`, … (Claude's discretion per D-05; sequential).
- `Status`: seed value `unconfirmed` (user flips to `confirmed-as-assumed` or `refuted`).
- `Links`: → refuted AC-ID + CAPABILITY-MAP row + v2 requirement ID.

**The watch-list seed rows** `[VERIFIED: CAPABILITY-MAP.md §"Phase 6 watch-list (D-10)"]` — the map's own watch-list is exactly: SPIKE-01 (MEDIUM), SPIKE-02 (MEDIUM), SPIKE-04(b) env-override (LOW), SPIKE-04(c) IDE-vs-Shell (MEDIUM). CONTEXT.md D-05 names three primary rows (SPIKE-01/02/04). **Recommendation: seed the three primary CONTEXT rows; optionally add SPIKE-04(c) as a fourth to match the full CAPABILITY-MAP watch-list.** Proposed seed rows:

| ID | Status | Assumption (refuted default) | Links (v2 req + AC + map row) |
|----|--------|------------------------------|-------------------------------|
| FU-01 | unconfirmed | SPIKE-01: no isolated subagents → sequential inline | → **PAR-01** + **NATIVE-01**, AC-01, CAPABILITY-MAP SPIKE-01 |
| FU-02 | unconfirmed | SPIKE-02: no structured prompts → `text_mode` | → **NATIVE-01**, AC-02, CAPABILITY-MAP SPIKE-02 |
| FU-03 | unconfirmed | SPIKE-04(b): config home `~/.bob` fixed, no env override | → descriptor config-home-override enhancement (see gap note), AC-04 + AC-06, CAPABILITY-MAP SPIKE-04(b) |
| FU-04 *(optional)* | unconfirmed | SPIKE-04(c): IDE-vs-Shell via `BOB_SHELL_CLI_IDE_SERVER_PORT` | → NATIVE-01 (signal-aware mode), AC-04, CAPABILITY-MAP SPIKE-04(c) |

**v2 ID verification** `[VERIFIED: grep REQUIREMENTS.md §v2]`:
- `PAR-01` exists ("Worktree-isolated parallel execution once Bob's spawning model proves it supports isolation + completion signals") — exact match for the SPIKE-01 follow-up. ✓
- `NATIVE-01` exists ("Map flagged primitive gaps to rich Bob-native equivalents (modes/agents) instead of flag/skip") — match for SPIKE-02 (rich prompt re-modeling) and SPIKE-01 secondary. ✓
- **GAP: there is NO dedicated v2 ID for the SPIKE-04 config-home-override enhancement.** REQUIREMENTS.md §v2 lists LIFE-01, SHAPE-01, AUTO-01, PARITY-01, NATIVE-01, PAR-01, MERGE-01 — none is a descriptor config-home override. The FU-03 `Links` cell should therefore point at a **proposed/new v2 requirement** (e.g. cite it descriptively as "descriptor config-home-override enhancement — v2 candidate, no ID yet") rather than an existing ID. The planner should flag this so the user can either add a v2 ID or accept the descriptive link. **Do not invent and assert a non-existent ID in the presence test.**

**Presence test (D-06):** add to the SAME `test/acceptance-coverage.test.cjs` (Claude's discretion allows one file or split; one file is simpler and matches the "one suite per concern" weight of `roster-capmap.test.cjs`). Assert: the file exists; the header row contains the required columns (`ID`, `Assumption`, `Observed on-device`, `Impact`, `Proposed enhancement`, `Links`); and the three primary watch-list rows are present (grep for `SPIKE-01`, `SPIKE-02`, `SPIKE-04` tokens in the table body). Keep it a structural/presence assertion only — do NOT assert the rows are still `unconfirmed` (the user flips them; an over-tight test would fail after a real pass).

## Unattended run structure (D-03/D-04 — VERIFY-02)

Add scaffolding to `ACCEPTANCE-CHECKLIST.md` **around** the frozen AC bodies — never rewrite any `Cmd:`/`Expect:`/`Confirms:`/`Result:` text. Required content floor:

1. **"How to run" preamble** (new section after the existing schema/safety-invariant block, before AC-01): prerequisites (a real Bob install; Node ≥22.15.0 `[VERIFIED: package.json engines]`; a throwaway/scratch workspace); the `gsd-bob` install step (`npx -y --package=@opengsd/gsd-bob@latest -- gsd-bob --bob --local`); and an explicit instruction: *run each `Cmd:` line verbatim, type numbered answers when prompted, mark `fail` if observed output does not match `Expect:`, and if a fail concerns a watch-list assumption, record it in `.planning/ACCEPTANCE-FOLLOWUPS.md`.* Reference the followups log by path here (D-06 linkage).
2. **Execution order** statement: read-only AC-01..AC-12 first, then mutating AC-13..AC-26 in dependency order (see next section). State that read-only steps are safe to run in any order; mutating steps must run in the listed order because each depends on prior install/loop state.
3. **Results roll-up table** at the top: `| AC-ID | pass/fail | notes |` for AC-01..AC-26 — the single at-a-glance record the user reports. Keep the per-step inline `Result: [ ] pass [ ] fail` (D-04: both the inline checkbox AND the roll-up).

**Safety invariant preservation (T-01-SC):** the preamble must reaffirm read-only-by-default. The ONLY mutating commands are the explicitly-marked install/loop/gate runs already inside AC-13..AC-26 (`npx … gsd-bob`, `/gsd-*` invocations). The scaffolding text adds no new `Cmd:` line and must not weaken this posture. `[VERIFIED: ACCEPTANCE-CHECKLIST.md L15, L23 CONTEXT.md]`

## Mutating-step dependency order (D-03 — confirmed from AC bodies)

`[VERIFIED: ACCEPTANCE-CHECKLIST.md AC-13..AC-26 "AFTER …" preconditions]` — each mutating step's body states its prerequisite explicitly. Confirmed order:

| Order | AC | Mutating action | Prerequisite (stated in body) |
|-------|----|-----------------|-------------------------------|
| read-only first | AC-01..AC-12 | observation/grep only (AC-11 reads post-install state but its own `Cmd:` is read-only `cat`/`grep`) | none (AC-11's install is a separate Phase-3 act; its command is read-only) |
| 1 | AC-13 | install (`gsd-bob --bob --local`) | fresh scratch `.bob/` |
| 2 | AC-14 | re-run install (idempotency) | **AFTER AC-13** + a seeded user mode/command/rule |
| 3 | AC-15 | uninstall (`--uninstall`) | **AFTER AC-13/AC-14** install present |
| 4 | AC-16 | dry-run (`--dry-run`) | a `.bob/` to snapshot (after install; writes nothing) |
| 5 | AC-17 | `/gsd-new-project` | **AFTER AC-13** install |
| 6 | AC-18 | `/gsd-plan-phase` | **AFTER AC-17** (needs PROJECT.md) |
| 7 | AC-19 | `/gsd-execute-phase` | **AFTER AC-18** (needs PLAN.md) |
| 8 | AC-20 | `/gsd-verify-work` | **AFTER AC-19** (needs executed phase) |
| 9 | AC-21 | `/gsd-progress` | **AFTER AC-17..AC-20** (full loop run) |
| 10 | AC-22 | `/gsd-code-review` (+`--fix`) | **AFTER AC-13** install |
| 11 | AC-23 | `/gsd-debug` + `continue` | **AFTER AC-13** install |
| 12 | AC-24 | `/gsd-audit-fix` | **AFTER AC-13** install |
| 13 | AC-25 | `/gsd-audit-uat` | **AFTER AC-13** install |
| 14 | AC-26 | README/upstream doc greps | none (read-only; any checkout) — can run last or anytime |

**Ordering caveats for the preamble to state precisely:**
- **AC-15 uninstall removes the install.** It must come AFTER AC-14 but the core-loop (AC-17..21) and gates (AC-22..25) need an install present. **Recommendation:** either (a) run AC-15 (uninstall) LAST among the install-lifecycle group and reinstall before the loop, or (b) reorder so the loop/gates (AC-17..26) run on the AC-13 install and AC-15 uninstall runs at the very end as the teardown. The cleanest unattended order: AC-13 → AC-14 → AC-16 (dry-run, no-op) → AC-17..21 (loop) → AC-22..25 (gates) → AC-26 (docs) → **AC-15 uninstall last (teardown)**. The planner should pick one and state it; do not leave the user to infer that AC-15 destroys the install the later steps need.
- AC-16 dry-run writes nothing, so its position is flexible; place it adjacent to the install lifecycle for narrative grouping.
- AC-11 (TRANS-05 idempotent merge) reads state left by "a separate Phase-3 install"; in the unattended pass that install is AC-13, so AC-11's read-only check is most meaningful AFTER AC-13. Note this in the order even though AC-11 is itself read-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resolve repo root in tests | `path.resolve(__dirname, '..', '..')` inline | `require('./_helpers/vendor.cjs').repoRoot` | `[VERIFIED: test/_helpers/vendor.cjs]` Single source of truth; every test imports it |
| Parse markdown structure | A markdown AST lib (`remark`, `marked`) | line-based `split('\n').filter(...)` + regex | `[VERIFIED: roster-capmap.test.cjs, backend-neutrality.test.cjs]` Whole suite parses by line; adding a dep violates D-07 zero-dep posture |
| Freeze the SC list | A hand-typed array of 28 IDs in the test | Parse REQUIREMENTS.md §v1 at test time | `[VERIFIED: generate-support-roster.cjs]` "GENERATED … never hand-maintained" — a frozen list drifts when requirements change |
| Re-author AC steps for "completeness" | New AC-27+ steps | The coverage matrix proving AC-01..26 suffice | D-01/CONTEXT: "Prove coverage, don't re-author." The checklist is already complete. |

**Key insight:** Phase 6's entire value is *proof and structure*, not new content. Every temptation to "add a step / add a check / write a richer parser" is the anti-pattern — the deliverable is a matrix + two assertions + doc scaffolding + a seeded log.

## Common Pitfalls

### Pitfall 1: Auto-mode self-feeding loop (re-reading own output to invent gaps)
**What goes wrong:** Under `--auto --chain` (`_auto_chain_active: true` `[VERIFIED: config.json]`), the agent re-reads its own freshly written COVERAGE-MATRIX or RESEARCH output and "discovers" gaps that are really its own claims, then authors new AC steps to fill them.
**Why it happens:** The phase is verification-shaped; an over-eager model treats "verify" as "find more to build."
**How to avoid:** The sources of truth are EXACTLY REQUIREMENTS.md (canonical SC) and ACCEPTANCE-CHECKLIST.md (`Confirms:` lines) — never the matrix or RESEARCH the agent itself wrote. The coverage already proves zero orphans (this research did the cross-check); the plan asserts it, it does not re-discover it.
**Warning signs:** A plan task that adds `AC-27`, edits an AC `Cmd:`/`Expect:` body, or "expands" the checklist.

### Pitfall 2: Rewriting AC bodies while adding scaffolding
**What goes wrong:** Adding the preamble/order/roll-up edits or reflows existing `Cmd:`/`Expect:`/`Confirms:`/`Result:` lines, breaking the frozen schema (D-05) and the safety invariant (T-01-SC).
**How to avoid:** Only INSERT new sections (preamble before AC-01, roll-up table at top) and APPEND an ordering note. Never touch text inside `## AC-NN` blocks. A diff that shows changes inside any AC block is wrong.
**Warning signs:** `git diff` touching lines 19–199 of the current checklist.

### Pitfall 3: Coverage test brittle to `Confirms:` string drift
**What goes wrong:** A test keyed on exact `Confirms:` prose (e.g. the ` — conservative default …` text or the ` / SC#N` suffix) breaks when a future edit rewords a line.
**How to avoid:** Extract ONLY the `(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-\d{2}` tokens via `matchAll` (see §"How `Confirms:` lines encode SC identity"). Ignore prose, SC#N suffixes, and parentheticals. Assert on the ID Set, never on full-line equality.
**Warning signs:** `assert.equal(confirmsLine, '<exact string>')` anywhere in the test.

### Pitfall 4: Loosening the read-only-by-default posture in the preamble
**What goes wrong:** The "How to run" text implies all steps are safe to run freely, obscuring that AC-13/15/17..25 mutate state.
**How to avoid:** The preamble explicitly partitions read-only (AC-01..12, AC-26) from mutating (AC-13..25) and states the dependency order. Preserve T-01-SC's framing: read-only by default, mutating steps are the *intended* Phase-6 actions, clearly marked.

### Pitfall 5: Asserting a non-existent v2 ID for SPIKE-04 follow-up
**What goes wrong:** The presence test (or the seed row) references a v2 ID for the config-home-override enhancement that does not exist in REQUIREMENTS.md.
**How to avoid:** FU-03 links a *descriptively-named proposed* enhancement, not an existing ID (see §"Follow-up log schema" GAP note). The presence test must not assert that ID exists in REQUIREMENTS.md.

## Code Examples

### Extracting all requirement IDs from a `Confirms:` line (handles multi-ID + both forms)
```js
// Source: derived from test/backend-neutrality.test.cjs line-scan pattern + verified against
// all 26 Confirms: lines in .planning/ACCEPTANCE-CHECKLIST.md
const ID_RE = /\b(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-\d{2}\b/g;
function idsInConfirms(line) {
  return new Set([...line.matchAll(ID_RE)].map((m) => m[0]));
}
// AC-06  -> Set { 'RUNTIME-01', 'RUNTIME-02' }
// AC-13  -> Set { 'INSTALL-01', 'INSTALL-02', 'INSTALL-03' }
// AC-26  -> Set { 'UP-01', 'UP-02' }
```

### Parsing AC-id ↔ Confirms pairing from the checklist
```js
// Source: mirrors the line-filter style of test/roster-capmap.test.cjs
const md = fs.readFileSync(path.join(repoRoot, '.planning', 'ACCEPTANCE-CHECKLIST.md'), 'utf8');
const lines = md.split('\n');
const pairs = []; // { ac: 'AC-06', ids: Set }
let currentAc = null;
for (const l of lines) {
  const h = l.match(/^##\s+(AC-\d{2})\b/);
  if (h) currentAc = h[1];
  else if (l.startsWith('Confirms:') && currentAc) pairs.push({ ac: currentAc, ids: idsInConfirms(l) });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-phase ad-hoc verification notes | One root-anchored consolidated checklist (D-07 append) | Phase 1 | Phase 6 runs ONE file once; no gathering work |
| Hand-maintained coverage claims | Generated/asserted-from-source (SUPPORT-ROSTER pattern) | Phase 5 | The coverage matrix + test cannot drift from the checklist |

**Deprecated/outdated:** None relevant. The colon command form (`/gsd:<cmd>`) is deprecated project-wide `[CITED: CLAUDE.md "What NOT to Use"]` — the checklist already uses the hyphen `gsd-<cmd>` form; do not introduce colon forms in any new doc.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Seeding 3 primary watch-list rows (vs the 4 in CAPABILITY-MAP §D-10) satisfies D-05 | Follow-up log schema | LOW — D-05 names 3 primary rows; adding SPIKE-04(c) as a 4th is offered as optional, not required. User can confirm in discuss. |
| A2 | FU-03 (config-home override) links a *proposed* v2 enhancement, not an existing ID | Follow-up log schema | LOW — verified no such v2 ID exists; flagged as a gap for the user to add an ID or accept a descriptive link |
| A3 | AC-15 uninstall should run last as teardown (vs reinstall-between) | Mutating-step dependency order | LOW — both orderings are valid; the planner picks one and states it explicitly. Either avoids the "uninstall destroys the install later steps need" trap. |

**All other claims** (SC→AC mapping, zero orphans, `Confirms:` parse forms, test conventions, v2 ID existence, config flags) are `[VERIFIED]` against the live source files read this session.

## Open Questions

1. **Coverage matrix location (Claude's discretion per CONTEXT).**
   - What we know: D-01 allows a standalone `COVERAGE-MATRIX.md`, a checklist preamble section, or both.
   - Recommendation: standalone `.planning/phases/06-on-device-acceptance-verification/COVERAGE-MATRIX.md` (keeps the checklist body untouched per Pitfall 2) AND a one-line pointer to it from the checklist preamble. The matrix in this RESEARCH (§"SC→AC Coverage Matrix") is the verified content to transcribe.

2. **One test file vs split (Claude's discretion).**
   - Recommendation: one `test/acceptance-coverage.test.cjs` holding both the traceability assertions and the followups-presence assertion — matches the single-concern weight of `roster-capmap.test.cjs` and keeps the new surface minimal.

3. **Whether to add the optional FU-04 (SPIKE-04(c) IDE-vs-Shell) seed row.**
   - Recommendation: include it — it costs one row and matches the full CAPABILITY-MAP §D-10 watch-list; the user can delete it if they prefer the strict 3-row D-05 set.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `node --test` runner | ✓ | ≥22.15.0 (engines floor) `[VERIFIED: package.json]` | — |
| `node:test` / `node:assert` | hermetic assertions | ✓ (built-in) | — | — |
| Live IBM Bob | NOTHING in Phase 6 dev deliverables | ✗ (by design, never) | — | All Phase-6 deliverables are doc + hermetic test; the on-device pass is the USER's single act, not a dev dependency |

**Missing dependencies with no fallback:** None. (The absent live Bob is intentional and not a Phase-6 dev blocker — it is the very condition this phase compensates for.)

## Validation Architecture

SKIPPED — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json` `[VERIFIED: config.json]`. The phase's own hermetic tests (coverage + presence) are documented in §"Traceability test shape" and §"Follow-up log schema" and run via `npm test` (`node --test "test/**/*.test.cjs"`).

## Security Domain

`security_enforcement: true` `[VERIFIED: config.json]`, but Phase 6 introduces **no authentication, session, access-control, cryptography, network, or untrusted-input surface**. It produces markdown docs and read-only `node:test` files that parse repo-local files. ASVS categories V2–V6 do not apply (no app surface created).

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (doc/test-only phase) |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | no | tests read trusted repo files only; no external input |
| V6 Cryptography | no | n/a |

**Phase-relevant safety control (carried from T-01-SC, not ASVS):** the checklist's read-only-by-default invariant — the preamble must not introduce or imply new mutating commands beyond the already-marked AC-13..25 install/loop/gate runs. This is the one "security-adjacent" concern and is covered in Pitfall 4.

## Sources

### Primary (HIGH confidence)
- `.planning/ACCEPTANCE-CHECKLIST.md` (read in full, AC-01..AC-26 + all 26 `Confirms:` lines grep'd) — the run target + coverage source
- `.planning/REQUIREMENTS.md` (v1 IDs, §Traceability 28 Phase-1–5 IDs, §v2 IDs) — canonical SC list + v2 link targets
- `.planning/ROADMAP.md` (Phase 1–5 Success Criteria blocks, Phase 6 3 SCs, test-deferred principle)
- `.planning/phases/06-.../06-CONTEXT.md` (D-01..D-07 locked decisions)
- `.planning/phases/01-.../CAPABILITY-MAP.md` §"Phase 6 watch-list (D-10)" (the 4 watch-list rows)
- `test/roster-capmap.test.cjs`, `test/backend-neutrality.test.cjs`, `test/_helpers/vendor.cjs` (parse-and-assert conventions)
- `scripts/generate-support-roster.cjs` (the generate-from-source-of-truth precedent)
- `package.json` (test script, engines), `.planning/config.json` (workflow flags)

### Secondary (MEDIUM confidence)
- None — all findings verified against primary repo sources this session.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- SC→AC coverage mapping: HIGH — every ID cross-checked against both REQUIREMENTS.md and the live `Confirms:` lines; zero orphans confirmed.
- Test conventions: HIGH — read the exact analog test files and the shared helper.
- Follow-up schema + v2 links: HIGH — v2 IDs verified by grep; the one gap (no config-home-override v2 ID) is flagged, not assumed.
- Dependency ordering: HIGH — each AC body states its precondition explicitly; the AC-15 teardown caveat is the only judgment call (flagged in Assumptions Log).

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable — internal planning docs; only invalidated if AC steps or requirement IDs are edited)
