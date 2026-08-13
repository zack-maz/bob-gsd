'use strict';

/**
 * stage.cjs — the staging engine (INSTALL-03 clean layout, INSTALL-04 idempotent
 * re-run). It orchestrates the three structural pieces EVERY install stages and a
 * roster-agnostic convertible-artifact loop, applying the manifest-driven D-04
 * collision policy and D-05 orphan sweep. It CALLS the verified primitives
 * (bob-adapter merge/gate/roster, manifest hash/classify) — it never reimplements
 * YAML, hashing, or the gate.
 *
 * Two distinct roots, NEVER conflated (T-03-09b):
 *   repoRoot       the gsd-bob PACKAGE root — the ONLY source of the vendored
 *                  gsd-core/ payload (the entry passes path.resolve(__dirname,'..')).
 *   workspaceRoot  process.cwd() — where .planning/ is anchored and local .bob/
 *                  is written. NEVER the source of the payload copy.
 * Under real npx these differ, so the payload copy must never derive its source
 * from process.cwd()/workspaceRoot.
 *
 * Dependency discipline: node:fs / node:path ONLY — NO js-yaml (YAML goes through
 * bob-adapter.mergeCustomModes). It carries no inlined skip list — the adapter
 * gate (gateArtifact) is the sole authority on which artifacts are supported.
 */

const fs = require('node:fs');
const path = require('node:path');

const {
  BOB_CAPABILITY_DECL,
  emitGsdMode,
  mergeCustomModes,
  modesRelPathForScope,
  gateArtifact,
  buildSupportRoster,
  neutralizeModelReferences,
} = require('../bob-adapter.cjs');
const { sha256, safeJoin, classifyOnUpdate, classifyOrphan } = require('./manifest.cjs');

/**
 * Representative candidate set for the support roster. Mirrors
 * scripts/generate-support-roster.cjs — the roster is GENERATED from the gate,
 * never hand-maintained (T-02-10). Full-roster generation across the whole GSD
 * skill set rides with Phases 4-5; the convertible loop below scales to it with
 * zero changes here.
 *
 * BOB2-05: the synthetic `gsd-parallel-fanout` exemplar was removed. It existed
 * only to keep the gate's skip path visible while fan-out was assumed missing;
 * now that Bob supports fan-out it would gate SUPPORTED and appear in the roster
 * as an emitted skill that no source file produces. The gate's flag/skip path is
 * covered where it belongs — test/unsupported-gate.test.cjs and
 * test/bob2-capability.test.cjs — not by a fake roster row.
 */
const ROSTER_CANDIDATES = [
  { name: 'gsd-help', requires: [] },
  { name: 'gsd-plan-phase', requires: [] },
  { name: 'gsd-execute-phase', requires: [] },
];

/** Recursively list every FILE under `dir` as a path relative to `dir`. */
function listFilesRel(dir) {
  const out = [];
  const walk = (abs, rel) => {
    for (const name of fs.readdirSync(abs)) {
      const childAbs = path.join(abs, name);
      const childRel = rel ? path.join(rel, name) : name;
      const st = fs.statSync(childAbs);
      if (st.isDirectory()) walk(childAbs, childRel);
      else out.push(childRel);
    }
  };
  walk(dir, '');
  return out;
}

/**
 * Build the SUPPORT-ROSTER.md body from the adapter gate (never hand-maintained).
 * Mirrors scripts/generate-support-roster.cjs.
 */
function renderRoster() {
  const supported = ROSTER_CANDIDATES.filter(
    (c) => gateArtifact(c, BOB_CAPABILITY_DECL).supported,
  ).map((c) => c.name);
  const unsupportedLines = buildSupportRoster(ROSTER_CANDIDATES, BOB_CAPABILITY_DECL);

  const header =
    '# Bob Support Roster\n\n' +
    '> **GENERATED — do not hand-edit.** Produced from the bob-adapter gate ' +
    '(`gateArtifact` / `buildSupportRoster`), not maintained by hand (T-02-10).\n' +
    '> Every GSD artifact Bob cannot support is recorded LOUD as an ' +
    '`unsupported on Bob: <reason>` line (D-10, parity-first).\n';
  const supportedSection = supported.length
    ? supported.map((n) => `- ${n}`).join('\n')
    : '_(none in the representative set)_';
  const unsupportedSection = unsupportedLines.length
    ? unsupportedLines.map((l) => `- ${l}`).join('\n')
    : '_(none unsupported in the representative set)_';
  return (
    `${header}\n` +
    '## Supported (emitted to `.bob/commands` / `.bob/skills`)\n\n' +
    `${supportedSection}\n\n` +
    '## Unsupported on Bob (omitted from the loadable set, recorded loud)\n\n' +
    `${unsupportedSection}\n`
  );
}

/**
 * The staging engine.
 *
 * @param {object} opts
 * @param {string} opts.target         resolved scope dir (the .bob home)
 * @param {string} opts.scope          'local' | 'global'
 * @param {string} opts.workspaceRoot  cwd where .planning/ is anchored
 * @param {boolean} opts.dryRun        plan-only (no fs writes/copies/deletes)
 * @param {object} opts.manifest       D-01 manifest object (entries[] mutated in place)
 * @param {{written:string[],skipped:string[],removed:string[]}} opts.report
 * @param {string} opts.repoRoot       gsd-bob PACKAGE root (payload source)
 */
function stage({ target, scope, workspaceRoot, dryRun = false, manifest, report, repoRoot }) {
  if (!manifest || !Array.isArray(manifest.entries)) {
    throw new Error('stage: a manifest with an entries[] array is required');
  }
  if (!report || !report.written || !report.skipped || !report.removed) {
    throw new Error('stage: a report with written/skipped/removed buckets is required');
  }
  // Fail loud on a missing payload source BEFORE any structural write, so a
  // misconfigured repoRoot never silently stages an empty payload (T-03-09b).
  if (!repoRoot) {
    throw new Error('stage: repoRoot (the gsd-bob package root) is required to source the payload');
  }
  const payloadSrc = path.join(repoRoot, 'gsd-core');
  if (!fs.existsSync(payloadSrc)) {
    throw new Error(
      `stage: vendored payload not found at ${payloadSrc} (repoRoot=${repoRoot}); refusing to ` +
        'stage an empty gsd-core/ payload',
    );
  }

  // The set of paths (relative to target) emitted THIS run — drives the orphan
  // sweep. The set of installer-created dirs (relative to target) — the ONLY
  // dirs the prune pass may consider (never a user dir absent from this set).
  const emittedThisRun = new Set();
  const installerDirs = new Set();

  const recordDirsFor = (relPath) => {
    let dir = path.dirname(relPath);
    while (dir && dir !== '.' && dir !== path.sep) {
      installerDirs.add(dir);
      dir = path.dirname(dir);
    }
  };

  /**
   * Stage a single tracked FILE through the D-04 collision policy. Updates the
   * manifest entry's hash on (re)write; records skip on a user-modified file.
   * @param {string} relPath  path relative to target
   * @param {Buffer} bytes    exact bytes to write (hashed as-written)
   */
  const stageFile = (relPath, bytes) => {
    const abs = path.join(target, relPath);
    emittedThisRun.add(relPath);
    recordDirsFor(relPath);

    const existing = manifest.entries.find((e) => e.path === relPath && e.kind === 'file');
    const newHash = sha256(bytes);

    if (existing) {
      const verdict = classifyOnUpdate(existing, abs);
      if (verdict === 'skip-warn') {
        report.skipped.push(relPath);
        return;
      }
      // 'overwrite' | 'rewrite' → (re)write and refresh the recorded hash.
      if (!dryRun) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, bytes);
      }
      existing.sha256 = newHash;
      report.written.push(relPath);
      return;
    }

    // New tracked file.
    if (!dryRun) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, bytes);
    }
    manifest.entries.push({ path: relPath, sha256: newHash, kind: 'file' });
    report.written.push(relPath);
  };

  // ---- Structural piece 1: gsd mode merge → custom_modes.yaml -------------
  // BOB2-04: the path is SCOPE-DEPENDENT on Bob 2.0 — global lives under
  // settings/, local does not. modesRelPathForScope() owns that asymmetry and
  // carries the evidence; do not inline a literal here again.
  const modesRel = modesRelPathForScope(scope);
  const modesAbs = path.join(target, modesRel);
  let existingModes = '';
  try {
    existingModes = fs.readFileSync(modesAbs, 'utf8');
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
  const mergedModes = mergeCustomModes(existingModes, emitGsdMode());
  const mergedBytes = Buffer.from(mergedModes);
  emittedThisRun.add(modesRel);
  // Track the containing dir so an installer-created `settings/` is swept on
  // uninstall (the sweep only removes dirs it finds EMPTY, so a real Bob home —
  // where settings/ also holds settings.json — is never touched).
  recordDirsFor(modesRel);
  if (!dryRun) {
    // mkdir the modes file's OWN parent, not `target`: at global scope the path
    // is one level deeper (settings/), and `target` alone leaves it missing.
    fs.mkdirSync(path.dirname(modesAbs), { recursive: true });
    fs.writeFileSync(modesAbs, mergedBytes);
  }
  const mergedEntry = manifest.entries.find((e) => e.path === modesRel && e.kind === 'merged');
  if (mergedEntry) mergedEntry.sha256 = sha256(mergedBytes);
  else manifest.entries.push({ path: modesRel, sha256: sha256(mergedBytes), kind: 'merged' });
  report.written.push(modesRel);

  // ---- Structural piece 2: vendored gsd-core/ payload copy (FROM repoRoot) --
  // Source is repoRoot, never cwd/workspaceRoot. Copy recursively, then track
  // each copied file through the collision policy so user-edited payload files
  // are skipped, not clobbered.
  const payloadFiles = listFilesRel(payloadSrc); // relative to payloadSrc
  for (const rel of payloadFiles) {
    const destRel = path.join('gsd-core', rel);
    const bytes = fs.readFileSync(path.join(payloadSrc, rel));
    stageFile(destRel, bytes);
  }

  // ---- Structural piece 2b: gsd-core SIBLINGS the vendored shim eagerly needs -
  // The vendored gsd-core eagerly requires two files that resolve to SIBLINGS of
  // gsd-core/ (three `../` up from gsd-core/bin/lib/): scripts/fix-slash-commands.cjs
  // (command-roster.cjs) and package.json (runtime-artifact-conversion.cjs, read as
  // pkg.version). Without them, `node .bob/gsd-core/bin/gsd-tools.cjs query …` crashes
  // out of tree with `Cannot find module '../../../scripts/fix-slash-commands.cjs'`.
  // Both are sourced from repoRoot (the SAME root as the gsd-core/ payload, NEVER
  // cwd/workspaceRoot) and staged through stageFile() so they are manifest-tracked
  // (sha256 + path), obey the D-04 collision policy, and are swept on uninstall
  // (INSTALL-05) — no special-casing outside the manifest.
  stageFile(
    path.join('scripts', 'fix-slash-commands.cjs'),
    fs.readFileSync(path.join(repoRoot, 'scripts', 'fix-slash-commands.cjs')),
  );
  // Synthesize a MINIMAL package.json stamping the VENDORED gsd-core version
  // (gsd-core/VERSION → 1.6.1), NOT gsd-bob's own 0.1.0. This is the file
  // runtime-artifact-conversion.cjs reads as pkg.version to write `version:` into
  // converted-artifact frontmatter, so it must reflect the vendored payload.
  const vendoredVersion = fs.readFileSync(path.join(repoRoot, 'gsd-core', 'VERSION'), 'utf8').trim();
  stageFile(
    'package.json',
    Buffer.from(`${JSON.stringify({ name: '@opengsd/gsd-core', version: vendoredVersion }, null, 2)}\n`),
  );

  // ---- Structural piece 3: SUPPORT-ROSTER.md (regenerated via the gate) -----
  stageFile('SUPPORT-ROSTER.md', Buffer.from(renderRoster()));

  // ---- Convertible-artifact loop (D-08, roster-agnostic) -------------------
  // Each Claude command source under repoRoot/commands/gsd/ is run through the
  // bob artifactLayout converters (D-01 port-by-conversion — reuse the built
  // converters, never raw-copy and never hand-rewrite). For a supported source
  // `<stem>` we emit TWO Bob-conformant artifacts, matching the bob
  // artifactLayout exactly:
  //   - flat command  commands/gsd-<stem>.md   (convertClaudeCommandToBobCommand)
  //   - nested skill   skills/gsd-<stem>/SKILL.md (convertClaudeCommandToBobSkill)
  // Absence of the source is a clean no-op (existsSync guard) — the empty-roster
  // regression stays green. gateArtifact remains the sole support authority
  // (D-03 gate, don't break); no core-loop skip entries are added (A3 — all
  // degrade cleanly). No new converter or degrade*.cjs is introduced.
  const convertibleSrc = path.join(repoRoot, 'commands', 'gsd');
  if (fs.existsSync(convertibleSrc)) {
    // Require the converters lazily — only when there IS a source to convert —
    // so the absent-source path never depends on the vendored conversion lib.
    const {
      convertClaudeCommandToBobCommand,
      convertClaudeCommandToBobSkill,
    } = require(path.join(repoRoot, 'gsd-core', 'bin', 'lib', 'runtime-artifact-conversion.cjs'));
    for (const rel of listFilesRel(convertibleSrc)) {
      const stem = path.basename(rel, path.extname(rel));
      const name = `gsd-${stem}`;
      const candidate = { name, requires: [] };
      if (gateArtifact(candidate, BOB_CAPABILITY_DECL).supported) {
        const content = fs.readFileSync(path.join(convertibleSrc, rel), 'utf8');
        // Flat command (gsd- prefix), per the bob artifactLayout. The converter
        // output is run through the adapter's neutralizeModelReferences post-pass
        // (D-02) so every emitted artifact is born model-neutral (NEUTRAL-01/02);
        // stage.cjs calls the adapter, never inlines the rewrite.
        stageFile(
          path.join('commands', `${name}.md`),
          Buffer.from(neutralizeModelReferences(convertClaudeCommandToBobCommand(content, name))),
        );
        // Nested skill (gsd- prefix) at skills/<name>/SKILL.md — same post-pass.
        stageFile(
          path.join('skills', name, 'SKILL.md'),
          Buffer.from(neutralizeModelReferences(convertClaudeCommandToBobSkill(content, name))),
        );
      }
      // Unsupported candidates are surfaced through the roster (already rendered
      // from the gate above); nothing is emitted broken.
    }
  }

  // ---- D-05 orphan sweep --------------------------------------------------
  // Manifest 'file' entries no longer emitted this run. NEVER prune .planning/.
  const survivingEntries = [];
  for (const entry of manifest.entries) {
    if (entry.kind !== 'file' || emittedThisRun.has(entry.path)) {
      survivingEntries.push(entry);
      continue;
    }
    // Never sweep anything under .planning/ (D-07).
    if (entry.path === '.planning' || entry.path.startsWith(`.planning${path.sep}`)) {
      survivingEntries.push(entry);
      continue;
    }
    // CR-01: resolve through the containment guard so a poisoned `..`/absolute
    // entry can never drive an out-of-root delete (defense-in-depth alongside
    // readManifest's load-time validation).
    const abs = safeJoin(target, entry.path);
    const verdict = classifyOrphan(entry, abs);
    if (verdict === 'remove') {
      if (!dryRun && fs.existsSync(abs)) fs.rmSync(abs);
      report.removed.push(entry.path);
      // dropped: not pushed to survivingEntries
    } else {
      // 'keep-warn' — user-modified, leave it on disk and warn.
      report.skipped.push(entry.path);
      survivingEntries.push(entry);
    }
  }
  manifest.entries = survivingEntries;

  // ---- Prune now-empty installer-created dirs ONLY -------------------------
  // Only consider dirs the installer itself created (installerDirs). A user dir
  // absent from this set is never inspected or removed (D-03 manifest-as-truth).
  // .planning/ is never in installerDirs, so it is never pruned (D-07).
  if (!dryRun) {
    // Deepest-first so a parent can become empty after its child is pruned.
    const dirs = [...installerDirs].sort((a, b) => b.length - a.length);
    for (const rel of dirs) {
      if (rel === '.planning' || rel.startsWith(`.planning${path.sep}`)) continue;
      const abs = path.join(target, rel);
      try {
        if (fs.existsSync(abs) && fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
      } catch {
        // Non-empty or vanished — leave it. Never force-remove a populated dir.
      }
    }
  }
}

module.exports = { stage };
