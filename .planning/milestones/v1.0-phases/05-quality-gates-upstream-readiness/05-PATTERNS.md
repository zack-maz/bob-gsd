# Phase 5: Quality Gates & Upstream Readiness - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 13 (5 new command sources, 3 new tests, 1 new fixture dir, 1 modified script, 1 new README, 1 new UPSTREAM, 1 modified checklist)
**Analogs found:** 13 / 13 (every new/modified file has a direct in-repo analog — this is a port-by-conversion phase, no greenfield)

> **Phase posture (do not violate):** This is a test-deferred *port + audit + docs* phase. NO new converter, installer, gate, or state mechanism. Every new artifact either (a) is a vendored Claude command source the existing installer auto-converts, (b) is a `node:test` suite mirroring an existing one, or (c) is documentation. `src/bob-adapter.cjs` is touched ONLY if a gate proves un-degradable (not expected — see Concurrency audit, RESEARCH §2).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `commands/gsd/code-review.md` (NEW) | command-source (conversion input) | transform | `commands/gsd/plan-phase.md` (any of the 6 core-loop sources) | exact |
| `commands/gsd/code-review-fix.md` (NEW) | command-source | transform | `commands/gsd/execute-phase.md` | exact |
| `commands/gsd/debug.md` (NEW) | command-source | transform | `commands/gsd/progress.md` | exact |
| `commands/gsd/audit-fix.md` (NEW) | command-source | transform | `commands/gsd/verify-work.md` | exact |
| `commands/gsd/audit-uat.md` (NEW) | command-source | transform | `commands/gsd/verify-work.md` | exact |
| `test/quality-gate-equivalence.test.cjs` (NEW) | test | transform (golden-diff) | `test/core-loop-equivalence.test.cjs` | exact |
| `test/quality-gate-contract.test.cjs` (NEW, optional) | test | request-response (e2e) | `test/core-loop-contract.test.cjs` | exact |
| `test/debug-state-persistence.test.cjs` (NEW) | test | file-I/O (write→reset→read) | `test/core-loop-equivalence.test.cjs` (hermetic scratch) + `debug.md` model | role-match |
| `test/roster-capmap.test.cjs` (NEW) | test | transform (gate inspection) | `scripts/generate-support-roster.cjs` + `src/bob-adapter.cjs` gate | role-match |
| `test/fixtures/quality-gates/` (NEW) | test-fixture | n/a | `test/fixtures/core-loop/` | exact |
| `scripts/generate-support-roster.cjs` (MODIFIED) | config/utility | transform | self (extend candidate set L29-37) | self |
| `README.md` (NEW) | doc | n/a | `gsd-core/templates/README.md` (tone only) + `SUPPORT-ROSTER.md` (skill-list source) | tone-match |
| `UPSTREAM.md` (NEW) | doc | n/a | RESEARCH §5 inventory table | reference |
| `.planning/ACCEPTANCE-CHECKLIST.md` (MODIFIED) | doc | n/a | self (AC-17..AC-21 entries) | self |

## Pattern Assignments

### `commands/gsd/{code-review,code-review-fix,debug,audit-fix,audit-uat}.md` (command-source, transform)

**Analog:** the 6 existing core-loop sources in `commands/gsd/` (vendored in commit `feat(04-01): vendor 6 core-loop command sources from gsd-core 1.5.0`).

**Pattern:** Vendor the Claude command source verbatim from gsd-core into `commands/gsd/<name>.md`. The installer's convertible loop (`src/installer/stage.cjs` L239-266) enumerates every `.md` under `commands/gsd/`, derives `name = gsd-${stem}`, gates it via `gateArtifact`, and emits `.bob/commands/gsd-<x>.md` + `.bob/skills/gsd-<x>/SKILL.md`. **Zero installer/converter code changes.** The source frontmatter may use the legacy `gsd:` colon dialect; the converter translates `gsd:` → `gsd-` on emission.

**Where to get the source:** the workflows are already in `gsd-core/workflows/{code-review,code-review-fix,debug,audit-fix,audit-uat}.md`; the *slash-command sources* must come from gsd-core's command tree (the same provenance as the 6 core-loop sources). Do NOT hand-author — copy the upstream source so the install diff equals the upstream PR diff (D-01).

**Agent prompts are NOT vendored** (RESEARCH §1): `gsd-code-reviewer`, `gsd-code-fixer`, `gsd-debug-session-manager`, `gsd-debugger`, `gsd-executor` are runtime-resolved by the host (`gsd-tools.cjs query agent-skills <name>`), not converted as artifacts. Under `isolatedSubagents:false` their spawns collapse to sequential-inline. No `BOB_SKIP_LIST` entry expected (all gates are single-subagent wait-for-return, RESEARCH §2).

---

### `test/quality-gate-equivalence.test.cjs` (test, golden-diff transform)

**Analog:** `test/core-loop-equivalence.test.cjs` — mirror its structure exactly.

**Vendor-resolver import** (`test/_helpers/vendor.cjs` L23-28, used at `core-loop-equivalence.test.cjs` L33-38):
```javascript
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');
const conv = requireVendor('runtime-artifact-conversion.cjs');
```
Always require vendored modules through `requireVendor` so the test exercises the repo's `gsd-core/` copy (which carries the `bob` entry), never the global install.

**Per-command golden diff loop** (`core-loop-equivalence.test.cjs` L63-77) — the core pattern to copy, swapping the name list to the quality-gate stems (`code-review`, `code-review-fix`, `debug`, `audit-fix`, `audit-uat`):
```javascript
const cmdSrcDir = path.join(repoRoot, 'commands', 'gsd');
const fixDir = path.join(repoRoot, 'test', 'fixtures', 'quality-gates');
for (const stem of QUALITY_GATE_NAMES) {
  const name = `gsd-${stem}`;
  const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');
  test(`${stem}: command converts byte-identically`, () => {
    const out = conv.convertClaudeCommandToBobCommand(source, name);
    const expected = fs.readFileSync(path.join(fixDir, `${stem}.command.expected.md`), 'utf8');
    assert.equal(out, expected);
  });
  // ...skill golden diff identical, using convertClaudeCommandToBobSkill + .skill.expected.md
}
```

**Empty-description / strip-unsupported-keys guard** (`core-loop-equivalence.test.cjs` L79-101) — copy verbatim per stem (RESEARCH Pitfall 2: Bob silently ignores a description-less skill):
```javascript
const fm = out.substring(3, out.indexOf('---', 3));
assert.match(fm, /^description:\s*\S/m, 'non-empty description');
assert.match(fm, /^argument-hint:/m);          // command keeps argument-hint
assert.doesNotMatch(fm, /^effort:/m);
assert.doesNotMatch(fm, /^allowed-tools:/m);
assert.doesNotMatch(fm, /^agent:/m);
// skill side: name + non-empty description ONLY, argument-hint must be ABSENT (L91-101)
```

**Programmatic forbidden-token neutralization** (`core-loop-equivalence.test.cjs` L52-60, L103-110) — build tokens by `.join('')` so the test prose can't self-trip:
```javascript
const claudeHomePath = ['.', 'claude', '/'].join('');  // PATH form, not bare `.claude`
const colonDialect = ['gsd', ':'].join('');
// assert converted body excludes both
```

**Hermetic rule** (`core-loop-equivalence.test.cjs` L167-173): every scratch write to `fs.mkdtempSync(path.join(os.tmpdir(), 'gsdbob-...'))`; never the tracked `.planning/`.

---

### `test/quality-gate-contract.test.cjs` (test, e2e request-response) — optional but recommended

**Analog:** `test/core-loop-contract.test.cjs` — drives the REAL entry.

**Real-entry e2e pattern** (`core-loop-contract.test.cjs` L43-63, L67-94):
```javascript
const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
function runEntry(args, cwd) {
  return execFileSync(process.execPath, [ENTRY, ...args], { cwd, encoding: 'utf8' });
}
const target = path.join(scratch('tgt'), '.bob');
runEntry(['--bob', '--global', '-c', target], scratch('ws'));
// code-review + code-review-fix are COMMANDS:
assert.ok(fs.existsSync(path.join(target, 'commands', 'gsd-code-review.md')));
assert.ok(fs.existsSync(path.join(target, 'skills', 'gsd-code-review', 'SKILL.md')));
// audit-fix / audit-uat / debug workflows staged WHOLESALE, asserted as workflows
// (mirror the L96-122 "staged as workflow, NOT a command" assertion shape):
assert.ok(fs.existsSync(path.join(target, 'gsd-core', 'workflows', 'audit-fix.md')));
```
Note (RESEARCH §1): `debug`, `audit-fix`, `audit-uat` also have a *command source* in `commands/gsd/`, so they DO emit `.bob/commands/gsd-<x>.md`; the underlying `gsd-core/workflows/*.md` are additionally staged wholesale. Assert both surfaces.

---

### `test/debug-state-persistence.test.cjs` (test, file-I/O write→reset→read)

**Analog:** hermetic scratch pattern from `core-loop-equivalence.test.cjs` L167-173; state model from `gsd-core/workflows/debug.md` (RESEARCH §4).

**The D-05 round-trip the test MUST perform** (RESEARCH §4, Pitfall 3 — the "starts but loses state on reset" false-positive guard):
1. **Start** → write `.planning/debug/{slug}.md` (in a `mkdtempSync` scratch root) with frontmatter `status: investigating`, `trigger` = verbatim input, gathered symptoms, and a `Current Focus` block (`hypothesis`, `test`, `expecting`, `next_action`, `reasoning_checkpoint`, `tdd_checkpoint`) plus `Evidence` / `Eliminated` sections.
2. **Simulate reset** → fresh invocation / new context with NO in-memory carryover (re-read from disk only).
3. **`continue <slug>`** → read the file back.
4. **Assert restored verbatim from disk:** `status`, `hypothesis`, `next_action`, Evidence count, Eliminated count match what was written.
5. **Slug-sanitization edge cases:** a `../`-bearing or `>30`-char slug is rejected (regex `^[a-z0-9][a-z0-9-]*$`, max 30 chars, rejects `..`/`/`/`\` — `debug.md` list/status/continue steps).

Backend-agnostic: exercises plain markdown read/write under Node as the standing proxy for the Bob run. **Never write to the tracked `.planning/`** — use a scratch root.

---

### `test/roster-capmap.test.cjs` (test, gate inspection transform)

**Analog:** the gate API in `src/bob-adapter.cjs` (`gateArtifact` L200-220, `buildSupportRoster` L231-246, `PRIMITIVE_REASONS` L183-188, `BOB_SKIP_LIST` L173-177, `UNSUPPORTED_MARKER` L22) and the candidate-set shape in `scripts/generate-support-roster.cjs` L29-37.

**Gate-inspection pattern** (RESEARCH §Code Examples / §3):
```javascript
const adapter = require(path.join(repoRoot, 'src', 'bob-adapter.cjs'));
const decl = { isolatedSubagents: false, structuredPrompts: false };
// Every quality-gate candidate degrades cleanly → supported → NO roster line:
for (const name of ['gsd-code-review','gsd-code-review-fix','gsd-debug','gsd-audit-fix','gsd-audit-uat']) {
  assert.equal(adapter.gateArtifact({ name, requires: [] }, decl).supported, true);
}
// Every line that DOES appear must end in a PRIMITIVE_REASONS-traceable reason:
const lines = adapter.buildSupportRoster(candidates, decl);
for (const line of lines) {
  assert.match(line, new RegExp(adapter.UNSUPPORTED_MARKER));
  // reason must trace to a PRIMITIVE_REASONS value or a BOB_SKIP_LIST value
}
```
Two assertions (D-09.3): (a) every skip line's reason traces to a capability-map primitive, and (b) no supported quality-gate artifact is missing.

---

### `test/fixtures/quality-gates/` (test-fixture)

**Analog:** `test/fixtures/core-loop/` — holds `<stem>.command.expected.md`, `<stem>.skill.expected.md`, plus a golden artifact (`PROJECT.golden.md`).

**Pattern:** Freeze one `<stem>.command.expected.md` + `<stem>.skill.expected.md` per quality-gate stem, produced by running the actual converter on the vendored source (the golden is the converter's own output, frozen). For the equivalence test's golden reference (REVIEW.md / DEBUG session), store a frozen golden mirroring `PROJECT.golden.md`. Generate goldens by running `convertClaudeCommandToBobCommand`/`...Skill` on the vendored source once, then commit the output as the fixture.

---

### `scripts/generate-support-roster.cjs` (MODIFIED, config/utility transform)

**Analog:** self — the hard-coded candidate set at L29-37 is the GAP (RESEARCH §3).

**Current state (L29-37):** a Phase-2 representative subset (`gsd-help`, `gsd-plan-phase`, `gsd-execute-phase`, `gsd-autonomous`, `gsd-parallel-fanout`).

**Change (D-06, RESEARCH §3 + Open Question 1):** extend the candidate set so it enumerates the actual emitted set. **Recommended form:** derive candidates from `commands/gsd/*.md` (the same source the installer's `stage.cjs` L239-266 iterates) so the standalone script and the installer agree and the list can't drift:
```javascript
// derive instead of hard-coding — mirrors the installer's enumeration
const cmdDir = path.join(__dirname, '..', 'commands', 'gsd');
const candidates = fs.readdirSync(cmdDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ name: `gsd-${path.basename(f, '.md')}`, requires: [] }));
```
Keep the `gateArtifact`/`buildSupportRoster` call shape (L39-42) and the header/body emission (L44-82) unchanged. Update the header's "Phase 2 representative set" scope note to reflect full-roster generation. Expected result: quality-gate candidates all appear under **Supported**; no new `unsupported on Bob:` line.

**Anti-pattern:** do NOT hand-edit `SUPPORT-ROSTER.md` — it is generated (header line L46).

---

### `README.md` (NEW, doc)

**Analog:** `gsd-core/templates/README.md` for tone (clear tables, authoritative, no marketing fluff); `SUPPORT-ROSTER.md` as the supported-skills *data source*.

**Required-content floor (D-08):** one-line `npx` install; scope (local `.bob/` vs global `~/.bob/`); modes (re-run = update, `--uninstall` + install = clean — **never invented `--clean`/`--update` flags**); supported skills (**sourced from `SUPPORT-ROSTER.md`, not hand-typed** — Pitfall 5); flagged gaps (`unsupported on Bob:` reasons); targeted gsd-core version `1.5.0`; test-deferred / no-local-Bob posture; pointer to `.planning/ACCEPTANCE-CHECKLIST.md`.

---

### `UPSTREAM.md` (NEW, doc)

**Analog/source:** the verified 5-artifact inventory in RESEARCH §5. Copy the table with file:line pointers:

| # | Artifact | File:line |
|---|----------|-----------|
| 1 | `"bob"` registry entry | `gsd-core/bin/lib/capability-registry.cjs` L3045-3109 |
| 2 | Command converter `convertClaudeCommandToBobCommand` | registry L3077/L3095; impl `gsd-core/bin/lib/runtime-artifact-conversion.cjs` |
| 3 | Skill converter `convertClaudeCommandToBobSkill` | registry L3069/L3087; same lib |
| 4 | Runtime alias | `gsd-core/bin/shared/runtime-aliases.manifest.json` L79-82 (`"bob": ["bob","bob-cli"]`) |
| 5 | configHome / shim resolution | `gsd-core/bin/lib/runtime-homes.cjs` `dot-home` case L83-91 + `gsd-tools.cjs` shim (generic, no bob branch) |

Plus the single net-new substance module `src/bob-adapter.cjs` (D-07). Record `gsd-core/VERSION` = `1.5.0`.

---

### `.planning/ACCEPTANCE-CHECKLIST.md` (MODIFIED, doc)

**Analog:** self — entries AC-17..AC-21 (mutating `/gsd-*` step + read-only `ls`/`grep` confirms). Highest existing AC-ID = **AC-21**; append from **AC-22**.

**Per-entry schema (verified from AC-17..AC-21):**
```
## AC-NN — <one-line title> (<REQ-ID>)

Cmd:    On a real Bob machine, AFTER <prior AC>, run <mutating /gsd-* step>; then read-only confirm <ls/grep>.
Expect: <exact expected outputs / file existence / grep counts>. (on-device complement to test/<file>)
Confirms: <REQ-ID> — <restated success criterion> / SC#N.
Result: [ ] pass  [ ] fail
```
Suggested (discretion, RESEARCH §7): AC-22 code-review (+`--fix`), AC-23 debug + `continue` resume, AC-24 audit-fix, AC-25 audit-uat, AC-26 README/upstream-readiness doc checks.

## Shared Patterns

### Vendor-resolver for all tests
**Source:** `test/_helpers/vendor.cjs` L23-28
**Apply to:** every new test file
```javascript
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');
```
Exercises the repo's vendored `gsd-core/` (with the `bob` entry), never the global `~/.claude/gsd-core`.

### Hermetic scratch writes
**Source:** `core-loop-equivalence.test.cjs` L167-173 / `core-loop-contract.test.cjs` L56-58
**Apply to:** every test that writes (debug-state-persistence, contract)
```javascript
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsdbob-<suite>-'));
// ... ; fs.rmSync(dir, { recursive: true, force: true });
```
Never write to the tracked `.planning/`.

### Programmatic forbidden-token construction (self-trip avoidance)
**Source:** `backend-neutrality.test.cjs` L26-28 (base64) / `core-loop-equivalence.test.cjs` L57-60 (`.join('')`)
**Apply to:** any test asserting absence of brand literals or colon-dialect refs
```javascript
const FORBIDDEN = ['Q2xhdWRl','R2VtaW5p','R3Jhbml0ZQ==','R1BU'].map((b)=>Buffer.from(b,'base64').toString('utf8'));
```

### Backend-neutrality must stay green (UP-01)
**Source:** `test/backend-neutrality.test.cjs` — scans the brace-walked `"bob"` block in `capability-registry.cjs` (L52-72) + `src/bob-adapter.cjs`, stripping comments and the `convert...CommandToBob...` source-format token (L41-49) before matching the base64 brand set.
**Apply to:** any edit to `bob-adapter.cjs` or the registry entry — keep zero model-name literals. (No edit expected this phase.)

### Generated-not-hand-edited roster
**Source:** `scripts/generate-support-roster.cjs` (header L44-50) + gate `src/bob-adapter.cjs` L200-246
**Apply to:** `SUPPORT-ROSTER.md` and the README skill list — both derive from the gate output; never hand-maintain.

## No Analog Found

None. Every new/modified file has a direct in-repo analog (this is a port-by-conversion + mirror-the-test phase). The only "new shape" is the debug-state-persistence round-trip, which composes two existing patterns (hermetic scratch + the `debug.md` on-disk session model) rather than introducing a new mechanism.

## Metadata

**Analog search scope:** `commands/gsd/`, `test/`, `test/_helpers/`, `test/fixtures/core-loop/`, `scripts/`, `src/bob-adapter.cjs`, `gsd-core/workflows/`, `.planning/ACCEPTANCE-CHECKLIST.md`
**Files scanned (read in full or targeted):** `test/core-loop-equivalence.test.cjs`, `test/core-loop-contract.test.cjs`, `test/_helpers/vendor.cjs`, `test/backend-neutrality.test.cjs`, `scripts/generate-support-roster.cjs`, `src/bob-adapter.cjs`, plus directory listings
**Pattern extraction date:** 2026-06-19
