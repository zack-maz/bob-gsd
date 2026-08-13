'use strict';

/**
 * bob2-capability.test.cjs — Phase 12 (BOB2-02, BOB2-04, BOB2-05).
 *
 * Pins the capability facts that were RE-VERIFIED against a live Bob Shell 2.0.1
 * install, replacing the doc-derived model v1/v2 had to work from. Every
 * assertion here corresponds to an observation recorded in
 * `.planning/phases/12-bob-2-0-capability-re-verification/12-BOB2-EVIDENCE.md`.
 *
 * Hermetic: reads only gsd-bob's own emitted values. It does NOT shell out to
 * Bob — the observations are frozen here so a regression fails in CI on any
 * machine, not only on one with Bob installed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  BOB_TOOL_GROUPS,
  BOB_LEGACY_TOOL_GROUP_ALIASES,
  MODES_FILENAME,
  modesRelPathForScope,
  isModesRelPath,
  emitGsdMode,
  gateArtifact,
} = require('../src/bob-adapter.cjs');

// --- BOB2-02: tool groups ---------------------------------------------------

/**
 * The verified vocabulary, frozen. Bob's mode schema validates `groups` as an
 * OPEN string union, so an unverified token would pass validation and then
 * silently never resolve to a tool — the failure mode this test exists to catch.
 * Changing this list means re-observing Bob, not editing to make a test pass.
 */
const VERIFIED_TOOL_GROUPS = [
  'read',
  'edit',
  'execute',
  'mcp',
  'skill',
  'todo',
  'artifact',
  'subtask',
  'subagent',
  'mode',
];

test('BOB2-02: the adapter vocabulary is exactly the set verified on Bob 2.0.1', () => {
  assert.deepEqual([...BOB_TOOL_GROUPS].sort(), [...VERIFIED_TOOL_GROUPS].sort());
});

test('BOB2-02: every group the emitted gsd mode declares is a verified group', () => {
  const groups = emitGsdMode().groups;
  assert.ok(Array.isArray(groups) && groups.length > 0, 'gsd mode must declare groups');
  for (const g of groups) {
    assert.ok(
      BOB_TOOL_GROUPS.includes(g),
      `emitted tool group "${g}" is not in the set verified against Bob 2.0.1 — ` +
        'Bob accepts unknown group strings silently and then grants no tool for them',
    );
  }
});

test('BOB2-02/03: the gsd mode keeps an execution group so the gsd_run seam is live', () => {
  const groups = emitGsdMode().groups;
  assert.ok(
    groups.includes('execute'),
    'without `execute` the customInstructions `node gsd-tools.cjs` shell-out cannot run',
  );
});

test('BOB2-02: `browser` is NOT emitted — it is an approval token, not a mode group', () => {
  assert.ok(!BOB_TOOL_GROUPS.includes('browser'));
  assert.ok(!emitGsdMode().groups.includes('browser'));
});

test('BOB2-02: `command` is recorded as a legacy ALIAS of `execute`, not an invalid token', () => {
  // Bob 2.0.1 normalizes `command` -> `execute` in both the custom-mode file
  // loader and the mode importer. The docs contradiction is a naming one only.
  assert.equal(BOB_LEGACY_TOOL_GROUP_ALIASES.command, 'execute');
  // The alias is back-compat input, never our output: we emit the canonical form.
  assert.ok(!emitGsdMode().groups.includes('command'));
});

// --- BOB2-04: scope-dependent custom-modes path -----------------------------

test('BOB2-04: the GLOBAL modes file lives under settings/', () => {
  assert.equal(modesRelPathForScope('global'), path.join('settings', MODES_FILENAME));
});

test('BOB2-04: the LOCAL modes file has no settings/ segment', () => {
  assert.equal(modesRelPathForScope('local'), MODES_FILENAME);
});

test('BOB2-04: the two scopes resolve to different paths (asymmetry regression guard)', () => {
  // Collapsing these back to one literal is the v0.2.2 bug: a global install
  // wrote ~/.bob/custom_modes.yaml, which Bob 2.0 never reads.
  assert.notEqual(modesRelPathForScope('global'), modesRelPathForScope('local'));
});

test('BOB2-04: uninstall recognises modes files at BOTH scopes and the legacy path', () => {
  assert.ok(isModesRelPath(modesRelPathForScope('global')));
  assert.ok(isModesRelPath(modesRelPathForScope('local')));
  // A manifest written by v0.2.x recorded the home-root path; it must still
  // un-merge or an upgrade would strand the old mode entry.
  assert.ok(isModesRelPath('custom_modes.yaml'));
  assert.ok(!isModesRelPath('settings/settings.json'));
  assert.ok(!isModesRelPath(''));
});

// --- BOB2-05: parallel subagent fan-out -------------------------------------

test('BOB2-05: parallel subagent fan-out gates as SUPPORTED (observed, not assumed)', () => {
  // Bob Shell 2.0.1's own spawn_subagent tool description states: "Multiple
  // spawn_subagent calls in one turn run in parallel."
  const decl = { parallelSubagentFanout: true, structuredPrompts: false };
  const res = gateArtifact({ name: 'gsd-parallel-fanout', requires: ['parallelSubagentFanout'] }, decl);
  assert.equal(res.supported, true);
});

test('BOB2-05: the gate still flags fan-out when a runtime lacks it (mechanism intact)', () => {
  // Flipping the declaration must still produce a concrete, loud reason — the
  // flag/skip contract does not weaken just because Bob now supports fan-out.
  const decl = { parallelSubagentFanout: false, structuredPrompts: false };
  const res = gateArtifact({ name: 'gsd-parallel-fanout', requires: ['parallelSubagentFanout'] }, decl);
  assert.equal(res.supported, false);
  assert.match(res.reason, /parallel|fan-?out|subagent/i);
});
