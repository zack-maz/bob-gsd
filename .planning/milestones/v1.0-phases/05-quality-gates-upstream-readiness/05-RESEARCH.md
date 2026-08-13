# Phase 5: Quality Gates & Upstream Readiness - Research

**Researched:** 2026-06-19
**Domain:** GSD-skill porting via existing converter pipeline (test-deferred); upstream-readiness audit + documentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Port-by-conversion (reuse the Phase 4 mechanism verbatim). Quality-gate commands/workflows are emitted through the **existing `bob` converter** from the vendored `gsd-core/` payload — no hand-rewrite. Phase 5 deliverable: (a) confirm the quality-gate artifacts + transitive deps are present in the vendored payload and enumerated by the runtime; (b) ensure they convert + gate correctly; (c) build the equivalence/state-persistence/roster verification; (d) append device-runnable AC steps; (e) the UP-01/UP-02 audit + README.
- **D-02:** No isolated subagents → the single Bob agent performs each delegated step inline, sequentially. All three gates use **sequential single-subagent** delegation, never concurrent fan-out. `code-review` → `gsd-code-reviewer`, then (with `--fix`) `code-review-fix` → `gsd-code-fixer`; `debug` → `gsd-debug-session-manager` → `gsd-debugger`; `audit-fix` → `gsd-executor` one scoped fix at a time. Each collapses to sequential-inline with identical output. The `bob` declaration already advertises `isolatedSubagents:false`.
- **D-03:** Gate, don't break — expected outcome is NO new skips. A quality-gate artifact is added to `BOB_SKIP_LIST` / routed to `SUPPORT-ROSTER.md` ONLY if it has a hard dependency on isolation + completion-signals that cannot be expressed inline.
- **D-04:** Persistence rides the existing `.planning/debug/{slug}.md` session file — no new state mechanism. Resume via `/gsd-debug continue <slug>`; resolved sessions archived under `.planning/debug/resolved/`. Plain on-disk markdown — runtime-neutral, survives resets by construction. Slug sanitized (`^[a-z0-9][a-z0-9-]*$`, max 30 chars, rejects `..`/`/`/`\`). Bob checkpoints render as numbered `text_mode` choices via TRANS-03.
- **D-05:** QUAL-02's "persistent across resets" is a verification obligation. The state-persistence test MUST: start a session, assert `.planning/debug/{slug}.md` written with expected fields, simulate a reset (fresh invocation), `continue <slug>`, assert state faithfully restored from disk — under the Claude/Node runtime as the backend-agnostic equivalence proxy.
- **D-06:** `audit-fix` / `audit-uat` port by conversion (D-01); the parity gate owns the "explicit flagged reason" half of QUAL-03. Satisfied when (a) audit commands run natively (sequential-inline + text_mode), and (b) the roster is inspected against the capability map so every parity-first skip is an `unsupported on Bob: <reason>` line in `SUPPORT-ROSTER.md`. Roster is GENERATED from `gateArtifact`/`buildSupportRoster` (`scripts/generate-support-roster.cjs`), never hand-maintained.
- **D-07:** Audit, don't refactor — confirm existing isolation holds and record the targeted version. UP-01 is verification/documentation: (a) confirm all Bob-specific logic is confined to one adapter component (`src/bob-adapter.cjs` + the `"bob"` registry entry + the `dot-home` descriptor/alias touchpoints); (b) the backend-neutrality grep stays green (zero model-name literals); (c) record targeted gsd-core version = `1.5.0` in a durable maintainer-visible place (README + inventory doc).
- **D-08:** Ship a net-new top-level `README.md` (none exists today) covering: one-line `npx` install, scope (local `.bob/` vs global `~/.bob/`) and modes (re-run = update, `--uninstall`+install = clean — never invented `--clean`/`--update`), supported skills (sourced from `SUPPORT-ROSTER.md`, not hand-listed), flagged gaps, targeted gsd-core version (1.5.0), test-deferred/no-local-Bob posture, and a pointer to `.planning/ACCEPTANCE-CHECKLIST.md`. Maintainer-reviewable standard, mirrors gsd-core's README conventions.
- **D-09:** Complementary checks, all runnable in the Claude/Node runtime without a live Bob: (1) Claude-runtime equivalence — `code-review` (+`--fix`) against a frozen fixture diff, audit against a fixture; (2) state-persistence test (`node:test`) — D-05's start→write→reset→continue→restore; (3) roster-vs-capability-map inspection; (4) backend-neutrality grep stays green; (5) doc/structure review (README + 5-artifact inventory).
- **D-10:** Append device-runnable AC steps to `.planning/ACCEPTANCE-CHECKLIST.md` per the Phase 1 D-07 convention (AC-ID + `Cmd/Expect/Confirms/Result` schema) — continuing from **AC-21** (next is AC-22), one per Phase 5 success criterion.

### Claude's Discretion
- Fixture diff shape for the code-review equivalence test and how the golden `REVIEW.md` reference is frozen/stored.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11 / Phase 3 D-15 / Phase 4).
- Exact AC-ID numbering continuation and per-command checklist copy.
- README section ordering and depth (within the UP-02 required-content floor in D-08).
- The exact filename/location of the "5-artifact upstream inventory" doc (`UPSTREAM.md` vs a README section) — both acceptable.

### Deferred Ideas (OUT OF SCOPE)
- Broader skill coverage (`new-milestone`, `complete-milestone`, `transition`, `spec-phase`, `mvp-phase`, `ui-phase`, `ai-integration-phase`, `autonomous`, `manager`, `workstreams`) — v2.
- Other review/quality skills in the vendored payload (`eval-review`, `ui-review`, `plan-review-convergence`, `audit-milestone`, `secure-phase`, `validate-phase`) — out of QUAL-01..03 v1 scope; NOT ported in Phase 5.
- Actual upstream PR to open-gsd/gsd-core (MERGE-01) — Phase 5 makes the work *mergeable* but does not open the PR.
- Rich Bob-native re-modeling of subagents/prompts (modes/agents) — v2 NATIVE-01.
- Worktree-isolated / concurrent execution — v2 PAR-01.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | `code-review` (incl. `--fix`) runs natively in Bob | Command sources `code-review.md` + `code-review-fix.md` exist in vendored `gsd-core/workflows/`; converter pipeline (`stage.cjs` lines 239-266) auto-converts any `commands/gsd/*.md` source. Vendor the two command sources → installer emits `.bob/commands/gsd-code-review.md` + skill. Both gates use single-subagent sequential delegation (verified §Concurrency). |
| QUAL-02 | `debug` runs natively with persistent debug state | `debug.md` workflow already implements the `.planning/debug/{slug}.md` file-based session model with `continue <slug>` resume + `resolved/` archive + slug sanitization (verified §Debug State). State-persistence test asserts start→write→reset→continue→restore. |
| QUAL-03 | `audit` (`audit-fix` / `audit-uat`) runs natively | Both workflow sources present in vendored payload; `audit-uat` is inline-only (zero subagent spawn), `audit-fix` is single sequential `gsd-executor` spawn. Roster inspection (§Roster) proves every skip carries a capability-map-traceable reason. |
| UP-01 | Bob-specific code isolated to one adapter component; zero model-name literals; targeted version recorded | 5-artifact inventory produced with file:line pointers (§UP-01 Inventory). `backend-neutrality.test.cjs` already green; `gsd-core/VERSION` = `1.5.0` confirmed. |
| UP-02 | README to maintainer standard | No `README.md` exists today (confirmed). Net-new file; supported-skills list sourced from `SUPPORT-ROSTER.md`. gsd-core README conventions surveyed (§README). |
</phase_requirements>

## Summary

This is a **test-deferred port phase, not a feature build**. Phases 2-4 already built the entire machinery: the `bob` converter, the parity gate, the roster-agnostic installer, and the sequential-inline + text_mode degradation seams. Phase 5's job is to (1) vendor five quality-gate command sources into `commands/gsd/` so the existing installer auto-converts them, (2) build five backend-agnostic verification suites in `node:test`, (3) append device-runnable AC steps (AC-22+), and (4) produce the UP-01 isolation audit + a net-new README. **No new converter, installer, gate, or state mechanism is written.**

The single most important mechanical fact: the installer's convertible-artifact loop (`src/installer/stage.cjs` lines 239-266) iterates *every* `.md` under `repoRoot/commands/gsd/`, runs each through `convertClaudeCommandToBobCommand` + `convertClaudeCommandToBobSkill`, and gates each via `gateArtifact`. The whole `gsd-core/` payload (including `workflows/`, `references/`, `templates/`) is staged wholesale (lines 217-222). So the **conversion source of truth for quality-gate slash commands is `commands/gsd/<name>.md`** — and those five files are NOT present yet (verified: `commands/gsd/` holds only the 6 core-loop sources). Vendoring them mirrors commit `feat(04-01): vendor 6 core-loop command sources from gsd-core 1.5.0` exactly.

The agent prompts (`gsd-code-reviewer`, `gsd-code-fixer`, `gsd-debug-session-manager`, `gsd-debugger`, `gsd-executor`) are NOT in the vendored payload and do NOT need to be — they are resolved at runtime by the orchestrator/host, not converted as artifacts. The workflows reference them by name (`subagent_type=`); under Bob's `isolatedSubagents:false` they collapse to sequential-inline execution by the single agent. All three gates already use single-subagent, wait-for-return delegation (the `ORCHESTRATOR RULE` comments confirm this), so **none depend on *concurrent* subagent results — all degrade cleanly with no new skip** (D-03 expectation holds).

**Primary recommendation:** Vendor the 5 quality-gate command sources into `commands/gsd/`, mirror the established `node:test` + frozen-fixture + golden pattern (`test/core-loop-equivalence.test.cjs`, `test/_helpers/vendor.cjs`) for the 5 verification suites, append AC-22..AC-26 to the checklist, and write `README.md` + the 5-artifact upstream inventory. Touch `src/bob-adapter.cjs` only if a gate proves un-degradable (not expected).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Quality-gate slash-command emission | Installer staging (`stage.cjs`) | `bob` converter (`runtime-artifact-conversion.cjs`) | Installer enumerates `commands/gsd/*.md`, converter transforms each — no Phase 5 code in either; Phase 5 only adds the *source* files |
| Quality-gate workflow staging | Installer payload copy | Vendored `gsd-core/workflows/` | Whole payload staged wholesale; workflows already present |
| Subagent → sequential-inline degradation | `bob` capability declaration (`capability-registry.cjs`) | Host runtime selection | `isolatedSubagents:false` drives the runtime to inline execution; no per-skill code |
| Interactive prompt → text_mode | `.planning/config.json` (`text_mode:true`) | TRANS-03 config+workflow seam | Already wired in Phase 2/3; debug checkpoints render as numbered choices |
| Debug state persistence | `.planning/debug/{slug}.md` on disk | `debug.md` workflow logic | File-based markdown is runtime-neutral, survives resets by construction |
| Parity-skip flagging | `gateArtifact`/`buildSupportRoster` (`bob-adapter.cjs`) | `scripts/generate-support-roster.cjs` | Single gate authority; roster is generated, never hand-edited |
| Upstream isolation | `src/bob-adapter.cjs` + `"bob"` registry entry + `dot-home` descriptor | — | The ~5-touchpoint "move" inventory; UP-01 audits, does not refactor |
| Verification | `test/*.test.cjs` (`node:test`) | `test/fixtures/` golden artifacts | Backend-agnostic Claude/Node proxy for the deferred Bob run |
| Documentation | `README.md` (net-new) + optional `UPSTREAM.md` | `SUPPORT-ROSTER.md` (skill list source) | Maintainer-reviewable; supported-skills sourced from roster |

## Standard Stack

This phase introduces **no new packages**. It reuses the existing, already-installed stack.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `>=22.15.0` | Test runner + converter runtime | `package.json` engines; matches gsd-core + Bob Shell floor `[VERIFIED: package.json]` |
| `node:test` | built-in | All Phase 5 verification suites | Zero-dep; the established pattern in `test/*.test.cjs` `[VERIFIED: test/ dir]` |
| `node:assert/strict` | built-in | Assertions | Used by every existing suite `[VERIFIED: test files]` |
| `js-yaml` | `4.1.0` | (Inherited) only `src/bob-adapter.cjs` requires it | Already a dep; NOT used in Phase 5's new code `[VERIFIED: package.json]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` / `node:path` / `node:os` | built-in | Fixture reads, scratch `mkdtempSync` dirs | All test helpers `[VERIFIED: test/_helpers/vendor.cjs]` |
| `node:child_process` (`execFileSync`) | built-in | Drive the real installer entry in e2e tests | Used by `core-loop-contract.test.cjs` `[VERIFIED]` |

**Installation:** None required — `npm test` runs `node --test "test/**/*.test.cjs"` `[VERIFIED: package.json scripts.test]`.

## Package Legitimacy Audit

> Not applicable. Phase 5 installs **zero new external packages**. The only runtime dependency (`js-yaml@4.1.0`) was vetted in Phase 2 and is not used by any Phase 5 code. No `package.json` change is expected.

## Architecture Patterns

### System Architecture Diagram

```
                    PHASE 5 DELIVERABLE FLOW (test-deferred)

  [Vendor step] gsd-core/workflows/{code-review,code-review-fix,debug,
                 audit-fix,audit-uat}.md  ──┐ (already in payload, staged wholesale)
                                            │
  [Vendor step] commands/gsd/{code-review,code-review-fix,debug,        ◄── NEW SOURCES
                 audit-fix,audit-uat}.md  ──┤    (Phase 5 adds these; mirrors 04-01)
                                            │
                                            ▼
            ┌──────────────────────────────────────────────┐
            │  src/installer/stage.cjs (UNCHANGED)           │
            │  • copy whole gsd-core/ payload  (L217-222)    │
            │  • for each commands/gsd/*.md:    (L239-266)   │
            │      gateArtifact(candidate, BOB_CAPABILITY)   │
            │      → convertClaudeCommandToBobCommand        │
            │      → convertClaudeCommandToBobSkill          │
            │  • renderRoster()  →  SUPPORT-ROSTER.md (L225)  │
            └──────────────────────────────────────────────┘
                                            │
                ┌───────────────────────────┼────────────────────────┐
                ▼                           ▼                        ▼
     .bob/commands/gsd-<x>.md     .bob/skills/gsd-<x>/SKILL.md   .bob/gsd-core/workflows/*.md
                │                                                      │
                ▼ (runtime: Bob host, deferred — proxied by Claude/Node)
     ┌──────────────────────────────────────────────────────────────────┐
     │  Sequential-inline execution (isolatedSubagents:false)             │
     │  code-review → gsd-code-reviewer  [→ code-review-fix → gsd-code-fixer]│
     │  debug → gsd-debug-session-manager → gsd-debugger                  │
     │  audit-fix → gsd-executor (one scoped fix at a time)               │
     │  audit-uat → inline analysis (NO subagent)                         │
     │  debug state → .planning/debug/{slug}.md (survives reset)          │
     └──────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
            VERIFICATION (Claude/Node, no live Bob — D-09)
   equivalence │ state-persistence │ roster-vs-capmap │ neutrality grep │ doc review
                                            │
                                            ▼
            .planning/ACCEPTANCE-CHECKLIST.md  (append AC-22..AC-26)
            README.md + UPSTREAM.md (5-artifact inventory)
```

### Recommended Project Structure
```
commands/gsd/
├── code-review.md        # NEW — vendored Claude source (conversion input)
├── code-review-fix.md    # NEW
├── debug.md              # NEW
├── audit-fix.md          # NEW
└── audit-uat.md          # NEW
test/
├── quality-gate-equivalence.test.cjs    # NEW — QUAL-01/03 conversion + contract
├── debug-state-persistence.test.cjs     # NEW — QUAL-02 start→reset→continue→restore
├── roster-capmap.test.cjs               # NEW — QUAL-03 every skip traces to a primitive
├── backend-neutrality.test.cjs          # EXISTING — must stay green (UP-01)
└── fixtures/quality-gates/              # NEW — frozen diffs + golden REVIEW.md etc.
README.md                 # NEW (UP-02)
UPSTREAM.md               # NEW (UP-01 5-artifact inventory) — or a README section
```

### Pattern 1: Vendor-the-command-source (port-by-conversion)
**What:** Copy the Claude command source from gsd-core into `commands/gsd/<name>.md`. The installer's convertible loop does the rest.
**When to use:** For every quality-gate slash command (QUAL-01, QUAL-03).
**Example:**
```bash
# Source: stage.cjs L239-266 [VERIFIED: src/installer/stage.cjs]
# Phase 5 adds the source; the installer enumerates + converts it with ZERO code change.
const convertibleSrc = path.join(repoRoot, 'commands', 'gsd');
for (const rel of listFilesRel(convertibleSrc)) {
  const stem = path.basename(rel, path.extname(rel));   // e.g. "code-review"
  const name = `gsd-${stem}`;                            // "gsd-code-review"
  if (gateArtifact({ name, requires: [] }, BOB_CAPABILITY_DECL).supported) {
    // → .bob/commands/gsd-code-review.md  AND  .bob/skills/gsd-code-review/SKILL.md
  }
}
```
Note: the `commands/gsd/` source frontmatter uses the legacy `name: gsd:plan-phase` colon dialect; the converter translates `gsd:` → `gsd-` on emission `[VERIFIED: core-loop sources + convertClaudeCommandToBobContent]`.

### Pattern 2: node:test + frozen-fixture + golden diff
**What:** Read vendored source via `requireVendor`, convert, assert byte-identity against a frozen fixture; all scratch writes to `mkdtempSync` temp dirs.
**When to use:** The equivalence suite (QUAL-01/03).
**Example:**
```javascript
// Source: test/core-loop-equivalence.test.cjs L63-77 [VERIFIED]
const conv = requireVendor('runtime-artifact-conversion.cjs');
test(`${stem}: command converts byte-identically to the frozen fixture`, () => {
  const out = conv.convertClaudeCommandToBobCommand(source, name);
  const expected = fs.readFileSync(path.join(fixDir, `${stem}.command.expected.md`), 'utf8');
  assert.equal(out, expected);
});
```

### Pattern 3: Programmatically-built forbidden-token set (self-trip avoidance)
**What:** Build forbidden brand tokens from base64 so the test file's own prose cannot self-trip the scan.
**When to use:** Any test asserting absence of brand literals or colon-dialect refs.
**Example:**
```javascript
// Source: test/backend-neutrality.test.cjs L26-28 [VERIFIED]
const FORBIDDEN_TOKENS = ['Q2xhdWRl','R2VtaW5p','R3Jhbml0ZQ==','R1BU']
  .map((b) => Buffer.from(b, 'base64').toString('utf8'));  // [Claude,Gemini,Granite,GPT]
```

### Anti-Patterns to Avoid
- **Hand-rewriting quality-gate artifacts for Bob.** Violates D-01. The install diff must equal the upstream PR diff. Use the converter.
- **Hand-editing `SUPPORT-ROSTER.md`.** Violates D-06/T-02-10. Regenerate via `scripts/generate-support-roster.cjs`.
- **Adding a new converter or `degrade*.cjs`.** Phase 5 introduces no new conversion code (`stage.cjs` comment L238).
- **Adding quality-gate names to `BOB_SKIP_LIST`.** Only if a gate proves un-degradable (not expected — all use sequential single-subagent).
- **Writing the debug state-persistence test as "session starts" only.** The D-05 trap: must do a real reset → `continue` → restore-from-disk assertion.
- **Hand-typing the README supported-skills list.** Source it from `SUPPORT-ROSTER.md` so it can't drift.
- **Inventing `--clean`/`--update` flags in README docs.** re-run = update, `--uninstall`+install = clean.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Convert quality-gate commands to Bob | A new converter | `convertClaudeCommandToBobCommand`/`...Skill` (vendored) | Already byte-tested for the core loop; reuse keeps install diff = PR diff |
| Enumerate + stage convertible artifacts | A Phase-5 staging loop | `stage.cjs` L239-266 (unchanged) | Roster-agnostic; auto-picks up new `commands/gsd/*.md` |
| Generate the support roster | Hand-written roster lines | `scripts/generate-support-roster.cjs` | Stale/silent roster hides a parity gap |
| Persist debug state across resets | A new state store | `.planning/debug/{slug}.md` (existing `debug.md`) | Plain markdown on disk, runtime-neutral, survives resets by construction |
| Degrade subagents to inline | Per-skill degrade code | `isolatedSubagents:false` in the `bob` declaration | Runtime selects sequential-inline; no per-skill code |
| Render text_mode prompts | Per-skill prompt rewriting | `workflow.text_mode:true` config + TRANS-03 seam | Already wired in Phase 2/3 |

**Key insight:** Every mechanism Phase 5 needs already exists and is tested. The phase is overwhelmingly *vendoring sources + writing verification + writing docs*, not building runtime code.

## Runtime State Inventory

> This is a port + audit phase, not a rename/refactor. The inventory below confirms the on-disk runtime state Phase 5 *verifies* (debug sessions) and what it must NOT touch.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `.planning/debug/{slug}.md` session files + `.planning/debug/resolved/` archive — created at runtime by `debug.md`, NOT in git today | None — the state-persistence TEST creates these in a scratch temp dir; never write to the tracked `.planning/` |
| Live service config | None — gsd-bob is a static artifact emitter; no external services hold quality-gate state | None |
| OS-registered state | None | None ("None — no daemons, schedulers, or OS registrations") |
| Secrets/env vars | `BOB_CONFIG_DIR` referenced in the `bob` descriptor `env` array (`capability-registry.cjs` L3056-3058) — code reference only, optional override; no secret | None (existing; not changed by Phase 5) |
| Build artifacts | `.cjs` is hand-written (no TS→CJS build for this repo); `commands/gsd/*.md` are committed sources, not generated | None — adding 5 new committed source files only |

**The canonical question** (what runtime state survives a source change): the only stateful surface is `.planning/debug/`, which is *created at runtime and intentionally not committed*. The Phase 5 test must use `mkdtempSync` scratch dirs and never write to the repo's tracked `.planning/` (the established hermetic rule — `core-loop-equivalence.test.cjs` L167-173).

## Common Pitfalls

### Pitfall 1: Assuming the quality-gate command sources are already vendored
**What goes wrong:** Planner assumes the installer already emits `gsd-code-review` etc. because the workflows are in the payload.
**Why it happens:** `gsd-core/workflows/{code-review,debug,audit-*}.md` ARE present, but those are *workflows* (staged wholesale, reached transitively). The *slash-command sources* under `commands/gsd/` are the conversion input, and only the 6 core-loop sources exist there `[VERIFIED: ls commands/gsd/]`.
**How to avoid:** First task must vendor the 5 quality-gate command sources into `commands/gsd/` (mirror commit `feat(04-01): vendor 6 core-loop command sources`).
**Warning signs:** A passing test that never asserts `commands/gsd-code-review.md` is emitted by the real entry.

### Pitfall 2: Bob silently ignores a description-less skill
**What goes wrong:** A converted SKILL.md without a non-empty `description` is silently skipped by Bob.
**Why it happens:** Bob reads only `name`+`description`; the converter must emit a non-empty description and strip `effort`/`allowed-tools`/`argument-hint` from skills.
**How to avoid:** Reuse the existing empty-description guard assertions (`core-loop-equivalence.test.cjs` L79-101) for the quality-gate commands.
**Warning signs:** Empty `description:` line in a converted SKILL.md.

### Pitfall 3: Debug state-persistence false positive ("starts but loses state on reset")
**What goes wrong:** Test asserts a session file is created but never verifies restore-after-reset.
**Why it happens:** It's the easy assertion; the hard one (D-05) is the reset→continue→restore round-trip.
**How to avoid:** The test MUST simulate a fresh invocation/new context and assert the Current Focus fields (`status`, `hypothesis`, `next_action`, Evidence/Eliminated counts) are restored verbatim from `.planning/debug/{slug}.md`.
**Warning signs:** No `continue <slug>` step in the test; no read-back assertion after a simulated reset.

### Pitfall 4: Mistaking sequential single-subagent for concurrent fan-out
**What goes wrong:** Flagging a quality gate as un-degradable because it "spawns subagents".
**Why it happens:** Spawning a subagent ≠ requiring *concurrent* subagent results. All three gates spawn ONE subagent at a time and wait for its return (the `ORCHESTRATOR RULE — ... Wait for the subagent to return` comments in every gate confirm this).
**How to avoid:** §Concurrency audit below — all degrade cleanly; expected outcome is NO new skip.
**Warning signs:** A `BOB_SKIP_LIST` entry added for `gsd-code-review`/`gsd-debug`/`gsd-audit-*`.

### Pitfall 5: Hand-listing supported skills in the README
**What goes wrong:** README skill list drifts from what actually installs.
**Why it happens:** Easier to type than to source from the roster.
**How to avoid:** Source the supported-skills list from `SUPPORT-ROSTER.md` (D-08, §specifics).
**Warning signs:** A skill in the README that isn't in the regenerated roster.

## Code Examples

### Confirming the real installer emits a quality-gate command + skill (e2e)
```javascript
// Source: test/core-loop-contract.test.cjs L67-94 [VERIFIED] — mirror for QUAL
const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
const target = path.join(scratch('tgt'), '.bob');
runEntry(['--bob', '--global', '-c', target], scratch('ws'));
assert.ok(fs.existsSync(path.join(target, 'commands', 'gsd-code-review.md')));
assert.ok(fs.existsSync(path.join(target, 'skills', 'gsd-code-review', 'SKILL.md')));
// audit-fix / audit-uat workflows staged wholesale, NOT as commands:
assert.ok(fs.existsSync(path.join(target, 'gsd-core', 'workflows', 'audit-fix.md')));
```

### Roster-vs-capability-map assertion (QUAL-03)
```javascript
// Source: src/bob-adapter.cjs gateArtifact/buildSupportRoster [VERIFIED]
const adapter = require(path.join(repoRoot, 'src', 'bob-adapter.cjs'));
const decl = { isolatedSubagents: false, structuredPrompts: false };
// Each quality-gate candidate degrades cleanly → supported → no roster line.
for (const name of ['gsd-code-review','gsd-debug','gsd-audit-fix','gsd-audit-uat']) {
  assert.equal(adapter.gateArtifact({ name, requires: [] }, decl).supported, true);
}
// Every line that DOES appear must end in a PRIMITIVE_REASONS-traceable reason.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rewrite skills per runtime | Port-by-conversion through the descriptor/converter | Phase 4 D-01 | Install diff = upstream PR diff (UP-01 "move, not rewrite") |
| `gsd:<cmd>` colon command dialect | `gsd-<cmd>` hyphen form | gsd-core #2808 / #3042 | Converter translates `gsd:` → `gsd-` on emission |
| Per-skill degradation code | Capability declaration drives runtime selection | Phase 2 | `isolatedSubagents:false` + `text_mode:true`; no per-skill code |

**Deprecated/outdated:**
- Legacy `gsd:<cmd>` form — only the hyphen form is routable under Bob.
- `--clean`/`--update` flags — never existed; re-run = update, `--uninstall`+install = clean.

## Detailed Findings (researcher confirm-items)

### 1. Transitive artifact enumeration (D-01 confirm-item) — VERIFIED

**Conversion source of truth for slash commands:** `repoRoot/commands/gsd/<name>.md` (enumerated by `stage.cjs` L239-266). Currently holds ONLY the 6 core-loop sources `[VERIFIED: ls]`. The 5 quality-gate sources must be added.

**Workflows (staged wholesale from the vendored payload, `stage.cjs` L217-222):**
| Workflow file | In vendored `gsd-core/workflows/`? | Spawns (sequential, one-at-a-time) |
|---|---|---|
| `code-review.md` (696 lines) | ✓ present | `gsd-code-reviewer` (L485); dispatches `code-review-fix.md` when `--fix` |
| `code-review-fix.md` | ✓ present | `gsd-code-fixer` (L197, L314); re-review via `gsd-code-reviewer` (L280) |
| `debug.md` (237 lines) | ✓ present | `gsd-debug-session-manager` (L132, L215) → internally `gsd-debugger` |
| `audit-fix.md` | ✓ present | `gsd-executor` (L101), one scoped fix at a time |
| `audit-uat.md` | ✓ present | **NO subagent spawn** — inline Grep/Read analysis only `[VERIFIED]` |

**Agent prompts** (`gsd-code-reviewer`, `gsd-code-fixer`, `gsd-debug-session-manager`, `gsd-debugger`, `gsd-executor`): **NOT in the vendored payload** `[VERIFIED: find gsd-core -iname ...]`. There is no `agents/` dir in `gsd-core/` and none at repo root. They are resolved at runtime by the host via `gsd_run query agent-skills <name>` (`gsd-tools.cjs` L1097) — NOT converted as Bob artifacts. Under Bob (`isolatedSubagents:false`) the spawn collapses to inline execution by the single agent.
- Supporting `references/` present: `executor-examples.md`, `debugger-philosophy.md`, `common-bug-patterns.md`, `agent-contracts.md`, `checkpoints.md`, `continuation-format.md` — all staged wholesale `[VERIFIED]`.
- Templates present: `DEBUG.md`, `UAT.md`, etc. — staged wholesale `[VERIFIED: ls gsd-core/templates]`.

**Conclusion:** The conversion source-of-truth for the planner: vendor the 5 command sources into `commands/gsd/`; the workflows + references + templates they transitively load are ALREADY in the staged payload; the agent prompts are runtime-resolved, not converted.

### 2. Concurrency-dependency audit (D-03 confirm-item) — VERIFIED, NO concurrency

Every gate uses single-subagent, wait-for-return delegation — none depends on *concurrent* subagent results:
- `code-review`: spawns `gsd-code-reviewer`, then the `ORCHESTRATOR RULE` (L506) says "Wait for the subagent to return its result" before proceeding. `--fix` dispatches `code-review-fix` *after* review returns.
- `code-review-fix`: spawns `gsd-code-fixer` (L197), waits (L215); `--auto` loop is iterative (capped at 3), each iteration sequential.
- `debug`: spawns `gsd-debug-session-manager` (L132/L215); the manager runs the checkpoint loop in one context; `gsd-debugger` is invoked internally one hypothesis at a time.
- `audit-fix`: "Auto-fixable findings processed **sequentially** until --max reached" (L171); one `gsd-executor` spawn per fix, waits (L105).
- `audit-uat`: no subagent at all.

**Flagged-for-concurrency: NONE.** All degrade cleanly to sequential-inline with identical output (D-02/D-03 expectation confirmed). No quality-gate entry should be added to `BOB_SKIP_LIST`.

### 3. Roster generation scope (D-06 confirm-item) — GAP IDENTIFIED

`scripts/generate-support-roster.cjs` currently uses a **hard-coded Phase-2 representative candidate set** (L29-37): `gsd-help`, `gsd-plan-phase`, `gsd-execute-phase`, `gsd-autonomous`, `gsd-parallel-fanout` — NOT the full quality-gate set. The script comment explicitly says "Full-roster generation across every GSD skill rides with Phases 4-5" (L10-12, L28).

**What must change (Claude's discretion on exact form):** The roster generator's candidate set should be extended so it enumerates the actual emitted set — ideally derived from `commands/gsd/*.md` (the same source the installer iterates), so any genuine quality-gate skip surfaces. The installer's own `stage.cjs` `renderRoster()` (L225) is the runtime authority; the standalone script should match it. Each emitted line's reason already traces to a `PRIMITIVE_REASONS` key (`isolatedSubagents`, `structuredPrompts`) or a `BOB_SKIP_LIST` entry (`bob-adapter.cjs` L173-188). Expected result after the change: the quality-gate candidates appear under **Supported** (all degrade cleanly), and no new `unsupported on Bob:` line is added. The roster-vs-capmap TEST (D-09.3) asserts: (a) every skip line's reason traces to a capability-map primitive, and (b) no supported quality-gate artifact is missing.

### 4. Debug state-persistence mechanics (QUAL-02 / D-04/D-05) — VERIFIED

From `gsd-core/workflows/debug.md` `[VERIFIED]`:
- **Session file:** `.planning/debug/{SLUG}.md` created before delegation (Step 3, L183), with frontmatter `status`/`trigger`/`created`/`updated` and a `Current Focus` block (`hypothesis`, `test`, `expecting`, `next_action`, `reasoning_checkpoint`, `tdd_checkpoint`), plus `Evidence` and `Eliminated` sections.
- **Resume seam:** `/gsd-debug continue <slug>` (Step 1c, L84-138) — checks `.planning/debug/{SLUG}.md` exists, reads it back, prints the Current Focus, then delegates with `symptoms_prefilled: true`. "The existing file IS the context" (L102).
- **Archive:** resolved sessions under `.planning/debug/resolved/` (status subcommand checks both, L70).
- **Slug sanitization (appears in 3 places — list L39, status L68, continue L87):** strip whitespace, must match `^[a-z0-9][a-z0-9-]*$`, max 30 chars, reject `..`/`/`/`\`.

**The state-persistence test (D-05) must assert (in a scratch temp dir):**
1. start → `.planning/debug/{slug}.md` written with `status: investigating`, `trigger` = verbatim input, the gathered symptoms, and `Current Focus.next_action`.
2. simulate reset → fresh invocation / new context (no in-memory carryover).
3. `continue <slug>` → read the file back.
4. assert restored: `status`, `hypothesis`, `next_action`, Evidence count, Eliminated count match what was written — proving state survives the reset *from disk*, not memory.
5. slug-sanitization edge cases: a `../`-bearing or >30-char slug is rejected.

Backend-agnostic: the test exercises plain markdown file read/write under Node — the standing proxy for the Bob run.

### 5. UP-01 upstream inventory — VERIFIED (the 5 artifacts)

| # | Artifact | File:line | Role in the "move" |
|---|----------|-----------|---------------------|
| 1 | `"bob"` registry entry | `gsd-core/bin/lib/capability-registry.cjs` L3045-3109 | The runtime descriptor: `configHome` `dot-home` `.bob` + `BOB_CONFIG_DIR` env (L3053-3059), `artifactLayout` global+local with the 2 converters (L3061-3098), `commandStyle: slash-hyphen` (L3099) |
| 2 | Command converter | `convertClaudeCommandToBobCommand` (named in registry L3077/L3095; impl in `gsd-core/bin/lib/runtime-artifact-conversion.cjs`) | Claude command → `.bob/commands/gsd-<x>.md` |
| 3 | Skill converter | `convertClaudeCommandToBobSkill` (registry L3069/L3087; same conversion lib) | Claude command → `.bob/skills/gsd-<x>/SKILL.md` |
| 4 | Runtime alias | `gsd-core/bin/shared/runtime-aliases.manifest.json` L79-82 (`"bob": ["bob","bob-cli"]`) | CLI flag/alias routing for `--bob` |
| 5 | configHome / shim resolution | `gsd-core/bin/lib/runtime-homes.cjs` generic `dot-home` case L83-91 + `gsd-tools.cjs` shim (resolves generically, **no bob-specific branch needed** — the `.bob` shim path is in every workflow's init block) | Resolves the `bob` home so `gsd_run query` works |

Plus the **single net-new substance module** `src/bob-adapter.cjs` (the gate + custom-mode merge) — the one isolated Bob-specific component (D-07). Note artifacts 2/3 are gsd-core's *generic* converters parameterized by the registry entry; the truly net-new code is the registry entry (1), the alias (4), and `bob-adapter.cjs`.

- `gsd-core/VERSION` = **`1.5.0`** `[VERIFIED: cat]` — matches CLAUDE.md "latest 1.5.0". Record this in README + UPSTREAM.md.
- `test/backend-neutrality.test.cjs` scopes its grep to: (a) the `"bob": { ... }` block extracted by brace-walking from `capability-registry.cjs` (L52-72), and (b) `bob-adapter.cjs` (L92-107). It strips comment lines and the `convert...CommandToBob...` converter-name token (a source-format prefix, not a backend ref) before matching the base64-decoded `[Claude,Gemini,Granite,GPT]` set (L41-49, L26-28). Already green `[VERIFIED: structure]`.

### 6. Existing test patterns — VERIFIED

- **`test/_helpers/vendor.cjs`:** exports `repoRoot`, `vendorLib`, `requireVendor(file)` — every test requires vendored modules through this so it exercises the project's `gsd-core/` copy (with the `bob` entry), never the global install.
- **`test/core-loop-equivalence.test.cjs`:** the golden-diff template. Per-command byte-identity vs `test/fixtures/core-loop/<stem>.command.expected.md` + `.skill.expected.md`; empty-description guard; neutralization (no Claude config-home path, no colon dialect — tokens built programmatically); D-05 real-answer guard (sentinel + no `TODO/placeholder/{{`); scratch writes to `mkdtempSync` only.
- **`test/core-loop-contract.test.cjs`:** the e2e/structural template. Drives the REAL entry (`bin/gsd-bob.cjs`) via `execFileSync` against a scratch `.bob`; asserts emitted commands+skills, workflows staged (not as commands), PLAN/PROJECT structural markers, atomic-commit shape `/^\w+\(\d+-\d+\)/`.
- **Fixture layout:** `test/fixtures/core-loop/` holds `*.command.expected.md`, `*.skill.expected.md`, `PROJECT.golden.md`. Mirror with `test/fixtures/quality-gates/`.
- **Hermetic rule:** all scratch writes to `mkdtempSync(os.tmpdir(), ...)`; never the tracked `.planning/`.

### 7. Acceptance checklist — VERIFIED

`.planning/ACCEPTANCE-CHECKLIST.md` highest existing AC-ID = **AC-21** (CORE-05, progress + root-anchoring) `[VERIFIED: grep]`. Phase 5 appends from **AC-22**. Schema per entry:
```
## AC-NN — <one-line title> (<REQ-ID>)

Cmd:    On a real Bob machine, AFTER <prior AC>, run ... <mutating step>; then read-only confirm ...
Expect: <exact expected outputs / file existence / grep counts>
Confirms: <REQ-ID> — <restated success criterion> / SC#N. (on-device complement to test/<file>)
Result: [ ] pass  [ ] fail
```
Suggested (discretion): AC-22 code-review (+`--fix`), AC-23 debug + `continue` resume, AC-24 audit-fix, AC-25 audit-uat, AC-26 README/upstream-readiness doc checks. Mirror the AC-17..AC-21 phrasing (mutating `/gsd-*` step + read-only `ls`/`grep` confirms).

### 8. README / upstream conventions — VERIFIED

- **No `README.md` exists today** `[VERIFIED: ls]` — net-new file (D-08).
- gsd-core's own `gsd-core/templates/README.md` is an artifact-registry index (not a package README) — useful as a tone reference: clear tables, authoritative, no marketing fluff `[VERIFIED: head]`.
- README required-content floor (D-08): one-line `npx` install; scope (local `.bob/` vs global `~/.bob/`); modes (re-run = update, `--uninstall`+install = clean — NO invented flags); supported skills (sourced from `SUPPORT-ROSTER.md`); flagged gaps (`unsupported on Bob:` reasons); targeted gsd-core version `1.5.0`; test-deferred / no-local-Bob posture; pointer to `.planning/ACCEPTANCE-CHECKLIST.md`.
- 5-artifact inventory (UP-01) → a `UPSTREAM.md` or a README section (discretion); use the §5 table above with file:line pointers.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (none) | — | All claims verified against the live codebase (file reads + greps) or copied verbatim from locked CONTEXT.md. No `[ASSUMED]` claims. |

**All claims in this research were verified against the codebase — no user confirmation needed.**

## Open Questions (RESOLVED)

1. **Roster generator candidate-set form.**
   - What we know: the script (`generate-support-roster.cjs`) uses a hard-coded Phase-2 subset; the installer's `renderRoster()` is the runtime authority.
   - What's unclear: whether the planner derives the candidate set from `commands/gsd/*.md` (cleanest, matches the installer) or hard-codes the quality-gate names.
   - Recommendation: derive from `commands/gsd/*.md` so the standalone script and the installer agree and the list can't drift. Within D-06 + Claude's discretion.
   - **RESOLVED:** Plan 05-01 Task 2 derives the candidate set from `commands/gsd/*.md`.

2. **UPSTREAM.md vs README section for the 5-artifact inventory.**
   - What we know: CONTEXT.md D-08/discretion explicitly allows either.
   - Recommendation: a dedicated `UPSTREAM.md` keeps the README user-facing and the PR-scoping doc maintainer-facing; either is acceptable.
   - **RESOLVED:** Plan 05-03 uses a dedicated `UPSTREAM.md`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Tests + installer | ✓ | `>=22.15.0` (engines) | — |
| `node:test` / `node:assert` | All verification suites | ✓ | built-in | — |
| `git` | Atomic-commit contract test (if mirrored) | ✓ | system | — |
| Live IBM Bob | On-device run (Phase 6) | ✗ | — | Claude/Node runtime equivalence proxy (D-09); on-device run deferred to Phase 6 via AC steps |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** live Bob — by design test-deferred; the Claude/Node runtime is the standing equivalence proxy, AC-22..AC-26 capture the deferred on-device verification.

## Sources

### Primary (HIGH confidence — read directly this session)
- `src/bob-adapter.cjs` — `gateArtifact`, `buildSupportRoster`, `BOB_SKIP_LIST`, `PRIMITIVE_REASONS`, `UNSUPPORTED_MARKER`, `emitGsdMode`, `mergeCustomModes`.
- `src/installer/stage.cjs` — payload copy (L217-222), convertible loop (L239-266), roster regen (L225), orphan sweep.
- `scripts/generate-support-roster.cjs` — representative-set scope (L25-42).
- `gsd-core/workflows/{code-review,code-review-fix,debug,audit-fix,audit-uat}.md` — agent spawns, sequential ORCHESTRATOR RULE, debug session model.
- `gsd-core/bin/lib/capability-registry.cjs` — `"bob"` entry L3045-3109.
- `gsd-core/bin/shared/runtime-aliases.manifest.json` — bob aliases L79-82.
- `gsd-core/bin/lib/runtime-homes.cjs` — `dot-home` case L83-91.
- `gsd-core/VERSION` — `1.5.0`.
- `test/{backend-neutrality,core-loop-equivalence,core-loop-contract}.test.cjs`, `test/_helpers/vendor.cjs`.
- `.planning/ACCEPTANCE-CHECKLIST.md` (AC-21 highest), `.planning/config.json` (`nyquist_validation:false`, `text_mode:true`).
- `package.json`, `commands/gsd/` listing, `SUPPORT-ROSTER.md`.

### Secondary / Tertiary
- None — no web research required (test-deferred port within locked scope).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; verified against `package.json` + `test/`.
- Architecture / port mechanism: HIGH — verified `stage.cjs` convertible loop + bob registry entry + core-loop precedent commit.
- Concurrency audit: HIGH — read all 5 workflow files; ORCHESTRATOR RULE confirms sequential.
- Debug state model: HIGH — read `debug.md` end to end.
- UP-01 inventory: HIGH — file:line pointers verified.
- Pitfalls: HIGH — derived from existing tests + locked decisions.

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable — vendored payload pinned at gsd-core 1.5.0; no fast-moving external deps)

> **Validation Architecture section omitted:** `.planning/config.json` has `workflow.nyquist_validation: false` `[VERIFIED]`.
> **Security Domain section omitted:** no `security_enforcement` config and this is a static artifact-emitter port with no auth/crypto/network surface; the only relevant control (debug slug sanitization against `..`/`/`/`\` path traversal) is already implemented in `debug.md` and asserted by the state-persistence test (Pitfall 3 / Finding 4 step 5).
