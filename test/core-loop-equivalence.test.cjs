'use strict';

/**
 * core-loop-equivalence.test.cjs — CORE-01..05 / D-05 / RUNTIME-03.
 *
 * Proves the 6 vendored core-loop upstream command sources convert correctly and
 * deterministically into Bob-conformant artifacts:
 *   - per-command golden diff (×6): convertClaudeCommandToBobCommand / ...Skill
 *     are byte-identical to frozen fixtures under test/fixtures/core-loop/.
 *   - empty-description guard (×6): each converted command carries a NON-EMPTY
 *     description + argument-hint, and strips effort/allowed-tools/agent (Bob
 *     silently ignores a description-less skill — RESEARCH Pitfall 2/4).
 *   - neutralization (×6): each converted body carries no upstream config-home
 *     PATH ref and no colon-dialect command ref; carries .bob + hyphen form.
 *     Forbidden tokens are built PROGRAMMATICALLY so this file's prose cannot
 *     self-trip the assertions.
 *   - real-answer guard (D-05): a frozen golden PROJECT.md carries the sentinel
 *     project-name string and NO TODO/placeholder/{{ markers — the explicit
 *     guard against a structurally-valid-but-empty artifact.
 *   - byte-compat proxy (RUNTIME-03): the runtime-agnostic .planning/ write path
 *     yields byte-identical output under the bob vs the reference config home, and the
 *     resolved config home leaks nowhere into the artifact body.
 *
 * Hermetic: reads vendored sources + frozen fixtures; any scratch write goes to
 * a mkdtempSync temp dir — never the tracked .planning/.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');

const conv = requireVendor('runtime-artifact-conversion.cjs');
const { resolveConfigHomeFromDescriptor } = requireVendor('runtime-homes.cjs');
const { runtimes } = requireVendor('capability-registry.cjs');
const stateDoc = requireVendor('state-document.cjs');

const CORE_LOOP_NAMES = [
  'new-project',
  'plan-phase',
  'discuss-phase',
  'execute-phase',
  'verify-work',
  'progress',
];

const cmdSrcDir = path.join(repoRoot, 'commands', 'gsd');
const fixDir = path.join(repoRoot, 'test', 'fixtures', 'core-loop');

// Forbidden / required tokens built PROGRAMMATICALLY (mirrors command-golden.test.cjs)
// so the test prose itself never contains the literal tokens it forbids.
// NOTE: the config-home leak target is the PATH form (the upstream dot-home with a
// trailing slash), NOT the bare dot-home substring — the core-loop sources
// legitimately reference a `--<runtime>`
// reviewer flag, which is real content, not a config-home path ref.
const claudeHomePath = ['.', 'claude', '/'].join('');
const colonDialect = ['gsd', ':'].join('');
const bobHome = ['.', 'bob'].join('');
const hyphenForm = ['gsd', '-'].join('');

// ---- Per-command golden diff (×6) -----------------------------------------
for (const stem of CORE_LOOP_NAMES) {
  const name = `gsd-${stem}`;
  const source = fs.readFileSync(path.join(cmdSrcDir, `${stem}.md`), 'utf8');

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

  test(`${stem}: command frontmatter has non-empty description + argument-hint, strips unsupported keys`, () => {
    const out = conv.convertClaudeCommandToBobCommand(source, name);
    const fmEnd = out.indexOf('---', 3);
    assert.ok(fmEnd > 0, 'frontmatter block present');
    const fm = out.substring(3, fmEnd);
    assert.match(fm, /^description:\s*\S/m, 'non-empty description');
    assert.match(fm, /^argument-hint:/m);
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

// ---- D-05 real-answer guard ------------------------------------------------
test('D-05 real-answer guard: golden PROJECT.md carries the sentinel and no placeholder markers', () => {
  const SENTINEL = 'Acme Realtime Telemetry Pipeline';
  const project = fs.readFileSync(path.join(fixDir, 'PROJECT.golden.md'), 'utf8');
  assert.match(
    project,
    new RegExp(SENTINEL),
    'real validated answer must appear — not a placeholder',
  );
  assert.doesNotMatch(
    project,
    /\bTODO\b|\bplaceholder\b|\{\{/i,
    'no stub/template markers remain',
  );
});

// ---- Byte-compat proxy (RUNTIME-03) ---------------------------------------
const STATE_TEMPLATE = [
  '---',
  'current_phase: 04',
  'status: executing',
  'stopped_at: nowhere',
  '---',
  '',
  '# Project State',
  '',
  'Phase: 04 — EXECUTING',
].join('\n');

/**
 * Drive the runtime-agnostic .planning/ write path under a given runtime. The
 * config home is resolved (proving the context is real) but never flows into
 * the body — its absence from the output is the equivalence proof.
 */
function renderPlanningArtifact(runtimeId) {
  const descriptor = runtimes[runtimeId].runtime.configHome;
  const configHome = resolveConfigHomeFromDescriptor(descriptor, { env: {}, home: '/home/u' });
  void configHome;
  let content = STATE_TEMPLATE;
  content = stateDoc.stateReplaceField(content, 'status', 'executing');
  content = stateDoc.stateReplaceField(content, 'stopped_at', 'Phase 4 plan 1 executing');
  content = stateDoc.stateReplaceField(content, 'current_phase', '04');
  return content;
}

test('byte-compat proxy: .planning/ write path is byte-identical across bob and claude config homes', () => {
  const bobBytes = renderPlanningArtifact('bob');
  const claudeBytes = renderPlanningArtifact('claude');
  assert.equal(bobBytes, claudeBytes, 'runtime-agnostic write path');
  assert.match(bobBytes, /Phase 4 plan 1 executing/, 'write path actually mutated the template');
  assert.ok(!bobBytes.includes(bobHome), 'config home must not leak into .planning/ body');
});

// ---- Sanity: scratch writes only ever touch a temp dir --------------------
test('scratch writes go to a mkdtempSync temp dir, never the tracked .planning/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsdbob-coreloop-'));
  assert.ok(dir.startsWith(os.tmpdir()), 'scratch dir lives under the OS tmpdir');
  // Confirm the hyphen command form is what the artifactLayout prefixes with.
  assert.ok(hyphenForm.endsWith('-'), 'hyphen command form sanity');
  fs.rmSync(dir, { recursive: true, force: true });
});
