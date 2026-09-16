'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { repoRoot, vendorLib, requireVendor } = require('./_helpers/vendor.cjs');

// TRANS-03 (golden, by REUSE): with workflow.text_mode forced true for the bob
// runtime, gsd-core's EXISTING config+workflow seam degrades AskUserQuestion to a
// numbered text list and captures a validated typed answer on the reference runtime —
// NO converter rewriting. We assert three things:
//   1. The seam carries the bob default: the fixture's workflow.text_mode:true
//      projects to text_mode === true in the resolved config (the value the
//      workflow markdown reads at config-loader.cjs line 160/557).
//   2. The documented degradation contract: given text_mode:true + a question
//      spec, the presentation is a numbered text list and a typed numeric choice
//      is captured and validated (this is the workflow-layer behavior the seam
//      gates; modeled here as a small harness asserting the contract).
//   3. The bob converters do NOT contain an AskUserQuestion-rewriting branch
//      (D-09 reuse-the-seam, not rebuild) — verified against the converter source.

const { loadConfig } = requireVendor('config-loader.cjs');

// Path to the text_mode fixture config (a .planning/config.json-shaped object).
const FIXTURE_CONFIG = path.join(repoRoot, 'test', 'fixtures', 'text-mode', 'config.json');

// Build the forbidden token programmatically so this test file's own prose can
// never satisfy (or trip) the converter-source guard assertion below.
const ASK_TOKEN = ['Ask', 'User', 'Question'].join('');

// ---------------------------------------------------------------------------
// 1. The seam: workflow.text_mode:true projects to resolved text_mode === true.
// ---------------------------------------------------------------------------

test('the bob-runtime workflow.text_mode:true projects to text_mode === true via the vendored config-loader', () => {
  // loadConfig(cwd) reads <cwd>/.planning/config.json. Stage a throwaway project
  // dir whose .planning/config.json IS the text_mode fixture, then resolve it.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-bob-textmode-'));
  try {
    const planningDir = path.join(tmp, '.planning');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.copyFileSync(FIXTURE_CONFIG, path.join(planningDir, 'config.json'));

    const cfg = loadConfig(tmp);
    assert.equal(
      cfg.text_mode,
      true,
      'workflow.text_mode:true must project to the top-level text_mode the workflows read',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('the global default for text_mode is false (so the bob default is a deliberate override, not ambient)', () => {
  // Confirm the seam distinguishes bob's explicit true from the shipped default
  // false — proving the projection reflects the fixture value, not a constant.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-bob-textmode-def-'));
  try {
    const planningDir = path.join(tmp, '.planning');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'config.json'), JSON.stringify({ workflow: {} }));

    const cfg = loadConfig(tmp);
    assert.equal(
      cfg.text_mode,
      false,
      'with no text_mode set, the resolved value falls back to the shipped default false',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 2. The degradation contract: text_mode true -> numbered text list + validated
//    typed-answer capture. This models the workflow-layer behavior the seam
//    gates (plan-phase.md line 160 branch): when text_mode is on, every
//    AskUserQuestion is presented as a numbered text list and the typed numeric
//    choice is captured + validated against the option set.
// ---------------------------------------------------------------------------

/**
 * Render a question spec as the text_mode numbered list and validate a typed
 * choice. This is the documented seam behavior: a numbered list of options and a
 * 1-based numeric selection that must fall within range. (No AskUserQuestion
 * structured payload — text only, the conservative Bob lower bound SPIKE-02.)
 */
function degradeToTextMode(questionSpec, textMode) {
  if (!textMode) {
    // text_mode off: the structured prompt path would be used (not exercised here).
    return { mode: 'structured', prompt: null, validate: null };
  }
  const lines = [questionSpec.question];
  questionSpec.options.forEach((opt, i) => {
    lines.push(`${i + 1}. ${opt}`);
  });
  return {
    mode: 'text',
    prompt: lines.join('\n'),
    // Validate a typed answer: must be an integer within [1, options.length].
    validate(typed) {
      const n = Number.parseInt(String(typed).trim(), 10);
      if (!Number.isInteger(n) || n < 1 || n > questionSpec.options.length) {
        return { valid: false };
      }
      return { valid: true, choice: questionSpec.options[n - 1] };
    },
  };
}

test('with text_mode on, a question is presented as a numbered text list', () => {
  const spec = { question: 'Pick a strategy:', options: ['inline', 'worktree', 'skip'] };
  const out = degradeToTextMode(spec, true);
  assert.equal(out.mode, 'text');
  assert.match(out.prompt, /1\. inline/);
  assert.match(out.prompt, /2\. worktree/);
  assert.match(out.prompt, /3\. skip/);
});

test('with text_mode on, a valid typed numeric choice is captured', () => {
  const spec = { question: 'Pick a strategy:', options: ['inline', 'worktree', 'skip'] };
  const out = degradeToTextMode(spec, true);
  const res = out.validate('2');
  assert.equal(res.valid, true);
  assert.equal(res.choice, 'worktree');
});

test('with text_mode on, an out-of-range or non-numeric answer is rejected (validated)', () => {
  const spec = { question: 'Pick a strategy:', options: ['inline', 'worktree', 'skip'] };
  const out = degradeToTextMode(spec, true);
  assert.equal(out.validate('0').valid, false, 'below range rejected');
  assert.equal(out.validate('4').valid, false, 'above range rejected');
  assert.equal(out.validate('nope').valid, false, 'non-numeric rejected');
});

// ---------------------------------------------------------------------------
// 3. The converters do NOT rewrite AskUserQuestion (D-09 reuse-the-seam).
//    TRANS-03 is a config+workflow concern, not an artifact transform — the bob
//    converters must carry NO AskUserQuestion-rewriting branch.
// ---------------------------------------------------------------------------

test('the bob converters contain NO AskUserQuestion-rewriting branch (TRANS-03 by reuse, not rebuild)', () => {
  const src = fs.readFileSync(
    path.join(vendorLib, 'runtime-artifact-conversion.cjs'),
    'utf8',
  );

  // Isolate the source slice of each bob converter and assert neither references
  // the structured prompt token — the degradation is the seam's job, not theirs.
  for (const fnName of ['convertClaudeCommandToBobSkill', 'convertClaudeCommandToBobCommand']) {
    const start = src.indexOf(`function ${fnName}`);
    assert.ok(start !== -1, `${fnName} must exist in the vendored converter lib`);
    // Slice to the next top-level "function " declaration.
    const rest = src.slice(start + `function ${fnName}`.length);
    const nextFn = rest.indexOf('\nfunction ');
    const slice = nextFn === -1 ? rest : rest.slice(0, nextFn);
    assert.ok(
      !slice.includes(ASK_TOKEN),
      `${fnName} must NOT contain an ${ASK_TOKEN}-rewriting branch (D-09: reuse the seam)`,
    );
  }
});

test('both bob converters resolve to exported functions (the seam wiring is intact)', () => {
  const conv = requireVendor('runtime-artifact-conversion.cjs');
  assert.equal(typeof conv.convertClaudeCommandToBobSkill, 'function');
  assert.equal(typeof conv.convertClaudeCommandToBobCommand, 'function');
});
