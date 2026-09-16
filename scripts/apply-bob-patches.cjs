'use strict';
/**
 * apply-bob-patches.cjs — idempotent re-injection of ALL gsd-bob local deltas over a
 * freshly-restaged pristine `@opengsd/gsd-core` payload (Phase 07 D-02, Phase 13 D-08).
 *
 * The vendored `gsd-core/` tree is NOT the pristine npm tarball. It is:
 *     pristine tarball + normalization pass + Bob code/data patches + a local VERSION file
 * A naive "nuke-and-restage the raw tarball" drops every one of those deltas and leaves
 * the payload broken under Bob (colon command form leaks back in, `stage.cjs` crashes on
 * the missing Bob converters, workflow bash blocks cannot find the shim, and the
 * descriptor the dispatch queries read is absent).
 *
 * This script reproduces the WHOLE local-delta set, each guarded to be a clean no-op on
 * re-run (the D-02 idempotency contract). It is the executable core of the MAINTAINING
 * runbook: a bump = nuke → restage clean tarball → run this → validate.
 *
 * The NINE deltas (Phase 13 grew the original six):
 *   1. colon→hyphen command form   (`gsd:<cmd>` → `gsd-<cmd>`) over the .md doc tree
 *   2. home-path normalization      (`~/.claude` → `$HOME/.claude`) over the .md doc tree
 *   3. `"bob"` runtime registry block   → bin/lib/capability-registry.cjs (const runtimes)
 *   4. Bob converter code block (~105 lines) + 3 export symbols
 *                                       → bin/lib/runtime-artifact-conversion.cjs
 *   5a. `"bob"` alias (JSON)             → bin/shared/runtime-aliases.manifest.json
 *   5b. `bob` alias (FALLBACK_ALIASES)   → bin/lib/runtime-name-policy.cjs
 *   6. local VERSION file                → gsd-core/VERSION
 *   7. Bob converter names               → bin/lib/capability-validator.cjs VALID_CONVERTER_NAMES
 *      (a closed allowlist enforced by `_resolveNamedConverter` on every registry-driven
 *      staging path — without it the descriptor names converters the engine refuses)
 *   8. `.bob` probes in the `gsd_run` resolver preamble over the .md doc tree, plus the
 *      gsd-bob install one-liner in its "not found" hint. Upstream's preamble probes 19
 *      runtime homes and none is `.bob`, so a `<repo>/.bob/gsd-core` or `~/.bob/gsd-core`
 *      install was unreachable from every workflow bash block (pre-existing since 1.6.1).
 *   9. per-install runtime marker         → gsd-core/.gsd-runtime (contents: `bob`)
 *      gsd-core resolves the active runtime as GSD_RUNTIME > config.runtime > this
 *      marker > 'claude' (runtime-slash.cjs, #2297/#3897). Upstream's bin/install.js
 *      writes it beside VERSION for every install; gsd-bob's installer copies the whole
 *      vendored tree, so the marker ships in the payload. Without it every dispatch
 *      query answers for the `claude` descriptor (harness-worktree isolation Bob lacks).
 *      Kept OUT of `.planning/config.json` on purpose — that file is the Claude↔Bob
 *      interchange surface and must not pin a runtime.
 *
 * Safety (Phase 13): every anchor-based step is PREFLIGHTED before the first write — a
 * missing anchor aborts with nothing touched instead of leaving a half-patched tree — and
 * `verifyAll()` re-checks every delta after the run and throws on any gap.
 *
 * Constraints (CLAUDE.md): node-builtins only (`node:fs`, `node:path`) — no third-party
 * deps, no network, no child_process. Writes only under `gsd-core/`. Every filesystem read
 * fails loud (swallow ONLY ENOENT, re-throw everything else — mirrors fix-slash-commands.cjs).
 *
 * The colon→hyphen normalization REUSES the exported pure transform from
 * scripts/fix-slash-commands.cjs. It must NEVER run that script as `main` — its require.main
 * block runs the FORWARD (hyphen→colon) direction, the opposite of what is needed (Pitfall 4).
 */

const fs = require('node:fs');
const path = require('node:path');

// Reuse the exported pure transforms — do NOT invoke fix-slash-commands.cjs as a script.
const { transformContentToHyphen, readCmdNames } = require('./fix-slash-commands.cjs');

const ROOT = path.join(__dirname, '..');
const GSD_CORE = path.join(ROOT, 'gsd-core');

// The version the restaged payload must carry. The tarball ships NO VERSION file; since
// gsd-core 1.7.0 (#1383) `resolveVersionFrom` reads gsd-core/VERSION FIRST, and stage.cjs
// reads it to stamp the install. Keep in lock-step with the tarball you restage.
const TARGET_VERSION = '1.14.0';

// Only the .md documentation subdirs are normalized. bin/ is EXCLUDED: a text transform
// over bin/**/*.cjs would corrupt legitimate code (e.g. runtime-slash.cjs's legacy-colon
// input parser). bin/lib stays a patch-only target for steps 3/4/5b/7 — never normalized.
const NORMALIZE_DIRS = ['workflows', 'references', 'templates', 'contexts'];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo']);

// ---------------------------------------------------------------------------
// Canonical Bob blocks. Stored as per-line JSON strings joined by "\n" so backticks,
// ${...}, and backslashes survive verbatim without template-literal interference.
// ---------------------------------------------------------------------------

/**
 * The `"bob"` runtime descriptor, in the exact shape gsd-core 1.14.0's generated
 * registry uses for every runtime (key order mirrors the `cline` entry). Field-by-field
 * provenance is in `.planning/research/260916-gsd-core-1.14.0-delta.md` §2.
 *
 *   - `localConfigDir` — REQUIRED since 1.7.0 (#1756); `getDirName` derives from it.
 *   - `triggerPrecedence` — required-with-default; declared for clarity.
 *   - NO `hookEvents` — the only legal values are the hook-event families
 *     (`claude`, `gemini`); "emits none" is expressed by OMISSION (as `cline` does).
 *   - `hostIntegration` — REQUIRED since ADR-1239; read by every `dispatch-*` query.
 *       dispatch.isolation "none": Bob has no GIT-WORKTREE primitive (this axis is about
 *       worktrees, not context isolation). The installer therefore seeds
 *       `workflow.use_worktrees: false` so execute-phase's isolation gate passes.
 *       namedDispatch/background true, nested false, maxDepth 1: Bob 2.x spawns named
 *       isolated subagents, several per turn in parallel, never nested (BOB2-05).
 *       modelMode "passive": Bob owns model routing (RUNTIME-04). hookBus "none",
 *       effortSurface "none": no managed hook or reasoning-effort argv surface.
 *   - `installSurface` stays "profile-marker-only" (NOT "none" — 1.14.0 excludes
 *     `installSurface: "none"` runtimes from ALLOWED_CONFIG_RUNTIMES).
 *   - Backend-agnostic by design: no model/backend brand names appear in this entry.
 */
const REGISTRY_BLOCK = [
  "  // gsd-bob HAND-EDIT to this GENERATED registry (vendored-payload approach;",
  "  // RESEARCH Pitfall 2). The upstream PR will add a capabilities/bob/capability.json",
  "  // source so the generator emits this same data — the resulting object is identical.",
  "  // Backend-agnostic by design: no model/backend brand names appear in this entry.",
  "  \"bob\": {",
  "    \"id\": \"bob\",",
  "    \"role\": \"runtime\",",
  "    \"version\": \"1.14.0\",",
  "    \"title\": \"IBM Bob\",",
  "    \"description\": \"IBM Bob (bob.ibm.com) — backend-agnostic; .bob/skills + .bob/commands; text_mode prompts; isolated subagents with parallel fan-out; no managed hook surface; tier-2 support.\",",
  "    \"tier\": \"core\",",
  "    \"requires\": [],",
  "    \"engines\": {",
  "      \"gsd\": \">=1.14.0\"",
  "    },",
  "    \"runtime\": {",
  "      \"configHome\": {",
  "        \"kind\": \"dot-home\",",
  "        \"name\": \".bob\",",
  "        \"env\": []",
  "      },",
  "      \"localConfigDir\": \".bob\",",
  "      \"configFormat\": \"none\",",
  "      \"artifactLayout\": {",
  "        \"global\": [",
  "          {",
  "            \"kind\": \"skills\",",
  "            \"destSubpath\": \"skills\",",
  "            \"prefix\": \"gsd-\",",
  "            \"nesting\": \"nested\",",
  "            \"recursive\": false,",
  "            \"converter\": \"convertClaudeCommandToBobSkill\"",
  "          },",
  "          {",
  "            \"kind\": \"commands\",",
  "            \"destSubpath\": \"commands\",",
  "            \"prefix\": \"gsd-\",",
  "            \"nesting\": \"flat\",",
  "            \"recursive\": false,",
  "            \"converter\": \"convertClaudeCommandToBobCommand\"",
  "          }",
  "        ],",
  "        \"local\": [",
  "          {",
  "            \"kind\": \"skills\",",
  "            \"destSubpath\": \"skills\",",
  "            \"prefix\": \"gsd-\",",
  "            \"nesting\": \"nested\",",
  "            \"recursive\": false,",
  "            \"converter\": \"convertClaudeCommandToBobSkill\"",
  "          },",
  "          {",
  "            \"kind\": \"commands\",",
  "            \"destSubpath\": \"commands\",",
  "            \"prefix\": \"gsd-\",",
  "            \"nesting\": \"flat\",",
  "            \"recursive\": false,",
  "            \"converter\": \"convertClaudeCommandToBobCommand\"",
  "          }",
  "        ]",
  "      },",
  "      \"triggerPrecedence\": [",
  "        \"skills\",",
  "        \"commands\"",
  "      ],",
  "      \"commandStyle\": \"slash-hyphen\",",
  "      \"hooksSurface\": \"none\",",
  "      \"sandboxTier\": \"none\",",
  "      \"supportTier\": 2,",
  "      \"installSurface\": \"profile-marker-only\",",
  "      \"writesSharedSettings\": false,",
  "      \"permissionWriter\": null,",
  "      \"extendedHookEvents\": [],",
  "      \"hostIntegration\": {",
  "        \"embeddingMode\": \"imperative\",",
  "        \"commandSurface\": \"slash-file\",",
  "        \"dispatch\": {",
  "          \"namedDispatch\": true,",
  "          \"nested\": false,",
  "          \"maxDepth\": 1,",
  "          \"background\": true,",
  "          \"subagentToolkit\": \"full\",",
  "          \"backgroundDispatch\": false,",
  "          \"isolation\": \"none\",",
  "          \"maxConcurrency\": \"undocumented\"",
  "        },",
  "        \"modelMode\": \"passive\",",
  "        \"hookBus\": \"none\",",
  "        \"stateIO\": \"filesystem\",",
  "        \"transport\": \"mcp\",",
  "        \"runtime\": \"node\",",
  "        \"effortSurface\": \"none\"",
  "      }",
  "    }",
  "  },"
].join("\n");

const CONVERTER_BLOCK = [
  "// --- Bob converters (gsd-bob HAND-EDIT to this GENERATED file; vendored-payload approach) ---",
  "// IBM Bob reads ONLY `name`+`description` on skills and `description`+`argument-hint`",
  "// on commands. Both converters reconstruct the frontmatter from that whitelist",
  "// (never filter-in-place) so every unsupported key is stripped by omission, and",
  "// reuse gsd-core's shipped `yamlQuote` so YAML flow chars (e.g. a leading `[BETA]`)",
  "// can't break Bob's frontmatter parser (a skill with an unparseable description is",
  "// silently ignored by Bob). Both converters ALSO run their bodies through",
  "// convertClaudeToBobContent, which rewrites Claude config-home path references to",
  "// the `.bob` home and translates the colon command dialect to the routable hyphen",
  "// form, so emitted `.bob/` artifacts never point at paths that do not exist under a",
  "// Bob install. The upstream PR moves these into gsd-core verbatim.",
  "/**",
  " * Apply Bob-specific content conversion — path replacement + command name conversion.",
  " * Mirrors convertClaudeToAntigravityContent but maps to Bob's `.bob` config home.",
  " * Path mappings depend on install mode:",
  " *   Global: $HOME/.claude/ & ~/.claude/ → ~/.bob/  (bare forms → ~/.bob)",
  " *   Local:  $HOME/.claude/ & ~/.claude/ → .bob/    (bare forms → .bob)",
  " * Always: ./.claude/ → ./.bob/, .claude/ → .bob/, and the colon command dialect",
  " * (`gsd:`) → the routable hyphen form (`gsd-`).",
  " * Backend-agnostic by design (RUNTIME-04): does NOT call neutralizeAgentReferences",
  " * (that is a Gemini-backend concern). Pure string replaces — dependency-free.",
  " * @param {string} content - Source content to convert",
  " * @param {boolean} [isGlobal=false] - Whether this is a global install",
  " */",
  "function convertClaudeToBobContent(content, isGlobal = false) {",
  "    let c = content;",
  "    if (isGlobal) {",
  "        c = c.replace(/\\$HOME\\/\\.claude\\//g, '~/.bob/');",
  "        c = c.replace(/~\\/\\.claude\\//g, '~/.bob/');",
  "        // Bare form (no trailing slash) — must come after slash form to avoid double-replace",
  "        c = c.replace(/\\$HOME\\/\\.claude\\b/g, '~/.bob');",
  "        c = c.replace(/~\\/\\.claude\\b/g, '~/.bob');",
  "    }",
  "    else {",
  "        c = c.replace(/\\$HOME\\/\\.claude\\//g, '.bob/');",
  "        c = c.replace(/~\\/\\.claude\\//g, '.bob/');",
  "        // Bare form (no trailing slash) — must come after slash form to avoid double-replace",
  "        c = c.replace(/\\$HOME\\/\\.claude\\b/g, '.bob');",
  "        c = c.replace(/~\\/\\.claude\\b/g, '.bob');",
  "    }",
  "    c = c.replace(/\\.\\/\\.claude\\//g, './.bob/');",
  "    c = c.replace(/\\.claude\\//g, '.bob/');",
  "    // Command name conversion (the colon command dialect → routable hyphen form).",
  "    c = c.replace(/gsd:/g, 'gsd-');",
  "    return c;",
  "}",
  "/**",
  " * Convert a Claude command/skill (.md) to a Bob skill (SKILL.md).",
  " * Reduces frontmatter to `name` + `description` only; body preserved verbatim.",
  " * Unlike the Antigravity analog, this does NOT early-return when frontmatter is",
  " * absent — Bob ignores a skill without a usable description, so a 2-line block",
  " * (with an empty description) is always emitted.",
  " *",
  " * @param {string} content       raw command/skill markdown (may have frontmatter)",
  " * @param {string} skillName     target skill name (becomes the `name:` field)",
  " * @param {*} _runtime           unused (API symmetry with skillsKind wrapper)",
  " * @param {*} _cmdNames          unused (API symmetry)",
  " * @param {boolean} isGlobal     whether this is a global install (5th positional,",
  " *                               supplied by skillsKind) — drives the `.bob` home mapping",
  " * @returns {string} SKILL.md with name+description-only frontmatter + neutralized body",
  " */",
  "function convertClaudeCommandToBobSkill(content, skillName, _runtime = null, _cmdNames = null, isGlobal = false) {",
  "    // Neutralize the FULL content first (mirrors the Antigravity skill converter):",
  "    // rewrites .claude→.bob path refs and gsd:→gsd- before frontmatter reduction.",
  "    const converted = convertClaudeToBobContent(content, isGlobal);",
  "    const { frontmatter, body } = extractFrontmatterAndBody(converted);",
  "    const name = skillName || extractFrontmatterField(frontmatter || '', 'name') || 'unknown';",
  "    const description = (frontmatter && extractFrontmatterField(frontmatter, 'description')) || '';",
  "    const fm = `---\\nname: ${name}\\ndescription: ${yamlQuote(description)}\\n---`;",
  "    return `${fm}\\n${body}`;",
  "}",
  "/**",
  " * Convert a Claude command (.md) to a Bob slash command (.bob/commands/<name>.md).",
  " * Templated on the Cursor command converter BUT — unlike Cursor, which strips ALL",
  " * frontmatter — Bob KEEPS its two allowed fields (`description`, `argument-hint`),",
  " * rebuilt from a whitelist. Projects `$ARGUMENTS` in the body to Bob's `$1`",
  " * positional arg (the simple/no-arg case; complex multi-arg projection is deferred",
  " * to Phases 4-5 per RESEARCH Open Questions).",
  " *",
  " * @param {string} content       raw command markdown (may have frontmatter)",
  " * @param {string} _commandName  target command name (unused; API symmetry)",
  " * @param {boolean} [isGlobal=false] whether this is a global install. gsd-bob's",
  " *                               stage.cjs passes `scope === 'global'` so a global",
  " *                               install references `~/.bob/...` (then rewritten to the",
  " *                               absolute target) instead of a workspace-relative",
  " *                               `.bob/...` that does not exist under `~/.bob`.",
  " * @returns {string} command markdown with description+argument-hint-only frontmatter",
  " */",
  "function convertClaudeCommandToBobCommand(content, _commandName, isGlobal = false) {",
  "    // Neutralize the FULL content first (as the skill converter does) so a frontmatter",
  "    // description that names a sibling command in the colon dialect (e.g. quick-batch's",
  "    // \"/gsd:quick-shaped tasks\") is emitted in the routable hyphen form too.",
  "    const converted = convertClaudeToBobContent(content, isGlobal);",
  "    const { frontmatter, body } = extractFrontmatterAndBody(converted);",
  "    const description = (frontmatter && extractFrontmatterField(frontmatter, 'description')) || null;",
  "    const argumentHint = (frontmatter && extractFrontmatterField(frontmatter, 'argument-hint')) || null;",
  "    let fm = '---\\n';",
  "    if (description !== null)",
  "        fm += `description: ${yamlQuote(description)}\\n`;",
  "    if (argumentHint !== null)",
  "        fm += `argument-hint: ${yamlQuote(argumentHint)}\\n`;",
  "    fm += '---\\n';",
  "    // Body is already neutralized (.claude→.bob, gsd:→gsd-); project $ARGUMENTS -> $1",
  "    // (order matters — neutralize then project; documented simple/no-arg case).",
  "    const projectedBody = body.replace(/\\$ARGUMENTS\\b/g, '$1');",
  "    return `${fm}${projectedBody}`;",
  "}"
].join("\n");

// The three export symbols added inside runtime-artifact-conversion.cjs's module.exports.
const CONVERTER_EXPORT_LINES = [
  'convertClaudeToBobContent,',
  'convertClaudeCommandToBobSkill,',
  'convertClaudeCommandToBobCommand,'
];

// The two converter names added to capability-validator.cjs's closed allowlist (step 7).
const CONVERTER_ALLOWLIST_LINES = [
  "'convertClaudeCommandToBobSkill',",
  "'convertClaudeCommandToBobCommand',"
];

// Step 8 — the `gsd_run` resolver preamble (references/gsd-run-resolver.md, inlined into
// every workflow bash block). Exact upstream substrings → their Bob-aware replacements.
// Each replacement removes its own search key, so the transform is idempotent.
const SHIM = '${_GSD_SHIM_NAME}';
const RESOLVER_LOCAL_FROM =
  `_gsd_at "\${_GSD_RUNTIME_ROOT}/gsd-core/bin/${SHIM}" "\${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${SHIM}"`;
const RESOLVER_LOCAL_TO =
  `_gsd_at "\${_GSD_RUNTIME_ROOT}/gsd-core/bin/${SHIM}" "\${_GSD_RUNTIME_ROOT}/.bob/gsd-core/bin/${SHIM}" "\${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${SHIM}"`;
const RESOLVER_GLOBAL_FROM = `_gsd_at "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${SHIM}"`;
const RESOLVER_GLOBAL_TO = `_gsd_at "$HOME/.bob/gsd-core/bin/${SHIM}" "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${SHIM}"`;
const RESOLVER_HINT_FROM = 'Run: npx -y @opengsd/gsd-core@latest --claude --local';
const RESOLVER_HINT_TO = 'Run: npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local';
/** Marker every patched resolver preamble carries (used by verifyAll + tests). */
const RESOLVER_BOB_PROBE = `/.bob/gsd-core/bin/${SHIM}`;

// ---------------------------------------------------------------------------
// Filesystem helpers — fail loud (swallow ONLY ENOENT), mirroring
// scripts/fix-slash-commands.cjs's readCmdNames discipline.
// ---------------------------------------------------------------------------

function readFileOrNull(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err; // EACCES, ENOTDIR, etc. are real misconfig — never swallow.
  }
}

function readDirEntriesOrNull(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Recursively collect *.md files under a doc dir (skip SKIP_DIRS).
function collectMd(dir, acc) {
  const entries = readDirEntriesOrNull(dir);
  if (entries === null) return acc; // dir absent — nothing to normalize.
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      collectMd(full, acc);
    } else if (e.isFile() && path.extname(e.name) === '.md') {
      acc.push(full);
    }
  }
  return acc;
}

function collectDocTree() {
  const files = [];
  for (const sub of NORMALIZE_DIRS) collectMd(path.join(GSD_CORE, sub), files);
  return files;
}

const FILES = {
  registry: path.join(GSD_CORE, 'bin', 'lib', 'capability-registry.cjs'),
  conversion: path.join(GSD_CORE, 'bin', 'lib', 'runtime-artifact-conversion.cjs'),
  validator: path.join(GSD_CORE, 'bin', 'lib', 'capability-validator.cjs'),
  aliasManifest: path.join(GSD_CORE, 'bin', 'shared', 'runtime-aliases.manifest.json'),
  namePolicy: path.join(GSD_CORE, 'bin', 'lib', 'runtime-name-policy.cjs'),
  version: path.join(GSD_CORE, 'VERSION'),
  runtimeMarker: path.join(GSD_CORE, '.gsd-runtime'),
};

/** The runtime id the per-install marker carries (delta 9). */
const RUNTIME_MARKER = 'bob';

// Anchors, in one place so preflight and the patch steps can never disagree.
const ANCHORS = {
  registryRuntimes: 'const runtimes = {',
  registryClaude: /^[ \t]*"claude": \{$/m,
  conversionExports: 'module.exports = {',
  // A helper the Bob converters CALL — if it ever disappears the converters are broken
  // anyway, so anchor failure and real failure coincide (never a per-runtime converter
  // name: the Cursor-command export this used to anchor on was deleted upstream in 1.7.0).
  conversionExportLine: /^([ \t]*)extractFrontmatterField,$/m,
  validatorAllowlist: /^([ \t]*)'convertClaudeCommandToClineSkill',$/m,
  namePolicyCline: /^([ \t]*)cline: \['cline', 'cline-cli'\],$/m,
};

// ---------------------------------------------------------------------------
// Delta steps 1 & 2 — normalization over the .md doc tree (idempotent by design).
// ---------------------------------------------------------------------------

function normalizeHomePath(content) {
  // ~/.claude → $HOME/.claude, preserving a preceding non-word/non-$ boundary char
  // (covers the `@~/.claude/...` mandatory-read form). Idempotent: after the first
  // pass no `~/.claude` remains, so subsequent runs are no-ops.
  return content.replace(/(^|[^\w$])~\/\.claude/g, '$1$HOME/.claude');
}

function runNormalization() {
  const cmdNames = readCmdNames();
  const files = collectDocTree();
  let colonChanged = 0;
  let homeChanged = 0;
  for (const file of files) {
    const src = readFileOrNull(file);
    if (src === null) continue;
    let out = transformContentToHyphen(src, cmdNames); // colon→hyphen (Pitfall 4: pure transform, not the script)
    const afterColon = out;
    out = normalizeHomePath(out); // ~/.claude → $HOME/.claude
    if (afterColon !== src) colonChanged++;
    if (out !== afterColon) homeChanged++;
    if (out !== src) fs.writeFileSync(file, out, 'utf8');
  }
  console.log(`  [1] colon→hyphen: ${colonChanged} file(s) changed`);
  console.log(`  [2] ~/.claude→$HOME: ${homeChanged} file(s) changed`);
  console.log(`      (scanned ${files.length} .md file(s) under ${NORMALIZE_DIRS.join(', ')})`);
}

// ---------------------------------------------------------------------------
// Delta step 3 — registry block into const runtimes (anchor: first "claude": {).
// ---------------------------------------------------------------------------

function patchRegistry() {
  const content = readFileOrNull(FILES.registry);
  if (content === null) { console.log('  [3] registry: SKIP (file absent)'); return; }
  if (content.includes('"id": "bob"')) { console.log('  [3] registry: already applied — no-op'); return; }

  const runtimesIdx = content.indexOf(ANCHORS.registryRuntimes);
  if (runtimesIdx === -1) throw new Error('[3] registry: anchor `const runtimes = {` not found');

  const before = content.slice(0, runtimesIdx);
  const after = content.slice(runtimesIdx);
  // First "claude": { AFTER const runtimes — never the earlier const capabilities object.
  if (!ANCHORS.registryClaude.test(after)) throw new Error('[3] registry: sibling anchor `"claude": {` not found inside const runtimes');
  const patchedAfter = after.replace(ANCHORS.registryClaude, (m) => `${REGISTRY_BLOCK}\n${m}`);

  fs.writeFileSync(FILES.registry, before + patchedAfter, 'utf8');
  console.log('  [3] registry: "bob" block inserted before "claude" in const runtimes');
}

// ---------------------------------------------------------------------------
// Delta step 4 — converter block + 3 exports into runtime-artifact-conversion.cjs.
// ---------------------------------------------------------------------------

function patchConverter() {
  let content = readFileOrNull(FILES.conversion);
  if (content === null) { console.log('  [4] converter: SKIP (file absent)'); return; }

  let touched = false;

  // 4a — inject the ~105-line block before module.exports (function decls hoist).
  if (content.includes('function convertClaudeCommandToBobSkill')) {
    console.log('  [4a] converter block: already applied — no-op');
  } else {
    if (!content.includes(ANCHORS.conversionExports)) throw new Error('[4a] converter: anchor `module.exports = {` not found');
    content = content.replace(ANCHORS.conversionExports, `${CONVERTER_BLOCK}\n${ANCHORS.conversionExports}`);
    touched = true;
    console.log('  [4a] converter block: inserted before module.exports');
  }

  // 4b — add the three export symbols, anchored on a helper the converters call.
  if (content.includes('convertClaudeCommandToBobSkill,')) {
    console.log('  [4b] converter exports: already applied — no-op');
  } else {
    if (!ANCHORS.conversionExportLine.test(content)) throw new Error('[4b] converter: export anchor `extractFrontmatterField,` not found');
    content = content.replace(ANCHORS.conversionExportLine, (m, indent) =>
      m + '\n' + CONVERTER_EXPORT_LINES.map((l) => indent + l).join('\n'));
    touched = true;
    console.log('  [4b] converter exports: 3 symbols added');
  }

  if (touched) fs.writeFileSync(FILES.conversion, content, 'utf8');
}

// ---------------------------------------------------------------------------
// Delta step 5a — "bob" alias into the JSON manifest (structured edit; drift-proof).
// ---------------------------------------------------------------------------

function patchAliasManifest() {
  const raw = readFileOrNull(FILES.aliasManifest);
  if (raw === null) { console.log('  [5a] alias manifest: SKIP (file absent)'); return; }

  const obj = JSON.parse(raw);
  if (Object.prototype.hasOwnProperty.call(obj, 'bob')) {
    console.log('  [5a] alias manifest: already applied — no-op');
    return;
  }
  obj.bob = ['bob', 'bob-cli'];
  fs.writeFileSync(FILES.aliasManifest, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log('  [5a] alias manifest: "bob" key added');
}

// ---------------------------------------------------------------------------
// Delta step 5b — bob alias into FALLBACK_ALIASES (anchor: cline entry).
// ---------------------------------------------------------------------------

function patchNamePolicyAlias() {
  const content = readFileOrNull(FILES.namePolicy);
  if (content === null) { console.log('  [5b] name-policy alias: SKIP (file absent)'); return; }
  if (/\bbob:\s*\['bob'/.test(content)) { console.log('  [5b] name-policy alias: already applied — no-op'); return; }

  if (!ANCHORS.namePolicyCline.test(content)) throw new Error('[5b] name-policy: anchor `cline: [...]` not found in FALLBACK_ALIASES');
  const patched = content.replace(ANCHORS.namePolicyCline, (m, indent) => `${m}\n${indent}bob: ['bob', 'bob-cli'],`);

  fs.writeFileSync(FILES.namePolicy, patched, 'utf8');
  console.log('  [5b] name-policy alias: "bob" entry added after "cline"');
}

// ---------------------------------------------------------------------------
// Delta step 6 — write the local VERSION file (tarball ships none; the shim's
// resolveVersionFrom and stage.cjs both read it).
// ---------------------------------------------------------------------------

function writeVersion() {
  const current = readFileOrNull(FILES.version);
  if (current === TARGET_VERSION) {
    console.log(`  [6] VERSION: already ${TARGET_VERSION} — no-op`);
    return;
  }
  // Match the current file shape: no trailing newline.
  fs.writeFileSync(FILES.version, TARGET_VERSION, 'utf8');
  console.log(`  [6] VERSION: wrote ${TARGET_VERSION}`);
}

// ---------------------------------------------------------------------------
// Delta step 7 — Bob converter names into the closed VALID_CONVERTER_NAMES allowlist.
// ---------------------------------------------------------------------------

function patchConverterAllowlist() {
  const content = readFileOrNull(FILES.validator);
  if (content === null) { console.log('  [7] converter allowlist: SKIP (file absent)'); return; }
  if (content.includes("'convertClaudeCommandToBobSkill',")) { console.log('  [7] converter allowlist: already applied — no-op'); return; }

  if (!ANCHORS.validatorAllowlist.test(content)) throw new Error("[7] converter allowlist: anchor `'convertClaudeCommandToClineSkill',` not found in VALID_CONVERTER_NAMES");
  const patched = content.replace(ANCHORS.validatorAllowlist, (m, indent) =>
    m + '\n' + CONVERTER_ALLOWLIST_LINES.map((l) => indent + l).join('\n'));

  fs.writeFileSync(FILES.validator, patched, 'utf8');
  console.log('  [7] converter allowlist: 2 Bob converter names added');
}

// ---------------------------------------------------------------------------
// Delta step 8 — `.bob` probes in the gsd_run resolver preamble (doc tree).
// ---------------------------------------------------------------------------

/** Pure transform: make one document's resolver preamble Bob-aware (idempotent). */
function patchResolverContent(content) {
  return content
    .split(RESOLVER_LOCAL_FROM).join(RESOLVER_LOCAL_TO)
    .split(RESOLVER_GLOBAL_FROM).join(RESOLVER_GLOBAL_TO)
    .split(RESOLVER_HINT_FROM).join(RESOLVER_HINT_TO);
}

function patchResolverProbes() {
  const files = collectDocTree();
  let changed = 0;
  let carrying = 0;
  for (const file of files) {
    const src = readFileOrNull(file);
    if (src === null) continue;
    const out = patchResolverContent(src);
    if (out !== src) { fs.writeFileSync(file, out, 'utf8'); changed++; }
    if (out.includes(RESOLVER_BOB_PROBE)) carrying++;
  }
  console.log(`  [8] gsd_run resolver: ${changed} file(s) changed (${carrying} now probe .bob)`);
}

// ---------------------------------------------------------------------------
// Delta step 9 — per-install runtime marker beside VERSION.
// ---------------------------------------------------------------------------

function writeRuntimeMarker() {
  const current = readFileOrNull(FILES.runtimeMarker);
  if (current !== null && current.trim() === RUNTIME_MARKER) {
    console.log(`  [9] .gsd-runtime: already ${RUNTIME_MARKER} — no-op`);
    return;
  }
  // Same shape upstream's bin/install.js writes: the bare id plus a newline.
  fs.writeFileSync(FILES.runtimeMarker, `${RUNTIME_MARKER}\n`, 'utf8');
  console.log(`  [9] .gsd-runtime: wrote ${RUNTIME_MARKER}`);
}

// ---------------------------------------------------------------------------
// Preflight — every anchor-based step must be either already applied or anchorable
// BEFORE the first write, so a missing anchor can never leave a half-patched tree.
// ---------------------------------------------------------------------------

function preflight() {
  const problems = [];
  const check = (label, file, appliedTest, anchorTest) => {
    const content = readFileOrNull(file);
    if (content === null) return; // absent file → the step SKIPs; nothing to anchor
    if (appliedTest(content)) return;
    if (!anchorTest(content)) problems.push(`${label}: anchor not found in ${path.relative(ROOT, file)}`);
  };
  check('[3] registry', FILES.registry,
    (c) => c.includes('"id": "bob"'),
    (c) => { const i = c.indexOf(ANCHORS.registryRuntimes); return i !== -1 && ANCHORS.registryClaude.test(c.slice(i)); });
  check('[4a] converter block', FILES.conversion,
    (c) => c.includes('function convertClaudeCommandToBobSkill'),
    (c) => c.includes(ANCHORS.conversionExports));
  check('[4b] converter exports', FILES.conversion,
    (c) => c.includes('convertClaudeCommandToBobSkill,'),
    (c) => ANCHORS.conversionExportLine.test(c));
  check('[5b] name-policy alias', FILES.namePolicy,
    (c) => /\bbob:\s*\['bob'/.test(c),
    (c) => ANCHORS.namePolicyCline.test(c));
  check('[7] converter allowlist', FILES.validator,
    (c) => c.includes("'convertClaudeCommandToBobSkill',"),
    (c) => ANCHORS.validatorAllowlist.test(c));
  if (problems.length) {
    throw new Error(`apply-bob-patches preflight failed — nothing was written:\n  - ${problems.join('\n  - ')}`);
  }
}

// ---------------------------------------------------------------------------
// Verify — every delta present after the run (fail loud on any gap).
// ---------------------------------------------------------------------------

/**
 * Extract the `"bob": {…},` block from the vendored registry (brace-walked from the
 * `"id": "bob"` marker) and parse it as JSON. Shared with the drift-guard test.
 * @returns {object} the bob runtime descriptor as data
 */
function readVendoredBobEntry(registrySource) {
  const src = registrySource === undefined ? readFileOrNull(FILES.registry) : registrySource;
  if (src === null) throw new Error('capability-registry.cjs absent');
  const idIdx = src.indexOf('"id": "bob"');
  if (idIdx === -1) throw new Error('"bob" entry not present in capability-registry.cjs');
  const open = src.lastIndexOf('{', idIdx);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(src.slice(open, i + 1)); }
  }
  throw new Error('unbalanced "bob" block in capability-registry.cjs');
}

/** The canonical bob descriptor as data (REGISTRY_BLOCK minus comments + trailing comma). */
function canonicalBobEntry() {
  const body = REGISTRY_BLOCK.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const json = body.replace(/^\s*"bob":\s*/, '').replace(/,\s*$/, '');
  return JSON.parse(json);
}

function verifyAll() {
  const gaps = [];
  const has = (file, needle, label) => {
    const c = readFileOrNull(file);
    if (c === null || !c.includes(needle)) gaps.push(label);
  };
  const version = readFileOrNull(FILES.version);
  if (version !== TARGET_VERSION) gaps.push(`[6] VERSION is ${JSON.stringify(version)}, expected ${TARGET_VERSION}`);
  has(FILES.registry, '"id": "bob"', '[3] registry: "bob" entry missing');
  try {
    const entry = readVendoredBobEntry();
    for (const key of ['localConfigDir', 'hostIntegration', 'triggerPrecedence']) {
      if (entry.runtime[key] === undefined) gaps.push(`[3] registry: bob.runtime.${key} missing`);
    }
    if (entry.runtime.hookEvents !== undefined) gaps.push('[3] registry: bob.runtime.hookEvents must be omitted (no legal "none" value)');
  } catch (err) {
    gaps.push(`[3] registry: ${err.message}`);
  }
  has(FILES.conversion, 'function convertClaudeCommandToBobSkill', '[4a] converter block missing');
  for (const l of CONVERTER_EXPORT_LINES) has(FILES.conversion, l, `[4b] export missing: ${l}`);
  const manifest = readFileOrNull(FILES.aliasManifest);
  if (manifest === null || !Object.prototype.hasOwnProperty.call(JSON.parse(manifest), 'bob')) gaps.push('[5a] alias manifest: bob key missing');
  const policy = readFileOrNull(FILES.namePolicy);
  if (policy === null || !/\bbob:\s*\['bob'/.test(policy)) gaps.push('[5b] name-policy: bob alias missing');
  for (const l of CONVERTER_ALLOWLIST_LINES) has(FILES.validator, l, `[7] allowlist missing: ${l}`);
  // [8] every doc-tree file that carries the resolver preamble must probe .bob.
  for (const file of collectDocTree()) {
    const c = readFileOrNull(file);
    if (c !== null && c.includes('_gsd_at') && !c.includes(RESOLVER_BOB_PROBE)) {
      gaps.push(`[8] resolver preamble without .bob probe: ${path.relative(GSD_CORE, file)}`);
    }
  }
  // [2] no un-normalized home path may survive in the doc tree.
  for (const file of collectDocTree()) {
    const c = readFileOrNull(file);
    if (c !== null && /(^|[^\w$])~\/\.claude/.test(c)) gaps.push(`[2] ~/.claude survives in ${path.relative(GSD_CORE, file)}`);
  }
  const marker = readFileOrNull(FILES.runtimeMarker);
  if (marker === null || marker.trim() !== RUNTIME_MARKER) gaps.push(`[9] .gsd-runtime marker missing or not "${RUNTIME_MARKER}"`);
  if (gaps.length) {
    throw new Error(`apply-bob-patches verify failed:\n  - ${gaps.join('\n  - ')}`);
  }
  console.log('  [✓] verify: all nine deltas present');
}

// ---------------------------------------------------------------------------
// Orchestrator.
// ---------------------------------------------------------------------------

function applyAll() {
  console.log(`apply-bob-patches: reproducing local deltas over ${path.relative(process.cwd(), GSD_CORE) || GSD_CORE}`);
  preflight();
  runNormalization();
  patchRegistry();
  patchConverter();
  patchAliasManifest();
  patchNamePolicyAlias();
  writeVersion();
  patchConverterAllowlist();
  patchResolverProbes();
  writeRuntimeMarker();
  verifyAll();
  console.log('apply-bob-patches: done (idempotent — safe to re-run).');
}

if (require.main === module) {
  applyAll();
}

module.exports = {
  applyAll,
  preflight,
  verifyAll,
  runNormalization,
  normalizeHomePath,
  patchRegistry,
  patchConverter,
  patchAliasManifest,
  patchNamePolicyAlias,
  writeVersion,
  patchConverterAllowlist,
  patchResolverProbes,
  patchResolverContent,
  writeRuntimeMarker,
  RUNTIME_MARKER,
  readVendoredBobEntry,
  canonicalBobEntry,
  REGISTRY_BLOCK,
  CONVERTER_BLOCK,
  CONVERTER_EXPORT_LINES,
  CONVERTER_ALLOWLIST_LINES,
  RESOLVER_BOB_PROBE,
  RESOLVER_HINT_TO,
  TARGET_VERSION,
  NORMALIZE_DIRS
};
