'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');

// TRANS-02: GSD skill -> .bob/skills/<name>/SKILL.md, name+description frontmatter only.
const conv = requireVendor('runtime-artifact-conversion.cjs');

const fixDir = path.join(repoRoot, 'test', 'fixtures', 'skill');
const input = fs.readFileSync(path.join(fixDir, 'input.md'), 'utf8');
const expected = fs.readFileSync(path.join(fixDir, 'expected.md'), 'utf8');

test('convertClaudeCommandToBobSkill is exported as a function', () => {
  assert.equal(typeof conv.convertClaudeCommandToBobSkill, 'function');
});

test('skill output is byte-identical to the golden expected fixture', () => {
  const out = conv.convertClaudeCommandToBobSkill(input, 'gsd-ultraplan-phase');
  assert.equal(out, expected);
});

test('skill frontmatter contains ONLY name + description (unsupported keys stripped)', () => {
  const out = conv.convertClaudeCommandToBobSkill(input, 'gsd-ultraplan-phase');
  const fmEnd = out.indexOf('---', 3);
  assert.ok(fmEnd > 0, 'frontmatter block present');
  const fm = out.substring(3, fmEnd);
  assert.match(fm, /^name:/m);
  assert.match(fm, /^description:/m);
  assert.doesNotMatch(fm, /^effort:/m);
  assert.doesNotMatch(fm, /^allowed-tools:/m);
  assert.doesNotMatch(fm, /^argument-hint:/m);
});

test('description with YAML flow chars ([BETA]) is safely quoted via yamlQuote', () => {
  const out = conv.convertClaudeCommandToBobSkill(input, 'gsd-ultraplan-phase');
  // JSON.stringify wraps the value in double quotes -> safe for YAML parsers.
  assert.match(out, /^description: "\[BETA\]/m);
});

test('a skill with no source frontmatter still yields well-formed output (no crash)', () => {
  const bare = '# Just a body\n\nNo frontmatter here.\n';
  const out = conv.convertClaudeCommandToBobSkill(bare, 'gsd-bare');
  assert.match(out, /^---\nname: gsd-bare\ndescription: ""\n---\n/);
  assert.ok(out.includes('Just a body'));
});

// TRANS-01/02 (WR-03): the emitted body must carry ZERO upstream config-home path
// refs and ZERO colon-dialect command refs — every one is neutralized to the .bob
// home / hyphen form. Forbidden tokens are built programmatically so this test
// file's own prose can never self-trip the negative assertions.
test('skill body is neutralized: no .claude / no colon-dialect; has .bob / hyphen form', () => {
  const out = conv.convertClaudeCommandToBobSkill(input, 'gsd-ultraplan-phase');
  const claudeHome = ['.', 'claude'].join('');
  const colonDialect = ['gsd', ':'].join('');
  const bobHome = ['.', 'bob'].join('');
  const hyphenForm = ['gsd', '-'].join('');
  assert.ok(!out.includes(claudeHome), 'emitted skill body contains no Claude config-home path ref');
  assert.ok(!out.includes(colonDialect), 'emitted skill body contains no colon-dialect command ref');
  assert.ok(out.includes(bobHome), 'emitted skill body contains the .bob home');
  assert.ok(out.includes(hyphenForm), 'emitted skill body contains the hyphen command form');
});
