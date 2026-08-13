---
phase: 02-runtime-foundation-artifact-translation
plan: 02
subsystem: artifact-translation
tags: [gsd-bob, converters, bob-adapter, custom-modes, js-yaml, node-test, golden-tests, tdd]

# Dependency graph
requires:
  - phase: 02-runtime-foundation-artifact-translation
    plan: 01
    provides: "vendored gsd-core payload, data-only bob registry entry (converter STRINGS), test/_helpers/vendor.cjs, js-yaml@4.1.0"
provides:
  - "convertClaudeCommandToBobSkill + convertClaudeCommandToBobCommand (in vendored runtime-artifact-conversion.cjs, exported) — bob registry converter strings now resolve to live functions"
  - "src/bob-adapter.cjs — the single isolated net-new Bob module: emitGsdMode, mergeCustomModes, gateArtifact, buildSupportRoster, BOB_SKIP_LIST"
  - "Golden fixtures + node:test suites for skill/command conversion, idempotent custom_modes merge, unsupported-primitive gate"
  - "vendored scripts/fix-slash-commands.cjs (completes the conversion lib's transitive dep closure)"
affects: [02-03, installer phase (calls mergeCustomModes + gateArtifact), Phases 4-5 (full-roster gating, multi-arg projection), upstream PR (converters move verbatim)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bob converters reconstruct frontmatter from a WHITELIST (never filter-in-place) so unsupported keys are stripped by omission"
    - "Reuse gsd-core's shipped yamlQuote (=JSON.stringify) for every emitted field — YAML flow chars ([BETA], etc.) can't break Bob's parser"
    - "All net-new Bob substance + the only js-yaml import isolated to src/bob-adapter.cjs (D-04/D-07) — installer/staging path stays node:fs-only"
    - "Custom_modes merge idempotency proven by PARSED-entry comparison, not raw text (js-yaml drops comments on re-emit — Pitfall 5)"
    - "Parity-first gate: unsupported artifact OMITTED from loadable set AND recorded loud as 'unsupported on Bob: <reason>'"

key-files:
  created:
    - src/bob-adapter.cjs
    - scripts/fix-slash-commands.cjs
    - test/skill-golden.test.cjs
    - test/command-golden.test.cjs
    - test/merge.test.cjs
    - test/unsupported-gate.test.cjs
    - test/fixtures/skill/input.md
    - test/fixtures/skill/expected.md
    - test/fixtures/command/input.md
    - test/fixtures/command/expected.md
    - test/fixtures/custom_modes/user-seeded.yaml
  modified:
    - gsd-core/bin/lib/runtime-artifact-conversion.cjs

key-decisions:
  - "Bob skill converter does NOT early-return on missing frontmatter (unlike the Antigravity analog) — Bob ignores a skill without a description, so a 2-line block with an empty description is always emitted"
  - "mergeCustomModes filter is slug-EQUALITY scoped (m.slug === entry.slug AND owned), so a differently-named gsd-* slug (e.g. gsd-legacy) is retained, not blanket-wiped — matches plan action text exactly"
  - "gateArtifact: curated BOB_SKIP_LIST takes precedence over primitive checks (covers what skill metadata cannot self-describe)"
  - "Vendored scripts/fix-slash-commands.cjs (node-builtins-only) rather than stubbing — completes the 02-01 vendoring so the conversion lib loads (Rule 3 blocking fix)"

patterns-established:
  - "Golden-fixture conversion test: read input.md, run converter, assert byte-equality with expected.md via the vendored lib through test/_helpers/vendor.cjs"
  - "Forbidden/marker tokens in a test built programmatically (token.join(' ')) so the test prose never self-trips its own assertions"

requirements-completed: [TRANS-01, TRANS-02, TRANS-04, TRANS-05]

# Metrics
duration: 4min
completed: 2026-06-18
status: complete
---

# Phase 2 Plan 2: Artifact Translation Core Summary

**Bob-native emitter — two whitelist-reconstructing converters (skill → name+description-only SKILL.md, command → description+argument-hint-only slash command with `$ARGUMENTS`→`$1`) wired into the registry by string, plus the single isolated `src/bob-adapter.cjs` carrying the gsd custom-mode emitter, an idempotent slug-scoped `custom_modes.yaml` merge, and the loud parity-first unsupported-primitive gate.**

## Performance

- **Duration:** ~4 min
- **Tasks:** 3 (all TDD: RED → GREEN)
- **Tests:** 35/35 pass (`npm test`), of which 23 are net-new this plan
- **Files:** 11 created + 1 modified (vendored conversion lib)

## Accomplishments

- **TRANS-01 / TRANS-02 (Task 1):** `convertClaudeCommandToBobSkill` and `convertClaudeCommandToBobCommand` added to the vendored `runtime-artifact-conversion.cjs` and registered in `module.exports`. The bob registry entry's converter STRINGS (added data-only in 02-01) now resolve to live functions — verified programmatically: both `convertClaude*ToBob*` strings map to exported functions through the layout dispatch.
  - Skill output: frontmatter reduced to **exactly** `name:` + `description:` (effort / allowed-tools / argument-hint stripped by reconstruction); body preserved verbatim; description passed through `yamlQuote` so a leading `[BETA]` is safely quoted.
  - Command output: frontmatter reduced to **exactly** `description:` + `argument-hint:` (effort / allowed-tools / agent stripped); body preserved; `$ARGUMENTS` projected to `$1` (simple/no-arg case; complex multi-arg deferred to Phases 4-5 per RESEARCH Open Questions).
  - Both prove well-formed output for a no-frontmatter input (no crash).
- **TRANS-05 (Task 2):** `src/bob-adapter.cjs` — the ONE isolated net-new Bob module. `emitGsdMode()` returns the single gsd mode with groups locked to `[read, edit, command, mcp]` (no skill/browser, D-02). `mergeCustomModes()` parses with js-yaml's safe schema, removes only the owned slug equal to the incoming entry slug, appends the fresh entry, dumps with `lineWidth:-1` — idempotent, replace-in-place, never touches non-gsd slugs.
- **TRANS-04 (Task 3):** `gateArtifact()` + `buildSupportRoster()` + curated `BOB_SKIP_LIST`. A supported candidate is loadable with no roster line; a candidate with an unmet hard dependency (e.g. `isolatedSubagents`) or on the skip-list is OMITTED and recorded as a loud `unsupported on Bob: <reason>` line — parity-first, never silent.
- **js-yaml isolation verified:** `src/bob-adapter.cjs` is the sole production importer of `js-yaml` (the only other importer is `test/merge.test.cjs`, which uses it to *assert* on the merge output). No installer/staging path imports it.

## Task Commits

1. **Task 1: Bob skill + command converters (TRANS-01, TRANS-02) with golden tests** — `22a409c` (test/RED) → `584642e` (feat/GREEN)
2. **Task 2: Isolated bob-adapter — gsd mode + idempotent merge (TRANS-05)** — `ed6085f` (test/RED) → `2a5b851` (feat/GREEN)
3. **Task 3: Unsupported-primitive gate + support roster (TRANS-04)** — `b9d8b63` (test/RED) → `bb9624f` (feat/GREEN)

_TDD gate sequence present for all three tasks: test(RED) precedes feat(GREEN)._

## Files Created/Modified

- `gsd-core/bin/lib/runtime-artifact-conversion.cjs` — added the two Bob converters (templated on the Antigravity skill / Cursor command analogs) + their `module.exports` entries
- `src/bob-adapter.cjs` — emitGsdMode, mergeCustomModes, gateArtifact, buildSupportRoster, BOB_SKIP_LIST, UNSUPPORTED_MARKER (sole js-yaml consumer)
- `scripts/fix-slash-commands.cjs` — vendored (node-builtins-only) to complete `command-roster.cjs`'s transitive dep closure so the conversion lib loads
- `test/skill-golden.test.cjs`, `test/command-golden.test.cjs` — TRANS-01/02 golden byte-equality tests
- `test/merge.test.cjs` — TRANS-05 three slug-level invariants (idempotency, non-gsd preservation, replace-not-duplicate) by parsed-entry comparison
- `test/unsupported-gate.test.cjs` — TRANS-04 supported/unsupported/skip-list + loud roster marker
- `test/fixtures/skill/{input,expected}.md`, `test/fixtures/command/{input,expected}.md`, `test/fixtures/custom_modes/user-seeded.yaml` — golden fixtures

## Decisions Made

- **No early-return on missing skill frontmatter:** the Antigravity template returns the converted content unchanged when frontmatter is absent; Bob must always emit a `name:`+`description:` block (empty description allowed) because Bob silently ignores a skill lacking a usable description (Pitfall 4).
- **Slug-EQUALITY scoped merge filter:** `m && isOwned(m.slug) && m.slug === entry.slug` — so a differently-named owned slug (`gsd-legacy`) is RETAINED, not wiped. A dedicated test pins this so the semantics can't silently broaden into a blanket gsd-* wipe.
- **Skip-list precedence in the gate:** `BOB_SKIP_LIST` is checked before primitive requirements, covering hard dependencies skill metadata cannot express.
- **Vendor over stub** for `fix-slash-commands.cjs`: it has zero non-builtin deps, so vendoring it (mirroring 02-01's vendored-payload approach) is the correct fix rather than stubbing — keeps the conversion lib byte-faithful to upstream for the eventual PR.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vendored the missing `scripts/fix-slash-commands.cjs`**
- **Found during:** Task 1 (first GREEN run — and re-confirmed: the RED run of the golden tests was the first thing in the project to `require` the conversion lib).
- **Issue:** The vendored `gsd-core/bin/lib/command-roster.cjs` `require`s `../../../scripts/fix-slash-commands.cjs`, which from `gsd-core/bin/lib/` resolves to `<repo-root>/scripts/fix-slash-commands.cjs`. That file was not vendored in 02-01 (the 02-01 tests never required the conversion lib, so the gap was latent). Requiring `runtime-artifact-conversion.cjs` therefore threw `MODULE_NOT_FOUND`.
- **Fix:** Copied the global install's `~/.claude/scripts/fix-slash-commands.cjs` (node-builtins-only — `node:fs`, `node:path`, no third-party deps) to `<repo>/scripts/fix-slash-commands.cjs`, completing the vendored dep closure. The conversion lib now loads cleanly.
- **Files modified:** `scripts/fix-slash-commands.cjs` (new)
- **Verification:** `node -e "require('./gsd-core/bin/lib/runtime-artifact-conversion.cjs')"` succeeds; full suite 35/35.
- **Committed in:** `584642e` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — completed the 02-01 vendoring; no production scope creep).
**Impact on plan:** None on plan intent. The fix is a vendoring completion, fully consistent with 02-01's stated vendored-payload approach, and is itself upstream-neutral (the file exists upstream at the same relative path).

## Threat Surface Scan

No new threat surface beyond the plan's `threat_model`. All four registered threats are addressed:
- **T-02-04** (malicious custom_modes.yaml): `yaml.load` uses js-yaml v4's safe schema (no arbitrary-tag execution); the filter is slug-scoped; `merge.test.cjs` asserts non-gsd preservation + idempotency.
- **T-02-05** (frontmatter injection silently dropping a skill): every emitted description/argument-hint passes through `yamlQuote`; `skill-golden.test.cjs` asserts the `[BETA]` description is double-quoted.
- **T-02-06** (shell interpolation — *accept*): converters emit markdown only; no shell interpolation occurs.
- **T-02-07** (silent parity gap): `gateArtifact` omits + records a loud `unsupported on Bob: <reason>` line; `unsupported-gate.test.cjs` asserts the marker.

The vendored `scripts/fix-slash-commands.cjs` adds no new trust boundary (node-builtins-only, read-only command-name discovery).

## Known Stubs

None. The `$ARGUMENTS`→`$1` projection is intentionally the simple/no-arg case (documented, deferred-by-design to Phases 4-5 per RESEARCH Open Questions), and `BOB_SKIP_LIST` is intentionally a tiny representative list proving the mechanism — full-roster gating across the whole skill set is explicitly scoped to Phases 4-5. Neither blocks this plan's goal (proving the translation core on representative cases).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The bob registry converter STRINGS now resolve to live functions — staging of `.bob/skills` / `.bob/commands` is unblocked for the installer phase.
- `mergeCustomModes` and `gateArtifact`/`buildSupportRoster` are exported for the installer to call (D-06: merge lives in the adapter, installer invokes it).
- Full-roster gating across every GSD skill, and complex multi-arg `$ARGUMENTS` projection, are scoped to Phases 4-5.

## Self-Check: PASSED

- All created files verified present on disk (src/bob-adapter.cjs, scripts/fix-slash-commands.cjs, 4 test files, 5 fixture files) and the modified conversion lib carries both converters in module.exports.
- All task commits verified in git log: `22a409c`, `584642e`, `ed6085f`, `2a5b851`, `b9d8b63`, `bb9624f`.
- `npm test` → 35/35 pass; bob converter strings resolve to exported functions; js-yaml confined to src/bob-adapter.cjs (+ merge test).

---
*Phase: 02-runtime-foundation-artifact-translation*
*Completed: 2026-06-18*
