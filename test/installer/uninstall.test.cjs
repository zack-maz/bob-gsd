'use strict';

/**
 * uninstall.test.cjs — INSTALL-05 / D-06 / D-07. After an install, --uninstall:
 *   - deletes matching `file` entries,
 *   - UN-MERGES the gsd slice from custom_modes.yaml (user `my-mode` kept, no gsd),
 *   - removes ONLY workflow.text_mode from .planning/config.json (user keys kept),
 *   - deletes the manifest dotfile,
 *   - and NEVER deletes the workspace .planning/ directory.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { repoRoot } = require('../_helpers/vendor.cjs');

const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
const USER_SEEDED = path.join(repoRoot, 'test', 'fixtures', 'custom_modes', 'user-seeded.yaml');

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

function runEntry(args, cwd) {
  return execFileSync(process.execPath, [ENTRY, ...args], { cwd, encoding: 'utf8' });
}

test('uninstall un-merges slices, deletes tracked files, preserves .planning/', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws');
  fs.mkdirSync(target, { recursive: true });

  // Pre-seed a user mode AND a user-authored config.json key, then install.
  // BOB2-04: a GLOBAL-scope install merges into <home>/settings/custom_modes.yaml.
  const seededModes = path.join(target, 'settings', 'custom_modes.yaml');
  fs.mkdirSync(path.dirname(seededModes), { recursive: true });
  fs.copyFileSync(USER_SEEDED, seededModes);
  const planningDir = path.join(cwd, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  const cfgPath = path.join(planningDir, 'config.json');
  fs.writeFileSync(cfgPath, JSON.stringify({ userKey: 'keep-me' }, null, 2) + '\n', 'utf8');

  runEntry(['--bob', '--global', '-c', target], cwd);

  // Sanity: the install staged a payload file we expect uninstall to delete.
  const payload = path.join(target, 'gsd-core', 'bin', 'gsd-tools.cjs');
  assert.ok(fs.existsSync(payload), 'payload present after install');
  assert.ok(fs.existsSync(path.join(target, '.gsd-bob-manifest.json')), 'manifest present after install');

  // Uninstall.
  runEntry(['--bob', '--global', '-c', target, '--uninstall'], cwd);

  // Matching `file` entries deleted.
  assert.equal(fs.existsSync(payload), false, 'tracked payload file deleted on uninstall');

  // custom_modes.yaml un-merged, NOT deleted: my-mode kept, no gsd slug.
  const modesPath = seededModes;
  assert.ok(fs.existsSync(modesPath), 'custom_modes.yaml still exists (un-merged, not deleted)');
  const modes = fs.readFileSync(modesPath, 'utf8');
  assert.ok(modes.includes('slug: my-mode'), 'user my-mode preserved');
  assert.equal((modes.match(/slug: gsd$/gm) || []).length, 0, 'gsd slug un-merged');

  // config.json un-merged: user key kept, workflow.text_mode removed, file kept.
  assert.ok(fs.existsSync(cfgPath), '.planning/config.json still exists');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  assert.equal(cfg.userKey, 'keep-me', 'user config key preserved');
  assert.ok(!cfg.workflow || cfg.workflow.text_mode === undefined, 'workflow.text_mode removed');

  // Manifest dotfile gone.
  assert.equal(
    fs.existsSync(path.join(target, '.gsd-bob-manifest.json')),
    false,
    'manifest dotfile deleted on uninstall',
  );

  // D-07: the workspace .planning/ directory is NEVER pruned.
  assert.ok(fs.existsSync(planningDir), '.planning/ directory preserved (D-07)');
});
