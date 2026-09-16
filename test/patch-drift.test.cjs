'use strict';

/**
 * patch-drift.test.cjs — the descriptor/patch drift guard (Phase 13 D-09).
 *
 * The vendored `gsd-core/` tree is NOT the pristine npm tarball: it is
 * pristine + nine local Bob deltas re-injected by scripts/apply-bob-patches.cjs.
 * Nothing in the suite previously proved that what is COMMITTED under gsd-core/
 * still equals what that script would write. A hand-edit to the registry block,
 * a partially-applied run, or an upstream bump that silently drops a delta all
 * slipped through. This file closes that: it pins the THREE representations of
 * the `bob` descriptor to each other and re-checks every delta against the
 * committed tree.
 *
 * What it asserts:
 *   1. three-way descriptor identity — canonicalBobEntry() (the script's
 *      REGISTRY_BLOCK as data) deep-equals readVendoredBobEntry() (the block
 *      parsed back out of the committed capability-registry.cjs) deep-equals
 *      `requireVendor('capability-registry.cjs').runtimes.bob` (what gsd-core
 *      itself loads at runtime).
 *   2. 1.14.0's OWN validator accepts the entry — validateCapability(…,'bob')
 *      and validateRuntimeBody(…) both return [] (no errors), so the descriptor
 *      is legal by the vendored engine's rules, not by our reading of them.
 *   3. the closed converter allowlist (delta 7) carries BOTH Bob converter
 *      names — without them `_resolveNamedConverter` refuses the converters the
 *      descriptor names.
 *   4. the load-bearing descriptor facts: NO `hookEvents` key (omission is the
 *      only legal "none"), `localConfigDir: '.bob'`,
 *      `hostIntegration.dispatch.isolation === 'none'` (the key the 1.14.0
 *      execute-phase gate reads), `hostIntegration.modelMode === 'passive'`.
 *   5. deltas 6 + 9 — `gsd-core/VERSION` === TARGET_VERSION and
 *      `gsd-core/.gsd-runtime` trims to the runtime marker.
 *   6. delta 8 — every .md under the four normalized doc subdirs that inlines
 *      the `gsd_run` resolver preamble (detected by `_gsd_at`) also carries the
 *      Bob probe, and NONE still carries the upstream install hint.
 *   7. verifyAll() and preflight() both run clean against the committed tree,
 *      and patchResolverContent is idempotent AND orders the Bob probes FIRST
 *      (local `.bob` before `.claude`; global `$HOME/.bob` before the
 *      CLAUDE_CONFIG_DIR form) on a sample preamble built in the test.
 *
 * Hermetic: reads only the committed tree through requireVendor / repoRoot; no
 * network, no child processes, no writes at all (nothing to scratch). Forbidden
 * literals are built PROGRAMMATICALLY via .join('') so this file's own prose can
 * never self-trip the doc-tree scan.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { requireVendor, repoRoot } = require('./_helpers/vendor.cjs');

const patches = require(path.join(repoRoot, 'scripts', 'apply-bob-patches.cjs'));
const {
  canonicalBobEntry,
  readVendoredBobEntry,
  patchResolverContent,
  preflight,
  verifyAll,
  RESOLVER_BOB_PROBE,
  RESOLVER_HINT_TO,
  RUNTIME_MARKER,
  CONVERTER_ALLOWLIST_LINES,
  TARGET_VERSION,
} = patches;

const registry = requireVendor('capability-registry.cjs');
const validator = requireVendor('capability-validator.cjs');

const gsdCore = path.join(repoRoot, 'gsd-core');

// ---- 1. three-way descriptor identity ------------------------------------

test('drift: canonicalBobEntry == readVendoredBobEntry == registry.runtimes.bob', () => {
  const canonical = canonicalBobEntry();
  const vendored = readVendoredBobEntry();
  assert.deepEqual(vendored, canonical, 'committed registry block matches the script constant');
  assert.deepEqual(registry.runtimes.bob, canonical, 'loaded registry entry matches the script constant');
});

// ---- 2. 1.14.0's own validator accepts the entry -------------------------

test("drift: 1.14.0's own validator returns [] for the bob capability and runtime body", () => {
  const bob = registry.runtimes.bob;
  assert.deepEqual(validator.validateCapability(bob, 'bob'), [], 'validateCapability reports no errors');
  assert.deepEqual(validator.validateRuntimeBody(bob), [], 'validateRuntimeBody reports no errors');
});

// ---- 3. the closed converter allowlist carries both Bob converters -------

test('drift: VALID_CONVERTER_NAMES carries both Bob converter names (delta 7)', () => {
  const names = [...validator.VALID_CONVERTER_NAMES];
  // Derive the expected names from the script's own allowlist lines so the two
  // can never disagree: each line is `'<name>',`.
  const expected = CONVERTER_ALLOWLIST_LINES.map((l) => l.replace(/^'|',$/g, ''));
  assert.equal(expected.length, 2, 'the script injects exactly two converter names');
  for (const name of expected) {
    assert.ok(names.includes(name), `VALID_CONVERTER_NAMES includes ${name}`);
  }
});

// ---- 4. load-bearing descriptor facts ------------------------------------

test('drift: the bob descriptor carries the load-bearing Bob facts', () => {
  const rt = registry.runtimes.bob.runtime;
  assert.equal(
    Object.prototype.hasOwnProperty.call(rt, 'hookEvents'),
    false,
    'hookEvents must be OMITTED — there is no legal "none" value',
  );
  assert.equal(rt.localConfigDir, ['.', 'bob'].join(''), 'localConfigDir is the Bob dot-home name');
  assert.equal(
    rt.hostIntegration.dispatch.isolation,
    'none',
    'dispatch.isolation is none — Bob has no worktree isolation primitive',
  );
  assert.equal(rt.hostIntegration.modelMode, 'passive', 'modelMode is passive — Bob routes the backend');
});

// ---- 5. deltas 6 + 9 — VERSION + the per-install runtime marker ----------

test('drift: gsd-core/VERSION is the target version and .gsd-runtime carries the marker', () => {
  assert.equal(fs.readFileSync(path.join(gsdCore, 'VERSION'), 'utf8'), TARGET_VERSION);
  assert.equal(fs.readFileSync(path.join(gsdCore, '.gsd-runtime'), 'utf8').trim(), RUNTIME_MARKER);
});

// ---- 6. delta 8 — resolver probes across the normalized doc tree ---------

// The upstream install hint this file must NOT find in the doc tree, built
// programmatically so the assertion can never match this test's own source.
const upstreamHint = ['Run: npx -y @opengsd/gsd-core@latest ', '--claude --local'].join('');

function docTreeMd() {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && path.extname(e.name) === '.md') out.push(full);
    }
  };
  for (const sub of ['workflows', 'references', 'templates', 'contexts']) walk(path.join(gsdCore, sub));
  return out;
}

test('drift: every resolver-preamble .md carries the Bob probe and none carries the upstream hint', () => {
  const files = docTreeMd();
  assert.ok(files.length > 100, `the doc tree is populated (saw ${files.length} .md files)`);
  const missingProbe = [];
  const staleHint = [];
  let carrying = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (src.includes(upstreamHint)) staleHint.push(path.relative(repoRoot, file));
    if (!src.includes('_gsd_at')) continue;
    carrying++;
    if (!src.includes(RESOLVER_BOB_PROBE)) missingProbe.push(path.relative(repoRoot, file));
  }
  assert.ok(carrying > 0, 'at least one .md inlines the gsd_run resolver preamble');
  assert.deepEqual(missingProbe, [], 'every resolver-preamble .md carries the Bob probe');
  assert.deepEqual(staleHint, [], 'no .md still carries the upstream gsd-core install hint');
});

test('drift: the patched hint names the gsd-bob installer, not the upstream one', () => {
  const resolver = fs.readFileSync(
    path.join(gsdCore, 'references', 'gsd-run-resolver.md'),
    'utf8',
  );
  assert.ok(resolver.includes(RESOLVER_HINT_TO), 'the canonical resolver reference carries the gsd-bob hint');
});

// ---- 7. preflight / verifyAll / patchResolverContent ---------------------

test('drift: verifyAll() and preflight() run clean against the committed tree', () => {
  assert.doesNotThrow(() => verifyAll(), 'verifyAll reports no gaps');
  assert.doesNotThrow(() => preflight(), 'preflight finds every anchor');
});

test('drift: patchResolverContent inserts the Bob probes FIRST and is idempotent', () => {
  // A sample preamble built here (never read from the tree) so the ordering
  // assertion is about the transform, not about the committed bytes.
  const shim = '${_GSD_SHIM_NAME}';
  const root = '${_GSD_RUNTIME_ROOT}';
  const claudeDot = ['.', 'claude'].join('');
  const bobDot = ['.', 'bob'].join('');
  const sample = [
    `_gsd_at "${root}/gsd-core/bin/${shim}" "${root}/${claudeDot}/gsd-core/bin/${shim}"`,
    `_gsd_at "\${CLAUDE_CONFIG_DIR:-$HOME/${claudeDot}}/gsd-core/bin/${shim}"`,
    upstreamHint,
  ].join('\n');

  const once = patchResolverContent(sample);
  assert.notEqual(once, sample, 'the transform changed the sample');
  assert.equal(patchResolverContent(once), once, 'a second pass is a no-op (idempotent)');

  const lines = once.split('\n');
  // Local probe line: the workspace-relative .bob form precedes the .claude one.
  const localLine = lines.find((l) => l.includes(`${root}/${bobDot}/`));
  assert.ok(localLine, 'the local probe line gained a .bob candidate');
  assert.ok(
    localLine.indexOf(`${root}/${bobDot}/`) < localLine.indexOf(`${root}/${claudeDot}/`),
    'the local .bob probe precedes the .claude probe',
  );
  // Global probe line: $HOME/.bob precedes the CLAUDE_CONFIG_DIR form.
  const globalLine = lines.find((l) => l.includes('CLAUDE_CONFIG_DIR'));
  assert.ok(globalLine, 'the global probe line survived');
  assert.ok(
    globalLine.indexOf(`$HOME/${bobDot}/`) >= 0 &&
      globalLine.indexOf(`$HOME/${bobDot}/`) < globalLine.indexOf('CLAUDE_CONFIG_DIR'),
    'the global $HOME/.bob probe precedes the CLAUDE_CONFIG_DIR form',
  );
  // The hint was rewritten to the gsd-bob one-liner.
  assert.ok(once.includes(RESOLVER_HINT_TO), 'the hint now names the gsd-bob installer');
  assert.ok(!once.includes(upstreamHint), 'the upstream hint is gone');
});
