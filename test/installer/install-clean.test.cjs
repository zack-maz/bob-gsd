'use strict';

/**
 * install-clean.test.cjs — INSTALL-01/03 end-to-end clean install against a
 * scratch .bob/ target, driving the real entry bin/gsd-bob.cjs via child_process.
 *
 * Two load-bearing properties (the Phase-3 blockers):
 *   CWD-INDEPENDENCE (T-03-14c): the entry is invoked by its ABSOLUTE package-root
 *     path while `cwd` is a scratch workspace distinct from the package root —
 *     exactly the real-npx shape. The vendored payload must still copy because
 *     stage() sources it from repoRoot = path.resolve(__dirname,'..'), not cwd.
 *   CONFIG.JSON PREDICATE (D-14/Q1): the workflow.text_mode merge is written ONLY
 *     when <cwd>/.planning/ already exists; with no project there is NO stray
 *     .planning/ under cwd and stdout carries the KNOWN-LIMITATION note.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { repoRoot } = require('../_helpers/vendor.cjs');

const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

/** Run the entry with the given args from a scratch cwd; return captured stdout. */
function runEntry(args, cwd) {
  return execFileSync(process.execPath, [ENTRY, ...args], { cwd, encoding: 'utf8' });
}

test('clean install: prints absolute target, stages full layout, writes manifest', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws'); // scratch workspace, NO .planning/

  const out = runEntry(['--bob', '--global', '-c', target], cwd);

  // INSTALL-01: the resolved ABSOLUTE target is printed before any write.
  assert.ok(out.includes(target), 'stdout must print the absolute target path');

  // CWD-INDEPENDENCE blocker: the entry ran from a cwd distinct from the package
  // root, yet the vendored payload copied — proving repoRoot ≠ cwd sourcing.
  assert.notEqual(cwd, repoRoot, 'cwd must differ from the package root for the blocker');
  assert.ok(
    fs.existsSync(path.join(target, 'gsd-core', 'bin', 'gsd-tools.cjs')),
    'vendored payload must be sourced from the package root, not cwd',
  );

  // INSTALL-03 clean layout. BOB2-04: at GLOBAL scope the modes file Bob 2.0
  // reads is <home>/settings/custom_modes.yaml, not the home root.
  const modes = fs.readFileSync(path.join(target, 'settings', 'custom_modes.yaml'), 'utf8');
  const gsdCount = (modes.match(/slug: gsd$/gm) || []).length;
  assert.equal(gsdCount, 1, 'exactly one slug: gsd');
  assert.equal(
    fs.existsSync(path.join(target, 'custom_modes.yaml')),
    false,
    'must NOT write the home-root modes file Bob 2.0 ignores (BOB2-04 regression guard)',
  );
  assert.ok(fs.existsSync(path.join(target, 'SUPPORT-ROSTER.md')), 'roster written');

  const manifestRaw = fs.readFileSync(path.join(target, '.gsd-bob-manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.ok(Array.isArray(manifest.entries) && manifest.entries.length > 0, 'manifest has entries[]');
});

test('config.json predicate: NO project .planning/ → no stray dir + KNOWN-LIMITATION note', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws-noproj'); // explicitly no .planning/

  const out = runEntry(['--bob', '--global', '-c', target], cwd);

  assert.equal(
    fs.existsSync(path.join(cwd, '.planning')),
    false,
    'no stray .planning/ created in a non-project cwd',
  );
  assert.ok(
    /KNOWN-LIMITATION/.test(out) && /text_mode/.test(out),
    'stdout carries the per-project-only text_mode KNOWN-LIMITATION note',
  );
});

test('config.json predicate: project .planning/ present → config.json gains workflow.text_mode', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws-proj');
  fs.mkdirSync(path.join(cwd, '.planning'), { recursive: true });

  runEntry(['--bob', '--global', '-c', target], cwd);

  const cfgPath = path.join(cwd, '.planning', 'config.json');
  assert.ok(fs.existsSync(cfgPath), '<cwd>/.planning/config.json written when project exists');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  assert.equal(cfg.workflow.text_mode, true, 'workflow.text_mode:true merged in');

  // The merged config.json is recorded as a `merged` manifest entry (workspace-anchored).
  const manifest = JSON.parse(fs.readFileSync(path.join(target, '.gsd-bob-manifest.json'), 'utf8'));
  const cfgEntry = manifest.entries.find(
    (e) => e.path === path.join('.planning', 'config.json') && e.kind === 'merged',
  );
  assert.ok(cfgEntry, 'config.json tracked as a merged manifest entry');
});
