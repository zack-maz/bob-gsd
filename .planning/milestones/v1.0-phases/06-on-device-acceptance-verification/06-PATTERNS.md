# Phase 6: On-Device Acceptance Verification - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 4 (3 docs + 1 test)
**Analogs found:** 4 / 4 (all exact or strong role-matches)

This is a **doc-and-test-only** phase (D-07): no runtime/adapter/installer/converter code. Three markdown docs + one `node:test` `.cjs`. Every analog lives in this repo; mirror its exact conventions.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/ACCEPTANCE-CHECKLIST.md` (MODIFIED — insert preamble + order + roll-up only) | doc (checklist) | transform (wrap frozen body) | its own existing header/schema block (L1-15) | self-analog (exact) |
| `.planning/phases/06-.../06-COVERAGE-MATRIX.md` (NEW) | doc (derived table) | transform (SC→AC from `Confirms:` source) | `SUPPORT-ROSTER.md` (derived-from-source table) | role-match (exact) |
| `.planning/ACCEPTANCE-FOLLOWUPS.md` (NEW, root-anchored sibling) | doc (fixed-schema log) | event-driven (user-populated rows) | `ACCEPTANCE-CHECKLIST.md` header/schema conventions | role-match |
| `test/acceptance-coverage.test.cjs` (NEW) | test (`node:test`) | parse-and-assert (derive contract, assert no drift) | `test/roster-capmap.test.cjs` | exact |

---

## Pattern Assignments

### `test/acceptance-coverage.test.cjs` (test, parse-and-assert) — PRIMARY

**Analog:** `test/roster-capmap.test.cjs` (parse a doc, derive the contract from a source of truth, assert no drift). Supporting analog for line-scan parsing: `test/backend-neutrality.test.cjs`.

**Header pattern** — copy verbatim from `test/roster-capmap.test.cjs:1,30-34`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { repoRoot } = require('./_helpers/vendor.cjs');
```
- `'use strict';` is line 1.
- A leading `/** ... */` block comment naming the requirement IDs / decisions the suite proves (`roster-capmap.test.cjs:3-28` is the model — it opens by naming `QUAL-03 / D-02 / D-06`). For this file: name `VERIFY-01 / VERIFY-02 / D-02 / D-06`.
- `node:assert/strict` (not bare `node:assert`).

**Repo-root resolution** — `test/_helpers/vendor.cjs:18,28`:
```js
const repoRoot = path.resolve(__dirname, '..', '..');
module.exports = { repoRoot, vendorLib, vendorShared, requireVendor };
```
Import `{ repoRoot }` only. NEVER hand-roll `path.resolve(__dirname, ...)` in the test (Research §"Don't Hand-Roll"). Path joins use `path.join(repoRoot, '.planning', 'ACCEPTANCE-CHECKLIST.md')`.

**Read + line-scan a markdown doc** — mirror `roster-capmap.test.cjs` `fs.readFileSync(...,'utf8')` then operate over the parsed structure. The line-filter idiom (from Research §"Code Examples", derived from `backend-neutrality.test.cjs` line-scan):
```js
const md = fs.readFileSync(path.join(repoRoot, '.planning', 'ACCEPTANCE-CHECKLIST.md'), 'utf8');
const lines = md.split('\n');
// pair each `Confirms:` line to its preceding `## AC-NN` header
```
Confirms-line shape is verified: AC headers are `## AC-NN — ...` and the field is a line starting `Confirms:` (checklist L33, L184, L198). Both encoding forms exist; extract IDs with the family regex, not prose:
```js
const ID_RE = /\b(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-\d{2}\b/g;
function idsInConfirms(line) { return new Set([...line.matchAll(ID_RE)].map((m) => m[0])); }
```
AC-06 → `{RUNTIME-01,RUNTIME-02}`; AC-13 → `{INSTALL-01,INSTALL-02,INSTALL-03}`; AC-26 → `{UP-01,UP-02}` (verified against checklist L198). Collect ALL matches per line (`matchAll`), de-dup into a Set. Never `assert.equal` on full-line prose (Pitfall 3).

**Derive the canonical SC set from REQUIREMENTS.md at test time** (anti-drift — the `SUPPORT-ROSTER.md` "GENERATED, never hand-maintained" property). Parse `.planning/REQUIREMENTS.md`, take requirement IDs under `## v1 Requirements` and **above `## v2 Requirements`** (verified boundary: `## v1 Requirements` at L6, `## v2 Requirements` at L80), and DROP the `VERIFY-*` IDs in `### On-Device Verification` (L73) — those are this phase's own reqs, not Phase 1–5 SCs. Do NOT freeze a hand-typed list of 28 IDs (Research §"Don't Hand-Roll").

**Per-assertion `test()` pattern** — `roster-capmap.test.cjs:71,82,97`, one `test('<REQ-ID>: <prose>', () => {...})` per assertion, messages naming the failing item:
```js
test('VERIFY-01: every v1 SC (Phases 1–5) is referenced by ≥1 AC Confirms line (no orphan SC)', () => {
  // setdiff canonical − referenced === ∅; message: `orphan SC: ${id} has no AC`
});
```
Assertion-message style is verbatim from `roster-capmap.test.cjs:77,89` (template literal naming the offending name). Expected result: zero orphans both directions (Research §"SC→AC Coverage Matrix" pre-verified).

**Followups-presence assertion** — same file (one suite, matching `roster-capmap.test.cjs` single-concern weight; Research Open Q2). Structural/presence only:
- file exists (`fs.existsSync` / `readFileSync`);
- header row contains required columns (`ID`, `Assumption`, `Observed on-device`, `Impact`, `Proposed enhancement`, `Links`);
- the three primary watch-list tokens present in the table body (grep `SPIKE-01`, `SPIKE-02`, `SPIKE-04`).
Do NOT assert rows are still `unconfirmed` (user flips them post-pass — Research §"Follow-up log schema"). Do NOT assert a non-existent v2 ID for the SPIKE-04 row (Pitfall 5).

**Test runner / file placement** — `package.json` script is `"test": "node --test \"test/**/*.test.cjs\""`. The file MUST be kebab-case ending `.test.cjs`, placed directly in `test/` (not in `test/installer/` or a subdir) so the glob picks it up. No package.json edit needed — the glob auto-includes it.

---

### `.planning/phases/06-.../06-COVERAGE-MATRIX.md` (doc, derived table)

**Analog:** `SUPPORT-ROSTER.md` — the "derive from a source of truth, do not hand-maintain" precedent.

**Header pattern** (mirror `SUPPORT-ROSTER.md:1-6`): a `# Title`, then a blockquote stating the file is derived from a named source and what guards it from drifting:
```markdown
# Phase 6 Coverage Matrix — SC → AC traceability

> **DERIVED from `.planning/ACCEPTANCE-CHECKLIST.md` `Confirms:` lines + `.planning/REQUIREMENTS.md` v1 IDs.**
> Guarded against drift by `test/acceptance-coverage.test.cjs` (VERIFY-01). Do not hand-curate the mapping.
```

**Core table pattern** — transcribe the verified mapping from `06-RESEARCH.md §"SC→AC Coverage Matrix"` (28 canonical SCs → AC-01..26, zero orphans). Columns: `Phase | Requirement ID (canonical SC) | Confirmed by AC | Notes`. Key the join on the `(FAMILY)-\d{2}` requirement ID, NOT the phase-local ` / SC#N` suffix (Research §"How Confirms lines encode SC identity").

**Do NOT re-author or re-discover coverage** (Pitfall 1) — the matrix transcribes Research's already-verified mapping; the test mechanically re-proves it. No new AC steps.

---

### `.planning/ACCEPTANCE-FOLLOWUPS.md` (doc, fixed-schema log) — root-anchored sibling

**Analog:** `ACCEPTANCE-CHECKLIST.md` header/schema conventions (root-anchored, fixed-schema, append/populate convention).

**Root-anchoring + header pattern** — mirror `ACCEPTANCE-CHECKLIST.md:1-3`: `# Title`, an **Established/Run-target** line, and a paragraph stating it is the single **root-anchored** (`.planning/ACCEPTANCE-FOLLOWUPS.md`) log, NOT nested under a phase dir (verified convention: `ls .planning/*.md` — all of PROJECT/REQUIREMENTS/ROADMAP/STATE/ACCEPTANCE-CHECKLIST live at `.planning/` root).

**Fixed-schema declaration** — mirror the checklist's `**Schema (D-05):**` block (`ACCEPTANCE-CHECKLIST.md:11-15`) that names every field in order. Fixed columns (D-05 + Research §"Follow-up log schema"):
```
| ID | Status | Assumption | Observed on-device | Impact | Proposed enhancement | Links |
```
- `ID`: `FU-01`, `FU-02`, … sequential.
- `Status`: seed value `unconfirmed` (user flips to `confirmed-as-assumed` / `refuted`).

**Pre-seeded watch-list rows** — transcribe the 3 primary (+ optional 4th) rows from `06-RESEARCH.md §"Follow-up log schema"`: FU-01 SPIKE-01→PAR-01+NATIVE-01; FU-02 SPIKE-02→NATIVE-01; FU-03 SPIKE-04(b) config-home → **descriptive proposed enhancement, NO existing v2 ID** (verified gap — Pitfall 5); FU-04 (optional) SPIKE-04(c) IDE-vs-Shell.

**Cross-link** — referenced by path from the checklist preamble (D-06 linkage).

---

### `.planning/ACCEPTANCE-CHECKLIST.md` (doc, MODIFIED — wrap only)

**Analog:** its own existing header/schema/safety block (`ACCEPTANCE-CHECKLIST.md:1-15`).

**INSERT-only constraint (Pitfall 2):** only add new sections; never edit text inside any `## AC-NN` block (frozen AC bodies span L17-198). A `git diff` touching lines inside an AC block is wrong.

Required additions (D-03/D-04), placed AROUND the frozen bodies:
1. **Results roll-up table** at the top (after the existing schema/safety block at L15, before AC-01 at L17): `| AC-ID | pass/fail | notes |` for AC-01..AC-26.
2. **"How to run" preamble** (new section, same location): prerequisites (real Bob install; Node ≥22.15.0; throwaway workspace), the install step `npx -y --package=@opengsd/gsd-bob@latest -- gsd-bob --bob --local`, and the verbatim-run / mark-fail-if-Expect-mismatch / record-in-FOLLOWUPS instruction. Reference `.planning/ACCEPTANCE-FOLLOWUPS.md` by path.
3. **Execution-order** statement: read-only AC-01..12 (+ AC-26) first; mutating AC-13..25 in dependency order (Research §"Mutating-step dependency order" — AC-13 install → 14 re-run → 16 dry-run → 17-21 loop → 22-25 gates → 26 docs → **15 uninstall LAST as teardown**).

**Preserve T-01-SC** (`ACCEPTANCE-CHECKLIST.md:15`, Pitfall 4): the preamble reaffirms read-only-by-default; adds NO new `Cmd:` line; the only mutating commands are the already-marked install/loop/gate runs inside AC-13..25.

---

## Shared Patterns

### Repo-root resolution (tests)
**Source:** `test/_helpers/vendor.cjs:18,28` (`const { repoRoot } = require('./_helpers/vendor.cjs')`)
**Apply to:** `test/acceptance-coverage.test.cjs`. Never inline `path.resolve(__dirname, ...)`.

### node:test header
**Source:** `test/roster-capmap.test.cjs:1,30-34`
**Apply to:** the new test — `'use strict';`, `node:test`, `node:assert/strict`, leading JSDoc naming the requirement IDs proved.

### Derive-from-source-of-truth (anti-drift)
**Source:** `SUPPORT-ROSTER.md:1-6` blockquote + `scripts/generate-support-roster.cjs` ("GENERATED … never hand-maintained"); enforced by `test/roster-capmap.test.cjs:53-67` (re-derives the candidate set rather than hard-coding).
**Apply to:** COVERAGE-MATRIX.md (derived from `Confirms:` lines) and the coverage test (parse REQUIREMENTS.md + ACCEPTANCE-CHECKLIST.md at test time, never freeze an ID list).

### Family-ID regex (parse target)
**Source:** `06-RESEARCH.md §"Code Examples"` (verified against all 26 `Confirms:` lines)
```js
const ID_RE = /\b(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)-\d{2}\b/g;
```
**Apply to:** the coverage test extraction. Use `matchAll`, collect ALL IDs per line, key on the ID not the ` / SC#N` suffix or prose.

### Root-anchored fixed-schema doc
**Source:** `ACCEPTANCE-CHECKLIST.md:1-15` (root-anchored declaration + `**Schema:**` field-order block)
**Apply to:** `ACCEPTANCE-FOLLOWUPS.md` (sibling at `.planning/` root, fixed columns declared up front).

### Hyphen command form only
**Source:** CLAUDE.md "What NOT to Use"; `roster-capmap.test.cjs:45` constructs the form via `['gsd','-'].join('')` to keep colon-dialect literals out of test prose.
**Apply to:** all new docs/tests — use `gsd-<cmd>`, never `/gsd:<cmd>`.

---

## No Analog Found

None. All 4 files have a strong in-repo analog. (The 3 docs are markdown-convention matches; the test is an exact `roster-capmap.test.cjs` clone in shape.)

---

## Metadata

**Analog search scope:** `test/`, `test/_helpers/`, `.planning/` (root + phase 06), `SUPPORT-ROSTER.md`, `package.json`, `.planning/REQUIREMENTS.md`
**Files scanned:** `test/roster-capmap.test.cjs`, `test/_helpers/vendor.cjs`, `.planning/ACCEPTANCE-CHECKLIST.md` (head + tail), `SUPPORT-ROSTER.md`, `package.json`, `.planning/REQUIREMENTS.md` (structure)
**Pattern extraction date:** 2026-06-19
