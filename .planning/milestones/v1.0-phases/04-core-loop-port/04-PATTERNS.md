# Phase 4: Core-Loop Port - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 13 (8 vendored command sources + 3 test suites + 1 fixture tree + 1 AC append)
**Analogs found:** 13 / 13 (every new file has a concrete in-repo analog)

> **Phase nature:** port-by-conversion **verification** phase. No production/converter code is written. New files are: (1) vendored Claude slash-command source `.md` (converter INPUT — the load-bearing gap), (2) three `node:test` suites, (3) golden fixtures, (4) an append to the AC checklist. Every primitive (converters, gate, installer, text_mode/sequential degradation) is already built and tested — do NOT re-implement.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `commands/gsd/new-project.md` | config (cmd source) | transform (converter input) | `test/fixtures/command/input.md` | role-match (shape only; real bodies fetched from gsd-core 1.5.0) |
| `commands/gsd/plan-phase.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `commands/gsd/discuss-phase.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `commands/gsd/execute-phase.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `commands/gsd/execute-plan.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `commands/gsd/verify-work.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `commands/gsd/verify-phase.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `commands/gsd/progress.md` | config (cmd source) | transform | `test/fixtures/command/input.md` | role-match |
| `test/core-loop-equivalence.test.cjs` | test | transform/golden-diff | `test/command-golden.test.cjs` + `test/planning-bytecompat.test.cjs` | exact |
| `test/core-loop-contract.test.cjs` | test | request-response + batch (git log) | `test/installer/install-clean.test.cjs` | exact |
| `test/core-loop-root-anchor.test.cjs` | test | file-I/O (fs walk) | `test/installer/install-clean.test.cjs` (lines 64-79) | exact |
| `test/fixtures/core-loop/` (golden tree + per-cmd `*.expected.md`) | fixture | file-I/O | `test/fixtures/command/{input,expected}.md` | exact |
| `.planning/ACCEPTANCE-CHECKLIST.md` (append AC-17..AC-21) | config (checklist) | append | existing AC-13..AC-16 rows | exact |

## Pattern Assignments

### `commands/gsd/<name>.md` (config — converter input source) ×8

**Analog:** `test/fixtures/command/input.md` (the canonical Claude-command shape the vendored converter consumes).

**CRITICAL acquisition note (RESEARCH A2 / Open Q1):** these 8 files are **absent** from the repo and from `~/.claude` on this dev box. They must be **fetched from the published `@opengsd/gsd-core@1.5.0` tarball's `commands/gsd/` tree** (the same dir `stageCommandsForRuntimeFlat` reads) and vendored verbatim — NOT hand-authored (hand-authoring violates D-01/UP-01). Front-load this as the first plan task; gate behind `checkpoint:human-verify` if the tarball must be fetched.

**Shape to mirror** (`test/fixtures/command/input.md` lines 1-15):
```markdown
---
description: "Run the GSD help workflow and show available commands."
argument-hint: <topic>
effort: low
allowed-tools: Read, Bash
agent: gsd-help
---

# GSD Help

Show available GSD commands. The user passed $ARGUMENTS to scope the help output.

See the workflow at .claude/gsd-core/workflows/help.md and run /gsd:help.
```
The converter (already built) strips `effort`/`allowed-tools`/`agent`, reduces frontmatter to `description`+`argument-hint`, projects `$ARGUMENTS`→`$1`, rewrites `.claude`→`.bob` and `gsd:`→`gsd-`. **Do not pre-neutralize** the vendored source — vendor it as gsd-core ships it and let the converter transform it.

**Staging seam (no installer change needed)** — `src/installer/stage.cjs` lines 231-243:
```javascript
const convertibleSrc = path.join(repoRoot, 'commands', 'gsd');
if (fs.existsSync(convertibleSrc)) {
  for (const rel of listFilesRel(convertibleSrc)) {
    const name = path.basename(rel, path.extname(rel));
    const candidate = { name, requires: [] };
    if (gateArtifact(candidate, BOB_CAPABILITY_DECL).supported) {
      const destRel = path.join('commands', rel);
      stageFile(destRel, fs.readFileSync(path.join(convertibleSrc, rel)));
    }
  }
}
```
The loop is already a no-op-when-absent guard. Vendoring `commands/gsd/*.md` activates it with **zero installer edits**. Expectation: all 8 gate `supported:true` → none routed to `SUPPORT-ROSTER.md` (the only existing skip is `gsd-autonomous`, out of core-loop scope).

---

### `test/core-loop-equivalence.test.cjs` (test — golden diff + real-answer guard; CORE-01/04, D-05/D-06.1)

**Analog A — per-command converter golden diff:** `test/command-golden.test.cjs` lines 7-23 (copy verbatim structure):
```javascript
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');
const conv = requireVendor('runtime-artifact-conversion.cjs');
const input = fs.readFileSync(path.join(fixDir, 'input.md'), 'utf8');
const expected = fs.readFileSync(path.join(fixDir, 'expected.md'), 'utf8');
test('command output is byte-identical to the golden expected fixture', () => {
  const out = conv.convertClaudeCommandToBobCommand(input, 'gsd-help');
  assert.equal(out, expected);
});
```
Apply per core-loop command: read `commands/gsd/<name>.md`, byte-compare `convertClaudeCommandToBobCommand(input, 'gsd-<name>')` (and `convertClaudeCommandToBobSkill` for the skill kind) against a frozen `<name>.expected.md` under `test/fixtures/core-loop/`.

**Empty-description guard (RESEARCH Pitfall 2/4)** — the converter never early-returns on missing frontmatter (`runtime-artifact-conversion.cjs:723-725`), so an empty `description:` is a silent-ignore risk. Assert each converted skill/command carries a non-empty `description`. Mirror `command-golden.test.cjs:25-35`:
```javascript
const fmEnd = out.indexOf('---', 3);
const fm = out.substring(3, fmEnd);
assert.match(fm, /^description:\s*\S/m); // non-empty
assert.match(fm, /^argument-hint:/m);
assert.doesNotMatch(fm, /^effort:/m);
```

**Analog B — real-answer guard (D-05 false-positive trap):** thread sentinel answer strings through the text_mode flow, assert they land in the artifact (RESEARCH Code Examples):
```javascript
const SENTINEL = 'Acme Realtime Telemetry Pipeline';
const project = fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf8');
assert.match(project, new RegExp(SENTINEL), 'real validated answer must appear — not a placeholder');
assert.doesNotMatch(project, /\bTODO\b|\bplaceholder\b|\{\{/i, 'no stub/template markers remain');
```

**Analog C — runtime-agnostic byte-compat proxy:** `test/planning-bytecompat.test.cjs` lines 52-79 (the equivalence-proxy pattern). Resolve bob-vs-claude config home from the descriptor, drive the SAME write path, assert byte-identity AND that the config home leaks nowhere:
```javascript
assert.equal(bobBytes, claudeBytes, 'runtime-agnostic write path');
assert.ok(!bobBytes.includes('.bob'), 'config home must not leak into .planning/ body');
```

---

### `test/core-loop-contract.test.cjs` (test — PLAN.md sections + atomic commits; CORE-02/03, D-06.2)

**Analog — scratch-tmpdir e2e install:** `test/installer/install-clean.test.cjs` lines 22-62. Copy the scratch + execFileSync harness verbatim:
```javascript
const { execFileSync } = require('node:child_process');
const { repoRoot } = require('../_helpers/vendor.cjs');
const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
function scratch(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`)); }
// drive the real entry from a scratch cwd; read back .bob/
execFileSync(process.execPath, [ENTRY, '--bob', '--global', '-c', target], { cwd, encoding: 'utf8' });
assert.ok(fs.existsSync(path.join(target, 'commands', 'gsd-plan-phase.md')));
```
Structural contract: read the produced `PLAN.md`/`PROJECT.md` and assert documented section/frontmatter headers exist.

**Atomic-commit assertion (CORE-03)** — RESEARCH Code Examples; protocol lives in `agents/gsd-executor.md` `<task_commit_protocol>` (runtime-resolved, not file-loaded):
```javascript
const log = execFileSync('git', ['-C', repo, 'log', '--format=%s'], { encoding: 'utf8' });
for (const l of log.trim().split('\n')) assert.match(l, /^\w+\(\d+-\d+\)/, 'atomic commit message shape');
```

---

### `test/core-loop-root-anchor.test.cjs` (test — single root-anchored `.planning/`; CORE-05, D-07)

**Analog A — `existsSync` cwd predicate:** `test/installer/install-clean.test.cjs` lines 64-79 (no stray `.planning/` in a non-project cwd):
```javascript
assert.equal(fs.existsSync(path.join(cwd, '.planning')), false, 'no stray .planning/ in a non-project cwd');
```

**Analog B — bob declares NO `.planning/` artifactLayout target:** `test/planning-bytecompat.test.cjs` lines 81-93 (already proves the structural invariant; extend it for the post-loop walk):
```javascript
const layout = runtimes.bob.runtime.artifactLayout;
for (const t of [...layout.global, ...layout.local]) {
  assert.ok(!/\.planning/.test(t.destSubpath), 'bob artifactLayout must not enumerate .planning/');
}
```

**Post-loop walk assertion** (RESEARCH Code Examples):
```javascript
const planningDirs = []; // walk <scope> collecting any `.planning` dir
assert.equal(planningDirs.length, 1, 'exactly one .planning/');
assert.equal(path.dirname(planningDirs[0]), workspaceRoot, '.planning/ at workspace root next to .bob/');
assert.ok(!fs.existsSync(path.join(scopeDir, '.planning')), 'no nested .planning/ under the scope dir');
```

---

### `test/fixtures/core-loop/` (fixture — frozen golden tree + per-command `*.expected.md`)

**Analog:** `test/fixtures/command/{input.md,expected.md}` — the input/expected golden pair pattern. For each core-loop command, store the vendored source under test as `<name>` input and a frozen `<name>.expected.md` (converter output). Additionally freeze a golden `.planning/` reference subtree (PROJECT/REQUIREMENTS/ROADMAP/PLAN/STATE/config.json) for the end-to-end equivalence diff. All scratch writes go to `mkdtempSync` temp dirs — never into the tracked `.planning/` (security V12; D-07 sweep guard).

---

### `.planning/ACCEPTANCE-CHECKLIST.md` (config — append AC-17..AC-21)

**Analog:** existing rows AC-13..AC-16 (lines 103-129). Highest existing AC-ID = **AC-16** (verified). Append five rows AC-17..AC-21, one per core-loop SC (in-Bob run of new-project / plan-phase / execute-phase / verify / progress).

**Exact schema** (header + 4 ordered fields), per AC-13 (lines 103-108):
```markdown
## AC-NN — <title> (CORE-0N)

Cmd:    <read-only / side-effect-free command; mutating loop steps are Phase-6-contributed, wrapped in read-only confirms — see AC-13/14/15 style>
Expect: <observable result>
Confirms: CORE-0N — <criterion> / SC#N. (on-device complement to test/core-loop-*.test.cjs)
Result: [ ] pass  [ ] fail
```

**Safety invariant (T-01-SC, line 15):** every `Cmd:` must be read-only / side-effect-free. The in-Bob `/gsd-*` run itself is the mutating Phase-6 step (allowed, like AC-13's install), wrapped in read-only read-backs (`ls`, `grep -c`, `gsd-tools query`). Mirror AC-05's "on-device complement to `test/planning-bytecompat.test.cjs`" phrasing to point each AC at its hermetic test complement.

## Shared Patterns

### Vendor resolver (every test)
**Source:** `test/_helpers/vendor.cjs`
**Apply to:** all 3 new test suites
```javascript
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');
const conv = requireVendor('runtime-artifact-conversion.cjs');
```
Always require gsd-core modules through `requireVendor` so the test exercises the repo's vendored `bob`-aware copy, never the global `~/.claude/gsd-core`.

### Scratch-tmpdir isolation (every test that writes)
**Source:** `test/installer/install-clean.test.cjs` lines 27-29
**Apply to:** equivalence (e2e), contract, root-anchor suites
```javascript
function scratch(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`)); }
```
Never write to the tracked workspace `.planning/` (security V12 / D-07).

### Reuse the gate/converter — never re-implement
**Source:** `runtime-artifact-conversion.cjs` (`convertClaudeCommandToBob{Skill,Command}`), `src/bob-adapter.cjs` (`gateArtifact`)
**Apply to:** all conversion/gating in tests — call them, do not branch on backend. A diff that touches `runtime-artifact-conversion.cjs`, adds a `degrade*.cjs`, or hand-writes `.bob/skills`/`.bob/commands` is OUT OF SCOPE (RESEARCH Anti-Patterns / Pitfall 3).

### text_mode + sequential degradation are already built
**Source:** gsd-core workflow bodies (config-driven `TEXT_MODE` branch — `execute-phase.md:160`, `plan-phase.md:380/462/1474/1533`) + Phase 3 installer `text_mode:true` config-merge.
**Apply to:** treat D-02/D-04 as verification obligations only — no new degradation code. Sequential-inline is a host-runtime property (`Agent(subagent_type=…)` resolved by the runtime); the test asserts output equivalence, never wall-clock/parallelism.

## No Analog Found

None. Every Phase 4 file has a concrete in-repo analog. The single non-code unknown is **acquisition** of the 8 `commands/gsd/*.md` sources (must be fetched from the `@opengsd/gsd-core@1.5.0` tarball — RESEARCH A2/Open Q1), not a missing pattern.

## Metadata

**Analog search scope:** `test/`, `test/_helpers/`, `test/fixtures/`, `src/installer/`, `.planning/ACCEPTANCE-CHECKLIST.md`
**Files scanned:** 7 (command-golden, install-clean, planning-bytecompat, vendor.cjs, stage.cjs, fixtures/command/input.md, ACCEPTANCE-CHECKLIST.md)
**Pattern extraction date:** 2026-06-19
