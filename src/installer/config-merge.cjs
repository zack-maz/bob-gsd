'use strict';

/**
 * config-merge.cjs — the SOLE text_mode + context_window guarantee
 * (RESEARCH Pitfall 2).
 *
 * The bob runtime descriptor does NOT enforce workflow.text_mode; this MERGE
 * into the workspace-root .planning/config.json is the only mechanism that
 * turns text_mode on for a Bob install AND that seeds Bob's real context
 * window (top-level `context_window`). It is root-anchored at
 * `<workspaceRoot>/.planning/config.json` (CORE-05) — NEVER written under the
 * scope/.bob dir.
 *
 * Dependency discipline: node:fs / node:path ONLY (no js-yaml — config.json is
 * JSON, not YAML). Fail-loud, never-clobber discipline mirrors the adapter's
 * mergeCustomModes (bob-adapter.cjs:82-95): an UNPARSEABLE existing config is
 * left byte-for-byte untouched with a concrete warning (D-13 / anti-pattern
 * #22), never silently rewritten.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Bob's runtime context window, in tokens.
 *
 * Bob spawns subagents sparingly and its guidance is "default: do the work
 * yourself", so the GSD loop shares ONE context window in the common case even
 * though parallel fan-out IS available (BOB2-05). Bob's real 270k is therefore
 * the operative token budget. gsd-core keys its
 * read-depth / advisory scaling on this top-level `context_window` integer
 * (defaulting to a conservative 200000 when absent), so the adapter seeds Bob's
 * true window to make gsd-core's budget math match reality.
 */
const BOB_CONTEXT_WINDOW = 270000;

/**
 * Merge `workflow.text_mode:true` + top-level `context_window` into the
 * root-anchored .planning/config.json.
 *
 * Behavior:
 *   - missing config.json            → create
 *                                      `{ workflow: { text_mode: true }, context_window: 270000 }`
 *   - existing config with user keys → preserve them, set workflow.text_mode:true
 *                                      and context_window:270000
 *   - non-object workflow value      → coerce to a fresh object, then set the key
 *   - re-run                         → byte-identical (idempotent)
 *   - UNPARSEABLE config.json        → warn (naming the path) + return WITHOUT
 *                                      writing (no clobber)
 *   - dryRun                         → compute the would-be bytes, write nothing
 *
 * @param {string} workspaceRoot  the cwd where .planning/ is anchored
 * @param {{dryRun?: boolean}} [opts]
 * @returns {{written: boolean, path: string, bytes: (string|undefined)}}
 *   `bytes` is the serialized would-be/just-written content (for the caller to
 *   record a `merged` manifest entry via sha256(bytes)); `undefined` only when
 *   the file was an unparseable user file we refused to touch.
 */
function mergeTextMode(workspaceRoot, { dryRun = false } = {}) {
  const planningCfg = path.join(workspaceRoot, '.planning', 'config.json');

  let cfg = {};
  let raw;
  try {
    raw = fs.readFileSync(planningCfg, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      raw = undefined; // start from {}
    } else {
      throw err;
    }
  }

  if (raw !== undefined) {
    try {
      cfg = JSON.parse(raw);
    } catch (err) {
      // Never clobber an unparseable user file: warn naming the path and bail.
      console.warn(
        `gsd-bob: ${planningCfg} is present but is not valid JSON — preserving it ` +
          `as-is and NOT writing text_mode (${err.message})`,
      );
      return { written: false, path: planningCfg, bytes: undefined };
    }
    // A non-object parse result (array/scalar) is not a config mapping; start
    // fresh rather than crashing on property assignment.
    if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) {
      cfg = {};
    }
  }

  cfg.workflow =
    cfg.workflow && typeof cfg.workflow === 'object' && !Array.isArray(cfg.workflow)
      ? cfg.workflow
      : {};
  cfg.workflow.text_mode = true;

  // Seed Bob's real context window unconditionally — it is a runtime constant the
  // adapter owns (exactly like text_mode). Bob spawns isolated subagents
  // sequentially (no documented parallel fan-out), so the whole loop effectively
  // shares one window, and gsd-core's read-depth/advisory scaling must key on
  // Bob's true 270k rather than the conservative 200k default.
  cfg.context_window = BOB_CONTEXT_WINDOW;

  // Byte-stable serialization so the manifest hash is reproducible across runs.
  const bytes = JSON.stringify(cfg, null, 2) + '\n';

  if (dryRun) {
    return { written: false, path: planningCfg, bytes };
  }

  fs.mkdirSync(path.dirname(planningCfg), { recursive: true });
  fs.writeFileSync(planningCfg, bytes, 'utf8');
  return { written: true, path: planningCfg, bytes };
}

module.exports = { mergeTextMode, BOB_CONTEXT_WINDOW };
