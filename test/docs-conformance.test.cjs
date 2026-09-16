'use strict';

/**
 * docs-conformance.test.cjs — D-03 (Phase 10 verification).
 *
 * The hermetic drift guard that pins README's Supported skills list and
 * COMMANDS.md's per-command reference to the generated `SUPPORT-ROSTER.md`
 * Supported set. Reads only committed markdown via a fixed `repoRoot` (never raw
 * process.cwd() — V5 input-validation control); no scratch tmpdir, no cleanup.
 *
 * The drift-proof spine enumerates stems from `commands/gsd/*.md` (readdirSync),
 * with the SINGLE pinned literal `31` (matching command-expansion.test.cjs L220);
 * every other count/list derives from `stems`.
 *
 * Three set-equality assertions (RESEARCH §3):
 *   1. roster Supported set == the directory-derived `gsd-<stem>` set.
 *   2. README `## Supported skills` token set == roster Supported set.
 *   3. COMMANDS.md `gsd-` token set == roster Supported set.
 *
 * The README/roster section slicing reuses the command-expansion.test.cjs
 * heading-to-next-`##` idiom so a Flagged-gaps mention of gsd-parallel-fanout
 * (Pitfall 5) or an Unsupported-reason stem can never falsely satisfy an
 * assertion. All regexes are linear + anchored (ReDoS-safe).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { repoRoot } = require('./_helpers/vendor.cjs');

// The drift-proof spine: enumerate stems from the directory, NEVER a hardcoded
// 31-name list.
const cmdSrcDir = path.join(repoRoot, 'commands', 'gsd');
const stems = fs
  .readdirSync(cmdSrcDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => path.basename(f, '.md'));

// The SINGLE pinned literal 31 (Pitfall 4) — every other count derives from here.
test('docs-conformance: commands/gsd/ holds exactly 31 sources', () => {
  assert.equal(stems.length, 31, 'commands/gsd/ must hold exactly 31 sources');
});

/**
 * Slice a markdown file from `## <heading>` to the next `## ` heading (or EOF),
 * reusing the command-expansion.test.cjs L228-234 idiom so out-of-section tokens
 * (e.g. Flagged-gaps / Unsupported-reason lines) can never leak in.
 */
function sliceSection(text, headingRe) {
  const startIdx = text.search(headingRe);
  assert.ok(startIdx >= 0, `section heading ${headingRe} present`);
  const after = text.slice(startIdx);
  const nextIdx = after.slice(1).search(/^##\s+/m);
  return nextIdx >= 0 ? after.slice(0, nextIdx + 1) : after;
}

/** Collect the set of `gsd-<name>` tokens appearing in `text`. */
function tokenSet(text) {
  return new Set([...text.matchAll(/gsd-[a-z0-9-]+/g)].map((m) => m[0]));
}

/** Collect the set of leading-bullet `gsd-<name>` entries in `text`. */
function bulletSet(text) {
  return new Set([...text.matchAll(/^-\s+(gsd-[a-z0-9-]+)\s*$/gm)].map((m) => m[1]));
}

// rosterSupported: the leading-bullet gsd- entries under SUPPORT-ROSTER.md's
// `## Supported` section (sliced so an Unsupported-reason stem cannot leak).
const roster = fs.readFileSync(path.join(repoRoot, 'SUPPORT-ROSTER.md'), 'utf8');
const rosterSupportedSection = sliceSection(roster, /^##\s+Supported\b/m);
const rosterSupported = bulletSet(rosterSupportedSection);

test('assertion 1: roster Supported set == directory-derived gsd-<stem> set', () => {
  const derived = stems.map((s) => `gsd-${s}`);
  assert.deepEqual(
    [...rosterSupported].sort(),
    [...derived].sort(),
    'SUPPORT-ROSTER.md Supported set must equal the commands/gsd/ stem set',
  );
});

test('assertion 2: README ## Supported skills token set == roster Supported set', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const section = sliceSection(readme, /^##\s+Supported skills/m);
  const readmeSet = tokenSet(section);
  assert.deepEqual(
    [...readmeSet].sort(),
    [...rosterSupported].sort(),
    'README ## Supported skills token set must equal the roster Supported set (no missing, no extra, no Flagged-gaps leak)',
  );
});

test('assertion 3: COMMANDS.md token set == roster Supported set', () => {
  const commands = fs.readFileSync(path.join(repoRoot, 'COMMANDS.md'), 'utf8');
  // Slice to the table body (from the `| Command |` header row) before tokenizing,
  // matching assertion 2's README-slicing so a future `gsd-` token in the GENERATED
  // banner can never falsely satisfy the assertion (IN-01).
  const tableIdx = commands.search(/^\| Command \|/m);
  assert.ok(tableIdx >= 0, 'COMMANDS.md has a `| Command |` table header');
  const commandsSet = tokenSet(commands.slice(tableIdx));
  assert.deepEqual(
    [...commandsSet].sort(),
    [...rosterSupported].sort(),
    'COMMANDS.md gsd- token set must equal the roster Supported set (no missing, no extra)',
  );
});

// The README prose count is tied to `stems.length` so a future count bump forces the
// README to be updated in lockstep — closing the unguarded hardcoded-`31` drift
// surface the pinned literal + set-equality assertions do not cover (WR-04).
test('assertion 4: README prose command count tracks the stem count', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.ok(
    readme.includes(`The ${stems.length} skills below`),
    `README must say "The ${stems.length} skills below" (prose count must track the stem count)`,
  );
  assert.ok(
    readme.includes(`for each of the ${stems.length} emitted commands`),
    `README must say "for each of the ${stems.length} emitted commands" (prose count must track the stem count)`,
  );
});
