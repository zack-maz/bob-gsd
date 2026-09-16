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
 * Bob's runtime context window, in tokens — the CONSERVATIVE end of the range
 * Bob documents.
 *
 * Bob's own 2.0.0 release notes give the window as "200,000 to 270,000 tokens"
 * (which end applies depends on the backend Bob routes the session to, and Bob
 * owns that routing — gsd-bob cannot know it at install time). gsd-core keys
 * its read-depth / advisory scaling on this top-level `context_window` integer,
 * so the adapter seeds the FLOOR: a budget that is correct on every backend
 * rather than one that overflows on the smaller ones. (v0.2.x–v0.3.0 seeded the
 * 270k ceiling; that was the optimistic end of the same range.) The GSD loop
 * shares ONE window in the common case, so this is the operative budget.
 */
const BOB_CONTEXT_WINDOW = 200000;

/**
 * The config keys this adapter OWNS in `.planning/config.json` — seeded by
 * mergeTextMode on every install and un-merged (removed, never the whole file)
 * by uninstall. Every entry is a Bob runtime constant, not a user preference:
 *
 *   workflow.text_mode      Bob has no structured-choice prompt primitive.
 *   workflow.use_worktrees  Bob has no git-worktree isolation primitive. Since
 *                           gsd-core 1.14.0 the execute-phase / quick-batch
 *                           dispatch gate refuses to run on a runtime whose
 *                           descriptor declares `dispatch.isolation: "none"`
 *                           unless this is `false` — executors then run
 *                           sequentially in the main checkout, which is exactly
 *                           how they ran under 1.6.1 (the gate is new, the
 *                           behaviour is not).
 *   context_window          the floor of Bob's documented 200k–270k window (see above).
 *   resolve_model_ids       "omit" — Bob owns model routing (RUNTIME-04). gsd-core's
 *                           own installer writes this for every non-reference
 *                           runtime; with it, workflow dispatches carry NO model
 *                           parameter (a tier alias would 404 on a host without
 *                           native tier names) and no flow asks the user to pick
 *                           a model. This is the config half of NEUTRAL-04.
 */
const BOB_OWNED_CONFIG = Object.freeze({
  workflow: Object.freeze({ text_mode: true, use_worktrees: false }),
  context_window: BOB_CONTEXT_WINDOW,
  resolve_model_ids: 'omit',
});

/**
 * Merge `workflow.text_mode:true` + top-level `context_window` into the
 * root-anchored .planning/config.json.
 *
 * Behavior:
 *   - missing config.json            → create
 *                                      `{ workflow: { text_mode: true, use_worktrees: false },
 *                                         context_window: 200000, resolve_model_ids: "omit" }`
 *   - existing config with user keys → preserve them, set the BOB_OWNED_CONFIG keys
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
  for (const [key, value] of Object.entries(BOB_OWNED_CONFIG.workflow)) {
    cfg.workflow[key] = value;
  }

  // Seed Bob's context-window floor unconditionally — it is a runtime constant
  // the adapter owns (exactly like text_mode) and pins gsd-core's read-depth /
  // advisory scaling to a budget that holds on every backend Bob routes to.
  cfg.context_window = BOB_OWNED_CONFIG.context_window;
  cfg.resolve_model_ids = BOB_OWNED_CONFIG.resolve_model_ids;

  // Byte-stable serialization so the manifest hash is reproducible across runs.
  const bytes = JSON.stringify(cfg, null, 2) + '\n';

  if (dryRun) {
    return { written: false, path: planningCfg, bytes };
  }

  fs.mkdirSync(path.dirname(planningCfg), { recursive: true });
  fs.writeFileSync(planningCfg, bytes, 'utf8');
  return { written: true, path: planningCfg, bytes };
}

/**
 * Remove ONLY the adapter-owned keys from a parsed config object (uninstall
 * un-merge). Every user key is preserved; an emptied `workflow` object is
 * dropped. Pure — the caller owns the read/parse/write and the never-clobber
 * rule for an unparseable file.
 *
 * @param {object} cfg  parsed .planning/config.json
 * @returns {object} the same object, mutated
 */
function unmergeOwnedKeys(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  if (cfg.workflow && typeof cfg.workflow === 'object' && !Array.isArray(cfg.workflow)) {
    for (const key of Object.keys(BOB_OWNED_CONFIG.workflow)) delete cfg.workflow[key];
    if (Object.keys(cfg.workflow).length === 0) delete cfg.workflow;
  }
  delete cfg.context_window;
  delete cfg.resolve_model_ids;
  return cfg;
}

module.exports = { mergeTextMode, unmergeOwnedKeys, BOB_CONTEXT_WINDOW, BOB_OWNED_CONFIG };
