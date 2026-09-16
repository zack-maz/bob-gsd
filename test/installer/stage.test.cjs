'use strict';

/**
 * stage.test.cjs — INSTALL-03 (clean .bob/ layout end-to-end) + INSTALL-04
 * (idempotent re-run preserving user files). Hermetic: every case runs against
 * scratch tmpdir `target` / `workspaceRoot` / fixture `repoRoot`, no live Bob.
 *
 * The repoRoot vs workspaceRoot distinction is load-bearing (T-03-09b): the
 * vendored gsd-core/ payload is copied from repoRoot (the package root), NEVER
 * from cwd/workspaceRoot. The cwd-independence case proves it by pointing all
 * three at distinct scratch dirs.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { repoRoot: pkgRoot } = require('../_helpers/vendor.cjs');

const { stage } = require(path.join(pkgRoot, 'src', 'installer', 'stage.cjs'));
const { newReport } = require(path.join(pkgRoot, 'src', 'installer', 'report.cjs'));
const manifestMod = require(path.join(pkgRoot, 'src', 'installer', 'manifest.cjs'));
const conv = require(
  path.join(pkgRoot, 'gsd-core', 'bin', 'lib', 'runtime-artifact-conversion.cjs'),
);

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

/**
 * Build a fixture gsd-bob PACKAGE root with a minimal vendored gsd-core/ payload
 * (just enough that <repoRoot>/gsd-core/bin/gsd-tools.cjs exists to be copied),
 * plus the two gsd-core SIBLINGS the staging engine now stages so the shim is
 * runnable out of tree: gsd-core/VERSION (source of the stamped package.json
 * version) and scripts/fix-slash-commands.cjs (eagerly required by the shim).
 * These siblings are part of the vendored package contract — a package missing
 * them is broken and stage() correctly throws.
 */
function fixtureRepoRoot() {
  const root = scratch('repo');
  const binDir = path.join(root, 'gsd-core', 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(path.join(binDir, 'gsd-tools.cjs'), '// vendored payload marker\n', 'utf8');
  // gsd-core/VERSION — single token, no trailing newline (mirrors the real file).
  fs.writeFileSync(path.join(root, 'gsd-core', 'VERSION'), '1.5.0', 'utf8');
  // scripts/fix-slash-commands.cjs sibling (verbatim-copied by stage()).
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'scripts', 'fix-slash-commands.cjs'),
    '// vendored fix-slash-commands marker\n',
    'utf8',
  );
  return root;
}

/**
 * Seed a `commands/gsd/<stem>.md` Claude source under an existing fixture
 * repoRoot so the convertible loop has input to convert. Mirrors the canonical
 * Claude-command shape (frontmatter with unsupported keys + body refs to be
 * neutralized). Returns the raw source content.
 */
function seedConvertibleSource(repoRoot, stem) {
  // The convertible loop lazily requires the vendored converter lib from the
  // fixture repoRoot; that lib pulls in sibling libs and reaches up into the
  // repoRoot's scripts/ + package.json. Rather than deep-copy the 5MB payload,
  // symlink the real pkgRoot's gsd-core/, scripts/ and package.json into the
  // fixture so every transitive require resolves against the genuine vendored
  // tree. (fixtureRepoRoot pre-creates gsd-core/bin/gsd-tools.cjs as a real
  // file, so remove that stub dir first before linking the real tree.)
  fs.rmSync(path.join(repoRoot, 'gsd-core'), { recursive: true, force: true });
  for (const link of ['gsd-core', 'scripts', 'package.json']) {
    const linkPath = path.join(repoRoot, link);
    if (!fs.existsSync(linkPath)) {
      fs.symlinkSync(path.join(pkgRoot, link), linkPath);
    }
  }

  const dir = path.join(repoRoot, 'commands', 'gsd');
  fs.mkdirSync(dir, { recursive: true });
  // Forbidden tokens (Claude config-home + colon dialect) built programmatically
  // so this test file's prose cannot self-trip the neutralization assertions.
  const claudeHome = ['.', 'claude'].join('');
  const colonDialect = ['gsd', ':'].join('');
  const content = [
    '---',
    `name: ${colonDialect}${stem}`,
    `description: Demo ${stem} command for the convertible loop`,
    'argument-hint: <topic>',
    'effort: low',
    'allowed-tools: Read, Bash',
    `agent: ${colonDialect}${stem}`,
    '---',
    '',
    `# ${stem}`,
    '',
    `See the workflow at ${claudeHome}/gsd-core/workflows/${stem}.md and run /${colonDialect}${stem}.`,
    `The user passed $ARGUMENTS to scope ${stem}.`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, `${stem}.md`), content, 'utf8');
  return content;
}

function freshManifest(target) {
  return manifestMod.buildManifest({
    scope: 'local',
    configHome: target,
    gsdBobVersion: '0.0.0-test',
    entries: [],
  });
}

function baseOpts(overrides = {}) {
  const target = overrides.target || scratch('target');
  const workspaceRoot = overrides.workspaceRoot || scratch('ws');
  const repoRoot = overrides.repoRoot || fixtureRepoRoot();
  return {
    target,
    scope: 'local',
    workspaceRoot,
    dryRun: false,
    manifest: overrides.manifest || freshManifest(target),
    report: overrides.report || newReport(),
    repoRoot,
    ...overrides,
  };
}

function countSlug(text, slug) {
  const re = new RegExp(`slug:\\s*${slug}(?![\\w-])`, 'g');
  return (text.match(re) || []).length;
}

test('clean stage: custom_modes.yaml (one gsd slug) + payload + roster + manifest entries', () => {
  const opts = baseOpts();
  stage(opts);

  const modesPath = path.join(opts.target, 'custom_modes.yaml');
  assert.ok(fs.existsSync(modesPath), 'custom_modes.yaml exists at the home root');
  const modesText = fs.readFileSync(modesPath, 'utf8');
  assert.equal(countSlug(modesText, 'gsd'), 1, 'exactly one gsd slug');

  assert.ok(
    fs.existsSync(path.join(opts.target, 'gsd-core', 'bin', 'gsd-tools.cjs')),
    'vendored payload copied so gsd-tools.cjs resolves',
  );
  assert.ok(fs.existsSync(path.join(opts.target, 'SUPPORT-ROSTER.md')), 'roster regenerated');

  const kinds = opts.manifest.entries.map((e) => e.kind);
  assert.ok(kinds.includes('merged'), 'manifest has a merged entry (custom_modes.yaml)');
  assert.ok(kinds.includes('file'), 'manifest has file entries (payload/roster)');
  const merged = opts.manifest.entries.find((e) => e.path === 'custom_modes.yaml');
  assert.ok(merged && merged.kind === 'merged', 'custom_modes.yaml tracked as merged');
});

test('repoRoot-sourced payload is cwd-independent (target, workspaceRoot, repoRoot all distinct)', () => {
  const target = scratch('target');
  const workspaceRoot = scratch('ws');
  const repoRoot = fixtureRepoRoot();
  // workspaceRoot has NO gsd-core/ — if stage read the payload from cwd it would fail.
  assert.ok(!fs.existsSync(path.join(workspaceRoot, 'gsd-core')), 'workspaceRoot has no payload');

  const opts = baseOpts({ target, workspaceRoot, repoRoot });
  stage(opts);

  assert.ok(
    fs.existsSync(path.join(target, 'gsd-core', 'bin', 'gsd-tools.cjs')),
    'payload resolves from repoRoot, not cwd/workspaceRoot',
  );
});

test('missing payload at repoRoot fails loud (does not silently stage an empty payload)', () => {
  const repoRoot = scratch('emptyrepo'); // no gsd-core/ inside
  const opts = baseOpts({ repoRoot });
  assert.throws(() => stage(opts), /repoRoot|gsd-core|payload/i);
});

test('idempotent re-run: unchanged custom_modes.yaml re-hashed, gsd slug stays 1', () => {
  const opts = baseOpts();
  stage(opts);
  const firstModes = fs.readFileSync(path.join(opts.target, 'custom_modes.yaml'), 'utf8');

  // Re-run with the SAME manifest (now populated) and a fresh report.
  const opts2 = baseOpts({
    target: opts.target,
    workspaceRoot: opts.workspaceRoot,
    repoRoot: opts.repoRoot,
    manifest: opts.manifest,
    report: newReport(),
  });
  stage(opts2);
  const secondModes = fs.readFileSync(path.join(opts.target, 'custom_modes.yaml'), 'utf8');
  assert.equal(countSlug(secondModes, 'gsd'), 1, 'no duplicate gsd slug after re-run');
  assert.equal(firstModes, secondModes, 'unchanged modes re-emitted byte-identically');
});

test('user-modified tracked file is SKIPPED (hash differs), not clobbered', () => {
  const opts = baseOpts();
  stage(opts);

  // Find a tracked payload file entry and user-edit it.
  const fileEntry = opts.manifest.entries.find(
    (e) => e.kind === 'file' && e.path.includes('gsd-tools.cjs'),
  );
  assert.ok(fileEntry, 'a tracked payload file entry exists');
  const abs = path.join(opts.target, fileEntry.path);
  fs.writeFileSync(abs, '// USER EDITED THIS\n', 'utf8');

  const report = newReport();
  stage(baseOpts({
    target: opts.target,
    workspaceRoot: opts.workspaceRoot,
    repoRoot: opts.repoRoot,
    manifest: opts.manifest,
    report,
  }));

  assert.equal(fs.readFileSync(abs, 'utf8'), '// USER EDITED THIS\n', 'user edit preserved');
  assert.ok(
    report.skipped.some((s) => s.includes('gsd-tools.cjs')),
    'skip recorded in report.skipped',
  );
});

test('pre-seeded user mode is preserved through staging', () => {
  const opts = baseOpts();
  fs.mkdirSync(opts.target, { recursive: true });
  fs.writeFileSync(
    path.join(opts.target, 'custom_modes.yaml'),
    'customModes:\n  - slug: my-mode\n    name: My Mode\n',
    'utf8',
  );
  stage(opts);
  const modesText = fs.readFileSync(path.join(opts.target, 'custom_modes.yaml'), 'utf8');
  assert.ok(modesText.includes('my-mode'), 'user slug preserved');
  assert.equal(countSlug(modesText, 'gsd'), 1, 'gsd slug added exactly once');
});

test('empty convertible roster: no commands/gsd/ source → zero convertible artifacts, no throw', () => {
  // The fixture repoRoot deliberately has NO commands/gsd/ source.
  const opts = baseOpts();
  assert.doesNotThrow(() => stage(opts), 'completes cleanly with an absent convertible source');
  // No skills/commands dirs are required to exist when the source is empty.
  assert.ok(fs.existsSync(path.join(opts.target, 'custom_modes.yaml')), 'structural pieces still staged');
});

test('convertible loop: present source emits CONVERTED command (bytes = convertClaudeCommandToBobCommand, NOT raw)', () => {
  const repoRoot = fixtureRepoRoot();
  const source = seedConvertibleSource(repoRoot, 'demo');
  const opts = baseOpts({ repoRoot });
  stage(opts);

  const cmdAbs = path.join(opts.target, 'commands', 'gsd-demo.md');
  assert.ok(fs.existsSync(cmdAbs), 'flat command emitted at commands/gsd-demo.md');
  const emitted = fs.readFileSync(cmdAbs, 'utf8');
  const expected = conv.convertClaudeCommandToBobCommand(source, 'gsd-demo');
  assert.equal(emitted, expected, 'emitted command bytes equal the converter output');
  assert.notEqual(emitted, source, 'emitted command is NOT the raw source (it was converted)');
});

test('convertible loop: present source ALSO emits the nested SKILL.md (bytes = convertClaudeCommandToBobSkill)', () => {
  const repoRoot = fixtureRepoRoot();
  const source = seedConvertibleSource(repoRoot, 'demo');
  const opts = baseOpts({ repoRoot });
  stage(opts);

  const skillAbs = path.join(opts.target, 'skills', 'gsd-demo', 'SKILL.md');
  assert.ok(fs.existsSync(skillAbs), 'nested skill emitted at skills/gsd-demo/SKILL.md');
  const emitted = fs.readFileSync(skillAbs, 'utf8');
  const expected = conv.convertClaudeCommandToBobSkill(source, 'gsd-demo');
  assert.equal(emitted, expected, 'emitted skill bytes equal the converter output');
});

test('convertible loop: emitted command frontmatter keeps description+argument-hint, strips effort/allowed-tools/agent', () => {
  const repoRoot = fixtureRepoRoot();
  seedConvertibleSource(repoRoot, 'demo');
  const opts = baseOpts({ repoRoot });
  stage(opts);

  const out = fs.readFileSync(path.join(opts.target, 'commands', 'gsd-demo.md'), 'utf8');
  const fmEnd = out.indexOf('---', 3);
  assert.ok(fmEnd > 0, 'frontmatter block present');
  const fm = out.substring(3, fmEnd);
  assert.match(fm, /^description:/m);
  assert.match(fm, /^argument-hint:/m);
  assert.doesNotMatch(fm, /^effort:/m);
  assert.doesNotMatch(fm, /^allowed-tools:/m);
  assert.doesNotMatch(fm, /^agent:/m);
});

test('convertible loop: emitted command + skill bodies are neutralized (no .claude / no colon dialect)', () => {
  const repoRoot = fixtureRepoRoot();
  seedConvertibleSource(repoRoot, 'demo');
  const opts = baseOpts({ repoRoot });
  stage(opts);

  const claudeHome = ['.', 'claude'].join('');
  const colonDialect = ['gsd', ':'].join('');
  const bobHome = ['.', 'bob'].join('');
  const hyphenForm = ['gsd', '-'].join('');

  for (const rel of ['commands/gsd-demo.md', 'skills/gsd-demo/SKILL.md']) {
    const out = fs.readFileSync(path.join(opts.target, rel), 'utf8');
    assert.ok(!out.includes(claudeHome), `${rel}: no Claude config-home path ref`);
    assert.ok(!out.includes(colonDialect), `${rel}: no colon-dialect command ref`);
    assert.ok(out.includes(bobHome), `${rel}: carries the .bob home`);
    assert.ok(out.includes(hyphenForm), `${rel}: carries the hyphen command form`);
  }
});

test('convertible loop: both emitted artifacts are recorded as manifest file entries', () => {
  const repoRoot = fixtureRepoRoot();
  seedConvertibleSource(repoRoot, 'demo');
  const opts = baseOpts({ repoRoot });
  stage(opts);

  const paths = opts.manifest.entries.filter((e) => e.kind === 'file').map((e) => e.path);
  assert.ok(
    paths.includes(path.join('commands', 'gsd-demo.md')),
    'command tracked as a manifest file entry',
  );
  assert.ok(
    paths.includes(path.join('skills', 'gsd-demo', 'SKILL.md')),
    'skill tracked as a manifest file entry',
  );
});

test('orphan sweep: hash-match orphan removed + dropped; diverged orphan kept+warned; .planning untouched', () => {
  const opts = baseOpts();
  stage(opts);

  // Inject two orphan 'file' entries into the manifest, both pointing under target.
  const orphanMatchAbs = path.join(opts.target, 'orphan-match.md');
  const orphanDiffAbs = path.join(opts.target, 'orphan-diff.md');
  const matchBytes = Buffer.from('orphan match content\n');
  fs.writeFileSync(orphanMatchAbs, matchBytes);
  fs.writeFileSync(orphanDiffAbs, Buffer.from('orphan content\n'));
  opts.manifest.entries.push({
    path: 'orphan-match.md',
    sha256: manifestMod.sha256(matchBytes),
    kind: 'file',
  });
  opts.manifest.entries.push({
    path: 'orphan-diff.md',
    sha256: manifestMod.sha256(Buffer.from('original content\n')), // differs from disk
    kind: 'file',
  });

  // A .planning dir under target must NEVER be pruned.
  const planningDir = path.join(opts.target, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'keep.md'), 'never prune me\n');

  const report = newReport();
  stage(baseOpts({
    target: opts.target,
    workspaceRoot: opts.workspaceRoot,
    repoRoot: opts.repoRoot,
    manifest: opts.manifest,
    report,
  }));

  assert.ok(!fs.existsSync(orphanMatchAbs), 'hash-match orphan removed');
  assert.ok(
    !opts.manifest.entries.some((e) => e.path === 'orphan-match.md'),
    'removed orphan dropped from entries[]',
  );
  assert.ok(report.removed.some((r) => r.includes('orphan-match.md')), 'recorded in report.removed');

  assert.ok(fs.existsSync(orphanDiffAbs), 'diverged orphan left on disk');
  assert.ok(report.skipped.some((s) => s.includes('orphan-diff.md')), 'diverged orphan warned');

  assert.ok(fs.existsSync(path.join(planningDir, 'keep.md')), '.planning never pruned');
});

test('user-dir prune safety: untracked dir + file under target survive an orphan sweep', () => {
  const opts = baseOpts();
  stage(opts);

  // A user-created, manifest-absent dir + file.
  const userDir = path.join(opts.target, 'my-stuff');
  const userFile = path.join(userDir, 'notes.txt');
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(userFile, 'my private notes\n');

  // Inject a removable orphan to force a sweep+prune pass.
  const orphanAbs = path.join(opts.target, 'gone.md');
  const orphanBytes = Buffer.from('gone\n');
  fs.writeFileSync(orphanAbs, orphanBytes);
  opts.manifest.entries.push({
    path: 'gone.md',
    sha256: manifestMod.sha256(orphanBytes),
    kind: 'file',
  });

  stage(baseOpts({
    target: opts.target,
    workspaceRoot: opts.workspaceRoot,
    repoRoot: opts.repoRoot,
    manifest: opts.manifest,
    report: newReport(),
  }));

  assert.ok(fs.existsSync(userDir), 'untracked user dir survives');
  assert.ok(fs.existsSync(userFile), 'untracked user file survives');
  assert.ok(!fs.existsSync(orphanAbs), 'the tracked orphan was still swept');
});

test('dryRun populates report buckets but writes/copies/removes nothing', () => {
  const target = scratch('target');
  const opts = baseOpts({ target, dryRun: true });
  stage(opts);

  assert.equal(fs.existsSync(path.join(target, 'custom_modes.yaml')), false, 'no modes written');
  assert.equal(fs.existsSync(path.join(target, 'gsd-core')), false, 'no payload copied');
  assert.equal(fs.existsSync(path.join(target, 'SUPPORT-ROSTER.md')), false, 'no roster written');
  assert.ok(opts.report.written.length > 0, 'report.written populated with the PLAN');
});

// ---- the STAGED roster covers the whole curated source set ----------------
//
// Before the Phase 13 re-vendor the staged SUPPORT-ROSTER.md was checked only for
// existence, and rosterCandidates() used to be seeded from a 3-name representative
// set. It is now DERIVED from `commands/gsd/*.md` — the same spine the convertible
// loop iterates — so the staged roster and the emitted artifact set can never
// disagree. This pins that: a real-payload stage lists EVERY curated stem as
// `gsd-<stem>` under the Supported heading, and the count matches the source count.

test('the STAGED SUPPORT-ROSTER.md lists every curated stem as gsd-<stem> under Supported', () => {
  const { rosterCandidates } = require(path.join(pkgRoot, 'src', 'installer', 'stage.cjs'));

  // Stage the REAL package payload (not the minimal fixture) so the roster is
  // rendered from the real curated source set.
  const target = scratch('target');
  const opts = baseOpts({ target, repoRoot: pkgRoot });
  stage(opts);

  const roster = fs.readFileSync(path.join(target, 'SUPPORT-ROSTER.md'), 'utf8');

  // Slice ONLY the Supported section so a stem named in an Unsupported reason line
  // can never falsely satisfy the assertion (the docs-conformance idiom).
  const supIdx = roster.search(/^##\s+Supported\b/m);
  assert.ok(supIdx >= 0, 'the staged roster has a Supported section');
  const afterSup = roster.slice(supIdx);
  const nextIdx = afterSup.slice(1).search(/^##\s+/m);
  const supported = nextIdx >= 0 ? afterSup.slice(0, nextIdx + 1) : afterSup;

  // The drift-proof spine: enumerate stems from the directory, never a name list.
  const stems = fs
    .readdirSync(path.join(pkgRoot, 'commands', 'gsd'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.basename(f, '.md'));

  const missing = stems.filter((stem) => !new RegExp(`^-\\s+gsd-${stem}\\s*$`, 'm').test(supported));
  assert.deepEqual(missing, [], 'every curated stem is listed in the staged roster');

  // Listed count === source count: the roster is no longer a representative subset.
  const listed = [...supported.matchAll(/^-\s+(gsd-[a-z0-9-]+)\s*$/gm)].map((m) => m[1]);
  assert.equal(listed.length, stems.length, 'the roster lists exactly the curated source set, no more');

  // And rosterCandidates() — the function that feeds the render — derives the same set.
  assert.deepEqual(
    rosterCandidates(pkgRoot).map((c) => c.name).sort(),
    stems.map((s) => `gsd-${s}`).sort(),
    'rosterCandidates() is derived from commands/gsd, not a hand-maintained list',
  );
});
