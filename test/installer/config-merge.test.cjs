'use strict';

/**
 * config-merge.test.cjs — INSTALL-03 owned-config guarantee (RESEARCH Pattern 3,
 * Pitfall 2: the descriptor does NOT enforce text_mode, this write is the SOLE
 * mechanism). Root-anchored at <workspaceRoot>/.planning/config.json (CORE-05).
 *
 * The seeded set is BOB_OWNED_CONFIG. Since gsd-core 1.14.0 it grew a third key:
 * `workflow.use_worktrees:false`. The 1.14.0 execute-phase / quick-batch dispatch
 * gate exits FATAL on a runtime whose descriptor declares
 * `dispatch.isolation:"none"` unless that key is false, so seeding it is what
 * keeps /gsd-execute-phase runnable on Bob at all. Expected shapes below are
 * DERIVED from BOB_OWNED_CONFIG rather than re-typed, so adding an owned key can
 * never leave this file asserting a stale shape.
 *
 * The second half covers `unmergeOwnedKeys` — the pure inverse the uninstall path
 * calls: it removes exactly the owned keys, preserves every user key, drops an
 * emptied `workflow` object, and tolerates null / non-object input.
 *
 * Hermetic: each case runs against a scratch tmpdir workspaceRoot. The
 * parse-fail case asserts the on-disk bytes are byte-identical before and after
 * the call (never clobber an unparseable user file — D-13 / anti-pattern #22).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { repoRoot } = require('../_helpers/vendor.cjs');

const {
  mergeTextMode,
  unmergeOwnedKeys,
  BOB_CONTEXT_WINDOW,
  BOB_OWNED_CONFIG,
} = require(path.join(repoRoot, 'src', 'installer', 'config-merge.cjs'));

// The expected owned shape, DERIVED (never re-typed) so a new owned key shows up
// in every expectation below at once.
const OWNED_WORKFLOW = { ...BOB_OWNED_CONFIG.workflow };
const OWNED_KEYS = Object.keys(OWNED_WORKFLOW);

function scratchWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gsdbob-cfg-'));
}

function cfgPath(ws) {
  return path.join(ws, '.planning', 'config.json');
}

function seedConfig(ws, raw) {
  fs.mkdirSync(path.join(ws, '.planning'), { recursive: true });
  fs.writeFileSync(cfgPath(ws), raw, 'utf8');
}

test('creates .planning/config.json with the full owned set (text_mode, use_worktrees, context_window) when absent', () => {
  const ws = scratchWorkspace();
  const res = mergeTextMode(ws);
  assert.equal(res.written, true);
  assert.equal(res.path, cfgPath(ws));
  const parsed = JSON.parse(fs.readFileSync(cfgPath(ws), 'utf8'));
  assert.deepEqual(parsed, { workflow: OWNED_WORKFLOW, context_window: BOB_CONTEXT_WINDOW });
  assert.equal(parsed.context_window, 270000, "Bob's 270k window seeded top-level");
  assert.equal(parsed.workflow.text_mode, true, 'text_mode set');
  assert.equal(
    parsed.workflow.use_worktrees,
    false,
    'use_worktrees:false seeded — the 1.14.0 dispatch gate refuses to run without it',
  );
});

test('preserves user keys and sets the owned workflow keys + context_window:270000', () => {
  const ws = scratchWorkspace();
  seedConfig(ws, JSON.stringify({ workflow: { granularity: 'coarse' }, other: 1 }, null, 2) + '\n');
  const res = mergeTextMode(ws);
  assert.equal(res.written, true);
  const parsed = JSON.parse(fs.readFileSync(cfgPath(ws), 'utf8'));
  assert.equal(parsed.workflow.granularity, 'coarse', 'user workflow key preserved');
  assert.equal(parsed.workflow.text_mode, true, 'text_mode set');
  assert.equal(parsed.workflow.use_worktrees, false, 'use_worktrees:false set');
  assert.equal(parsed.other, 1, 'top-level user key preserved');
  assert.equal(parsed.context_window, 270000, 'context_window added/set to 270000');
});

test('is idempotent — byte-identical output on the second run (incl. context_window)', () => {
  const ws = scratchWorkspace();
  mergeTextMode(ws);
  const first = fs.readFileSync(cfgPath(ws));
  mergeTextMode(ws);
  const second = fs.readFileSync(cfgPath(ws));
  assert.ok(first.equals(second), 'second run produces byte-identical bytes');
  assert.ok(
    first.toString('utf8').includes('"context_window": 270000'),
    'seeded context_window persists byte-identically across runs',
  );
});

test('coerces a non-object workflow into a fresh object before setting the owned keys', () => {
  const ws = scratchWorkspace();
  seedConfig(ws, JSON.stringify({ workflow: 'oops', keep: true }) + '\n');
  const res = mergeTextMode(ws);
  assert.equal(res.written, true);
  const parsed = JSON.parse(fs.readFileSync(cfgPath(ws), 'utf8'));
  assert.deepEqual(parsed.workflow, OWNED_WORKFLOW);
  assert.equal(parsed.keep, true);
});

test('parse failure → warns and leaves the bytes UNCHANGED (never clobber)', () => {
  const ws = scratchWorkspace();
  const broken = '{ this is not json ';
  seedConfig(ws, broken);
  const before = fs.readFileSync(cfgPath(ws));

  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  let res;
  try {
    res = mergeTextMode(ws);
  } finally {
    console.warn = origWarn;
  }

  const after = fs.readFileSync(cfgPath(ws));
  assert.ok(before.equals(after), 'on-disk bytes are byte-identical before/after');
  assert.ok(
    !after.toString('utf8').includes('context_window'),
    'no context_window injected into an unparseable user file',
  );
  assert.equal(res.written, false, 'signals nothing was written');
  assert.equal(res.bytes, undefined, 'no would-be bytes for a refused unparseable file');
  assert.ok(
    warnings.some((w) => w.includes(cfgPath(ws))),
    'warns naming the offending config path',
  );
});

test('dryRun computes the result but writes nothing to disk', () => {
  const ws = scratchWorkspace();
  const res = mergeTextMode(ws, { dryRun: true });
  assert.equal(res.written, false, 'dryRun does not write');
  assert.equal(fs.existsSync(cfgPath(ws)), false, 'no config.json created on disk');
  assert.ok(res.bytes && res.bytes.includes('text_mode'), 'would-be bytes still computed');
  assert.ok(
    res.bytes.includes('"context_window": 270000'),
    'would-be bytes include the seeded context_window',
  );
});

test('path is always <workspaceRoot>/.planning/config.json — never under a scope dir', () => {
  const ws = scratchWorkspace();
  const res = mergeTextMode(ws);
  assert.equal(res.path, path.join(ws, '.planning', 'config.json'));
  assert.equal(fs.existsSync(path.join(ws, '.bob')), false, 'never writes under .bob');
});

// ---- unmergeOwnedKeys — the pure inverse the uninstall path calls -----------

test('unmergeOwnedKeys removes every owned key (text_mode, use_worktrees, context_window)', () => {
  const cfg = unmergeOwnedKeys({
    workflow: { ...OWNED_WORKFLOW },
    context_window: BOB_CONTEXT_WINDOW,
  });
  // The whole workflow object was owned, so it is dropped rather than left empty.
  assert.deepEqual(cfg, {}, 'nothing of the seeded set survives');
});

test('unmergeOwnedKeys preserves user keys and leaves a surviving workflow object', () => {
  const cfg = unmergeOwnedKeys({
    workflow: { ...OWNED_WORKFLOW, granularity: 'coarse' },
    context_window: BOB_CONTEXT_WINDOW,
    other: 1,
  });
  assert.deepEqual(cfg, { workflow: { granularity: 'coarse' }, other: 1 });
  for (const key of OWNED_KEYS) {
    assert.equal(cfg.workflow[key], undefined, `workflow.${key} removed`);
  }
});

test('unmergeOwnedKeys drops an emptied workflow object but keeps a user-only one intact', () => {
  const emptied = unmergeOwnedKeys({ workflow: { ...OWNED_WORKFLOW }, keep: true });
  assert.equal(
    Object.prototype.hasOwnProperty.call(emptied, 'workflow'),
    false,
    'a workflow object emptied by the un-merge is dropped',
  );
  assert.equal(emptied.keep, true, 'user key untouched');

  const userOnly = unmergeOwnedKeys({ workflow: { granularity: 'coarse' } });
  assert.deepEqual(userOnly, { workflow: { granularity: 'coarse' } }, 'a user-only workflow survives');
});

test('unmergeOwnedKeys tolerates null / non-object input without throwing', () => {
  for (const input of [null, undefined, 'oops', 42, true]) {
    assert.doesNotThrow(() => unmergeOwnedKeys(input), `no throw on ${JSON.stringify(input)}`);
    assert.equal(unmergeOwnedKeys(input), input, 'a non-object input is returned unchanged');
  }
  // An array IS typeof 'object': it must survive with no owned key invented on it.
  const arr = unmergeOwnedKeys([1, 2]);
  assert.deepEqual(arr, [1, 2], 'an array config is returned unchanged');
});

test('mergeTextMode then unmergeOwnedKeys round-trips a user config back to its original shape', () => {
  const ws = scratchWorkspace();
  const original = { workflow: { granularity: 'coarse' }, other: 1 };
  seedConfig(ws, JSON.stringify(original, null, 2) + '\n');
  mergeTextMode(ws);
  const merged = JSON.parse(fs.readFileSync(cfgPath(ws), 'utf8'));
  assert.deepEqual(unmergeOwnedKeys(merged), original, 'install → uninstall leaves the user config as it was');
});
