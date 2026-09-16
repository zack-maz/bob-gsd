'use strict';

/**
 * bob2-surfaces.test.cjs — the Bob 2.0.x on-disk SURFACE facts, frozen.
 *
 * Companion to test/bob2-capability.test.cjs (which freezes the Bob 2.0.1
 * capability observations). This file freezes the *surface* half re-verified on
 * 2026-09-16 against the live docs, recorded in
 * `.planning/research/260916-bob-shell-docs.md` §0 (the installer quick-answer
 * table) and `.planning/research/260916-bob-ide-docs.md` "Practical summary":
 *
 *   1. the custom-modes path asymmetry — GLOBAL is `settings/custom_modes.yaml`,
 *      LOCAL is `custom_modes.yaml` at the home root. The Shell page and the IDE
 *      page CONTRADICT each other on the global path (§12 of the Shell notes); the
 *      IDE form is the one gsd-bob writes and the one Bob 2.0 was observed to read,
 *      so it is pinned here rather than left to whichever page is read next.
 *   2. mode `groups` ⊆ the IDE-documented vocabulary. Bob validates `groups` as an
 *      OPEN string union, so an off-vocabulary token passes validation and then
 *      silently resolves to no tool. The IDE page is the only source that
 *      enumerates the 2.0 vocabulary; the emitted mode must stay inside it.
 *   3. BOTH surfaces are emitted per stem — a Bob 2.0 install gets a skill AND a
 *      slash command for every curated command source (skills give description
 *      auto-activation, commands give the explicit `/gsd-<stem>` entry).
 *   4. Bob 1.0.x is explicitly UNSUPPORTED (it has no skills surface at all:
 *      "Skills were not available in Bob Shell 1.0.x"). gsd-bob therefore does NOT
 *      version-sniff — it emits the 2.0 layout unconditionally. This is asserted
 *      as the ABSENCE of any `bob --version` probe under bin/ and src/, so a
 *      future "detect and degrade" attempt has to change this test deliberately.
 *
 * Hermetic: reads only gsd-bob's own values plus one scratch stage() run into a
 * mkdtempSync target. No network, no shelling out to Bob — the frozen facts must
 * fail in CI on any machine, not only on one with Bob installed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { repoRoot } = require('./_helpers/vendor.cjs');

const {
  MODES_FILENAME,
  modesRelPathForScope,
  emitGsdMode,
} = require(path.join(repoRoot, 'src', 'bob-adapter.cjs'));
const { stage } = require(path.join(repoRoot, 'src', 'installer', 'stage.cjs'));
const { newReport } = require(path.join(repoRoot, 'src', 'installer', 'report.cjs'));
const manifestMod = require(path.join(repoRoot, 'src', 'installer', 'manifest.cjs'));

/**
 * The tool-group vocabulary the IDE custom-modes page enumerates for Bob 2.0.x
 * (260916-bob-ide-docs.md "Practical summary"). The Shell page still lists the
 * 1.0-era `read, edit, browser, command, mcp` — that contradiction is recorded in
 * the Shell notes §12; this is the 2.0 set.
 */
const IDE_DOCUMENTED_GROUPS = Object.freeze([
  'read',
  'edit',
  'execute',
  'mcp',
  'skill',
  'workflow',
  'todo',
  'subtask',
  'subagent',
  'mode',
]);

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

// ---- 1. the custom-modes path asymmetry ----------------------------------

test('BOB2 surfaces: the GLOBAL custom-modes path is settings/custom_modes.yaml', () => {
  assert.equal(modesRelPathForScope('global'), path.join('settings', MODES_FILENAME));
  assert.equal(MODES_FILENAME, 'custom_modes.yaml', 'the filename itself is unchanged in 2.0');
});

test('BOB2 surfaces: the LOCAL custom-modes path is custom_modes.yaml at the home root', () => {
  assert.equal(modesRelPathForScope('local'), MODES_FILENAME);
  assert.ok(
    !modesRelPathForScope('local').includes('settings'),
    'the local path has NO settings/ segment — the settings/ move is global-only',
  );
});

// ---- 2. mode groups stay inside the IDE-documented vocabulary ------------

test('BOB2 surfaces: the emitted mode groups are a SUBSET of the IDE-documented vocabulary', () => {
  const groups = emitGsdMode().groups;
  assert.ok(Array.isArray(groups) && groups.length > 0, 'the mode declares groups');
  const offVocabulary = groups.filter((g) => !IDE_DOCUMENTED_GROUPS.includes(g));
  assert.deepEqual(
    offVocabulary,
    [],
    'Bob accepts unknown group strings silently and then grants no tool for them',
  );
  // `groups` is load-bearing: omitting it grants NO grouped tools at all
  // ("If you omit `groups`, the mode does not get any grouped tools.").
  assert.ok(
    Object.prototype.hasOwnProperty.call(emitGsdMode(), 'groups'),
    'groups is never omitted from the emitted mode',
  );
});

// ---- 3. both 2.0 surfaces are emitted per stem ---------------------------

test('BOB2 surfaces: a scratch stage emits BOTH a skill and a command for every curated stem', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const workspaceRoot = scratch('ws');
  stage({
    target,
    scope: 'local',
    workspaceRoot,
    dryRun: false,
    manifest: manifestMod.buildManifest({
      scope: 'local',
      configHome: target,
      gsdBobVersion: '0.0.0-test',
      entries: [],
    }),
    report: newReport(),
    repoRoot,
  });

  // The source stems are the drift-proof spine — enumerated, never a name list.
  const stems = fs
    .readdirSync(path.join(repoRoot, 'commands', 'gsd'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.basename(f, '.md'));

  const missing = [];
  for (const stem of stems) {
    const name = `gsd-${stem}`;
    if (!fs.existsSync(path.join(target, 'commands', `${name}.md`))) {
      missing.push(`commands/${name}.md`);
    }
    if (!fs.existsSync(path.join(target, 'skills', name, 'SKILL.md'))) {
      missing.push(`skills/${name}/SKILL.md`);
    }
  }
  assert.deepEqual(missing, [], 'every curated stem gets BOTH Bob 2.0 surfaces');

  // Counts are derived from the stem count, then the stem count itself is pinned
  // once — the same single-pinned-literal discipline as command-expansion.test.cjs.
  const cmdCount = fs
    .readdirSync(path.join(target, 'commands'))
    .filter((f) => /^gsd-.*\.md$/.test(f)).length;
  const skillCount = fs
    .readdirSync(path.join(target, 'skills'))
    .filter((d) => fs.existsSync(path.join(target, 'skills', d, 'SKILL.md'))).length;
  assert.equal(cmdCount, stems.length, 'one command per stem');
  assert.equal(skillCount, stems.length, 'one skill per stem');
  assert.equal(stems.length, 31, 'commands/gsd/ holds exactly 31 sources');
});

// ---- 4. Bob 1.0.x is unsupported — no version sniffing at all ------------

test('BOB2 surfaces: the repo carries NO bob version probe (1.0.x is unsupported, not degraded)', () => {
  // Built programmatically so this test's own source cannot satisfy the scan if
  // bin/ or src/ ever grows a file that reads it.
  const probe = ['bob', ' --', 'version'].join('');
  const offenders = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile() && fs.readFileSync(abs, 'utf8').includes(probe)) {
        offenders.push(path.relative(repoRoot, abs));
      }
    }
  };
  for (const dir of ['bin', 'src']) walk(path.join(repoRoot, dir));
  assert.deepEqual(
    offenders,
    [],
    'gsd-bob emits the Bob 2.0 layout unconditionally — it never sniffs the Bob version ' +
      '(1.0.x has no skills surface at all, so there is nothing to degrade to)',
  );
});
