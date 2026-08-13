'use strict';

/**
 * descriptor.test.cjs — RUNTIME-01 (config-home resolution) + RUNTIME-02
 * (data-only bob runtime descriptor) coverage.
 *
 * Hermetic: injects env/home directly into resolveConfigHomeFromDescriptor
 * (no real filesystem, no live Bob). Exercises the VENDORED registry copy via
 * test/_helpers/vendor.cjs so it proves the extended (bob-carrying) registry,
 * not the global install.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

const { requireVendor } = require('./_helpers/vendor.cjs');

const { resolveConfigHomeFromDescriptor } = requireVendor('runtime-homes.cjs');
const { runtimes } = requireVendor('capability-registry.cjs');
const { resolveInstallPlan } = requireVendor('runtime-config-adapter-registry.cjs');

const bobDescriptor = { kind: 'dot-home', name: '.bob', env: [] };

test('RUNTIME-01: bob descriptor resolves to ~/.bob by default (leading dot preserved)', () => {
  const resolved = resolveConfigHomeFromDescriptor(bobDescriptor, { env: {}, home: '/home/u' });
  assert.equal(resolved, path.join('/home/u', '.bob'));
  assert.equal(resolved, '/home/u/.bob');
});

test('BOB2-04: bob declares NO config-home env override — ~/.bob is fixed', () => {
  // Verified against the shipped Bob Shell 2.0.1 bundle: the ONLY BOB_* env vars
  // it reads are BOB_API_KEY, BOB_DEV_KEY, BOB_GATEWAY_URL, BOB_LOG_LEVEL,
  // BOB_SUPPORT_KEY, BOB_USE_MODEL_ENV and BOBSHELL_API_KEY. There is no
  // config-home relocation variable, so the descriptor must not advertise one —
  // an override would only ever point the installer at a directory Bob does not
  // read. `--config-dir` remains the supported way to redirect an install.
  // The field stays present but EMPTY: gsd-core's dot-home branch iterates
  // `configHome.env` unconditionally, so `[]` is the data-only way to declare
  // "no override" without patching upstream resolver code.
  const fromRegistry = runtimes.bob.runtime.configHome;
  assert.deepEqual(
    fromRegistry.env,
    [],
    'bob configHome must declare no env override (see BOB2-04)',
  );
});

test('BOB2-04: an arbitrary BOB_* env var cannot move the resolved bob config home', () => {
  const fromRegistry = runtimes.bob.runtime.configHome;
  const resolved = resolveConfigHomeFromDescriptor(fromRegistry, {
    env: { BOB_CONFIG_DIR: '/tmp/should-be-ignored' },
    home: '/home/u',
  });
  assert.equal(resolved, path.join('/home/u', '.bob'));
});

test('RUNTIME-02: the vendored registry exposes a bob runtime', () => {
  assert.ok(runtimes.bob, 'runtimes.bob must exist in the vendored registry');
  assert.equal(runtimes.bob.role, 'runtime');
});

test('RUNTIME-02: bob configHome.name carries the leading dot (Pitfall 1 regression guard)', () => {
  assert.equal(runtimes.bob.runtime.configHome.name, '.bob');
  assert.equal(runtimes.bob.runtime.configHome.kind, 'dot-home');
});

test('RUNTIME-02: resolveInstallPlan("bob") does not throw (valid install axes)', () => {
  let plan;
  assert.doesNotThrow(() => {
    plan = resolveInstallPlan('bob');
  });
  assert.equal(plan.installSurface, 'profile-marker-only');
  assert.equal(plan.sandboxTier, 'none');
  assert.equal(plan.hooksSurface, 'none');
});

test('RUNTIME-02: bob configHome resolution also works against the real os.homedir shape', () => {
  // Using the descriptor straight out of the registry (not a hand-built one)
  // proves the registry literal — not just a local copy — resolves correctly.
  const fromRegistry = runtimes.bob.runtime.configHome;
  const resolved = resolveConfigHomeFromDescriptor(fromRegistry, { env: {}, home: os.homedir() });
  assert.equal(resolved, path.join(os.homedir(), '.bob'));
});
