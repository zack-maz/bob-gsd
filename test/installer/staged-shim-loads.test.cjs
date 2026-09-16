'use strict';

/**
 * staged-shim-loads.test.cjs — INSTALL-03 regression: a REAL install must produce
 * a self-sufficient .bob/ layout whose vendored gsd-core shim loads from ANY cwd.
 *
 * Why this exists (the gap the prior suite missed): the vendored gsd-core eagerly
 * requires a SIBLING of gsd-core/ (three `../` up from gsd-core/bin/lib/):
 *   - scripts/fix-slash-commands.cjs   (command-roster.cjs:36)
 * The installer staged gsd-core/ but not that sibling, so a real install crashed
 * with `Cannot find module '../../../scripts/fix-slash-commands.cjs'`. Every prior
 * case ran from the dev repo root, where scripts/ happens to exist, so none caught
 * it. This test ISOLATES the staged shim from the dev repo:
 *   1. drive a REAL install into a fresh mkdtemp .bob target (no hand-placed siblings),
 *   2. run the STAGED shim OUT OF TREE (cwd = a scratch dir, never repoRoot) via
 *      child_process — asserting exit 0 + parseable JSON,
 *   3. assert the staged sibling AND the per-install runtime marker are tracked in
 *      the written manifest.
 *
 * Phase 13 (gsd-core 1.14.0) changed what a correct layout looks like:
 *   - the synthetic sibling `package.json` is GONE. Since gsd-core 1.7.0 (#1383)
 *     `resolveVersionFrom` reads `gsd-core/VERSION` first and every remaining
 *     `../../../package.json` require in the shim is lazy + try/catch. The file
 *     must be ABSENT from the staged tree and from the manifest — staging it back
 *     would reintroduce a second, drift-prone version of record.
 *   - `gsd-core/.gsd-runtime` (contents `bob`) now ships in the payload. Without it
 *     every `dispatch-*` query answers for the `claude` descriptor.
 *   - the staged tree is version-of-record: `gsd-core/VERSION` must read 1.14.0 and
 *     the shim's own `runtime-identity --raw` must agree with it.
 *   - `query dispatch-isolation` is the gate /gsd-execute-phase reads in 1.14.0, so
 *     a real project-scoped install must answer runtime `bob` / isolation `none`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { repoRoot } = require('../_helpers/vendor.cjs');

// repoRoot (the dev package root) is the ONLY allowed reference to the dev repo —
// it locates the entry. The STAGED-shim invocation below must NOT see dev-repo
// siblings; its cwd is a clean scratch dir whose ancestry has no scripts/ or
// package.json other than the ones the installer placed under .bob/.
const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
const HEX64 = /^[0-9a-f]{64}$/;

// The vendored payload version of record (delta 6 of scripts/apply-bob-patches.cjs).
// Pinned as a literal HERE on purpose: this file's job is to prove the STAGED tree
// carries the bumped version, so deriving it from the same file under test would
// make the assertion vacuous.
const VENDORED_VERSION = '1.14.0';
const PKG_NAME = '@opengsd/gsd-core';

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

/** Run the entry with the given args from a scratch cwd; return captured stdout. */
function runEntry(args, cwd) {
  return execFileSync(process.execPath, [ENTRY, ...args], { cwd, encoding: 'utf8' });
}

/** Run the STAGED shim under `target` with the given args from `cwd`. */
function runShim(target, args, cwd) {
  const shim = path.join(target, 'gsd-core', 'bin', 'gsd-tools.cjs');
  return spawnSync(process.execPath, [shim, ...args], { cwd, encoding: 'utf8' });
}

test('real install: staged gsd-core shim loads OUT OF TREE (exit 0 + JSON) with the sibling + runtime marker manifest-tracked', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws'); // distinct scratch workspace, NO .planning/ needed

  // ---- 1. drive a REAL install via the entry (no hand-placed siblings) -------
  runEntry(['--bob', '--global', '-c', target], cwd);

  // ---- 2. the ONE required sibling + the per-install runtime marker ---------
  const scriptsRel = path.join('scripts', 'fix-slash-commands.cjs');
  assert.ok(
    fs.existsSync(path.join(target, scriptsRel)),
    'scripts/fix-slash-commands.cjs staged under the install target',
  );
  const markerRel = path.join('gsd-core', '.gsd-runtime');
  const markerAbs = path.join(target, markerRel);
  assert.ok(fs.existsSync(markerAbs), 'gsd-core/.gsd-runtime staged under the install target');
  assert.equal(
    fs.readFileSync(markerAbs, 'utf8').trim(),
    'bob',
    'the per-install runtime marker names the bob runtime (else dispatch queries answer for claude)',
  );

  // ---- 2b. the synthetic sibling package.json is GONE ----------------------
  assert.equal(
    fs.existsSync(path.join(target, 'package.json')),
    false,
    'no synthetic sibling package.json is staged (gsd-core/VERSION is the sole version of record)',
  );

  // ---- 2c. the staged tree carries the bumped version of record ------------
  const versionRel = path.join('gsd-core', 'VERSION');
  assert.equal(
    fs.readFileSync(path.join(target, versionRel), 'utf8'),
    VENDORED_VERSION,
    'staged gsd-core/VERSION is the vendored payload version',
  );

  // ---- 3. manifest tracking (and the package.json ABSENCE from it) ---------
  const manifest = JSON.parse(
    fs.readFileSync(path.join(target, '.gsd-bob-manifest.json'), 'utf8'),
  );
  const findFile = (p) =>
    manifest.entries.find((e) => e.path === p && e.kind === 'file');
  for (const rel of [scriptsRel, markerRel, versionRel]) {
    const entry = findFile(rel);
    assert.ok(entry, `${rel} tracked as a file manifest entry`);
    assert.match(entry.sha256, HEX64, `${rel} entry has a 64-hex sha256`);
  }
  assert.equal(
    manifest.entries.some((e) => e.path === 'package.json'),
    false,
    'package.json is not a manifest entry of any kind',
  );

  // ---- 4. THE OUT-OF-TREE LOAD (the regression) ----------------------------
  // Run the STAGED shim with cwd = the scratch target's parent — a clean mkdtemp
  // dir whose ancestry contains NO scripts/ or package.json except the staged
  // ones under the target. NEVER cwd = repoRoot (that is exactly what masked the bug).
  const shimCwd = path.dirname(target);
  const res = runShim(target, ['query', 'state.load'], shimCwd);

  assert.equal(
    res.status,
    0,
    `staged shim must load out of tree (exit 0); got status=${res.status}\nstderr:\n${res.stderr}`,
  );
  assert.ok(res.stdout && res.stdout.trim().length > 0, 'staged shim emits stdout');
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(res.stdout);
  }, 'staged shim stdout is parseable JSON');
  assert.equal(typeof parsed, 'object', 'parsed shim output is a JSON object');

  // ---- 5. the shim's OWN identity agrees with the staged VERSION file ------
  // `resolveVersionFrom` reads gsd-core/VERSION first now that the sibling
  // package.json is gone — this is the assertion that proves it still resolves.
  const ident = runShim(target, ['runtime-identity', '--raw'], shimCwd);
  assert.equal(
    ident.status,
    0,
    `runtime-identity must exit 0 out of tree; got status=${ident.status}\nstderr:\n${ident.stderr}`,
  );
  assert.deepEqual(
    JSON.parse(ident.stdout),
    { packageName: PKG_NAME, version: VENDORED_VERSION },
    'the staged shim reports the vendored package name + version',
  );
});

test('real project install: the staged shim answers dispatch-isolation for the bob runtime', () => {
  // A scratch PROJECT dir: the config merge only runs when .planning/ already
  // exists (bin/gsd-bob.cjs:138-159), so seed the dir and let a REAL local
  // install write .planning/config.json — never hand-write it here.
  const project = scratch('proj');
  fs.mkdirSync(path.join(project, '.planning'), { recursive: true });
  runEntry(['--bob', '--local'], project);

  const cfgAbs = path.join(project, '.planning', 'config.json');
  assert.ok(fs.existsSync(cfgAbs), 'the local install seeded .planning/config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgAbs, 'utf8'));
  assert.equal(cfg.workflow.use_worktrees, false, 'use_worktrees:false is seeded (the 1.14.0 gate)');

  const target = path.join(project, '.bob');
  const res = runShim(target, ['query', 'dispatch-isolation', '--json', '--phase', '1'], project);
  assert.equal(
    res.status,
    0,
    `dispatch-isolation must exit 0; got status=${res.status}\nstderr:\n${res.stderr}`,
  );
  const out = JSON.parse(res.stdout);
  assert.equal(out.runtime, 'bob', 'the marker + descriptor resolve the bob runtime, not claude');
  assert.equal(out.isolation, 'none', 'bob declares dispatch.isolation none (no worktree primitive)');
});
