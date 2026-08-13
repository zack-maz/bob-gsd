---
phase: 06-on-device-acceptance-verification
reviewed: 2026-06-19T22:16:25Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - test/acceptance-coverage.test.cjs
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: resolved
resolution: WR-01..05 addressed in test/acceptance-coverage.test.cjs (commit follows); info items accepted/folded. Negative-proof confirms a phantom in-family ref (RUNTIME-99) now fails loudly.
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-19T22:16:25Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

`test/acceptance-coverage.test.cjs` is a hermetic `node:test` suite that re-proves the on-device acceptance checklist's completeness by parsing three planning docs at run time. It is clean on the security and convention axes: pure read-only file reads, no `child_process`, no model-backend literals, CommonJS + `node:test`/`node:assert/strict` + built-ins only, path resolution via the shared `_helpers/vendor.cjs` `repoRoot`. The three tests pass against the current docs.

The defects are all **correctness/robustness of the assertions themselves** — this is anti-drift tooling whose entire value is catching a future doc edit, so a test that passes too easily is the failure mode that matters. The headline issue (WR-01) is that the "no orphan AC" test is materially weaker than its name and docstring promise: it accepts any in-family token, including non-existent IDs (`RUNTIME-99`), so a typo'd `Confirms:` reference passes silently. Several other findings concern silent fallbacks and over-rigid parsing that will mis-fire (false pass or brittle false fail) on plausible doc edits. No blockers — the suite does what it claims today — but the warnings should be fixed before this is trusted as the drift gate it is sold as.

## Warnings

### WR-01: "No orphan AC" test does not validate that referenced IDs are real canonical SCs

**File:** `test/acceptance-coverage.test.cjs:95-101`
**Issue:** The test name, the file docstring (`VERIFY-01b: every AC step references >=1 canonical requirement ID`), and the assertion message (`references no canonical requirement ID`) all claim the AC references are checked against the *canonical* SC set. The actual assertion is only `ids.size > 0` — it checks that the `Confirms:` line contains *any* token matching the family regex, never that the token is a member of `canonicalSCs()`. A `Confirms:` line reading `Confirms: RUNTIME-99 — typo` passes (verified: `new Set([...'RUNTIME-99'.matchAll(ID_RE)]).size > 0` is `true`). Because the orphan-SC test (lines 81-91) only iterates *over* the canonical set, a bogus in-family ID is never caught from either direction. This is the central robustness gap: the suite's purpose is to catch a future editor who fat-fingers a requirement ID, and that exact mistake slips through.
**Fix:** Intersect AC references against the canonical set and assert each AC has at least one *valid* reference (and, ideally, that no AC references an unknown in-family ID):
```js
test('VERIFY-01: every AC step references >=1 canonical requirement ID (no orphan AC)', () => {
  const canonical = canonicalSCs();
  const pairs = checklistRefs();
  assert.equal(pairs.length, 26, `expected 26 AC Confirms lines, parsed ${pairs.length}`);
  for (const { ac, ids } of pairs) {
    const known = [...ids].filter((id) => canonical.has(id));
    const unknown = [...ids].filter((id) => !canonical.has(id));
    assert.equal(unknown.length, 0, `${ac} references unknown ID(s): ${unknown.join(', ')}`);
    assert.ok(known.length > 0, `orphan AC: ${ac} references no canonical requirement ID`);
  }
});
```

### WR-02: `## v2 Requirements` boundary-miss fails open (silently scans the whole doc)

**File:** `test/acceptance-coverage.test.cjs:50-53`
**Issue:** `canonicalSCs()` does `const v1Section = v2Idx >= 0 ? md.slice(0, v2Idx) : md;`. If the heading is ever renamed/reworded (e.g. `## V2 Requirements`, `## v2 requirements`, or `## Deferred (v2) Requirements`), `indexOf` returns `-1` and the function silently falls back to scanning the **entire document** — including the v2 section and the Traceability table. Today this happens to still yield 28 IDs (the Traceability table repeats the same family IDs and v2 families like `LIFE`/`PARITY` are outside the regex), so the failure is invisible. But the boundary is load-bearing: the moment a future v2 requirement reuses a v1 family prefix (e.g. a `CORE-06`), a boundary-miss would silently fold it into the canonical SC set and demand an AC for it. A silent fallback in anti-drift tooling defeats the tooling.
**Fix:** Fail loudly if the boundary marker is absent rather than scanning the whole file:
```js
const v2Idx = md.indexOf('## v2 Requirements');
assert.ok(v2Idx >= 0, 'REQUIREMENTS.md must contain the `## v2 Requirements` boundary');
const v1Section = md.slice(0, v2Idx);
```
(Move the read+slice into the test bodies, or have `canonicalSCs()` throw, so the assertion is reachable.)

### WR-03: VERIFY-prefixed IDs are excluded only by coincidence of the family list

**File:** `test/acceptance-coverage.test.cjs:38, 54-55`
**Issue:** The docstring (lines 15-16, 44-47) and inline comment (54-55) state the intent is to exclude this phase's own `VERIFY-*` requirements from the canonical SC set. The exclusion is achieved purely by `VERIFY` being absent from the `(SPIKE|RUNTIME|TRANS|INSTALL|CORE|QUAL|UP)` alternation. This couples a *semantic* decision ("VERIFY reqs are not Phase 1-5 SCs") to an *enumerated* regex that must be hand-edited every time a new requirement family is added. A future family (say `DOCS-01`) added to REQUIREMENTS.md will be silently invisible to the canonical set with no test failure — its absence from the alternation means it is neither counted nor required to have an AC, the exact orphan the suite exists to catch. The regex is a closed allow-list masquerading as a parser.
**Fix:** Parse families generically and subtract the known-excluded ones, so new families are caught by default. For example, match `\b([A-Z]+)-\d{2}\b` in the v1 prose section, then `delete`/skip a small explicit exclusion set (`VERIFY`). This makes "what counts as a canonical SC" data-driven and surfaces an unanticipated new family instead of dropping it.

### WR-04: `\d{2}` hard-codes a two-digit ID width and silently drops other widths

**File:** `test/acceptance-coverage.test.cjs:38`
**Issue:** `ID_RE` requires exactly two digits (`\d{2}\b`). Verified: `RUNTIME-1`, `CORE-5`, and `RUNTIME-100` all fail to match; only the zero-padded two-digit form matches. If any phase ever crosses 99 items in a family (`INSTALL-100`) or an editor writes an un-padded `CORE-5`, the ID is silently skipped — a referenced SC vanishes from `referenced`, or a canonical SC vanishes from the set, with no error pointing at the cause. For anti-drift tooling this is a brittle false-negative surface.
**Fix:** Use `\d{1,3}` (or `\d+`) to tolerate width drift: `/\b(...)-\d{1,3}\b/g`. The zero-padding convention can be asserted separately if it matters, rather than enforced implicitly by a width that also silences legitimate IDs.

### WR-05: FOLLOWUPS column check passes on a header row that merely *contains* the substrings, in any order, in any single row

**File:** `test/acceptance-coverage.test.cjs:111-115`
**Issue:** The header-row detection picks the first line containing both `| ID |` and `| Links |`, then asserts the row `.includes(col)` for each required column name. `String.includes` is an unanchored substring test, so (a) column *order* is never validated despite the docstring (line 113 comment + FOLLOWUPS.md schema D-05) declaring an "exact column order"; (b) a column name that is a substring of another (`ID` is a substring of `Links`-adjacent prose, and `Impact`/`Assumption` could appear in narrative text spliced into the same line) can satisfy the check without a real column. The test asserts presence of *tokens on one line*, not a *table schema*. A future reorder or a dropped column inside a row that still happens to contain the words passes.
**Fix:** Split the header row on `|`, trim cells, and assert the exact ordered cell sequence:
```js
const cells = headerRow.split('|').map((c) => c.trim()).filter(Boolean);
assert.deepEqual(
  cells,
  ['ID', 'Status', 'Assumption', 'Observed on-device', 'Impact', 'Proposed enhancement', 'Links'],
  'follow-up log header must match the declared D-05 column order exactly'
);
```

## Info

### IN-01: `pairs.length === 26` is a magic number duplicating the AC count

**File:** `test/acceptance-coverage.test.cjs:97`
**Issue:** The expected AC count `26` is hard-coded. It is correct today (26 `## AC-NN` headers, 26 `Confirms:` lines), but it is a bare literal with no symbolic source. When Phase-N+1 appends AC-27 (the file explicitly advertises itself as a cross-phase append target, D-07), this line must be hand-bumped or the suite red-fails on a *correct* doc — and the failure message (`expected 26 ... parsed 27`) reads like a defect rather than "update the constant."
**Fix:** Either derive the expectation (`assert.equal(pairs.length, acHeaderCount)` where `acHeaderCount` counts `^##\s+AC-\d{2}` headers, turning the test into "every AC header has a Confirms line"), or extract the literal to a named const with a comment tying it to the checklist length.

### IN-02: `Confirms:`-without-preceding-header lines are silently dropped (header/Confirms pairing is positional and fragile)

**File:** `test/acceptance-coverage.test.cjs:67-75`
**Issue:** `checklistRefs()` only records a `Confirms:` line when `currentAc` is set, and resets `currentAc = null` after each pair. If a `Confirms:` line ever appears before its `## AC-NN` header (reordered block), under a non-AC header, or as a *second* `Confirms:` inside one AC block, it is silently ignored with no diagnostic. The `pairs.length` check (line 97) catches a *net* count mismatch but not a structural mispairing that nets to the same count (e.g. one AC with two Confirms lines + one AC with zero still totals correctly if counts coincide). The pairing relies on strict positional adjacency that the doc format does not enforce.
**Fix:** Cross-check that the number of `Confirms:` lines equals the number of `## AC-NN` headers and that every header produced exactly one pair; or assert `currentAc` is non-null at each `Confirms:` and warn on orphaned `Confirms:` lines.

### IN-03: FOLLOWUPS watch-list assertion uses whole-file `includes`, not row-scoped checks

**File:** `test/acceptance-coverage.test.cjs:121-123`
**Issue:** The `SPIKE-01/02/04` presence check is `md.includes(tok)` against the entire file. These tokens appear in prose paragraphs (lines 5-16 of FOLLOWUPS.md) as well as in table rows, so the assertion passes even if the actual table rows (`FU-01`..`FU-04`) were deleted, as long as the surrounding narrative still mentions the SPIKE tokens. The test's stated intent ("seed a `${tok}` row") is row-level, but the check is document-level.
**Fix:** Scope the token search to lines that look like table rows (start with `|` and contain an `FU-\d{2}` id), e.g. assert that some `| FU-… |` row line includes the token.

### IN-04: Docstring overstates what is proven ("every AC step references >=1 canonical requirement ID")

**File:** `test/acceptance-coverage.test.cjs:20-21`
**Issue:** The header comment asserts the suite proves AC steps reference *canonical* IDs and SCs reference *each other* bidirectionally. As detailed in WR-01, the implemented AC-side check is only non-emptiness against the family regex, not membership in the canonical set. Documentation that claims a stronger invariant than the code enforces is a maintenance trap — a future reader trusts the comment and does not re-verify.
**Fix:** Either strengthen the assertion (WR-01) so the docstring becomes true, or soften the docstring to state the actual (weaker) guarantee. Prefer the former.

---

_Reviewed: 2026-06-19T22:16:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
