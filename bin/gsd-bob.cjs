#!/usr/bin/env node
'use strict';

/**
 * gsd-bob.cjs — the npx/Node entry point for the gsd-bob installer.
 *
 * Composes the verified, single-responsibility modules from Plans 01-03 into the
 * full install / update / uninstall / dry-run flow:
 *   args.cjs        hand-parsed flag contract (NO CLI framework, NO --clean/--update)
 *   scope.cjs       scope → absolute target path (prints before any write)
 *   stage.cjs       structural staging + collision policy + orphan sweep
 *   config-merge.cjs the SOLE workflow.text_mode guarantee (root-anchored config.json)
 *   manifest.cjs    the single source of truth for what gsd-bob owns on disk
 *   report.cjs      written/skipped/removed end-of-run buckets
 *   bob-adapter.cjs unmergeCustomModes (uninstall un-merge — YAML stays in the adapter)
 *
 * Dependency discipline (CLAUDE.md "What NOT to Use"): node builtins +
 * src/installer/* + src/bob-adapter.cjs ONLY. No YAML parser in this file (the
 * uninstall un-merge routes through bob-adapter.unmergeCustomModes), no
 * third-party arg-parsing framework, no Claude agent SDK.
 *
 * TWO distinct roots, NEVER conflated (T-03-09b / T-03-14c):
 *   repoRoot       = path.resolve(__dirname, '..') — the gsd-bob PACKAGE root that
 *                    contains the vendored gsd-core/ payload. Under real npx this
 *                    is the unpacked package dir, NOT process.cwd(). It is the
 *                    payload SOURCE threaded into stage().
 *   workspaceRoot  = process.cwd() — where the root-anchored .planning/config.json
 *                    lives (CORE-05). NEVER passed where repoRoot is expected.
 *
 * Every run (install / update / uninstall / dry-run) PRINTS the resolved absolute
 * target path BEFORE any filesystem mutation (INSTALL-01, D-12).
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { parseArgs } = require('../src/installer/args.cjs');
const { resolveTarget } = require('../src/installer/scope.cjs');
const { stage } = require('../src/installer/stage.cjs');
const { mergeTextMode } = require('../src/installer/config-merge.cjs');
const { newReport, printReport } = require('../src/installer/report.cjs');
const {
  SCHEMA_VERSION,
  sha256,
  manifestPath,
  safeJoin,
  readManifest,
  writeManifest,
  buildManifest,
  classifyOrphan,
} = require('../src/installer/manifest.cjs');
const { emitGsdMode, unmergeCustomModes, isModesRelPath } = require('../src/bob-adapter.cjs');

// Two distinct roots — derived once, kept separate for the lifetime of the run.
const repoRoot = path.resolve(__dirname, '..'); // gsd-bob PACKAGE root (payload source)
const workspaceRoot = process.cwd(); // where .planning/ is anchored

/** The gsd-bob version recorded in a fresh manifest. */
function gsdBobVersion() {
  try {
    return require('../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Print the seven-flag usage banner. */
function printHelp() {
  console.log(
    [
      'gsd-bob — install the GSD planning framework into an IBM Bob environment.',
      '',
      'Usage: gsd-bob --bob [--local|--global] [--config-dir <path>] [--uninstall] [--dry-run]',
      '',
      'Flags:',
      '  --bob                 select the Bob runtime (UX-parity selector)',
      '  --local, -l           install into <cwd>/.bob (project scope)',
      '  --global, -g          install into the Bob config home (~/.bob)',
      '  --config-dir, -c <p>  explicit target directory (overrides scope resolution)',
      '  --uninstall, -u       remove a previous gsd-bob install (manifest-driven)',
      '  --dry-run             print the full plan and write nothing',
      '  --help, -h            show this help and exit',
      '',
      'Updating = re-run the same install command. Cleaning = uninstall, then install.',
      '(There is deliberately no separate refresh/overwrite flag — re-running is the update.)',
    ].join('\n'),
  );
}

/**
 * Resolve a null scope via an interactive readline prompt (D-11). Defaults to
 * local; --local/--global skip this entirely. Returns 'local' | 'global'.
 */
function promptScope() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Install scope — [L]ocal (<cwd>/.bob) or [g]lobal (~/.bob)? [L] ', (answer) => {
      rl.close();
      const a = String(answer || '').trim().toLowerCase();
      resolve(a === 'g' || a === 'global' ? 'global' : 'local');
    });
  });
}

/** Owned slugs for the uninstall un-merge: the emitted gsd slug + the gsd-* convention. */
function ownedSlugs() {
  return [emitGsdMode().slug];
}

/**
 * INSTALL / UPDATE (default; re-run IS the update). Stages the payload from
 * repoRoot, conditionally merges text_mode into the workspace .planning/config.json,
 * then writes the manifest.
 */
function runInstall({ target, scope, explicitDir, dryRun }) {
  const existing = readManifest(target);
  const manifest =
    existing ||
    buildManifest({
      schemaVersion: SCHEMA_VERSION,
      gsdBobVersion: gsdBobVersion(),
      scope,
      configHome: target,
      entries: [],
    });
  manifest.scope = scope;
  manifest.configHome = target;

  const report = newReport();

  // Structural staging — repoRoot is the payload source, workspaceRoot the anchor.
  stage({ target, scope, workspaceRoot, dryRun, manifest, report, repoRoot });

  // text_mode merge ONLY when the workspace already has a project .planning/.
  // A global install in an arbitrary non-project cwd skips the write entirely —
  // no stray <workspaceRoot>/.planning/config.json (D-14 / Q1 / T-03-14b).
  const planningDir = path.join(workspaceRoot, '.planning');
  const hasProject = fs.existsSync(path.join(workspaceRoot, '.planning'));
  if (hasProject) {
    const res = mergeTextMode(workspaceRoot, { dryRun });
    if (res && res.bytes !== undefined) {
      const cfgRel = path.join('.planning', 'config.json');
      const cfgHash = sha256(Buffer.from(res.bytes));
      const cfgEntry = manifest.entries.find((e) => e.path === cfgRel && e.kind === 'merged');
      if (cfgEntry) cfgEntry.sha256 = cfgHash;
      else manifest.entries.push({ path: cfgRel, sha256: cfgHash, kind: 'merged' });
    }
  } else {
    console.log(
      'KNOWN-LIMITATION: no project .planning/ found at ' +
        `${planningDir} — skipping the workflow.text_mode merge. text_mode is a ` +
        'per-project guarantee written into <project>/.planning/config.json; the bob ' +
        'runtime descriptor does NOT enforce it (run the install from a project root, ' +
        'or it activates the first time you run GSD inside a project).',
    );
  }

  if (!dryRun) writeManifest(target, manifest);
  printReport(report, { dryRun });
}

/**
 * UNINSTALL (--uninstall). Manifest-driven (D-03): deletes only matching `file`
 * entries (hash-match), un-merges `merged` slices (custom_modes.yaml via the
 * adapter; config.json by removing only the gsd-owned key), deletes the manifest
 * dotfile, and prunes now-empty installer dirs. NEVER deletes .planning/ (D-07).
 */
function runUninstall({ target, dryRun }) {
  const manifest = readManifest(target);
  const report = newReport();

  if (!manifest || !Array.isArray(manifest.entries)) {
    // Nothing tracked → nothing to remove (manifest-as-truth; never scans to invent).
    console.log(`No gsd-bob manifest at ${manifestPath(target)} — nothing tracked to remove.`);
    printReport(report, { dryRun });
    return;
  }

  const installerDirs = new Set();
  const recordDirsFor = (relPath) => {
    let dir = path.dirname(relPath);
    while (dir && dir !== '.' && dir !== path.sep) {
      installerDirs.add(dir);
      dir = path.dirname(dir);
    }
  };

  for (const entry of manifest.entries) {
    const rel = entry.path;
    // NEVER delete anything under .planning/ (D-07) — un-merge merged config only.
    const underPlanning = rel === '.planning' || rel.startsWith(`.planning${path.sep}`);

    if (entry.kind === 'merged') {
      if (isModesRelPath(rel)) {
        // Un-merge the gsd slice from custom_modes.yaml (D-06). Keyed by the
        // adapter predicate, not a literal, so BOTH Bob 2.0 locations un-merge:
        // `settings/custom_modes.yaml` (global) and `custom_modes.yaml` (local,
        // and the home-root path recorded by pre-BOB2-04 manifests).
        const abs = safeJoin(target, rel); // CR-01 containment guard
        let text = '';
        try {
          text = fs.readFileSync(abs, 'utf8');
        } catch (err) {
          if (!err || err.code !== 'ENOENT') throw err;
          report.removed.push(rel);
          continue;
        }
        const unmerged = unmergeCustomModes(text, ownedSlugs());
        if (!dryRun) fs.writeFileSync(abs, Buffer.from(unmerged));
        report.removed.push(`${rel} (gsd slug un-merged)`);
        continue;
      }
      // .planning/config.json — remove ONLY the gsd-owned key (workflow.text_mode),
      // preserve every user key. A tiny inline JSON un-merge (NOT YAML), and the
      // file is NEVER deleted (D-07). Anchored at workspaceRoot, not target.
      const cfgAbs = safeJoin(workspaceRoot, rel); // CR-01 containment guard
      let cfgRaw;
      try {
        cfgRaw = fs.readFileSync(cfgAbs, 'utf8');
      } catch (err) {
        if (!err || err.code !== 'ENOENT') throw err;
        report.removed.push(rel);
        continue;
      }
      let cfg;
      try {
        cfg = JSON.parse(cfgRaw);
      } catch {
        // Never clobber an unparseable user config — leave it and report skipped.
        report.skipped.push(`${rel} (unparseable — preserved)`);
        continue;
      }
      if (cfg && typeof cfg === 'object' && cfg.workflow && typeof cfg.workflow === 'object') {
        delete cfg.workflow.text_mode;
        if (Object.keys(cfg.workflow).length === 0) delete cfg.workflow;
      }
      if (!dryRun) fs.writeFileSync(cfgAbs, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
      report.removed.push(`${rel} (workflow.text_mode un-merged)`);
      continue;
    }

    // kind === 'file': delete only on hash-match (classifyOrphan), never under .planning/.
    if (underPlanning) {
      report.skipped.push(`${rel} (.planning/ never deleted)`);
      continue;
    }
    recordDirsFor(rel);
    // CR-01: resolve through the containment guard so a poisoned `..`/absolute
    // entry can never drive an out-of-root delete (defense-in-depth alongside
    // readManifest's load-time validation).
    const abs = safeJoin(target, rel);
    const verdict = classifyOrphan(entry, abs);
    if (verdict === 'remove') {
      if (!dryRun && fs.existsSync(abs)) fs.rmSync(abs);
      report.removed.push(rel);
    } else {
      report.skipped.push(`${rel} (user-modified — preserved)`);
    }
  }

  // Delete the manifest dotfile (no longer any tracked state).
  if (!dryRun) {
    const mf = manifestPath(target);
    if (fs.existsSync(mf)) fs.rmSync(mf);
  }

  // Prune now-empty installer-created dirs ONLY, deepest-first. NEVER .planning/.
  if (!dryRun) {
    const dirs = [...installerDirs].sort((a, b) => b.length - a.length);
    for (const rel of dirs) {
      if (rel === '.planning' || rel.startsWith(`.planning${path.sep}`)) continue;
      const abs = path.join(target, rel);
      try {
        if (fs.existsSync(abs) && fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
      } catch {
        // Non-empty or vanished — leave it.
      }
    }
  }

  printReport(report, { dryRun });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    return 0;
  }

  // Resolve the scope (interactive prompt only when no scope flag and not uninstall).
  let scope = opts.scope;
  if (scope === null) {
    scope = opts.uninstall ? 'local' : await promptScope();
  }

  const target = resolveTarget({ scope, explicitDir: opts.explicitDir });

  // Print the resolved ABSOLUTE target BEFORE any write — on EVERY path (INSTALL-01, D-12).
  const verb = opts.uninstall ? 'Uninstalling from' : opts.dryRun ? 'Planning install at' : 'Installing into';
  console.log(`${verb}: ${target}`);

  if (opts.uninstall) {
    runUninstall({ target, dryRun: opts.dryRun });
  } else {
    runInstall({ target, scope, explicitDir: opts.explicitDir, dryRun: opts.dryRun });
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code || 0;
  })
  .catch((err) => {
    console.error(`gsd-bob: ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  });
