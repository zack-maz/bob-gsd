'use strict';

/**
 * bob-adapter — the SINGLE isolated module carrying all net-new Bob substance
 * (D-07 / UP-01: "Bob-specific code isolated to one adapter component").
 *
 * It is the ONLY file in the project permitted to `require('js-yaml')` (D-04):
 * the install/staging path stays node:fs-only, so the YAML parser never enters
 * the installer's dependency/audit surface. js-yaml v4's default schema is the
 * SAFE schema — `yaml.load` does NOT execute arbitrary tags (T-02-04 control).
 *
 * Exports:
 *   - emitGsdMode()                          the gsd custom-mode object
 *   - mergeCustomModes(existingText, entry)  idempotent, slug-scoped merge
 *   - gateArtifact(candidate, capabilityDecl) unsupported-primitive flag/skip
 *   - buildSupportRoster(candidates, capabilityDecl)  loud "unsupported on Bob"
 *   - MODEL_TIER_RE_SOURCE                    SOURCE string: word-boundary tier tokens
 *   - MODEL_DIRECTIVE_RE_SOURCE               SOURCE string: line-anchored model directive
 *   - MODEL_TIER_REPLACEMENTS                 tier -> capability-neutral wording map
 *   - neutralizeModelReferences(content)      emit-time model-routing neutralization pass
 *   - scanModelLiterals(content)              detector shared with the NEUTRAL-03 invariant
 */

const path = require('node:path');
const yaml = require('js-yaml');

/** The exact marker recorded for every primitive Bob cannot support (D-10). */
const UNSUPPORTED_MARKER = 'unsupported on Bob:';

/**
 * Shared model-literal single source of truth (D-03). BOTH the emit-time
 * neutralization pass (neutralizeModelReferences) and the invariant's detector
 * (scanModelLiterals) are built from these SOURCE strings so they can never
 * drift. SOURCE strings are exported, NEVER a shared `/g` RegExp instance — a
 * global RegExp carries `lastIndex` state and mis-behaves when reused.
 *
 * The capability-tier token set is assembled PROGRAMMATICALLY from a base64
 * array so this backend-neutral adapter never embeds a bare model-brand literal
 * (mirrors test/backend-neutrality.test.cjs's forbidden-token trick). The three
 * decoded tokens are the capability tiers, in descending-capability order.
 */
const MODEL_TIER_TOKENS = ['b3B1cw==', 'c29ubmV0', 'aGFpa3U='].map((b) =>
  Buffer.from(b, 'base64').toString('utf8'),
);

/**
 * `\b(<tier>|<tier>|<tier>)\b` — word-boundary tier alternation. Case is handled
 * at RegExp construction with the `i` flag. Linear-time / ReDoS-safe (T-08-02).
 */
const MODEL_TIER_RE_SOURCE = `\\b(${MODEL_TIER_TOKENS.join('|')})\\b`;

/**
 * Line-anchored machine-readable model directive. The `^…key:` anchor + colon
 * means a PROSE mention of a config key (e.g. "set the model_profile in config")
 * never trips — only a literal directive LINE does (defense-in-depth; the
 * vendored converter already omits frontmatter per F-02). ReDoS-safe.
 */
const MODEL_DIRECTIVE_RE_SOURCE =
  '^[ \\t]*(model|effort|model_profile|resolve_model_ids)[ \\t]*:.*$';

/**
 * Brand-agnostic vendor-prefixed model-ID pre-collapse (Pitfall 1 / WR-01): an
 * alphabetic vendor prefix, OPTIONAL intervening version/date segments, then a
 * tier token + trailing id chars. The `(?:[.-][A-Za-z0-9]+)*` middle tolerates
 * ids that place a version BETWEEN the vendor prefix and the tier token
 * (e.g. `<vendor>-3-<tier>-20240229`, `<vendor>-3.5-<tier>`), not only the
 * vendor-immediately-tier shape — so the WHOLE id collapses cleanly and the
 * inner tier is never mangled into a residue that keeps the surviving vendor
 * brand (the WR-01 false-green). Built from MODEL_TIER_TOKENS (no bare brand
 * literal here — backend-neutral invariant). Segment classes are disjoint from
 * their separators, so matching is linear-time / ReDoS-safe (T-08-02).
 */
const MODEL_ID_RE_SOURCE = `[A-Za-z]+(?:[.-][A-Za-z0-9]+)*[.-](${MODEL_TIER_TOKENS.join('|')})[\\w.-]*`;

/** Neutral collapse phrase for a full vendor-prefixed model id. */
const MODEL_ID_REPLACEMENT = 'the configured model';

/**
 * Tier token -> capability-neutral wording (D-03): preserves the author's
 * RELATIVE intent without a brand. Built programmatically, keyed on the
 * lowercased decoded tier token, in the same descending-capability order as
 * MODEL_TIER_TOKENS — so no brand literal appears in this source file.
 * @type {Record<string,string>}
 */
const MODEL_TIER_REPLACEMENTS = MODEL_TIER_TOKENS.reduce((map, tok, i) => {
  map[tok.toLowerCase()] = ['a higher-capability model', 'a balanced model', 'a faster model'][i];
  return map;
}, {});

/**
 * Emit-time model-routing neutralization pass (D-02, NEUTRAL-01/02). Pure
 * string -> string, applied in stage.cjs as a post-pass wrapping each converter
 * output. THREE ordered, ReDoS-safe replacements:
 *   (1) Pitfall 1 — collapse a full vendor-prefixed model id to a neutral phrase
 *       BEFORE the bare-tier rewrite, so an inner tier token is never mangled.
 *   (2) NEUTRAL-01 defense-in-depth — strip any residual model-directive LINE.
 *   (3) NEUTRAL-02 — rewrite bare tier prose to capability-neutral wording.
 * Idempotent: the neutral replacements carry no tier token or directive line, so
 * a second pass is a no-op.
 *
 * @param {string} content  converted artifact text
 * @returns {string} neutralized text
 */
function neutralizeModelReferences(content) {
  let c = content;
  c = c.replace(new RegExp(MODEL_ID_RE_SOURCE, 'gi'), MODEL_ID_REPLACEMENT);
  c = c.replace(new RegExp(`${MODEL_DIRECTIVE_RE_SOURCE}\\r?\\n?`, 'gim'), '');
  c = c.replace(
    new RegExp(MODEL_TIER_RE_SOURCE, 'gi'),
    (m) => MODEL_TIER_REPLACEMENTS[m.toLowerCase()],
  );
  return c;
}

/**
 * The zero-literal detector the NEUTRAL-03 invariant reuses so the pass and the
 * test share ONE definition (D-03). Detects THREE shapes, EACH built from the
 * SAME shared SOURCE constant the rewrite consumes — so detector and rewrite can
 * never drift (WR-01):
 *   (1) a vendor-prefixed model id (MODEL_ID_RE_SOURCE) — closes the old
 *       rewrite/detector asymmetry where a surviving vendor-prefixed id (or a
 *       date-infixed id the pre-collapse used to miss) went completely unseen,
 *       and reports the FULL id token (not just the inner tier) for an actionable
 *       failure message.
 *   (2) a bare word-boundary tier token (MODEL_TIER_RE_SOURCE).
 *   (3) a machine-readable model-directive LINE (MODEL_DIRECTIVE_RE_SOURCE).
 * Constructs fresh per-line RegExps (resetting `lastIndex`) so no shared `/g`
 * state can cause an intermittent missed match.
 *
 * @param {string} content  artifact text to scan
 * @returns {Array<{line:number, token:string}>} one hit per surviving literal, 1-based line
 */
function scanModelLiterals(content) {
  const hits = [];
  const lines = content.split('\n');
  const id = new RegExp(MODEL_ID_RE_SOURCE, 'gi'); // same SOURCE as the rewrite (D-03)
  const tier = new RegExp(MODEL_TIER_RE_SOURCE, 'gi');
  const directive = new RegExp(MODEL_DIRECTIVE_RE_SOURCE, 'i'); // per-line, no /g state
  lines.forEach((line, i) => {
    let m;
    id.lastIndex = 0;
    while ((m = id.exec(line)) !== null) hits.push({ line: i + 1, token: m[0] });
    tier.lastIndex = 0;
    while ((m = tier.exec(line)) !== null) hits.push({ line: i + 1, token: m[0] });
    if (directive.test(line)) hits.push({ line: i + 1, token: line.trim().slice(0, 40) });
  });
  return hits;
}

/**
 * Bob's custom-mode tool-group vocabulary, VERIFIED against the shipped Bob
 * Shell 2.0.1 bundle rather than the (self-contradicting) docs — BOB2-02.
 *
 * Evidence, all read from `bobshell@2.0.1/dist/bob.js`:
 *   - The built-in mode table declares the consolidated `agent` mode as
 *     `groups: ["read","edit","execute","mcp","skill","todo","subagent","mode"]`
 *     and `plan` as `["read","edit","mcp","skill","subagent","mode"]`.
 *   - The extended table additionally carries `artifact` and `subtask`.
 *   - `workflow` exists as a tool id but ships `hidden:!0`.
 *   - `browser` appears ONLY in approval `allowed_permissions` seeding, never in
 *     a built-in mode's `groups` — it is a permission token, not a mode group.
 *
 * CRITICAL: the mode schema validates `groups` as `z.union([z.string(),
 * z.tuple([z.string(), {fileRegex}])])` — an OPEN string, not an enum. An
 * unrecognised group name therefore passes validation silently and is simply
 * never matched to a tool, costing the mode that capability with no error. That
 * is exactly why an invalid token is dangerous and why we pin the emitted set.
 * @type {readonly string[]}
 */
const BOB_TOOL_GROUPS = Object.freeze([
  'read',
  'edit',
  'execute',
  'mcp',
  'skill',
  'todo',
  'artifact',
  'subtask',
  'subagent',
  'mode',
]);

/**
 * Legacy tool-group spellings Bob 2.0.1 still accepts, mapped to the canonical
 * token it normalizes them to. Bob applies this in BOTH the custom-mode file
 * loader and the mode importer, for the bare-string and `[name, {fileRegex}]`
 * tuple forms alike. Recorded so the `command` vs `execute` question stays
 * settled: `command` is a back-compat ALIAS, not an invalid token.
 * @type {Readonly<Record<string,string>>}
 */
const BOB_LEGACY_TOOL_GROUP_ALIASES = Object.freeze({ command: 'execute' });

/** Bob's custom-modes filename, identical at both scopes. */
const MODES_FILENAME = 'custom_modes.yaml';

/**
 * Resolve the custom-modes file path RELATIVE TO THE INSTALL TARGET for a scope
 * — BOB2-04. The two scopes are NOT symmetric in Bob 2.0, which is easy to get
 * wrong and silent when you do:
 *
 *   global  `~/.bob/settings/custom_modes.yaml`
 *           Bob resolves this as `join(getGlobalSettingsDirectory(), FILENAME)`,
 *           and `getGlobalSettingsDirectory()` is `join(homedir(), '.bob',
 *           'settings')` — the same directory that holds `settings.json`,
 *           `auth-secrets.json` and `mcp.json`.
 *   local   `<workspace>/.bob/custom_modes.yaml`
 *           Bob resolves this as `join(workspaceRoot, '.bob', FILENAME)` — the
 *           workspace path has NO `settings/` segment.
 *
 * Writing the global mode to the home ROOT (`~/.bob/custom_modes.yaml`) — which
 * is what gsd-bob did through v0.2.2 — produces a file Bob 2.0 never reads, so
 * the GSD mode simply does not appear, with no error anywhere.
 *
 * @param {'local'|'global'} scope
 * @returns {string} path relative to the resolved install target
 */
function modesRelPathForScope(scope) {
  return scope === 'global' ? path.join('settings', MODES_FILENAME) : MODES_FILENAME;
}

/**
 * True when a manifest-recorded relative path denotes a custom-modes file, at
 * EITHER scope and including manifests written by pre-BOB2-04 versions that
 * recorded the home-root path. Uninstall keys off this, so it must stay
 * tolerant of the old location or a v0.2.x install would leave its mode behind.
 *
 * @param {string} relPath
 * @returns {boolean}
 */
function isModesRelPath(relPath) {
  return typeof relPath === 'string' && path.basename(relPath) === MODES_FILENAME;
}

/**
 * The single gsd custom mode (D-01). Groups are locked to
 * `[read, edit, execute, mcp]` (D-02) — `skill` is omitted for v1 because the GSD
 * seam is execute -> gsd_run, not skill -> skill. `execute` is Bob's canonical
 * terminal-shell tool-group token; without an execution group the
 * customInstructions gsd_run shell-out seam is dead.
 *
 * BOB2-02 (verified against Bob Shell 2.0.1, see BOB_TOOL_GROUPS): the docs
 * contradiction is a naming one, not a behavioural one — Bob's mode loader
 * NORMALIZES the legacy `command` token to `execute`, so both spellings resolve
 * to the same group. `execute` is the canonical form and is what we emit.
 *
 * Prose (roleDefinition/whenToUse/customInstructions) is minimal by design
 * (D-03): it points users at the /gsd-* slash commands and notes that planning
 * artifacts live in .planning/ and that the mode shells out via the execute tool.
 *
 * @param {{gsdCoreDir?: string}} [opts]  where THIS install put the vendored
 *   `gsd-core/` (workspace-relative `.bob/gsd-core` for a local install, the
 *   absolute `<target>/gsd-core` for a global one). Defaults to the local form.
 * @returns {{slug:string,name:string,roleDefinition:string,whenToUse:string,customInstructions:string,groups:string[]}}
 */
function emitGsdMode({ gsdCoreDir = path.join('.bob', 'gsd-core') } = {}) {
  const shim = path.join(gsdCoreDir, 'bin', 'gsd-tools.cjs');
  return {
    slug: 'gsd',
    name: 'GSD',
    roleDefinition:
      'You are a GSD (Getting Stuff Done) spec-driven planning operator. You drive ' +
      'the GSD planning loop — new-project, plan-phase, execute-phase, verify — and ' +
      'keep the .planning/ artifact contract (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, ' +
      'STATE.md, config.json, phase plans) in sync.',
    whenToUse:
      'Use this mode for any GSD planning or execution work. Invoke the /gsd-* slash ' +
      'commands (e.g. /gsd-plan-phase, /gsd-execute-phase, /gsd-verify-work) to run a ' +
      'specific workflow.',
    customInstructions:
      'All planning state lives under .planning/. Run GSD tooling by shelling out via ' +
      `the execute tool (e.g. \`node ${shim} query ...\`). Prefer the ` +
      '/gsd-* slash commands as entry points; never edit .planning/ artifacts outside a ' +
      'GSD workflow unless explicitly asked.',
    groups: ['read', 'edit', 'execute', 'mcp'],
  };
}

/**
 * Is `slug` a gsd-owned slug? (D-05: ownership = exactly `gsd` or `gsd-*`.)
 * @param {*} slug
 * @returns {boolean}
 */
function isOwnedSlug(slug) {
  return slug === 'gsd' || (typeof slug === 'string' && slug.startsWith('gsd-'));
}

/**
 * Merge the gsd mode into an existing custom_modes.yaml, idempotently and
 * scoped by slug (D-05/D-06). Replaces the gsd entry IN PLACE (removes the
 * owned slug that === the incoming entry's slug, then appends the fresh entry)
 * and NEVER touches non-gsd user slugs. Comments are NOT preserved on re-emit
 * (Pitfall 5 — the invariant is slug-level idempotency, not comment fidelity).
 *
 * @param {string} existingYamlText  current custom_modes.yaml text (may be empty)
 * @param {object} gsdModeEntry      the mode object from emitGsdMode()
 * @returns {string} the merged YAML text
 */
function mergeCustomModes(existingYamlText, gsdModeEntry) {
  // js-yaml v4 default = SAFE schema; does not execute arbitrary tags (T-02-04).
  let doc;
  if (existingYamlText) {
    const parsed = yaml.load(existingYamlText);
    // TRANS-05 (WR-01): a non-empty file must parse to a MAPPING. A scalar, array,
    // or other non-object root means a malformed/hand-broken custom_modes.yaml —
    // FAIL LOUD rather than silently dropping the gsd mode (or throwing opaquely
    // when we later try to assign `doc.customModes`). `null` is the one allowed
    // non-object: a file of only comments/whitespace yields `null` and is treated
    // as an empty mapping (no user modes to preserve, nothing to lose).
    if (parsed === null || parsed === undefined) {
      doc = {};
    } else if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      const got = Array.isArray(parsed) ? 'sequence' : typeof parsed;
      throw new Error(
        `mergeCustomModes: custom_modes.yaml root is not a mapping (got ${got}); ` +
          'refusing to silently drop the gsd mode',
      );
    } else {
      doc = parsed;
    }
  } else {
    doc = {};
  }
  const modes = Array.isArray(doc.customModes) ? doc.customModes : [];
  // Remove only the owned slug that matches the incoming entry's slug — leaves
  // every other slug (including differently-named gsd-* slugs) untouched.
  const filtered = modes.filter(
    (m) => !(m && isOwnedSlug(m.slug) && m.slug === gsdModeEntry.slug),
  );
  filtered.push(gsdModeEntry);
  doc.customModes = filtered;
  return yaml.dump(doc, { lineWidth: -1 });
}

/**
 * Un-merge the gsd-owned modes from an existing custom_modes.yaml — the
 * slug-removing sibling of mergeCustomModes, required by uninstall (D-06,
 * Open Question Q2). YAML handling stays confined to this adapter so the
 * installer's staging path never requires js-yaml.
 *
 * Discipline mirrors mergeCustomModes exactly:
 *   - js-yaml v4 SAFE schema (`yaml.load` does not execute arbitrary tags).
 *   - `null`/`undefined` parse result is treated as `{}` (empty mapping).
 *   - a sequence/scalar root throws the SAME concrete non-mapping error.
 * Removal rule: filter OUT any entry whose slug is gsd-owned (isOwnedSlug).
 * When `ownedSlugs` is a non-empty array the caller scopes removal to that
 * intersection; when omitted/empty it falls back to ALL isOwnedSlug entries
 * (the uninstall default). D-06: NEVER deletes the file and NEVER drops a
 * non-owned user slug.
 *
 * @param {string} existingYamlText  current custom_modes.yaml text (may be empty)
 * @param {string[]} [ownedSlugs]    optional removal scope; omitted = all gsd-owned
 * @returns {string} the un-merged YAML text
 */
function unmergeCustomModes(existingYamlText, ownedSlugs) {
  let doc;
  if (existingYamlText) {
    const parsed = yaml.load(existingYamlText);
    if (parsed === null || parsed === undefined) {
      doc = {};
    } else if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      const got = Array.isArray(parsed) ? 'sequence' : typeof parsed;
      throw new Error(
        `unmergeCustomModes: custom_modes.yaml root is not a mapping (got ${got}); ` +
          'refusing to silently drop user modes',
      );
    } else {
      doc = parsed;
    }
  } else {
    doc = {};
  }
  const modes = Array.isArray(doc.customModes) ? doc.customModes : [];
  const scope = Array.isArray(ownedSlugs) && ownedSlugs.length > 0 ? ownedSlugs : null;
  // Remove an entry iff it is gsd-owned AND (when a scope is given) in that scope.
  // Non-owned user slugs are ALWAYS preserved.
  const filtered = modes.filter((m) => {
    if (!m || !isOwnedSlug(m.slug)) return true;
    if (scope && !scope.includes(m.slug)) return true;
    return false;
  });
  doc.customModes = filtered;
  return yaml.dump(doc, { lineWidth: -1 });
}

/**
 * Curated skip-list (D-10) backing cases skill metadata cannot self-describe.
 * Maps a candidate name -> a concrete reason. A small, explicit list keeps the
 * parity-first gap LOUD: anything here is omitted from the loadable set and
 * recorded in the support roster, never emitted broken.
 *
 * Kept intentionally tiny for v1 (proves the mechanism); full-set gating across
 * the whole skill roster rides with Phases 4-5.
 */
const BOB_SKIP_LIST = {
  // Intentionally empty: the former `gsd-autonomous` entry was removed because Bob
  // DOES support isolated subagents (spawn_subagent, isolated context window,
  // `subagent` tool group), and gsd-autonomous only needs isolation — not parallel
  // fan-out — so it is emittable. The empty-but-present shape keeps the curated
  // skip mechanism live (gateArtifact still consults BOB_SKIP_LIST via
  // hasOwnProperty) for any future case metadata cannot self-describe.
};

/**
 * Bob's capability declaration — THE single authority (BOB2-05). Every consumer
 * (the installer's staging engine and all three doc generators) imports this one
 * object, so "what Bob supports" can never mean two different things in two
 * files. It previously existed as four hand-copied literals whose comments each
 * claimed to be the same declaration; they were one edit away from disagreeing.
 *
 * `parallelSubagentFanout: true` is OBSERVED on Bob Shell 2.0.1, not assumed:
 * the shipped `spawn_subagent` tool description states "Multiple spawn_subagent
 * calls in one turn run in parallel." Nested spawning is separately forbidden
 * (SUBAGENT_FORBIDDEN_TOOLS / SUBAGENT_FORBIDDEN_GROUPS) and no GSD primitive
 * needs it.
 *
 * `structuredPrompts: false` keeps its conservative value — text_mode remains
 * the prompting contract and was NOT re-verified in Phase 12.
 * @type {Readonly<Record<string,boolean>>}
 */
const BOB_CAPABILITY_DECL = Object.freeze({
  parallelSubagentFanout: true,
  structuredPrompts: false,
});

/**
 * Human-readable reasons for each primitive a runtime may lack. Retained in full
 * even for primitives Bob now supports: `gateArtifact` is runtime-agnostic and
 * still needs a concrete reason whenever a declaration reports a primitive false.
 * @type {Record<string,string>}
 */
const PRIMITIVE_REASONS = {
  parallelSubagentFanout:
    'requires parallel subagent fan-out; unavailable on this Bob version',
  structuredPrompts:
    'requires structured prompts; Bob supports text_mode prompting only',
};

/**
 * Programmatic flag/skip gate (D-10, TRANS-04). A candidate is SUPPORTED iff
 * every required primitive is supported by the bob capability declaration AND
 * the candidate name is not on the curated skip-list. Otherwise it is EXCLUDED
 * from the loadable set and a concrete reason is returned for the roster.
 *
 * @param {{name:string, requires?:string[]}} candidate  artifact + required primitives
 * @param {Record<string,boolean>} capabilityDecl  bob's supported-primitive map
 * @returns {{supported:true} | {supported:false, reason:string}}
 */
function gateArtifact(candidate, capabilityDecl) {
  const decl = capabilityDecl || {};
  // TRANS-04 (WR-04): a null/malformed candidate must NEVER be admitted as
  // supported. Guard the candidate shape FIRST (before skip-list/primitive checks)
  // so a missing or non-string name is excluded with a concrete reason.
  if (!candidate || typeof candidate.name !== 'string' || candidate.name.length === 0) {
    return { supported: false, reason: 'invalid candidate: missing or non-string name' };
  }
  // Curated skip-list takes precedence (covers what metadata can't express).
  if (Object.prototype.hasOwnProperty.call(BOB_SKIP_LIST, candidate.name)) {
    return { supported: false, reason: BOB_SKIP_LIST[candidate.name] };
  }
  const required = (candidate && Array.isArray(candidate.requires)) ? candidate.requires : [];
  for (const primitive of required) {
    if (!decl[primitive]) {
      const reason = PRIMITIVE_REASONS[primitive] || `requires unsupported primitive '${primitive}'`;
      return { supported: false, reason };
    }
  }
  return { supported: true };
}

/**
 * Build a loud support roster (D-10): one `unsupported on Bob: <reason>` line
 * per EXCLUDED candidate so the parity gap is never silent. Supported candidates
 * produce no line (they are emitted to .bob/commands / .bob/skills as usual).
 *
 * @param {Array<{name:string, requires?:string[]}>} candidates
 * @param {Record<string,boolean>} capabilityDecl
 * @returns {string[]} roster lines for the unsupported candidates
 */
function buildSupportRoster(candidates, capabilityDecl) {
  const lines = [];
  for (const candidate of candidates || []) {
    const res = gateArtifact(candidate, capabilityDecl);
    if (!res.supported) {
      // TRANS-04 (WR-04): never interpolate a possibly-undefined name (which would
      // emit a malformed `undefined:` line). Fall back to a fixed placeholder label.
      const label =
        candidate && typeof candidate.name === 'string' && candidate.name.length > 0
          ? candidate.name
          : '<unnamed candidate>';
      lines.push(`${label}: ${UNSUPPORTED_MARKER} ${res.reason}`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// NEUTRAL-04 — runtime-doc Bob-ification (agent/product-name neutralization +
// host-path rewrite) applied at STAGE time to every markdown the model reads
// under Bob: the converted commands/skills AND the vendored gsd-core doc tree
// (workflows, references, templates, contexts).
//
// Why at stage time and not in the vendored tree: the correct replacement for
// the upstream config-home path differs by install scope (workspace-relative
// `.bob/gsd-core/...` for a local install, the absolute target for a global
// one), so the payload copy is the only place that knows the answer. Keeping
// the vendored tree upstream-shaped also keeps the re-vendor replay small.
//
// Every brand table below is base64-decoded at load so this backend-neutral
// module never carries a bare agent/vendor/model literal (RUNTIME-04, the same
// discipline as MODEL_TIER_TOKENS).
// ---------------------------------------------------------------------------

const decodeList = (b64) => JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
const decodeStr = (b64) => Buffer.from(b64, 'base64').toString('utf8');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Other coding-agent runtimes / products (longest first so compounds win). */
const OTHER_RUNTIME_NAMES = decodeList(
  'WyJDbGF1ZGUgQ29kZSIsIkNsYXVkZSBBcHAiLCJDbGF1ZGUiLCJDb2RleCIsIkdlbWluaSIsIkN1cnNvciIsIkNvcGlsb3QiLCJPcGVuQ29kZSIsIkNsaW5lIiwiS2lsbyIsIldpbmRzdXJmIiwiQXVnbWVudCIsIlRyYWUiLCJRd2VuIiwiSGVybWVzIiwiS2ltaSBDb2RlIiwiS2ltaSIsIkNvZGVCdWRkeSIsIkFudGlncmF2aXR5IiwiWkNvZGUiXQ==',
);
/** Model vendors. */
const MODEL_VENDOR_NAMES = decodeList('WyJBbnRocm9waWMiLCJPcGVuQUkiXQ==');
/** Model families / local model servers (not covered by the tier tokens). */
const MODEL_PRODUCT_NAMES = decodeList('WyJHUFQiLCJPbGxhbWEiLCJsbGFtYS5jcHAiLCJsbGFtYSIsIk1pc3RyYWwiLCJHcmFuaXRlIl0=');
/** The upstream host's names: its project-instruction file, home dir, home env var. */
const UPSTREAM_INSTRUCTION_FILE = decodeStr('Q0xBVURFLm1k'); // → AGENTS.md on Bob
const UPSTREAM_HOME_DIRNAME = decodeStr('LmNsYXVkZQ=='); // the dot-home the payload references
const UPSTREAM_HOME_ENV = decodeStr('Q0xBVURFX0NPTkZJR19ESVI='); // `${<ENV>:-$HOME/<dot-home>}` form
/** The first token of the upstream reference runtime's name (the bare-word case). */
const UPSTREAM_RUNTIME_WORD = OTHER_RUNTIME_NAMES[2];

/** Bob's project-instruction file, as gsd-core's own `getProjectInstructionFile('bob')` resolves it. */
const BOB_INSTRUCTION_FILE = 'AGENTS.md';

/**
 * The Bob-only `gsd_run` resolver preamble that replaces upstream's 19-home
 * probe (which names every other runtime's config home). Probes, in order:
 * the install this artifact was staged from, the workspace-local `.bob`, then
 * the global `~/.bob`; falls back to a `gsd_run` already on PATH. Keeps the
 * package-identity check. Emitted as ONE line, exactly like upstream's.
 * @param {string} gsdCoreDir  where THIS install put gsd-core (see stage.cjs)
 */
function bobResolverPreamble(gsdCoreDir) {
  const shim = '${_GSD_SHIM_NAME}';
  const root = '${_GSD_RUNTIME_ROOT}';
  return (
    `_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="\${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; ` +
    `_gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; ` +
    `if _gsd_at "${gsdCoreDir}/bin/${shim}" "${root}/.bob/gsd-core/bin/${shim}" "$HOME/.bob/gsd-core/bin/${shim}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; ` +
    `elif unset -f gsd_run; _G="$(command -v gsd_run)"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; ` +
    `else echo "ERROR: gsd-tools.cjs not found under ${gsdCoreDir}, ${root}/.bob/gsd-core or $HOME/.bob/gsd-core, and gsd_run is not on PATH. Run: npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local" >&2; exit 1; fi; ` +
    `GSD_IDENTITY_STATUS=unverified; case "$(gsd_run runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@opengsd/gsd-core"'*'}') GSD_IDENTITY_STATUS=ok;; esac; export GSD_IDENTITY_STATUS; ` +
    `[ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \\"$GSD_TOOLS\\" did not prove it is @opengsd/gsd-core - it is either a different package or an older release without the runtime-identity verb." >&2`
  );
}

/** Match the whole upstream resolver preamble line (it is always emitted as one line). */
const RESOLVER_LINE_RE = /^[ \t]*_GSD_SHIM_NAME="gsd-tools\.cjs";.*$/gm;

/**
 * Case-shape-preserving replacement: an ALL-CAPS match (a heading / rule label)
 * → upper-case phrase, anything else → the lower-case phrase. Proper nouns are
 * always capitalized, so their case carries no sentence-position signal; a
 * lower-case common-noun phrase reads correctly mid-sentence, which is where
 * nearly every mention sits.
 */
function shapedReplacement(match, lower) {
  if (match === match.toUpperCase() && /[A-Z]/.test(match)) return lower.toUpperCase();
  return lower;
}

/**
 * Rewrite the upstream host paths in a runtime doc to this install's Bob paths.
 * Applied to prose AND code (paths inside bash blocks are the load-bearing
 * case: the workflows `@`-read and `cat` sibling files by these paths).
 * @param {string} content
 * @param {{gsdCoreDir:string, bobHome:string}} loc
 */
function rewriteUpstreamHostPaths(content, { gsdCoreDir, bobHome }) {
  const home = escapeRe(UPSTREAM_HOME_DIRNAME);
  const envForm = new RegExp(`\\$\\{${UPSTREAM_HOME_ENV}:-\\$HOME/${home}\\}`, 'g');
  return content
    // `${<ENV>:-$HOME/<dot-home>}/gsd-core/...` and the bare env form
    .replace(new RegExp(`\\$\\{${UPSTREAM_HOME_ENV}:-\\$HOME/${home}\\}/gsd-core/`, 'g'), `${gsdCoreDir}/`)
    .replace(envForm, bobHome)
    // `$HOME/<dot-home>/gsd-core/` and `~/<dot-home>/gsd-core/` → this install's gsd-core
    .replace(new RegExp(`(?:\\$HOME|~)/${home}/gsd-core/`, 'g'), `${gsdCoreDir}/`)
    .replace(new RegExp(`(?:\\$HOME|~)/${home}/gsd-core\\b`, 'g'), gsdCoreDir)
    // any other `$HOME/<dot-home>/…` → the Bob home
    .replace(new RegExp(`(?:\\$HOME|~)/${home}/`, 'g'), `${bobHome}/`)
    .replace(new RegExp(`(?:\\$HOME|~)/${home}\\b`, 'g'), bobHome)
    // workspace-relative `./<dot-home>/`, `<dot-home>/`, and `<any-root>/<dot-home>/`
    // (e.g. `${PROJECT_ROOT}/<dot-home>/skills/` → Bob's real project skills dir) → `.bob/`
    .replace(new RegExp(`\\./${home}/`, 'g'), './.bob/')
    .replace(new RegExp(`(^|[^\\w.])${home}/`, 'gm'), '$1.bob/')
    // the upstream project-instruction file → Bob's
    .replace(new RegExp(`\\b${escapeRe(UPSTREAM_INSTRUCTION_FILE)}\\b`, 'g'), BOB_INSTRUCTION_FILE)
    // any residual bare reference to the upstream home env var → Bob's name for it.
    // Bob defines no such variable, so `[ -n "$BOB_CONFIG_DIR" ]` guards stay false
    // exactly as they did — the dead branch keeps its semantics and loses the name.
    .replace(new RegExp(`\\b${UPSTREAM_HOME_ENV}\\b`, 'g'), 'BOB_CONFIG_DIR');
}

/**
 * Neutralize agent/product/vendor/model names in PROSE. Ordered so compounds
 * (`<name> Code`, `<name> RUNTIME`) resolve before bare words. The reference
 * runtime's own name becomes `Bob` (the text is now addressed to Bob); every
 * OTHER runtime becomes `another runtime` (the sentence was describing a host
 * that is not this one); vendors/models become neutral phrases; the model-tier
 * pass (neutralizeModelReferences) runs last.
 * @param {string} prose
 */
function neutralizeAgentNamesInProse(prose) {
  let c = prose;
  // A multi-word product name also appears joined by `-` or `_` (a runtime id,
  // a package name, a slug); match all three joiners so `<name>-code` never
  // degrades to `another runtime-code`.
  const nameRe = (n) => escapeRe(n).replace(/ /g, '[ _-]');
  const others = OTHER_RUNTIME_NAMES.filter((n) => !n.startsWith(UPSTREAM_RUNTIME_WORD));
  const othersAlt = others.map(nameRe).join('|');
  const ownAlt = OTHER_RUNTIME_NAMES.filter((n) => n.startsWith(UPSTREAM_RUNTIME_WORD)).map(nameRe).join('|');
  // `--<runtime>` reviewer-lane / offload selector flags → a generic lane placeholder.
  c = c.replace(new RegExp(`--(?:${othersAlt}|${ownAlt})\\b`, 'gi'), '--<lane>');
  // `<OTHER> RUNTIME` (e.g. an orchestrator rule addressed to a different host).
  c = c.replace(new RegExp(`\\b(?:${othersAlt})[ \\t]+RUNTIME\\b`, 'gi'), (m) => shapedReplacement(m, 'non-Bob runtime'));
  // The reference runtime (any compound form) → Bob.
  c = c.replace(new RegExp(`\\b(?:${ownAlt})\\b`, 'gi'), 'Bob');
  // Every other runtime → another runtime (case-shaped).
  c = c.replace(new RegExp(`\\b(?:${othersAlt})\\b`, 'gi'), (m) => shapedReplacement(m, 'another runtime'));
  // Vendors and model products.
  c = c.replace(new RegExp(`\\b(?:${MODEL_VENDOR_NAMES.map(escapeRe).join('|')})\\b`, 'gi'), (m) => shapedReplacement(m, 'the model vendor'));
  c = c.replace(new RegExp(`\\b${escapeRe(MODEL_PRODUCT_NAMES[0])}(?:-[\\w.]+)?\\b`, 'gi'), 'a model');
  c = c.replace(new RegExp(`\\b(?:${MODEL_PRODUCT_NAMES.slice(1).map(escapeRe).join('|')})\\b`, 'gi'), (m) => shapedReplacement(m, 'a local model server'));
  return neutralizeModelReferences(c);
}

/** Fence info-strings whose block body is executable shell (identifiers are load-bearing). */
const SHELL_FENCE_RE = /^[ \t]*(?:```|~~~)[ \t]*(?:bash|sh|shell|zsh|console)\b/;

/**
 * Neutralize a SHELL block: only its comment lines and its echo/printf message
 * lines are prose a person sees, so only those get the name rules. Bare
 * identifiers (a `case … in <runtime-id>)` arm, a `[ "$RUNTIME" = <id> ]` test, a
 * `--<runtime>` token) are
 * left as-is: renaming them would either activate another host's branch on Bob
 * or leave a dead arm with a misleading name.
 */
function neutralizeShellBlock(block) {
  return block
    .split('\n')
    .map((line) => (/^[ \t]*#/.test(line) || /^[ \t]*(?:echo|printf)\b/.test(line)
      ? neutralizeAgentNamesInProse(line)
      : line))
    .join('\n');
}

/**
 * Bob-ify one runtime document (a converted command/skill or a vendored
 * workflow/reference/template/context). Paths and the resolver preamble are
 * rewritten everywhere; prose — and every fenced block that is NOT shell
 * (json/xml/markdown/text examples the model reads as templates) — is fully
 * neutralized; shell blocks get comment + echo lines only (see
 * neutralizeShellBlock). Idempotent: no replacement reintroduces a matched token.
 *
 * @param {string} content
 * @param {{gsdCoreDir:string, bobHome:string}} loc
 *   gsdCoreDir  `.bob/gsd-core` (local) or `<abs target>/gsd-core` (global)
 *   bobHome     `.bob` (local) or the absolute target (global)
 * @returns {string}
 */
function bobifyRuntimeDoc(content, loc) {
  const withPaths = swapResolverPreamble(rewriteUpstreamHostPaths(content, loc), loc);
  // Split on fenced code blocks so shell identifiers are never touched by prose rules.
  const parts = withPaths.split(/(^[ \t]*(?:```|~~~)[^\n]*\n[\s\S]*?^[ \t]*(?:```|~~~)[ \t]*$)/m);
  return parts
    .map((part, i) => {
      if (i % 2 === 0) return neutralizeAgentNamesInProse(part);
      return SHELL_FENCE_RE.test(part) ? neutralizeShellBlock(part) : neutralizeAgentNamesInProse(part);
    })
    .join('');
}

/** Replace every upstream resolver-preamble line with the Bob-only one. */
function swapResolverPreamble(content, loc) {
  const preamble = bobResolverPreamble(loc.gsdCoreDir);
  return content.replace(RESOLVER_LINE_RE, (line) => line.match(/^[ \t]*/)[0] + preamble);
}

/**
 * Bob-ify a runtime SHELL file (e.g. the launcher snippet upstream ships beside
 * the workflows): paths + preamble everywhere, name rules on comments/echo only.
 * @param {string} content
 * @param {{gsdCoreDir:string, bobHome:string}} loc
 */
function bobifyRuntimeShell(content, loc) {
  return neutralizeShellBlock(swapResolverPreamble(rewriteUpstreamHostPaths(content, loc), loc));
}

module.exports = {
  bobifyRuntimeDoc,
  bobifyRuntimeShell,
  bobResolverPreamble,
  rewriteUpstreamHostPaths,
  neutralizeAgentNamesInProse,
  OTHER_RUNTIME_NAMES,
  MODEL_VENDOR_NAMES,
  MODEL_PRODUCT_NAMES,
  BOB_INSTRUCTION_FILE,
  UNSUPPORTED_MARKER,
  BOB_SKIP_LIST,
  BOB_CAPABILITY_DECL,
  BOB_TOOL_GROUPS,
  BOB_LEGACY_TOOL_GROUP_ALIASES,
  MODES_FILENAME,
  modesRelPathForScope,
  isModesRelPath,
  emitGsdMode,
  mergeCustomModes,
  unmergeCustomModes,
  gateArtifact,
  buildSupportRoster,
  MODEL_TIER_RE_SOURCE,
  MODEL_DIRECTIVE_RE_SOURCE,
  MODEL_TIER_REPLACEMENTS,
  neutralizeModelReferences,
  scanModelLiterals,
};
