# Phase 4: Core-Loop Port - Research

**Researched:** 2026-06-19
**Domain:** GSD→Bob artifact conversion (port-by-conversion), sequential-inline + text_mode degradation, hermetic equivalence/golden/structural verification (no live Bob)
**Confidence:** HIGH (everything is grounded in repo files cited by path:line; no external dependencies)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 Port-by-conversion.** Core-loop commands/skills/workflows/agents are emitted through the **existing** `bob` converter (Phase 2) from the vendored gsd-core payload. gsd-bob hand-rewrites NOTHING. Phase 4 deliverable = (a) confirm core-loop artifacts + transitive deps are present in the vendored payload and enumerated by the `bob` runtime; (b) ensure they convert + gate correctly; (c) build equivalence/golden verification; (d) append device-runnable AC steps. **Researcher confirm-item resolved below (Q1).**
- **D-02 Sequential-inline lower bound (SPIKE-01).** No isolated subagents → the single Bob agent performs each delegated step inline, sequentially, in the orchestrator's specified order. `isolatedSubagents:false` is already advertised in the bob capability entry. Same artifacts, slower wall-clock.
- **D-03 Gate, don't break.** A core-loop artifact joins `BOB_SKIP_LIST`/`SUPPORT-ROSTER.md` ONLY if it hard-depends on isolation+completion-signals that cannot be expressed inline. Expectation: all five degrade cleanly, none skip. **Researcher confirm-item resolved below (Q2).**
- **D-04 Reuse the TRANS-03 text_mode seam (Phase 2); no new degradation code.** Installer writes `workflow.text_mode:true` to root `.planning/config.json` (Phase 3 D-13); the `bob` descriptor forces it.
- **D-05 CORE-01 "real validated answers, not placeholders" is a verification obligation.** The equivalence test MUST thread ACTUAL answers through the text_mode flow and assert they land in PROJECT.md/REQUIREMENTS.md/ROADMAP.md — the guard against a structurally-valid-but-empty false-positive.
- **D-06 Three complementary checks, all Claude/Node-runtime, no live Bob:** (1) equivalence + golden diff, (2) artifact-contract structural tests (`node:test`), (3) root-anchoring assertion.
- **D-07 Root-anchoring (CORE-05):** exactly one `.planning/` at workspace root adjacent to `.bob/`, no nested second `.planning/` under the scope dir.
- **D-08 Append device-runnable AC steps** to `.planning/ACCEPTANCE-CHECKLIST.md` per Phase 1 D-07 (`AC-NN` + `Cmd/Expect/Confirms/Result`), one per core-loop SC, continuing from the highest existing AC-ID.

### Claude's Discretion
- Fixture project shape and how the golden `.planning/` reference tree is frozen/stored.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11 / Phase 3 D-15).
- Exact AC-ID numbering continuation and per-command checklist copy.
- Whether equivalence is asserted per-command or as one end-to-end loop run (or both).

### Deferred Ideas (OUT OF SCOPE)
- Worktree-isolated / concurrent execution of the core loop (v2 PAR-01; Phase 6 watch-list only).
- Quality-gate skills (`code-review`, `debug`, `audit`) — Phase 5.
- Lifecycle / phase-shaping / autonomy clusters — v2 (LIFE-01/SHAPE-01/AUTO-01).
- Rich Bob-native re-modeling of subagents/prompts (modes/agents) — v2 NATIVE-01.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | `new-project` produces PROJECT.md→REQUIREMENTS.md→ROADMAP.md natively in Bob | Q1 conversion source resolved; Q3 equivalence harness threads real text_mode answers (D-05 guard); new-project transitive set enumerated (Q2) — degrades cleanly |
| CORE-02 | `plan-phase` (+ transitive `discuss-phase`) produces PLAN.md natively in Bob | Q2 transitive set (researcher→pattern-mapper→planner→plan-checker) — all sequential-degradable; structural contract test against PLAN.md sections |
| CORE-03 | `execute-phase` (+ `execute-plan`) executes with atomic commits under sequential-inline | Q2: wave fan-out collapses to sequential waves; atomic-commit protocol lives in `agents/gsd-executor.md` `<task_commit_protocol>` — runtime-resolved, not file-loaded; commit assertion pattern in Q3 |
| CORE-04 | `verify` (`verify-work`/`verify-phase`) runs against phase goals natively in Bob | Q2: verify-work uses plan-checker/planner subagents (degradable); verify-phase has NO subagent refs (pure inline) |
| CORE-05 | `progress` reports status and advances; `.planning/` root-anchored next to `.bob/`, no nested second | Q5 root-anchoring assertion; bob declares no `.planning/` artifactLayout target (already proven in `planning-bytecompat.test.cjs`) |
</phase_requirements>

## Summary

Phase 4 is a **port-by-conversion verification phase**, not a build. The Bob emitter (`src/bob-adapter.cjs`), the gate (`gateArtifact`/`BOB_SKIP_LIST`/`buildSupportRoster`), the gsd-core Bob converters (`convertClaudeCommandToBobSkill`/`convertClaudeCommandToBobCommand` in `runtime-artifact-conversion.cjs`), and the roster-agnostic installer (`src/installer/`) are ALL already built. Phase 4 wires the five core-loop commands through them, proves equivalence/golden/structural correctness in the Claude/Node runtime, asserts root-anchoring, and appends five device-runnable AC steps.

**The #1 unknown (D-01 confirm-item) is now resolved (Q1).** There are **two distinct conversion machineries** in this repo and they source from different places:
1. **gsd-core's own install-time converters** (`runtime-artifact-conversion.cjs` lines 698–778) consume **Claude command/skill `.md` source files** (a `commands/gsd/*.md` directory) and emit `.bob/skills/<name>/SKILL.md` + `.bob/commands/<name>.md`. These are referenced by the `bob` capability entry's `artifactLayout` converters.
2. **gsd-bob's installer** (`src/installer/stage.cjs`) currently stages ONLY the vendored `gsd-core/` payload (workflows/contexts/references/templates/bin) + `custom_modes.yaml` + `SUPPORT-ROSTER.md`. Its convertible-artifact loop (stage.cjs:227–243) sources from `repoRoot/commands/gsd/` — **which does not exist in the repo** (stage.cjs:228–230 explicitly: "v1 vendors NO commands/gsd/ source"). So **today the installer emits ZERO `.bob/commands` or `.bob/skills`.**

**Therefore the load-bearing gap Phase 4 must close is: vendor the core-loop slash-command source files (`commands/gsd/{new-project,plan-phase,discuss-phase,execute-phase,execute-plan,verify-work,verify-phase,progress}.md`) under the gsd-bob package root so the already-built convertible loop picks them up and emits Bob artifacts.** The converters and gate need no changes; the missing input is the only blocker. (Alternatively the converters can be driven directly in the equivalence test against the same source — see Q3.)

The good news for D-02/D-04: **text_mode degradation is already baked into the gsd-core workflows themselves** — they read `text_mode` from the init JSON config and branch (`execute-phase.md:160`, `plan-phase.md:380/462/1474/1533`). The bob installer writes `text_mode:true` (Phase 3). No per-skill degradation code is needed. **Sequential-inline degradation is automatic too:** subagents are invoked via `Agent(subagent_type="…")` and agent prompts are resolved by the *host runtime's* agent registry, not loaded from a file path the workflow embeds — so under Bob the single agent simply executes those steps inline.

**Primary recommendation:** Vendor the eight core-loop `commands/gsd/*.md` source files into the gsd-bob package; confirm they + their 23 `@`-referenced refs/templates (all already present) + the agent roles convert and gate clean; build three hermetic `node:test` suites (equivalence-with-real-answers, structural-contract, root-anchoring) mirroring `test/installer/install-clean.test.cjs` (scratch-tmpdir + `execFileSync`) and `test/planning-bytecompat.test.cjs` (`requireVendor` golden diff); append AC-17..AC-21.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Enumerate core-loop transitive deps | Research/Plan (this phase) | — | Pure analysis of vendored payload; no runtime code |
| Convert Claude cmd/skill → Bob artifacts | gsd-core converters (`runtime-artifact-conversion.cjs`) | — | Already built; reused verbatim |
| Gate un-degradable artifacts → roster | `src/bob-adapter.cjs` `gateArtifact` | `BOB_SKIP_LIST` | Already built; Phase 4 only *adds* a skip entry if a command proves un-degradable |
| Stage emitted artifacts to `.bob/` | `src/installer/stage.cjs` | — | Roster-agnostic; auto-picks `repoRoot/commands/gsd/` once vendored |
| text_mode prompt degradation | gsd-core workflow bodies (config-driven `TEXT_MODE` branch) | installer config-merge (`text_mode:true`) | Built into workflows + Phase 3 installer; no new code |
| Sequential-inline subagent degradation | Host runtime (Bob) + workflow order | — | `Agent(subagent_type=)` resolved by runtime; no isolation contract in workflow body |
| Equivalence/golden/structural verification | gsd-bob `test/` (`node:test`) | `test/fixtures/`, `test/_helpers/vendor.cjs` | New test suites — the actual Phase 4 dev deliverable |
| Root-anchoring assertion (CORE-05) | gsd-bob `test/` | bob `artifactLayout` (no `.planning/` target) | Structural invariant; partially proven in `planning-bytecompat.test.cjs` |
| Device-runnable AC steps | `.planning/ACCEPTANCE-CHECKLIST.md` | — | Append-only; Phase 6 runs them |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node ≥22.15 builtin | All Phase 4 verification suites | `package.json` `test` script is `node --test "test/**/*.test.cjs"` [VERIFIED: package.json] — zero-dep, matches Phase 2/3 |
| `node:assert/strict` | builtin | Assertions | Used by every existing suite [VERIFIED: test/*.test.cjs] |
| `node:fs` / `node:path` / `node:os` | builtin | Scratch tmpdirs, file reads, golden trees | Dependency discipline (CLAUDE.md: "node:fs built-ins only") [VERIFIED: src/installer/stage.cjs:24-25] |
| `node:child_process` (`execFileSync`) | builtin | Drive the real installer entry end-to-end | Pattern in `test/installer/install-clean.test.cjs:22,33` [VERIFIED] |
| `runtime-artifact-conversion.cjs` (vendored) | gsd-core 1.5.0 | The Bob converters under test | `requireVendor('runtime-artifact-conversion.cjs')` [VERIFIED: test/command-golden.test.cjs:10] |
| `src/bob-adapter.cjs` | repo | gate / roster / mode merge | Already built [VERIFIED] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-yaml` | 4.1.0 | Only inside `bob-adapter.cjs` for `custom_modes.yaml` | NOT needed for Phase 4's core-loop work; do not introduce elsewhere [VERIFIED: package.json deps, bob-adapter.cjs:19] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vendoring `commands/gsd/*.md` source + reusing converters | Hand-writing 8 `.bob/skills`/`.bob/commands` files | Violates D-01 (port-by-conversion, not rewrite) and UP-01 (move-not-rewrite); install diff would diverge from the upstream PR diff. **Rejected.** |
| Driving converters in-test against the same source | Snapshotting `.bob/` only via the installer | Both are valid; doing both (unit converter golden + e2e installer) mirrors `command-golden.test.cjs` + `install-clean.test.cjs`. **Recommended: both.** |

**Installation:** No new packages. `npm test` runs everything. [VERIFIED: package.json]

## Package Legitimacy Audit

> Phase 4 installs **no external packages**. No npm/PyPI/crates dependency is added. The only runtime dep (`js-yaml@4.1.0`) was vetted in Phase 2 and is untouched here.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| *(none added)* | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       ┌─────────────────────────────────────────────────┐
                       │  gsd-bob PACKAGE ROOT (repoRoot)                  │
                       │                                                   │
  CORE-LOOP SOURCE ──► │  commands/gsd/*.md   ◄── GAP: not yet vendored   │
  (8 Claude cmd .md)   │   (new-project, plan-phase, discuss-phase,        │
                       │    execute-phase, execute-plan, verify-work,      │
                       │    verify-phase, progress)                        │
                       │            │                                      │
                       │  gsd-core/ (VENDORED payload — already present)   │
                       │   ├ workflows/*.md  (the loaded workflow bodies)  │
                       │   ├ references/*.md  (23 @-refs, ALL present)     │
                       │   ├ templates/*.md  (UAT/summary/report present)  │
                       │   └ bin/lib/runtime-artifact-conversion.cjs       │
                       │            │  (convertClaudeCommandToBob{Skill,    │
                       │            │   Command})                           │
                       └────────────┼──────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                         │
        ▼ (install path)                                          ▼ (test path)
  src/installer/stage.cjs                              test/*.test.cjs (node:test)
   convertibleSrc = repoRoot/commands/gsd              requireVendor(conversion)
        │  for each .md:                                + execFileSync(bin/gsd-bob.cjs)
        │  gateArtifact(candidate, BOB_DECL) ──┐
        │      supported? ──► stageFile()      │ unsupported ──► SUPPORT-ROSTER.md
        ▼                                      ▼
  .bob/commands/<name>.md                 (gsd-autonomous only, today)
  .bob/skills/<name>/SKILL.md
        │
        ▼  (Bob runtime, sequential-inline + text_mode)
  /gsd-* command  ──► loads workflow body ──► Agent(subagent_type=…) steps
        │                                      run INLINE (no isolation)
        │              AskUserQuestion ──► TEXT_MODE branch (config-driven)
        ▼
  .planning/  (root-anchored, byte-compatible with a Claude run)
   PROJECT.md → REQUIREMENTS.md → ROADMAP.md / PLAN.md / STATE.md / config.json
```

### Recommended Project Structure (additions only)
```
commands/
└── gsd/                          # NEW (Phase 4): vendored core-loop slash-command source
    ├── new-project.md            #   (Claude cmd .md → converter input)
    ├── plan-phase.md
    ├── discuss-phase.md
    ├── execute-phase.md
    ├── execute-plan.md
    ├── verify-work.md
    ├── verify-phase.md
    └── progress.md
test/
├── core-loop-equivalence.test.cjs   # NEW: golden diff + real-answer guard (D-05/D-06.1)
├── core-loop-contract.test.cjs      # NEW: PLAN.md/PROJECT.md section/frontmatter + atomic commit (D-06.2)
├── core-loop-root-anchor.test.cjs   # NEW: single .planning/ next to .bob/, no nesting (D-07/CORE-05)
└── fixtures/
    └── core-loop/                   # NEW: frozen golden .planning/ reference tree + sample project
```

### Pattern 1: Vendored-converter golden diff (unit)
**What:** Require the vendored converter, run it on the real core-loop source, byte-compare to a frozen `expected` fixture.
**When to use:** Per-command conversion correctness (CORE-01/02/04 artifact shape).
**Example:**
```javascript
// Source: test/command-golden.test.cjs:10-23 (pattern verbatim)
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');
const conv = requireVendor('runtime-artifact-conversion.cjs');
const input = fs.readFileSync(path.join(repoRoot, 'commands/gsd/plan-phase.md'), 'utf8');
const expected = fs.readFileSync(path.join(fixDir, 'plan-phase.expected.md'), 'utf8');
test('plan-phase converts to a byte-identical Bob command', () => {
  assert.equal(conv.convertClaudeCommandToBobCommand(input, 'gsd-plan-phase'), expected);
});
```

### Pattern 2: Scratch-tmpdir end-to-end install (integration)
**What:** Drive the real `bin/gsd-bob.cjs` entry via `execFileSync` from a scratch cwd, read back `.bob/`.
**When to use:** Prove the installer emits the core-loop `.bob/commands`/`.bob/skills` once `commands/gsd/` is vendored.
**Example:**
```javascript
// Source: test/installer/install-clean.test.cjs:22-62 (pattern verbatim)
const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
const target = path.join(scratch('tgt'), '.bob');
const cwd = scratch('ws');
execFileSync(process.execPath, [ENTRY, '--bob', '--global', '-c', target], { cwd, encoding: 'utf8' });
assert.ok(fs.existsSync(path.join(target, 'commands', 'gsd-plan-phase.md')));
```

### Pattern 3: Runtime-agnostic golden diff (equivalence)
**What:** Resolve bob vs claude config home from the descriptor, drive the SAME runtime-agnostic write path, assert byte-identity; assert the config home leaks nowhere into the artifact body.
**When to use:** RUNTIME-03 byte-compat is the equivalence proxy for the Bob run (no live Bob).
**Example:** `test/planning-bytecompat.test.cjs:52-79` — `resolveConfigHomeFromDescriptor` + `stateReplaceField`, then `assert.equal(bobBytes, claudeBytes)` and `assert.ok(!bobBytes.includes('.bob'))`.

### Anti-Patterns to Avoid
- **Hand-writing `.bob/skills`/`.bob/commands` for the core loop** — violates D-01/UP-01. Vendor the source; let the built converter emit. [CITED: CONTEXT.md D-01]
- **Adding per-skill text_mode/sequential degradation code** — the workflows already branch on `text_mode` (config-driven); subagent inlining is a runtime property. [VERIFIED: execute-phase.md:160]
- **Editing the converters or the gate** — they are proven by `command-golden`/`skill-golden`/`unsupported-gate` tests; Phase 4 only *consumes* them. [VERIFIED: test/]
- **Asserting wall-clock or parallelism** — the contract is output equivalence, not speed (D-02). [CITED: CONTEXT.md D-02]
- **Letting the equivalence test pass on placeholder artifacts** — D-05's explicit false-positive trap; assert the threaded answer strings appear in the output. [CITED: CONTEXT.md D-05]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude cmd → Bob skill/command | A new converter | `convertClaudeCommandToBob{Skill,Command}` | Already built + golden-tested [VERIFIED: runtime-artifact-conversion.cjs:735,763] |
| Decide if an artifact is supported | Inline allow/deny logic in stage | `gateArtifact(candidate, decl)` | Single authority; stage.cjs already delegates [VERIFIED: stage.cjs:236] |
| Emit the support roster | Hand-maintained list | `buildSupportRoster` / `scripts/generate-support-roster.cjs` | Generated from the gate, never hand-edited (T-02-10) [VERIFIED] |
| text_mode prompt rendering | New degradation pass | gsd-core workflow `TEXT_MODE` branch + installer `text_mode:true` | Built into workflows [VERIFIED: plan-phase.md:380] + Phase 3 config-merge |
| Resolve the bob config home | Path math | `getGlobalConfigDir('bob',…)` / `resolveConfigHomeFromDescriptor` | Descriptor-driven [VERIFIED: scope.cjs:34, planning-bytecompat.test.cjs:30] |
| Scratch-install harness | Bespoke fs orchestration | `execFileSync(ENTRY,…)` + `mkdtempSync` | Pattern proven [VERIFIED: install-clean.test.cjs] |

**Key insight:** Phase 4 writes almost no production code — its substance is (a) vendoring 8 source files and (b) writing 3 test suites + AC steps. Every conversion/gating/staging primitive already exists and is tested.

## Runtime State Inventory

> Phase 4 is **greenfield test/vendoring work**, not a rename/refactor of runtime state. No stored data, live service config, OS-registered state, secrets, or build artifacts are renamed or migrated.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 4 adds source files + tests; no datastore keys change | none |
| Live service config | None — no external service touched | none |
| OS-registered state | None | none |
| Secrets/env vars | None — equivalence test may set `BOB_CONFIG_DIR`/`CLAUDE_CONFIG_DIR` to temp dirs at runtime only (no persisted key) | none |
| Build artifacts | None — no compiled output; `.cjs` is hand-written | none |

**Verified by:** repo scan — Phase 4 deliverables are `commands/gsd/*.md` (new source), `test/core-loop-*.test.cjs` (new), and AC append. No existing runtime identifier is renamed.

## Common Pitfalls

### Pitfall 1: Assuming the installer already emits core-loop `.bob/` artifacts
**What goes wrong:** Planning a test that greps `.bob/commands/gsd-plan-phase.md` after install — it will be ABSENT.
**Why it happens:** `stage.cjs:227-243` sources convertibles from `repoRoot/commands/gsd/`, guarded by `existsSync`; that dir does not exist, so the loop is a no-op (stage.cjs:228-230 documents "v1 vendors NO commands/gsd/ source"). [VERIFIED: stage.cjs:231]
**How to avoid:** The first plan task must **vendor `commands/gsd/*.md`** (the 8 core-loop sources). Then the existing loop emits them with zero installer changes.
**Warning signs:** `ls .bob/commands` shows only whatever the loop emitted (currently nothing); `SUPPORT-ROSTER.md` shows only `gsd-autonomous`.

### Pitfall 2: Confusing workflow files with slash-command source files
**What goes wrong:** Feeding `gsd-core/workflows/new-project.md` to the converter and expecting `description:` frontmatter.
**Why it happens:** Workflow bodies start with `<purpose>` or `<!-- gsd:loop-host` — they have **no Claude `description:` frontmatter** (`head -1` shows `<purpose>`). [VERIFIED: workflows/new-project.md:1, plan-phase.md:1] The converter's INPUT is the **slash-command `.md`** (the `commands/gsd/<name>.md` file with `description`/`argument-hint` frontmatter that *invokes* the workflow), not the workflow body itself.
**How to avoid:** Vendor the **command** source files (frontmatter + a body that points at the workflow). The converter reduces frontmatter to `name`+`description` (skill) or `description`+`argument-hint` (command) and neutralizes paths/`gsd:`→`gsd-`.
**Warning signs:** Converted skill emits `description: ""` (empty) — Bob then *ignores* the skill (Pitfall 4 in AC-08). The converter deliberately never early-returns on missing frontmatter (emits empty description) [VERIFIED: runtime-artifact-conversion.cjs:723-725], so an empty description is a silent-ignore risk to assert against.

### Pitfall 3: Building degradation code that already exists
**What goes wrong:** Writing a text_mode shim or a sequential-execution wrapper.
**Why it happens:** Not realizing the gsd-core workflow bodies already branch on `text_mode` from init JSON (`TEXT_MODE=true if … text_mode from init JSON is true`) [VERIFIED: execute-phase.md:160; plan-phase.md:380,462,1474,1533] and that subagent inlining is a host-runtime behavior (the workflow calls `Agent(subagent_type=…)`; the prompt is resolved by the runtime, not loaded by the workflow) [VERIFIED: execute-phase.md:602,1376].
**How to avoid:** Treat D-02/D-04 as *verification* obligations, not code. The installer writing `text_mode:true` (Phase 3) + the descriptor is the entire mechanism.
**Warning signs:** A diff that touches `runtime-artifact-conversion.cjs` or adds a `degrade*.cjs` — both are out of scope.

### Pitfall 4: Equivalence test passing on empty/placeholder artifacts (D-05 trap)
**What goes wrong:** A golden diff that only checks section headers passes even when PROJECT.md is a stub.
**Why it happens:** Structural checks don't read content; "passes structurally but is empty" false-positive.
**How to avoid:** Thread known sentinel answer strings through the (text_mode) flow and assert those exact strings appear in PROJECT.md/REQUIREMENTS.md/ROADMAP.md. [CITED: CONTEXT.md D-05]
**Warning signs:** No assertion references a specific answer value; only `assert.match(out, /## /)`-style structural checks.

### Pitfall 5: A nested second `.planning/` under the scope dir (CORE-05)
**What goes wrong:** A global install in a non-project cwd, or a workflow run with a wrong cwd, creates `.bob/.planning/` or `<scope>/.planning/`.
**Why it happens:** `.planning/` must be workspace-root-anchored next to `.bob/`, never under it.
**How to avoid:** The installer already guards this — config.json text_mode merge is gated on an existing `<cwd>/.planning/` and a global install with no project skips the write + emits KNOWN-LIMITATION [VERIFIED: install-clean.test.cjs:64-79]. The bob `artifactLayout` declares NO `.planning/` target [VERIFIED: planning-bytecompat.test.cjs:81-93]. Phase 4's root-anchor test asserts exactly one `.planning/` at root and none nested after a loop run.
**Warning signs:** `find <scope> -type d -name .planning` returns >1 path.

## Code Examples

### Real-answer equivalence guard (D-05) — sketch
```javascript
// node:test, hermetic. Thread a known answer, assert it lands in the artifact.
const SENTINEL = 'Acme Realtime Telemetry Pipeline';
// ... drive new-project's text_mode flow with answers including SENTINEL as the project name ...
const project = fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf8');
assert.match(project, new RegExp(SENTINEL), 'real validated answer must appear — not a placeholder');
assert.doesNotMatch(project, /\bTODO\b|\bplaceholder\b|\{\{/i, 'no stub/template markers remain');
```

### Atomic-commit assertion (CORE-03) — sketch
```javascript
// After driving execute-plan against a fixture, assert one commit per task with the
// {type}({phase}-{plan}) message shape (the protocol lives in agents/gsd-executor.md).
const log = execFileSync('git', ['-C', repo, 'log', '--format=%s'], { encoding: 'utf8' });
const lines = log.trim().split('\n');
for (const l of lines) assert.match(l, /^\w+\(\d+-\d+\)/, 'atomic commit message shape');
```

### Root-anchoring assertion (CORE-05) — sketch
```javascript
// Source pattern: install-clean.test.cjs:70-74 (existsSync on cwd/.planning)
const planningDirs = []; // walk <scope> collecting any `.planning` dir
assert.equal(planningDirs.length, 1, 'exactly one .planning/');
assert.equal(path.dirname(planningDirs[0]), workspaceRoot, '.planning/ at workspace root next to .bob/');
assert.ok(!fs.existsSync(path.join(scopeDir, '.planning')), 'no nested .planning/ under the scope dir');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gsd:<cmd>` colon command dialect | `gsd-<cmd>` hyphen form (routable under Bob) | gsd-core #2808 / converter `gsd:`→`gsd-` | Converter rewrites it automatically [VERIFIED: runtime-artifact-conversion.cjs:717] |
| Per-runtime hand-written converters | Descriptor `artifactLayout` + named converters | gsd-core ADR-457 / capability-registry | bob entry declares its 2 converters declaratively [VERIFIED: capability-registry.cjs:3069,3077] |

**Deprecated/outdated:**
- Legacy colon command form — never emit; the converter handles translation.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vendoring `commands/gsd/*.md` is the intended way to feed the convertible loop (vs another source the installer should read) | Summary / Q1 | LOW — stage.cjs:231 names `repoRoot/commands/gsd` explicitly as the source path; this is the designed seam. If the team prefers driving converters only in-test, the install-time emission is deferred, but the AC steps then have nothing to grep under `.bob/commands` on-device. Confirm during planning. |
| A2 | The Claude command source files (`commands/gsd/<name>.md`) exist in the upstream gsd-core distribution and can be copied in | Q1 | LOW-MEDIUM — they are absent from BOTH the vendored payload and `~/.claude/commands/gsd/` on this dev box (verified absent). They exist in the published `@opengsd/gsd-core` package's command tree (the source `stageCommandsForRuntimeFlat` consumes). The plan must locate/obtain them (re-vendor from the npm tarball's `commands/gsd/`) — flag as a `checkpoint:human-verify` or an explicit "fetch from gsd-core 1.5.0 tarball" task. |
| A3 | All five core-loop commands degrade cleanly to sequential-inline; none need BOB_SKIP_LIST | Q2 | LOW — none of the 8 workflows assert isolation/completion-signal hard-dependencies; subagent calls are `Agent(subagent_type=)` (runtime-resolved) and degrade to inline. `gsd-autonomous` (the existing skip) is NOT a core-loop command. Verify per-command during planning. |
| A4 | Highest existing AC-ID is AC-16, so Phase 4 appends AC-17..AC-21 | Q5 | LOW — read directly from ACCEPTANCE-CHECKLIST.md. |

## Open Questions

1. **Where exactly do the `commands/gsd/<name>.md` source files come from for vendoring?** (A2)
   - What we know: The converter consumes Claude command `.md` files; `stage.cjs` expects them at `repoRoot/commands/gsd/`; they are absent from this repo and from `~/.claude` on the dev box.
   - What's unclear: The cleanest acquisition path — copy from the published `@opengsd/gsd-core@1.5.0` tarball's `commands/gsd/`, or generate thin command wrappers that invoke the vendored workflows.
   - Recommendation: First plan task = obtain the 8 core-loop command sources from the gsd-core 1.5.0 distribution (the same tree `stageCommandsForRuntimeFlat` reads) and vendor them under `commands/gsd/`. Gate behind a `checkpoint:human-verify` if the tarball must be fetched. Then the built loop + converters do the rest unchanged.

2. **Per-command vs single end-to-end equivalence (Claude's discretion D-06).**
   - What we know: Both are supported by existing patterns (`command-golden` per-artifact; `install-clean` e2e).
   - Recommendation: Do **both** — per-command converter golden diffs (fast, pinpoint) + one end-to-end loop run asserting the real-answer guard (D-05) and root-anchoring (D-07).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all tests + installer | ✓ (assumed; engines `>=22.15`) | per package.json | — |
| git | atomic-commit assertion (CORE-03) | ✓ (repo is a git repo) | — | — |
| `@opengsd/gsd-core@1.5.0` command tree | source of `commands/gsd/*.md` to vendor | ✗ (not present in repo; absent on dev box `~/.claude`) | 1.5.0 target | Fetch the npm tarball and copy its `commands/gsd/`; OR author thin command wrappers (last resort, risks D-01 divergence) |
| Live Bob | nothing at dev time | ✗ (never) | — | Claude-runtime equivalence + golden + structural (the entire Phase 4 design) |

**Missing dependencies with no fallback:** none that block dev-time work.
**Missing dependencies with fallback:** the `commands/gsd/*.md` source — fetch from the gsd-core 1.5.0 tarball (A2/Open Q1). This is the single acquisition task the plan must front-load.

## Validation Architecture

> nyquist_validation is not explicitly false in `.planning/config.json`; section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node ≥22.15 builtin) |
| Config file | none — `package.json` `scripts.test` = `node --test "test/**/*.test.cjs"` [VERIFIED] |
| Quick run command | `node --test test/core-loop-contract.test.cjs` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | new-project → PROJECT/REQ/ROADMAP with real answers | equivalence + real-answer guard | `node --test test/core-loop-equivalence.test.cjs` | ❌ Wave 0 |
| CORE-02 | plan-phase → contract-conformant PLAN.md | structural contract | `node --test test/core-loop-contract.test.cjs` | ❌ Wave 0 |
| CORE-03 | execute-phase atomic commits (sequential-inline) | integration + git-log assert | `node --test test/core-loop-contract.test.cjs` | ❌ Wave 0 |
| CORE-04 | verify validates phase vs goals | equivalence | `node --test test/core-loop-equivalence.test.cjs` | ❌ Wave 0 |
| CORE-05 | progress advances; single root-anchored `.planning/` | structural root-anchor | `node --test test/core-loop-root-anchor.test.cjs` | ❌ Wave 0 |
| (all) | each core-loop cmd converts + gates clean | converter golden + e2e install | `node --test test/core-loop-equivalence.test.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test test/core-loop-<the-suite-touched>.test.cjs`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + ACCEPTANCE-CHECKLIST AC-17..AC-21 appended before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `commands/gsd/*.md` (8 core-loop sources vendored) — prerequisite input for every test (Open Q1)
- [ ] `test/core-loop-equivalence.test.cjs` — covers CORE-01/04 + real-answer guard (D-05)
- [ ] `test/core-loop-contract.test.cjs` — covers CORE-02 (PLAN.md sections) + CORE-03 (atomic commits)
- [ ] `test/core-loop-root-anchor.test.cjs` — covers CORE-05
- [ ] `test/fixtures/core-loop/` — frozen golden `.planning/` reference tree + sample project + per-command `expected.md`
- Framework install: none — `node:test` is builtin.

## Security Domain

> `security_enforcement` not explicitly false; included. Phase 4 adds source files + tests; the security surface is the installer/staging path already hardened in Phase 3.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no auth surface |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (light) | converter/gate already validate candidate shape (`gateArtifact` rejects null/nameless [VERIFIED: bob-adapter.cjs:205]); staging uses `safeJoin` path-containment (CR-01) [VERIFIED: stage.cjs:261] |
| V6 Cryptography | no | sha256 used only for manifest integrity, not security crypto [VERIFIED: manifest.cjs] |
| V12 File handling | yes | scratch tests write only to `mkdtempSync` temp dirs; never to tracked `.planning/` (D-07 sweep guard) [VERIFIED: stage.cjs:254] |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via poisoned manifest/source path | Tampering | `safeJoin` containment guard (CR-01 regression test exists) [VERIFIED: stage.cjs:261, test/installer/manifest-path-safety.test.cjs] |
| Test writing into the real workspace `.planning/` | Tampering | All suites use `mkdtempSync` scratch dirs (pattern: install-clean.test.cjs:27) |
| `js-yaml` arbitrary-tag execution | Tampering | js-yaml v4 SAFE schema by default; confined to bob-adapter; not used by Phase 4 work [VERIFIED: bob-adapter.cjs:9-10] |

## Sources

### Primary (HIGH confidence — read directly this session)
- `src/bob-adapter.cjs` (full) — gate/roster/mode-merge surface; `BOB_SKIP_LIST` = only `gsd-autonomous`.
- `src/installer/stage.cjs` (full) — convertible loop sources `repoRoot/commands/gsd` (lines 227–243); absent today.
- `gsd-core/bin/lib/runtime-artifact-conversion.cjs:681-810` — `convertClaudeToBobContent`, `convertClaudeCommandToBobSkill` (735), `convertClaudeCommandToBobCommand` (763).
- `gsd-core/bin/lib/capability-registry.cjs:3041-3109` — bob runtime entry; `isolatedSubagents` not enumerated as a capability flag in the body, `artifactLayout` declares the 2 converters.
- `gsd-core/bin/lib/install-profiles.cjs:505-618` — `stageCommandsForRuntimeFlat` / `stageAgentsForRuntimeWithConverter` source-dir contract.
- `gsd-core/workflows/{new-project,plan-phase,discuss-phase,execute-phase,execute-plan,verify-work,verify-phase,progress}.md` — transitive agent refs + `TEXT_MODE` branches; 23 `@`-refs all present in payload.
- `test/planning-bytecompat.test.cjs`, `test/command-golden.test.cjs`, `test/installer/install-clean.test.cjs`, `test/_helpers/vendor.cjs` — the harness patterns to mirror.
- `.planning/ACCEPTANCE-CHECKLIST.md` — schema + highest AC-ID (AC-16).
- `.planning/phases/04-core-loop-port/04-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`.

### Secondary
- `.claude/CLAUDE.md` — converter-strips-keys, hyphen-form, dependency-free CJS conventions.

### Tertiary
- None — no external lookups needed (port-by-conversion, repo-grounded).

## Metadata

**Confidence breakdown:**
- Conversion source / transitive set (Q1, Q2): HIGH — traced every code path and grep'd every workflow.
- Verification harness (Q3): HIGH — three existing suites provide the exact pattern.
- Capability declaration (Q4): HIGH — read the bob entry and the workflow `text_mode` branches.
- AC append contract (Q5): HIGH — read the checklist end to end.
- Acquisition of `commands/gsd/*.md` (A2/Open Q1): MEDIUM — designed seam is clear; the files must be fetched from the gsd-core 1.5.0 distribution (the one gap requiring a concrete acquisition task).

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable; repo-internal — only changes if gsd-core is re-vendored or the converters change)

---

## Appendix: Direct answers to the five investigation items

**Q1 — Vendored payload inventory / conversion source (the #1 unknown).**
The vendored `gsd-core/` has NO `skills/` or `agents/` dirs [VERIFIED: `ls -d gsd-core/skills gsd-core/agents` → absent]. The `bob` runtime's `artifactLayout` (capability-registry.cjs:3061-3098) declares two source `kind`s — `skills` and `commands` — each with a named converter (`convertClaudeCommandToBobSkill`, `convertClaudeCommandToBobCommand`). Those converters (runtime-artifact-conversion.cjs:735,763) consume **Claude slash-command `.md` source files** (frontmatter + body), NOT the workflow bodies. In gsd-core's own installer the source dir is `commands/gsd/` (`stageCommandsForRuntimeFlat`, install-profiles.cjs:585). In **gsd-bob**, `src/installer/stage.cjs:231` sets `convertibleSrc = repoRoot/commands/gsd` and guards it with `existsSync`; that dir **does not exist** (stage.cjs:228-230 documents the absence), so the installer emits ZERO `.bob/commands`/`.bob/skills` today. **Conclusion: the conversion source is `repoRoot/commands/gsd/*.md` (Claude slash-command sources), which Phase 4 must vendor.** The workflow bodies + the 23 `@`-referenced refs/templates are already vendored and present (verified). Agent prompts (`agents/*.md`) are NOT vendored and are NOT needed as files — they are runtime-resolved via `Agent(subagent_type=…)`.

**Q2 — Transitive dependency set + degradation analysis.**
| Command | Subagent roles invoked | `@`-included refs (all present) | Degrades cleanly? |
|---------|------------------------|----------------------------------|-------------------|
| new-project | gsd-project-researcher (×N), gsd-research-synthesizer, gsd-roadmapper | (research/roadmap refs) | YES — fan-out runs inline sequentially → same SUMMARY/ROADMAP |
| plan-phase | gsd-phase-researcher, gsd-pattern-mapper, gsd-planner, gsd-plan-checker | agent-contracts, revision-loop, gates, gate-prompts, ui-brand, planner-antipatterns | YES — researcher→mapper→planner→checker is inherently sequential |
| discuss-phase | gsd-advisor-researcher, gsd-phase-researcher | (discuss refs) | YES |
| execute-phase | gsd-executor (waves), gsd-verifier, +checkers | executor-examples, worktree-path-safety, tdd, checkpoints, git-integration | YES — wave parallelization collapses to sequential waves; atomic-commit protocol in `agents/gsd-executor.md` (runtime-resolved) |
| execute-plan | gsd-executor | executor-examples | YES — single executor, already sequential |
| verify-work | gsd-plan-checker, gsd-planner | verification-patterns, verify-mvp-mode | YES |
| verify-phase | (none — pure inline) | — | YES — no subagent dependency at all |
| progress | (none) | — | YES — status/advance, no fan-out |
**No core-loop command hard-depends on *concurrent* subagent results** — every fan-out is an independence-for-speed pattern whose outputs are merged, not a barrier requiring simultaneous completion signals. **None require BOB_SKIP_LIST.** (`gsd-autonomous`, the only existing skip, is out of core-loop scope.)

**Q3 — Verification harness mechanics.**
Reuse three proven patterns: (1) **converter golden diff** — `requireVendor('runtime-artifact-conversion.cjs')` + byte-compare to `expected.md` (command-golden.test.cjs:10-23); (2) **scratch-tmpdir e2e** — `execFileSync(ENTRY,…)` from a scratch cwd, read back `.bob/` (install-clean.test.cjs:22-62); (3) **runtime-agnostic golden** — `resolveConfigHomeFromDescriptor` bob-vs-claude + assert byte-identity and no config-home leak (planning-bytecompat.test.cjs:52-79). For CORE-01's real-answer guard (D-05): thread sentinel answer strings through the text_mode flow and assert they appear in the artifacts (+ assert no `TODO`/`placeholder`/`{{` markers). For atomic commits (CORE-03): drive a fixture through execute-plan and assert one `{type}({phase}-{plan})`-shaped commit per task via `git log`. For root-anchoring (CORE-05): walk the scope dir, assert exactly one `.planning/` at workspace root and none nested. Freeze the golden `.planning/` reference tree under `test/fixtures/core-loop/` (Claude's discretion on shape).

**Q4 — The bob capability declaration.**
`capability-registry.cjs:3045-3109`. The bob entry's `description` (line 3049) states "sequential-inline subagents" and "text_mode prompts," and the `artifactLayout` (3061-3098) declares the skills+commands converters. **Notably, `isolatedSubagents`/`text_mode`/`structuredPrompts` are NOT enumerated as boolean capability flags inside the registry `runtime` object** — they live as the descriptor's documented posture. The gate's capability decl `{ isolatedSubagents:false, structuredPrompts:false }` is supplied by the installer/roster generator (stage.cjs:41; generate-support-roster.cjs:25), not read from the registry body. **Degradation is NOT driven by a workflow branch on a registry flag** — it is: (a) text_mode = the workflow's own `TEXT_MODE` branch reading `text_mode` from init JSON config (execute-phase.md:160; plan-phase.md:380/462/1474/1533), which the installer sets to true; (b) sequential-inline = a host-runtime property (the single Bob agent runs `Agent(subagent_type=…)` steps inline because no isolation primitive exists). So degradation is purely "single agent executes inline + config flips text_mode," exactly as D-02/D-04 state.

**Q5 — Acceptance-checklist append contract.**
Highest existing AC-ID = **AC-16** [VERIFIED: ACCEPTANCE-CHECKLIST.md:124]. Row schema (lines 9-15): a stable ID heading `## AC-NN — <title>` followed by four ordered fields — `Cmd:`, `Expect:`, `Confirms:`, `Result: [ ] pass  [ ] fail`. **Safety invariant (T-01-SC, line 15):** every `Cmd:` must be read-only / side-effect-free (listing, `echo $VAR`, read-only `gsd-tools query`); no install/write/delete/move (mutating install/uninstall steps are explicitly allowed only as Phase-3/6-contributed steps, with read-only confirms around them — see AC-13/14/15 for the established style). Phase 4 appends **AC-17..AC-21**, one per core-loop SC (the in-Bob run of new-project / plan-phase / execute-phase / verify / progress), each confirming the matching CORE-0N and pointing at its hermetic test complement (mirroring AC-05's "on-device complement to `test/planning-bytecompat.test.cjs`" phrasing).
