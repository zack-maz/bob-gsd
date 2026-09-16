'use strict';

/**
 * command-expansion.test.cjs — CMD-01 / CMD-02 / CMD-03 (Phase 9 verification).
 *
 * The directory-derived "confirm the phase in one command" gate. Iterates the
 * FULL commands/gsd/*.md directory (the drift-proof spine, D-05) rather than any
 * hardcoded name list, so it auto-covers this and every future command addition.
 * Composed from three real in-repo harness idioms (09-PATTERNS "highest-value
 * mapping"):
 *   - the per-stem structural + programmatic-forbidden-token loop from
 *     test/quality-gate-equivalence.test.cjs (Group A), minus the byte-golden diff;
 *   - the scanModelLiterals scan from test/model-neutrality.test.cjs (Group B);
 *   - the scratch-tmpdir stage() emission harness from
 *     test/model-neutrality.test.cjs (Group C).
 *
 * Groups:
 *   A — structural equivalence (per stem, all 31): each source converts to a
 *       Bob-conformant command (non-empty description; argument-hint IFF the
 *       source declared one; effort/allowed-tools/agent/type/requires stripped)
 *       and skill (name + non-empty description only, no argument-hint); neither
 *       body carries a Claude config-home path form or the colon command dialect;
 *       the conversion carries the .bob home + hyphen form.
 *   B — neutrality (per stem, all 31): scanModelLiterals over each EMITTED
 *       (neutralizeModelReferences post-pass, as stage.cjs applies) command and
 *       skill returns [] (reuse the shared detector, D-06).
 *   C — emitted count (CMD-01, D-07): one scratch stage() run emits N command
 *       files and N skill SKILL.md files where N === the number of
 *       commands/gsd sources; a single guard pins that N === 31.
 *   D — roster reflects 31 (CMD-02): repo-root SUPPORT-ROSTER.md lists every
 *       commands/gsd stem as gsd-<stem> under the Supported section.
 *
 * Hermetic: the converter is resolved via requireVendor (the repo's vendored
 * gsd-core, which carries the `bob` runtime — never the global install); every
 * scratch write goes to a mkdtempSync temp dir under os.tmpdir(), never the
 * tracked .planning/. Forbidden/required tokens are built PROGRAMMATICALLY via
 * .join('') so this file's own prose never contains the literals it forbids.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');

const conv = requireVendor('runtime-artifact-conversion.cjs');
const { scanModelLiterals, neutralizeModelReferences } = require(path.join(repoRoot, 'src', 'bob-adapter.cjs'));
const { stage } = require(path.join(repoRoot, 'src', 'installer', 'stage.cjs'));
const { newReport } = require(path.join(repoRoot, 'src', 'installer', 'report.cjs'));
const manifestMod = require(path.join(repoRoot, 'src', 'installer', 'manifest.cjs'));

// The drift-proof spine: enumerate stems from the directory, NEVER a hardcoded
// 31-name list (mirrors roster-capmap.test.cjs:53-67).
const cmdSrcDir = path.join(repoRoot, 'commands', 'gsd');
const stems = fs
  .readdirSync(cmdSrcDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => path.basename(f, '.md'));

// Forbidden / required tokens built PROGRAMMATICALLY (mirrors
// quality-gate-equivalence.test.cjs:49-53) so this file's prose never contains
// the literal tokens it forbids. The config-home leak target is the PATH form
// (`.claude/`), NOT the bare substring `.claude`.
const claudeHomePath = ['.', 'claude', '/'].join('');
const colonDialect = ['gsd', ':'].join('');
const bobHome = ['.', 'bob'].join('');
const hyphenForm = ['gsd', '-'].join('');

// ---- scratch stage() harness (mirrors model-neutrality.test.cjs:48-89) --------

// Every scratch() dir is tracked and removed in the after-hook so a full gsd-core
// payload copy never leaks into os.tmpdir() across runs (hermetic-cleanup convention, WR-01).
const scratchDirs = [];
function scratch(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
  scratchDirs.push(dir);
  return dir;
}

test.after(() => {
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function freshManifest(target) {
  return manifestMod.buildManifest({
    scope: 'local',
    configHome: target,
    gsdBobVersion: '0.0.0-test',
    entries: [],
  });
}

function baseOpts(overrides = {}) {
  const target = overrides.target || scratch('target');
  const workspaceRoot = overrides.workspaceRoot || scratch('ws');
  return {
    target,
    scope: 'local',
    workspaceRoot,
    dryRun: false,
    manifest: overrides.manifest || freshManifest(target),
    report: overrides.report || newReport(),
    repoRoot: overrides.repoRoot || repoRoot,
    ...overrides,
  };
}

// ---- Group A — structural equivalence (per stem, all 31) ---------------------

for (const stem of stems) {
  const name = `${hyphenForm}${stem}`;
  const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');
  // Data-driven: the command must keep argument-hint IFF the SOURCE declared one.
  const sourceHasArgumentHint = /^argument-hint:/m.test(source);

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
    assert.doesNotMatch(fm, /^type:/m);
    assert.doesNotMatch(fm, /^requires:/m);
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

// Cross-cutting: at least one converted body rewrites a config-home ref to the
// .bob home + hyphen form (positive neutralization proof over the full set).
test('at least one converted body references the .bob home + hyphen form (positive neutralization proof)', () => {
  let sawBobHome = false;
  let sawHyphenForm = false;
  for (const stem of stems) {
    const name = `${hyphenForm}${stem}`;
    const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');
    const cmd = conv.convertClaudeCommandToBobCommand(source, name);
    const skill = conv.convertClaudeCommandToBobSkill(source, name);
    if (cmd.includes(bobHome) || skill.includes(bobHome)) sawBobHome = true;
    if (cmd.includes(hyphenForm) || skill.includes(hyphenForm)) sawHyphenForm = true;
  }
  assert.ok(sawBobHome, 'the conversion rewrites at least one config-home ref to the .bob home');
  assert.ok(sawHyphenForm, 'the conversion carries the hyphen command form');
});

// ---- Group B — neutrality (per stem, all 31) ---------------------------------

for (const stem of stems) {
  const name = `${hyphenForm}${stem}`;
  test(`${stem}: EMITTED command + skill carry ZERO model literals (scanModelLiterals over the neutralized post-pass)`, () => {
    const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');
    // Mirror stage.cjs exactly: the emitted artifact is the converter output run
    // through the neutralizeModelReferences post-pass. Assert the zero-literal
    // property of what actually reaches .bob/, not the raw converter output (WR-02).
    const cmd = neutralizeModelReferences(conv.convertClaudeCommandToBobCommand(source, name));
    const skill = neutralizeModelReferences(conv.convertClaudeCommandToBobSkill(source, name));
    assert.deepEqual(
      scanModelLiterals(cmd),
      [],
      `emitted command ${name} must carry zero model literals`,
    );
    assert.deepEqual(
      scanModelLiterals(skill),
      [],
      `emitted skill ${name} must carry zero model literals`,
    );
  });
}

// ---- Group C — emitted count (CMD-01, D-07) ----------------------------------

test('CMD-01: a scratch stage() run emits one command + one skill per source (count === source count)', () => {
  const target = scratch('count');
  stage(baseOpts({ target }));

  const emittedCmds = fs
    .readdirSync(path.join(target, 'commands'))
    .filter((f) => /^gsd-.*\.md$/.test(f));
  const skillsDir = path.join(target, 'skills');
  const emittedSkills = fs
    .readdirSync(skillsDir)
    .filter((d) => /^gsd-/.test(d) && fs.existsSync(path.join(skillsDir, d, 'SKILL.md')));

  // Counts are DERIVED from the source-stem count — never a magic number.
  assert.equal(emittedCmds.length, stems.length, 'emitted .bob/commands/gsd-*.md === source count');
  assert.equal(emittedSkills.length, stems.length, 'emitted .bob/skills/gsd-*/SKILL.md === source count');
  assert.equal(emittedCmds.length, emittedSkills.length, 'command count === skill count');

  // The SINGLE pinned literal 31 (Pitfall 4) — every other count derives from here.
  assert.equal(stems.length, 31, 'CMD-01: commands/gsd/ holds exactly 31 sources');
});

// ---- Group D — roster reflects 31 (CMD-02) -----------------------------------

test('CMD-02: repo-root SUPPORT-ROSTER.md lists every source stem as gsd-<stem> under Supported', () => {
  const roster = fs.readFileSync(path.join(repoRoot, 'SUPPORT-ROSTER.md'), 'utf8');

  // Slice out ONLY the Supported section so a stem appearing in an Unsupported
  // reason line can never falsely satisfy the assertion.
  const supHeadingIdx = roster.search(/^##\s+Supported\b/m);
  assert.ok(supHeadingIdx >= 0, 'SUPPORT-ROSTER.md has a Supported section');
  const afterSup = roster.slice(supHeadingIdx);
  const nextHeadingIdx = afterSup.slice(1).search(/^##\s+/m);
  const supportedSection = nextHeadingIdx >= 0 ? afterSup.slice(0, nextHeadingIdx + 1) : afterSup;

  for (const stem of stems) {
    const line = new RegExp(`^-\\s+${hyphenForm}${stem}\\s*$`, 'm');
    assert.match(
      supportedSection,
      line,
      `SUPPORT-ROSTER.md Supported section must list ${hyphenForm}${stem}`,
    );
  }
});
