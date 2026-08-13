#!/usr/bin/env node
'use strict';

/**
 * stamp-covers.cjs — stamp generated facts into the cover SVGs.
 *
 * Cover images carry three facts that would otherwise be hand-kept and drift:
 * the package version and the capability gate's emitted/withheld counts. This
 * script derives all three from their sources of truth (package.json and the
 * bob-adapter gate — the same derivation as generate-support-roster.cjs) and
 * rewrites every `data-stamp` marked tspan in covers/*.svg, so a stale cover
 * is a regeneration away, never a hand-edit (same rule as SUPPORT-ROSTER, T-02-10).
 *
 * Markers: <tspan data-stamp="version">, <tspan data-stamp="emitted">,
 * <tspan data-stamp="withheld">. Covers without markers are left untouched.
 *
 * Run: `node scripts/stamp-covers.cjs`          — rewrite stale stamps in place
 *      `node scripts/stamp-covers.cjs --check`  — exit 1 if any stamp is stale
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const adapter = require(path.join(repoRoot, 'src', 'bob-adapter.cjs'));

// Same capability declaration + candidate derivation as
// scripts/generate-support-roster.cjs (D-06: derived from commands/gsd/*.md).
// The declaration is IMPORTED, never re-declared, so stamped cover facts cannot
// drift from the roster (BOB2-05).
const bobCapabilityDecl = adapter.BOB_CAPABILITY_DECL;

const commandsDir = path.join(repoRoot, 'commands', 'gsd');
const derivedCandidates = fs.existsSync(commandsDir)
  ? fs
      .readdirSync(commandsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ name: `gsd-${path.basename(f, '.md')}`, requires: [] }))
  : [];
const candidates = (() => {
  const byName = new Map();
  for (const c of derivedCandidates) byName.set(c.name, c);
  return [...byName.values()];
})();

const gated = candidates.map((c) => adapter.gateArtifact(c, bobCapabilityDecl));
const emitted = gated.filter((g) => g.supported).length;
const withheld = gated.length - emitted;
const { version } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const stamps = {
  version: `v${version}`,
  emitted: String(emitted),
  withheld: String(withheld),
};

const checkOnly = process.argv.includes('--check');
const coversDir = path.join(repoRoot, 'covers');
const svgs = fs.readdirSync(coversDir).filter((f) => f.endsWith('.svg')).sort();

let stale = 0;
for (const svg of svgs) {
  const file = path.join(coversDir, svg);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(
    /(<tspan\b[^>]*data-stamp="(version|emitted|withheld)"[^>]*>)([^<]*)(<\/tspan>)/g,
    (m, open, key, current, close) => {
      if (current === stamps[key]) return m;
      stale += 1;
      console.log(`${svg}: ${key} ${JSON.stringify(current)} -> ${JSON.stringify(stamps[key])}`);
      return `${open}${stamps[key]}${close}`;
    }
  );
  if (after !== before && !checkOnly) fs.writeFileSync(file, after);
}

if (stale === 0) {
  console.log(`stamp-covers: all stamps current (${stamps.version}, ${stamps.emitted} emitted, ${stamps.withheld} withheld)`);
} else if (checkOnly) {
  console.error(`stamp-covers: ${stale} stale stamp(s) — run \`node scripts/stamp-covers.cjs\` to regenerate`);
  process.exit(1);
} else {
  console.log(`stamp-covers: rewrote ${stale} stamp(s)`);
}
