---
phase: 02-runtime-foundation-artifact-translation
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/bob-adapter.cjs
  - scripts/generate-support-roster.cjs
  - scripts/fix-slash-commands.cjs
  - gsd-core/bin/lib/capability-registry.cjs
  - gsd-core/bin/lib/runtime-artifact-conversion.cjs
  - gsd-core/bin/lib/runtime-name-policy.cjs
  - package.json
  - test/skill-golden.test.cjs
  - test/command-golden.test.cjs
  - test/merge.test.cjs
  - test/unsupported-gate.test.cjs
  - test/descriptor.test.cjs
  - test/backend-neutrality.test.cjs
  - test/planning-bytecompat.test.cjs
  - test/text-mode-golden.test.cjs
  - test/_helpers/vendor.cjs
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-17
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed the net-new Bob runtime-foundation and artifact-translation work: the
isolated `src/bob-adapter.cjs` (mergeCustomModes / gateArtifact / emitGsdMode /
buildSupportRoster), the roster generator, the two new vendored converter
functions (`convertClaudeCommandToBobSkill` / `convertClaudeCommandToBobCommand`)
plus the `bob` registry/alias entries, and the test suite. All 42 tests pass.

The substantive defect is a **parity-breaking gap in the Bob converters**: unlike
every sibling converter in the same module (Antigravity, Gemini, Kilo, etc.), the
Bob converters perform NO body neutralization. They pass the source body through
verbatim, so `.claude/` / `~/.claude/` / `$HOME/.claude/` path references and the
deprecated `gsd:<cmd>` colon form survive into the emitted `.bob/` artifacts. The
current installed GSD payload contains 156+ `.claude/gsd` references and 59 files
with `~/.claude`/`$HOME/.claude` references, so this is actively triggered, not
latent. The golden fixtures were authored without any `.claude`/`gsd:` body
content, so the test suite cannot detect the gap — it bakes in the buggy behavior.

Secondary issues: `mergeCustomModes` is not robust to a non-mapping YAML root
(throws or silently drops the gsd mode), and the shared frontmatter extractor
mangles YAML block-scalar descriptions (latent for today's payload).

Scope note honored: pre-existing vendored upstream code was not flagged; only the
authored Bob delta and the net-new adapter/script logic were reviewed.

## Critical Issues

### CR-01: Bob converters skip path/command neutralization that every peer converter applies

**File:** `gsd-core/bin/lib/runtime-artifact-conversion.cjs:695-701, 714-727`
**Issue:**
Both net-new Bob converters pass the body through verbatim:

```js
function convertClaudeCommandToBobSkill(content, skillName, ...) {
  const { frontmatter, body } = extractFrontmatterAndBody(content);
  ...
  return `${fm}\n${body}`;          // body untouched
}
function convertClaudeCommandToBobCommand(content, _commandName) {
  ...
  const projectedBody = body.replace(/\$ARGUMENTS\b/g, '$1'); // ONLY $ARGUMENTS
  return `${fm}${projectedBody}`;
}
```

Every sibling converter neutralizes runtime paths and command-name dialect on the
body (see `convertClaudeToAntigravityContent`, lines 632-655, whose doc-comment
states this is "Applied to ALL content (skills, agents, engine files)"):

- `~/.claude/`, `$HOME/.claude/`, `./.claude/`, `.claude/` → the runtime's home
- `gsd:` → `gsd-` (the canonical hyphen form; the colon form is deprecated per
  CLAUDE.md / gsd-core #2808 and is non-routable in Bob)

The Bob registry declares `configHome.name === ".bob"` (capability-registry.cjs
line 3055), yet emitted Bob skills/commands will still instruct the model to look
under `.claude/`. Verified against the live payload: 156 `.claude/gsd` references
and 59 files referencing `~/.claude`/`$HOME/.claude` exist in installed skill
bodies — all would be emitted into `.bob/skills` unchanged. This breaks the
phase's stated parity-first contract (a Bob artifact must work on the Bob runtime)
and contradicts CLAUDE.md ("only `gsd-<cmd>` hyphen form is routable"; "Bob is
skills/commands/rules-driven", `.bob` home).

The `$ARGUMENTS` → `$1` projection is the only body transform applied, which makes
the omission of path/command neutralization look deliberate rather than overlooked.

**Fix:** Add a Bob content-neutralization pass mirroring the Antigravity converter,
mapping `.claude` references to Bob's `.bob` home and converting `gsd:` → `gsd-`,
and apply it to BOTH converters' bodies. Example:

```js
function convertClaudeToBobContent(content, isGlobal = false) {
  let c = content;
  const home = isGlobal ? '~/.bob/' : '.bob/';
  c = c.replace(/\$HOME\/\.claude\//g, home).replace(/~\/\.claude\//g, home);
  c = c.replace(/\$HOME\/\.claude\b/g, home.replace(/\/$/, ''))
       .replace(/~\/\.claude\b/g, home.replace(/\/$/, ''));
  c = c.replace(/\.\/\.claude\//g, './.bob/').replace(/\.claude\//g, '.bob/');
  c = c.replace(/gsd:/g, 'gsd-');
  return c;
}
// in convertClaudeCommandToBobSkill: run body through convertClaudeToBobContent
// in convertClaudeCommandToBobCommand: neutralize, THEN project $ARGUMENTS
```

Confirm the exact target home/path mapping against the Phase-3 install plan, then
update golden fixtures (see WR-03) to lock the new behavior.

## Warnings

### WR-01: mergeCustomModes throws or silently drops the gsd mode on a non-mapping YAML root

**File:** `src/bob-adapter.cjs:77-89`
**Issue:**
The merge assumes `yaml.load(existingYamlText)` returns an object. It does not
defend against a YAML root that is a scalar or a sequence:

- Scalar root (e.g. file contains `just a string`): `doc.customModes = filtered`
  throws `TypeError: Cannot create property 'customModes' on string`.
- Sequence root (e.g. file is a top-level YAML list): `doc` is an Array; assigning
  `doc.customModes` sets an ignored property and `yaml.dump(doc)` re-emits the
  bare array — the gsd mode is **silently dropped** (verified:
  `mergeCustomModes('- one\n- two\n', emitGsdMode())` returns `"- one\n- two\n"`
  with no gsd entry). A user with a malformed `custom_modes.yaml` would get no GSD
  mode installed and no error — the opposite of the phase's "loud failure" intent.

**Fix:** Guard that the parsed root is a plain object before mutating; otherwise
fail loudly or start from an empty object:

```js
const parsed = existingYamlText ? yaml.load(existingYamlText) : {};
const doc = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
  ? parsed
  : {};
```

Decide intentionally: silently re-homing a non-mapping file into a fresh doc loses
the user's existing content, so throwing a clear error may be the safer choice.

### WR-02: Block-scalar (`|` / `>`) descriptions are mangled to `"|"`, dropping the real text

**File:** `gsd-core/bin/lib/runtime-artifact-conversion.cjs:754-759` (used by the
net-new Bob converters at lines 698 and 716)
**Issue:**
`extractFrontmatterField` captures only the first line after the field name:
`new RegExp('^description:\\s*(.+)$', 'm')`. For a YAML block scalar the first line
is just the `|` or `>` indicator, so the description resolves to the literal `|`.
Verified: a source skill with `description: |\n  Line one\n  Line two` produces
`description: "|"` in the Bob output, dropping the actual description. Per CLAUDE.md
a Bob skill "without a usable description is ignored" — so such a skill would be
silently skipped by Bob.

Today's GSD payload uses single-line quoted descriptions, so this is latent, but
the converter is general-purpose and the failure mode is silent skill loss.

**Fix:** Detect block-scalar indicators and either reject loudly during conversion
or fold the block body into a single quoted line before `yamlQuote`. At minimum,
add a guard so a `|`/`>` description never silently becomes `"|"`.

### WR-03: Golden fixtures omit `.claude`/`gsd:` body content, so tests cannot catch CR-01

**File:** `test/fixtures/skill/input.md`, `test/fixtures/command/input.md` (and the
golden assertions in `test/skill-golden.test.cjs:20-23`,
`test/command-golden.test.cjs:20-23`)
**Issue:**
The golden inputs contain no `.claude/`, `~/.claude/`, `$HOME/.claude/`, or
`gsd:<cmd>` references, and the expected outputs assert verbatim body
pass-through. The suite therefore green-lights the CR-01 behavior and provides no
regression guard for the parity-critical neutralization. The only body transform
exercised is `$ARGUMENTS` → `$1`.

**Fix:** Add `.claude/gsd/...`, `~/.claude/...`, and a `/gsd:something` reference to
the fixture bodies and assert the expected `.bob/` + `gsd-` rewrites, so the golden
diff fails until CR-01 is fixed.

### WR-04: gateArtifact treats a null candidate as supported; nameless candidate yields a malformed roster line

**File:** `src/bob-adapter.cjs:127-141, 152-161`
**Issue:**
- `gateArtifact(null, decl)` returns `{ supported: true }` (the `candidate &&`
  guard short-circuits the skip-list check, `required` defaults to `[]`, loop is
  empty). A null/malformed candidate is silently admitted to the loadable set
  instead of being flagged — counter to the loud-gate intent (D-10/TRANS-04).
- `buildSupportRoster([{ requires: ['structuredPrompts'] }], {})` emits the literal
  line `"undefined: unsupported on Bob: ..."` for a candidate with no `name`.

**Fix:** Validate candidate shape and fail loudly (or exclude with a concrete
reason) when `candidate` is null or `candidate.name` is not a non-empty string,
rather than admitting it or emitting `undefined:` into the roster.

## Info

### IN-01: PRIMITIVE_REASONS and the curated skip-list duplicate human-readable strings

**File:** `src/bob-adapter.cjs:100-115`
**Issue:** `BOB_SKIP_LIST['gsd-autonomous']` and
`PRIMITIVE_REASONS.isolatedSubagents` carry near-identical prose about Bob running
subagents sequentially. Minor duplication; acceptable for v1 but worth consolidating
when the full roster lands in Phases 4-5.
**Fix:** Reference a single shared reason constant for the "sequential inline
subagents" rationale.

### IN-02: package.json lacks `bin`/`files` for the advertised npx distribution

**File:** `package.json:1-16`
**Issue:** The project is described as an npx-installable adapter (one-line
`npx ... gsd-bob`), but there is no `bin` map and no `files` allowlist. Out of this
phase's scope (installer is Phase 3), noted so it is not forgotten.
**Fix:** Add `bin`/`files` when the Phase-3 installer entry point exists.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
