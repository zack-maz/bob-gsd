'use strict';

/**
 * global-scope-paths.test.cjs — the global-scope path-absolutization contract
 * (Phase 13).
 *
 * The converters map the Claude config home to a WORKSPACE-RELATIVE `.bob/` form
 * for a local install and to the tilde form `~/.bob/` for a global one. Bob's file
 * tools take paths LITERALLY — no `~` expansion is documented anywhere in the Bob
 * docs — and a workspace-relative `.bob/gsd-core/...` simply does not exist under
 * `~/.bob`. So a global install that shipped either form would emit artifacts whose
 * every `@...` mandatory-read and every shell-out pointed at nothing.
 *
 * stage.cjs therefore rewrites the global form to the ABSOLUTE install target
 * (`absolutizeGlobalHome`) and hands `emitGsdMode` the matching `gsdCoreDir` so the
 * custom mode's `node .../gsd-core/bin/gsd-tools.cjs` shell-out names the same
 * place. This file pins both halves, at both scopes, through the REAL stage() seam:
 *
 *   1. GLOBAL emission — no emitted command or skill carries the tilde form and
 *      none carries the workspace-relative `@.bob/gsd-core` ref; at least one
 *      carries `@<absolute target>/gsd-core/workflows/`.
 *   2. GLOBAL mode — the merged settings/custom_modes.yaml customInstructions
 *      names `<absolute target>/gsd-core/bin/gsd-tools.cjs`.
 *   3. LOCAL emission + mode — the refs are the workspace-relative
 *      `.bob/gsd-core/...` form and the mode says `.bob/gsd-core/bin/gsd-tools.cjs`
 *      (the absolutization must NOT leak into local scope).
 *   4. absolutizeGlobalHome as a UNIT — slash form, bare form, a trailing-slash
 *      target, and no double-rewrite on a second pass.
 *
 * Hermetic: stage() runs into a mkdtempSync scratch target with a mkdtempSync
 * scratch workspaceRoot, reusing the model-neutrality.test.cjs / command-expansion
 * Group C harness idiom (freshManifest + newReport + baseOpts). Nothing is written
 * into the repo's .planning/. The tilde/dot-home literals the assertions forbid are
 * built PROGRAMMATICALLY via .join('') so this file's own prose never self-trips.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');
const { repoRoot: pkgRoot } = require('../_helpers/vendor.cjs');

const {
  stage,
  absolutizeGlobalHome,
} = require(path.join(pkgRoot, 'src', 'installer', 'stage.cjs'));
const { newReport } = require(path.join(pkgRoot, 'src', 'installer', 'report.cjs'));
const manifestMod = require(path.join(pkgRoot, 'src', 'installer', 'manifest.cjs'));
const { modesRelPathForScope } = require(path.join(pkgRoot, 'src', 'bob-adapter.cjs'));

// Programmatic tokens — never spelled out, so the forbidden-token scans below can
// never match this file's own source if it is ever read back.
const BOB_DOT = ['.', 'bob'].join('');
const TILDE_BOB = ['~', '/', BOB_DOT].join('');
const LOCAL_REF = `@${BOB_DOT}/gsd-core/`;

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

function freshManifest(target, scope) {
  return manifestMod.buildManifest({
    scope,
    configHome: target,
    gsdBobVersion: '0.0.0-test',
    entries: [],
  });
}

/** Run the REAL stage() at the given scope into a fresh scratch target. */
function stageAt(scope) {
  const target = path.join(scratch('tgt'), BOB_DOT);
  const workspaceRoot = scratch('ws');
  stage({
    target,
    scope,
    workspaceRoot,
    dryRun: false,
    manifest: freshManifest(target, scope),
    report: newReport(),
    repoRoot: pkgRoot,
  });
  return { target, workspaceRoot };
}

/** Every emitted command + skill body, as [relPath, content] pairs. */
function emittedArtifacts(target) {
  const out = [];
  for (const f of fs.readdirSync(path.join(target, 'commands'))) {
    if (f.endsWith('.md')) {
      out.push([path.join('commands', f), fs.readFileSync(path.join(target, 'commands', f), 'utf8')]);
    }
  }
  const skillsDir = path.join(target, 'skills');
  for (const d of fs.readdirSync(skillsDir)) {
    const abs = path.join(skillsDir, d, 'SKILL.md');
    if (fs.existsSync(abs)) {
      out.push([path.join('skills', d, 'SKILL.md'), fs.readFileSync(abs, 'utf8')]);
    }
  }
  return out;
}

/** The gsd mode's customInstructions out of a merged custom_modes.yaml. */
function gsdModeInstructions(target, scope) {
  const abs = path.join(target, modesRelPathForScope(scope));
  assert.ok(fs.existsSync(abs), `${modesRelPathForScope(scope)} written at ${scope} scope`);
  const doc = yaml.load(fs.readFileSync(abs, 'utf8')) || {};
  const mode = (doc.customModes || []).find((m) => m.slug === 'gsd');
  assert.ok(mode, 'the merged modes file carries the gsd mode');
  return mode.customInstructions;
}

// ---- 1/2. GLOBAL scope ----------------------------------------------------

test('global scope: no emitted artifact carries the tilde home or a workspace-relative gsd-core ref', () => {
  const { target } = stageAt('global');
  const artifacts = emittedArtifacts(target);
  assert.ok(artifacts.length > 0, 'the global stage emitted artifacts');

  const tildeLeaks = [];
  const relativeLeaks = [];
  for (const [rel, content] of artifacts) {
    if (content.includes(TILDE_BOB)) tildeLeaks.push(rel);
    if (content.includes(LOCAL_REF)) relativeLeaks.push(rel);
  }
  assert.deepEqual(tildeLeaks, [], 'no emitted artifact ships the un-expanded tilde home');
  assert.deepEqual(relativeLeaks, [], 'no emitted artifact ships a workspace-relative gsd-core ref');
});

test('global scope: at least one emitted artifact points at the ABSOLUTE staged workflows dir', () => {
  const { target } = stageAt('global');
  const wanted = `@${target}/gsd-core/workflows/`;
  const carriers = emittedArtifacts(target).filter(([, c]) => c.includes(wanted));
  assert.ok(
    carriers.length > 0,
    `at least one artifact carries ${wanted}; none of ${emittedArtifacts(target).length} did`,
  );
});

test('global scope: the merged custom mode shells out to the ABSOLUTE staged shim', () => {
  const { target } = stageAt('global');
  const instructions = gsdModeInstructions(target, 'global');
  assert.ok(
    instructions.includes(path.join(target, 'gsd-core', 'bin', 'gsd-tools.cjs')),
    'customInstructions names the absolute staged shim path',
  );
  assert.ok(
    !instructions.includes(TILDE_BOB),
    'customInstructions does not ship the un-expanded tilde home',
  );
});

// ---- 3. LOCAL scope (the absolutization must NOT leak) --------------------

test('local scope: emitted artifacts keep the workspace-relative .bob/gsd-core form', () => {
  const { target } = stageAt('local');
  const artifacts = emittedArtifacts(target);
  assert.ok(artifacts.length > 0, 'the local stage emitted artifacts');

  const carriers = artifacts.filter(([, c]) => c.includes(`${LOCAL_REF}workflows/`));
  assert.ok(carriers.length > 0, 'at least one artifact carries the workspace-relative workflows ref');

  // No artifact may carry the tilde form OR the absolute scratch target at local
  // scope — the absolutization is a global-only rewrite.
  const leaks = artifacts.filter(([, c]) => c.includes(TILDE_BOB) || c.includes(target));
  assert.deepEqual(leaks.map(([rel]) => rel), [], 'no tilde or absolute-target leak at local scope');
});

test('local scope: the merged custom mode shells out to the workspace-relative shim', () => {
  const { target } = stageAt('local');
  const instructions = gsdModeInstructions(target, 'local');
  assert.ok(
    instructions.includes(path.join(BOB_DOT, 'gsd-core', 'bin', 'gsd-tools.cjs')),
    'customInstructions names the workspace-relative staged shim path',
  );
  assert.ok(!instructions.includes(target), 'customInstructions carries no absolute target at local scope');
});

// ---- 4. absolutizeGlobalHome as a unit ------------------------------------

test('absolutizeGlobalHome: rewrites the slash form to <target>/', () => {
  const out = absolutizeGlobalHome(`read @${TILDE_BOB}/gsd-core/workflows/x.md now`, '/opt/home/.bob');
  assert.equal(out, 'read @/opt/home/.bob/gsd-core/workflows/x.md now');
});

test('absolutizeGlobalHome: rewrites the BARE form (no trailing slash) to <target>', () => {
  const out = absolutizeGlobalHome(`install under ${TILDE_BOB} today`, '/opt/home/.bob');
  assert.equal(out, 'install under /opt/home/.bob today');
});

test('absolutizeGlobalHome: a trailing-slash target never yields a doubled separator', () => {
  const out = absolutizeGlobalHome(`@${TILDE_BOB}/gsd-core/x.md`, '/opt/home/.bob/');
  assert.equal(out, '@/opt/home/.bob/gsd-core/x.md');
  assert.ok(!out.includes('//'), 'no doubled separator');
});

test('absolutizeGlobalHome: a second pass is a no-op (no double rewrite)', () => {
  const target = '/opt/home/.bob';
  const once = absolutizeGlobalHome(`@${TILDE_BOB}/gsd-core/x.md and ${TILDE_BOB}`, target);
  assert.equal(absolutizeGlobalHome(once, target), once, 'idempotent');
  assert.ok(!once.includes(TILDE_BOB), 'no tilde form survives the first pass');
});
