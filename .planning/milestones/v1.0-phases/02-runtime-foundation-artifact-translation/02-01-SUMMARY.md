---
phase: 02-runtime-foundation-artifact-translation
plan: 01
subsystem: infra
tags: [gsd-bob, capability-registry, runtime-descriptor, node-test, js-yaml, vendored-payload, bob-runtime]

# Dependency graph
requires:
  - phase: 01-bob-capability-mapping
    provides: CAPABILITY-MAP.md (config home ~/.bob, text_mode, sequential-inline defaults), SPIKE-04 config-home findings
provides:
  - CJS gsd-bob package manifest (engines node>=22.15.0, js-yaml pinned 4.1.0)
  - Vendored gsd-core payload tree under ./gsd-core (bin/lib, bin/shared)
  - Data-only `bob` runtime entry in the vendored capability-registry (configHome dot-home ~/.bob + BOB_CONFIG_DIR, artifactLayout skills+commands with lazy converter strings)
  - `bob` alias in runtime-aliases.manifest.json and FALLBACK_ALIASES
  - Hermetic verification suite (descriptor / backend-neutrality / planning-bytecompat) + test/_helpers/vendor.cjs resolver
affects: [02-02 (converters convertClaudeCommandToBob*), 02-03, installer phase, upstream PR (5 touchpoints)]

# Tech tracking
tech-stack:
  added: [js-yaml@4.1.0 (exact pin), node:test runner]
  patterns:
    - "Vendored-payload + hand-edited generated registry == future PR diff (a move, not a rewrite)"
    - "Tests require the VENDORED gsd-core lib via test/_helpers/vendor.cjs, never the global ~/.claude install"
    - "Backend-neutrality forbidden-token set built programmatically (base64) so the test never self-trips"

key-files:
  created:
    - package.json
    - package-lock.json
    - test/_helpers/vendor.cjs
    - test/descriptor.test.cjs
    - test/backend-neutrality.test.cjs
    - test/planning-bytecompat.test.cjs
    - gsd-core/ (vendored payload tree)
  modified:
    - .gitignore
    - gsd-core/bin/lib/capability-registry.cjs
    - gsd-core/bin/lib/runtime-name-policy.cjs
    - gsd-core/bin/shared/runtime-aliases.manifest.json

key-decisions:
  - "Descriptor name MUST be '.bob' (leading dot) — dot-home does path.join(home, name), so 'bob' would yield ~/bob (Pitfall 1)"
  - "hookEvents set to 'none' for bob (not 'claude' like the cursor template) to keep zero model-brand literals in the entry"
  - "Byte-compat proven via the REAL hermetic golden diff (primary path), not the structural-invariant fallback"
  - "test script uses a glob 'test/**/*.test.cjs' so it runs on Node 22-25 and excludes test/_helpers"

patterns-established:
  - "Pattern 1: data-only runtime entry templated on cursor; converter STRINGS resolved lazily at staging (functions land in 02-02)"
  - "Pattern 2: hermetic runtime tests inject env/home — no real filesystem, no live Bob"

requirements-completed: [RUNTIME-01, RUNTIME-02, RUNTIME-03, RUNTIME-04]

# Metrics
duration: 4min
completed: 2026-06-17
status: complete
---

# Phase 2 Plan 1: Runtime Foundation Summary

**Backend-agnostic `bob` runtime spine — vendored gsd-core payload, a data-only `bob` registry entry resolving `~/.bob` (with `BOB_CONFIG_DIR` override), and a hermetic suite proving descriptor resolution, `.planning/` byte-compatibility (real golden diff), and zero model-brand literals.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-17T20:42:25-07:00 (first task commit)
- **Completed:** 2026-06-17T20:46:43-07:00 (last task commit)
- **Tasks:** 3
- **Files modified:** 7 source files (+ vendored gsd-core payload tree)

## Accomplishments
- CJS `package.json` (`type` absent), engines `node>=22.15.0`, `js-yaml` pinned EXACT `4.1.0` (supply-chain mitigation T-02-SC), `node --test` script.
- Vendored gsd-core payload under `./gsd-core` so tests exercise the EXTENDED registry, not the global install.
- Added `runtimes['bob']` — `configHome {kind:'dot-home', name:'.bob', env:['BOB_CONFIG_DIR']}`, `artifactLayout` skills(nested)+commands(flat) naming the lazy converter strings, `installSurface:'profile-marker-only'`, `hooksSurface/hookEvents/sandboxTier:'none'` (all valid enums; `resolveInstallPlan('bob')` returns clean).
- Registered the `bob` alias in BOTH `runtime-aliases.manifest.json` and `FALLBACK_ALIASES` (touchpoint 2 kept in sync).
- 12 hermetic tests pass: descriptor (RUNTIME-01/02), backend-neutrality (RUNTIME-04), planning-bytecompat (RUNTIME-03).

## Task Commits

1. **Task 1: Scaffold layout + vendor gsd-core payload** - `7f8c9d4` (chore)
2. **Task 2: bob registry entry + alias (RUNTIME-02) with descriptor test (RUNTIME-01)** - `f234b18` (test/RED) → `f20e328` (feat/GREEN)
3. **Task 3: backend-neutrality (RUNTIME-04) + planning-bytecompat (RUNTIME-03)** - `bcba731` (test)

_TDD gate sequence present: test(RED) → feat(GREEN) for Task 2._

## Files Created/Modified
- `package.json` — CJS manifest, engines `node>=22.15.0`, `js-yaml` `4.1.0`, glob test script
- `package-lock.json` — lockfile resolving genuine `nodeca/js-yaml` 4.1.0
- `.gitignore` — node_modules + transient test output ignored; vendored `gsd-core/` deliberately committed
- `gsd-core/` — vendored gsd-core payload (`bin/lib`, `bin/shared`)
- `gsd-core/bin/lib/capability-registry.cjs` — added `runtimes['bob']` (with a head-comment documenting the generated-file hand-edit)
- `gsd-core/bin/lib/runtime-name-policy.cjs` — added `bob` to `FALLBACK_ALIASES`
- `gsd-core/bin/shared/runtime-aliases.manifest.json` — added `bob` alias
- `test/_helpers/vendor.cjs` — resolver to the vendored lib
- `test/descriptor.test.cjs` — RUNTIME-01/02 (7 tests)
- `test/backend-neutrality.test.cjs` — RUNTIME-04 (3 tests)
- `test/planning-bytecompat.test.cjs` — RUNTIME-03 (2 tests)

## Byte-Compatibility Form Used (RUNTIME-03 — mandatory disclosure)

**Form (a): the REAL hermetic byte diff was used (primary path).** `test/planning-bytecompat.test.cjs` drives gsd-core's runtime-agnostic `.planning/` write path — `state-document.cjs` `stateReplaceField`, the exact code `gsd-tools query state.*` uses to mutate `.planning/STATE.md` — under two runtime-config contexts (bob descriptor resolved vs claude descriptor resolved) and asserts the emitted STATE.md bytes are byte-identical. The write path takes NO runtime argument, so the two runs differ only in the resolved config home, which the test confirms never leaks into the artifact body. The structural-invariant assertion (bob declares no `.planning/` artifactLayout target) is ALSO asserted as a secondary guard — but the byte diff is the primary, passing path; the fallback exception was not needed. The on-device end-to-end byte diff is appended as **AC-05** in `.planning/ACCEPTANCE-CHECKLIST.md` for the Phase 6 pass.

## Decisions Made
- Descriptor `name` = `'.bob'` (leading dot) per RESEARCH correction — guards Pitfall 1 (`~/bob` regression), enforced by a test assertion.
- `hookEvents: 'none'` for bob instead of the cursor template's `'claude'`, keeping the entry free of model-brand literals (RUNTIME-04).
- Used the real hermetic golden diff (form a) for RUNTIME-03, not the structural-invariant fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] descriptor test tilde-expansion expectation corrected**
- **Found during:** Task 2 (GREEN run)
- **Issue:** The plan's behavior text expected `~/cbob` to expand against the injected `home` (`/home/u/cbob`). gsd-core's `dot-home` branch expands a leading `~/` via `expandTilde`, which uses the real `os.homedir()`, not the injected home arg.
- **Fix:** Assert tilde expansion against `os.homedir()` and that the result is not left literal — matching the actual vendored implementation.
- **Files modified:** test/descriptor.test.cjs
- **Verification:** `node --test test/descriptor.test.cjs` — 7/7 pass.
- **Committed in:** `f20e328` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] test script changed to a glob**
- **Found during:** Task 3 (running `npm test`)
- **Issue:** `node --test test/` fails on Node>=22 (the directory arg is resolved as a module path → MODULE_NOT_FOUND). The plan specified the literal `node --test test/`.
- **Fix:** Changed the script to `node --test "test/**/*.test.cjs"` — runs on Node 22-25 and excludes `test/_helpers/vendor.cjs`.
- **Files modified:** package.json
- **Verification:** `npm test` — 12/12 pass.
- **Committed in:** `bcba731` (Task 3 commit)

**3. [Rule 1 - Bug] backend-neutrality scan excludes the converter-name source prefix**
- **Found during:** Task 3 (first run of backend-neutrality.test.cjs)
- **Issue:** The scan flagged "Claude" inside the converter STRINGS `convertClaudeCommandToBobSkill`/`...Command`. That "Claude" is gsd-core's UNIVERSAL source-format converter-name prefix (every runtime — cursor, cline, antigravity — names its converters `convertClaudeCommandTo<Runtime>*`), not a model backend selected in the bob entry.
- **Fix:** The scan strips the `convertClaude*ToBob*` converter-name token before brand matching (in addition to comment lines), so only a genuine backend reference would trip it.
- **Files modified:** test/backend-neutrality.test.cjs
- **Verification:** `node --test test/backend-neutrality.test.cjs` — 3/3 pass; manual grep confirms no Gemini/Granite/GPT and no backend "Claude" reference in the bob entry.
- **Committed in:** `bcba731` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 test-correctness bugs, 1 Rule 3 blocking script fix)
**Impact on plan:** All three were test/script correctness fixes that align the suite with the actual vendored gsd-core behavior and a portable Node invocation. No production-code scope creep; the registry entry matches RESEARCH Pattern 1 exactly.

## Issues Encountered
- None beyond the deviations above. `npm install` succeeded online; `js-yaml@4.1.0` resolved (genuine `nodeca/js-yaml`).

## Threat Surface Scan
No new threat surface beyond the plan's threat_model. `BOB_CONFIG_DIR` reuses gsd-core's existing `resolveConfigHomeFromDescriptor` (no new path logic, T-02-01 accepted). The registry hand-edit (T-02-02) is guarded by the descriptor test + head-comment. `js-yaml` is pinned (T-02-SC).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The `bob` runtime entry's `artifactLayout` names `convertClaudeCommandToBobSkill` / `convertClaudeCommandToBobCommand` as lazy converter STRINGS — plan 02-02 authors those functions in `runtime-artifact-conversion.cjs` (+ a `bob-adapter.cjs` for the custom_modes.yaml merge). The registry loads cleanly today even though the functions don't exist yet (lazy string resolution).
- `backend-neutrality.test.cjs` already scans for a future `bob-adapter.cjs` (vacuous pass until 02-02 lands it).
- AC-05 (`.planning/` byte diff) queued in `.planning/ACCEPTANCE-CHECKLIST.md` for the Phase 6 on-device pass.

## Self-Check: PASSED
- All created files verified present on disk (package.json, package-lock.json, test/_helpers/vendor.cjs, 3 test files, vendored capability-registry.cjs, alias manifest).
- All commits verified in git log: `7f8c9d4`, `f234b18`, `f20e328`, `bcba731`.

---
*Phase: 02-runtime-foundation-artifact-translation*
*Completed: 2026-06-17*
