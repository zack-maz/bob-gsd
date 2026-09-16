'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');

// TRANS-01: GSD command -> .bob/commands/<name>.md, description+argument-hint only, $ARGUMENTS->$1.
const conv = requireVendor('runtime-artifact-conversion.cjs');

const fixDir = path.join(repoRoot, 'test', 'fixtures', 'command');
const input = fs.readFileSync(path.join(fixDir, 'input.md'), 'utf8');
const expected = fs.readFileSync(path.join(fixDir, 'expected.md'), 'utf8');

test('convertClaudeCommandToBobCommand is exported as a function', () => {
  assert.equal(typeof conv.convertClaudeCommandToBobCommand, 'function');
});

test('command output is byte-identical to the golden expected fixture', () => {
  const out = conv.convertClaudeCommandToBobCommand(input, 'gsd-help');
  assert.equal(out, expected);
});

test('command frontmatter contains ONLY description + argument-hint (unsupported keys stripped)', () => {
  const out = conv.convertClaudeCommandToBobCommand(input, 'gsd-help');
  const fmEnd = out.indexOf('---', 3);
  assert.ok(fmEnd > 0, 'frontmatter block present');
  const fm = out.substring(3, fmEnd);
  assert.match(fm, /^description:/m);
  assert.match(fm, /^argument-hint:/m);
  assert.doesNotMatch(fm, /^effort:/m);
  assert.doesNotMatch(fm, /^allowed-tools:/m);
  assert.doesNotMatch(fm, /^agent:/m);
});

test('$ARGUMENTS in the body is projected to $1', () => {
  const out = conv.convertClaudeCommandToBobCommand(input, 'gsd-help');
  assert.doesNotMatch(out, /\$ARGUMENTS/);
  assert.match(out, /\$1/);
});

test('a command with no source frontmatter still yields well-formed output (no crash)', () => {
  const bare = '# Bare command\n\nDoes $ARGUMENTS get projected? $1\n';
  const out = conv.convertClaudeCommandToBobCommand(bare, 'gsd-bare');
  assert.ok(out.startsWith('---\n'));
  assert.doesNotMatch(out, /\$ARGUMENTS/);
  assert.ok(out.includes('Bare command'));
});

// TRANS-01/02 (WR-03): the emitted command body must carry ZERO upstream config-home
// path refs and ZERO colon-dialect command refs. Forbidden tokens are built
// programmatically so this test file's prose cannot self-trip the assertions.
test('command body is neutralized: no .claude / no colon-dialect; has .bob / hyphen form', () => {
  const out = conv.convertClaudeCommandToBobCommand(input, 'gsd-help');
  const claudeHome = ['.', 'claude'].join('');
  const colonDialect = ['gsd', ':'].join('');
  const bobHome = ['.', 'bob'].join('');
  const hyphenForm = ['gsd', '-'].join('');
  assert.ok(!out.includes(claudeHome), 'emitted command body contains no Claude config-home path ref');
  assert.ok(!out.includes(colonDialect), 'emitted command body contains no colon-dialect command ref');
  assert.ok(out.includes(bobHome), 'emitted command body contains the .bob home');
  assert.ok(out.includes(hyphenForm), 'emitted command body contains the hyphen command form');
});
