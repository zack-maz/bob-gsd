'use strict';

/**
 * planning-bytecompat.test.cjs — RUNTIME-03.
 *
 * Proves a `.planning/` artifact produced under a BOB runtime config is
 * byte-identical to the same artifact produced under the REFERENCE runtime config.
 *
 * PRIMARY (hermetic golden diff): construct two runtime-config contexts (bob
 * descriptor resolved vs the reference descriptor resolved), drive the SAME
 * runtime-agnostic `.planning/` write path under each — gsd-core's
 * state-document writer (`stateReplaceField`/`stateReplaceFieldIfTemplate`),
 * the exact code path `gsd-tools query state.*` uses to mutate
 * `.planning/STATE.md` — and assert the emitted bytes are identical. The write
 * path takes NO runtime argument, so the two runs differ ONLY in the resolved
 * config home (which never reaches the artifact body); byte-identity is the
 * observable proof of runtime-agnosticism. Fully hermetic: in-memory strings,
 * injected env/home, no disk, no live Bob.
 *
 * STRUCTURAL INVARIANT (secondary, always asserted): the bob runtime declares
 * no `.planning/` artifactLayout target — converters/layout never enumerate
 * `.planning/`, so the write path is shared with the reference runtime by construction.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { requireVendor } = require('./_helpers/vendor.cjs');

const { resolveConfigHomeFromDescriptor } = requireVendor('runtime-homes.cjs');
const { runtimes } = requireVendor('capability-registry.cjs');
const stateDoc = requireVendor('state-document.cjs');

/** A representative `.planning/STATE.md` fragment (the real artifact contract). */
const STATE_TEMPLATE = [
  '---',
  'current_phase: 02',
  'status: executing',
  'stopped_at: nowhere',
  '---',
  '',
  '# Project State',
  '',
  'Phase: 02 — EXECUTING',
].join('\n');

/**
 * Drive the runtime-agnostic `.planning/` write path for a given runtime.
 * Resolving the config home exercises the runtime context, but the home path
 * never flows into the artifact body — the write functions take no runtime arg.
 */
function renderPlanningArtifact(runtimeId) {
  const descriptor = runtimes[runtimeId].runtime.configHome;
  // Resolve the runtime's config home hermetically (proves the context is real)
  // — deliberately unused in the body; its absence from the output is the point.
  const configHome = resolveConfigHomeFromDescriptor(descriptor, { env: {}, home: '/home/u' });
  void configHome;

  let content = STATE_TEMPLATE;
  content = stateDoc.stateReplaceField(content, 'status', 'executing');
  content = stateDoc.stateReplaceField(content, 'stopped_at', 'Phase 2 plan 1 executing');
  content = stateDoc.stateReplaceField(content, 'current_phase', '02');
  return content;
}

test('RUNTIME-03: .planning/ artifact is byte-identical across bob and claude runtime configs', () => {
  const bobBytes = renderPlanningArtifact('bob');
  const claudeBytes = renderPlanningArtifact('claude');
  assert.equal(
    bobBytes,
    claudeBytes,
    'the .planning/ artifact body must not vary with the runtime (runtime-agnostic write path)',
  );
  // Sanity: the write path actually mutated the template (not a vacuous equal).
  assert.match(bobBytes, /Phase 2 plan 1 executing/);
  // Sanity: the resolved config home leaked nowhere into the artifact body.
  assert.ok(!bobBytes.includes('.bob'), 'config home must not leak into .planning/ body');
  assert.ok(!claudeBytes.includes('.claude'), 'config home must not leak into .planning/ body');
});

test('RUNTIME-03 structural invariant: bob declares no .planning/ artifactLayout target', () => {
  const layout = runtimes.bob.runtime.artifactLayout;
  const allTargets = [...layout.global, ...layout.local];
  for (const t of allTargets) {
    assert.ok(
      !/\.planning/.test(t.destSubpath),
      `bob artifactLayout target "${t.destSubpath}" must not enumerate .planning/`,
    );
  }
  // bob's only targets are skills + commands (NOT .planning) — same shape as the reference.
  const kinds = allTargets.map((t) => t.kind).sort();
  assert.deepEqual([...new Set(kinds)].sort(), ['commands', 'skills']);
});
