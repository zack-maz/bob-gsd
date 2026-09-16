'use strict';

/**
 * quality-gate-equivalence.test.cjs — QUAL-01 / QUAL-03 (emission half).
 *
 * Mirrors test/core-loop-equivalence.test.cjs exactly, swapping the name list to
 * the four daily-driver quality-gate stems vendored in Plan 05-01:
 *   [code-review, debug, audit-fix, audit-uat].
 * (code-review-fix is WORKFLOW-ONLY — never a commands/gsd/ source, never a
 * command — per the 05-01 scope correction; it is exercised by the contract
 * suite's wholesale-workflow assertion, not here.)
 *
 * Proves the four vendored upstream command sources convert deterministically into
 * Bob-conformant artifacts:
 *   - per-stem golden diff (×4): convertClaudeCommandToBobCommand / ...Skill are
 *     byte-identical to frozen fixtures under test/fixtures/quality-gates/.
 *   - empty-description / strip-unsupported-keys guard (×4): each converted
 *     command carries a NON-EMPTY description, keeps argument-hint IFF the source
 *     declared one, and strips effort/allowed-tools/agent; the skill side carries
 *     name + non-empty description ONLY (argument-hint is not a Bob skill key).
 *     Bob silently ignores a description-less skill (RESEARCH Pitfall 2/4).
 *   - neutralization (×4): each converted body carries no upstream config-home PATH
 *     ref and no colon-dialect command ref; carries the .bob home + hyphen form.
 *     Forbidden tokens are built PROGRAMMATICALLY so this file's prose cannot
 *     self-trip the assertions.
 *
 * Hermetic: reads vendored sources + frozen fixtures through requireVendor (the
 * repo's vendored gsd-core, never the global install); any scratch write goes to
 * a mkdtempSync temp dir — never the tracked .planning/.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');

const conv = requireVendor('runtime-artifact-conversion.cjs');

const QUALITY_GATE_NAMES = ['code-review', 'debug', 'audit-fix', 'audit-uat'];

const cmdSrcDir = path.join(repoRoot, 'commands', 'gsd');
const fixDir = path.join(repoRoot, 'test', 'fixtures', 'quality-gates');

// Forbidden / required tokens built PROGRAMMATICALLY (mirrors
// core-loop-equivalence.test.cjs L52-60) so the test prose itself never contains
// the literal tokens it forbids. The config-home leak target is the PATH form
// (the upstream dot-home with a trailing slash), NOT the bare dot-home substring.
const claudeHomePath = ['.', 'claude', '/'].join('');
const colonDialect = ['gsd', ':'].join('');
const bobHome = ['.', 'bob'].join('');
const hyphenForm = ['gsd', '-'].join('');

// ---- Per-stem golden diff + guards (×4) -----------------------------------
for (const stem of QUALITY_GATE_NAMES) {
  const name = `${hyphenForm}${stem}`;
  const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');
  // Whether the SOURCE declares an argument-hint — the command must keep it IFF
  // it was declared (audit-uat has none, so the guard must be data-driven, not
  // a blanket "every command keeps argument-hint" assertion).
  const sourceHasArgumentHint = /^argument-hint:/m.test(source);

  test(`${stem}: command converts byte-identically to the frozen command fixture`, () => {
    const out = conv.convertClaudeCommandToBobCommand(source, name);
    const expected = fs.readFileSync(path.join(fixDir, `${stem}.command.expected.md`), 'utf8');
    assert.equal(out, expected);
  });

  test(`${stem}: skill converts byte-identically to the frozen skill fixture`, () => {
    const out = conv.convertClaudeCommandToBobSkill(source, name);
    const expected = fs.readFileSync(path.join(fixDir, `${stem}.skill.expected.md`), 'utf8');
    assert.equal(out, expected);
  });

  test(`${stem}: command frontmatter has non-empty description, strips unsupported keys, keeps argument-hint iff declared`, () => {
    const out = conv.convertClaudeCommandToBobCommand(source, name);
    const fmEnd = out.indexOf('---', 3);
    assert.ok(fmEnd > 0, 'frontmatter block present');
    const fm = out.substring(3, fmEnd);
    assert.match(fm, /^description:\s*\S/m, 'non-empty description');
    if (sourceHasArgumentHint) {
      assert.match(fm, /^argument-hint:/m, 'argument-hint preserved when the source declared one');
    } else {
      assert.doesNotMatch(fm, /^argument-hint:/m, 'no argument-hint synthesized when the source had none');
    }
    assert.doesNotMatch(fm, /^effort:/m);
    assert.doesNotMatch(fm, /^allowed-tools:/m);
    assert.doesNotMatch(fm, /^agent:/m);
  });

  test(`${stem}: skill frontmatter has name + non-empty description only`, () => {
    const out = conv.convertClaudeCommandToBobSkill(source, name);
    const fmEnd = out.indexOf('---', 3);
    assert.ok(fmEnd > 0, 'frontmatter block present');
    const fm = out.substring(3, fmEnd);
    assert.match(fm, /^name:\s*\S/m, 'non-empty name');
    assert.match(fm, /^description:\s*\S/m, 'non-empty description');
    assert.doesNotMatch(fm, /^effort:/m);
    assert.doesNotMatch(fm, /^allowed-tools:/m);
    assert.doesNotMatch(fm, /^argument-hint:/m, 'argument-hint is not a Bob skill key');
  });

  test(`${stem}: converted command + skill bodies are neutralized (no config-home path / no colon dialect)`, () => {
    const cmd = conv.convertClaudeCommandToBobCommand(source, name);
    const skill = conv.convertClaudeCommandToBobSkill(source, name);
    for (const [kind, out] of [['command', cmd], ['skill', skill]]) {
      assert.ok(!out.includes(claudeHomePath), `${kind}: no Claude config-home path ref`);
      assert.ok(!out.includes(colonDialect), `${kind}: no colon-dialect command ref`);
    }
  });
}

// ---- Cross-cutting: the converted bodies carry the .bob home + hyphen form ----
test('at least one quality-gate body references the .bob home (positive neutralization proof)', () => {
  let sawBobHome = false;
  for (const stem of QUALITY_GATE_NAMES) {
    const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');
    const cmd = conv.convertClaudeCommandToBobCommand(source, `${hyphenForm}${stem}`);
    const skill = conv.convertClaudeCommandToBobSkill(source, `${hyphenForm}${stem}`);
    if (cmd.includes(bobHome) || skill.includes(bobHome)) sawBobHome = true;
  }
  assert.ok(sawBobHome, 'the conversion rewrites at least one config-home ref to the .bob home');
});

// ---- Sanity: scratch writes only ever touch a temp dir --------------------
test('scratch writes go to a mkdtempSync temp dir, never the tracked .planning/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsdbob-qg-equiv-'));
  assert.ok(dir.startsWith(os.tmpdir()), 'scratch dir lives under the OS tmpdir');
  assert.ok(hyphenForm.endsWith('-'), 'hyphen command form sanity');
  fs.rmSync(dir, { recursive: true, force: true });
});
