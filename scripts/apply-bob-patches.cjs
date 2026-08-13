'use strict';
/**
 * apply-bob-patches.cjs — idempotent re-injection of ALL gsd-bob local deltas over a
 * freshly-restaged pristine `@opengsd/gsd-core` payload (Phase 07 D-02).
 *
 * The vendored `gsd-core/` tree is NOT the pristine npm tarball. It is:
 *     pristine tarball + normalization pass + FOUR bob patches + a local VERSION file
 * A naive "nuke-and-restage the raw tarball" drops every one of those deltas and leaves
 * the payload broken under Bob (colon command form leaks back in, `stage.cjs` crashes on
 * the missing Bob converters, and `stage.cjs` throws ENOENT on the missing VERSION file).
 *
 * This script reproduces the WHOLE local-delta set (RESEARCH §1 — six items, correcting
 * CONTEXT.md D-01's incomplete "two data-only edits" model), each guarded to be a clean
 * no-op on re-run (the D-02 idempotency contract). It is the executable core of the
 * Phase 10 MAINTAINING runbook: a bump = nuke → restage clean tarball → run this → validate.
 *
 * The SIX deltas:
 *   1. colon→hyphen command form   (`gsd:<cmd>` → `gsd-<cmd>`) over the .md doc tree
 *   2. home-path normalization      (`~/.claude` → `$HOME/.claude`) over the .md doc tree
 *   3. `"bob"` runtime registry block   → bin/lib/capability-registry.cjs (const runtimes)
 *   4. Bob converter code block (~105 lines) → bin/lib/runtime-artifact-conversion.cjs
 *   5a. `"bob"` alias (JSON)             → bin/shared/runtime-aliases.manifest.json
 *   5b. `bob` alias (FALLBACK_ALIASES)   → bin/lib/runtime-name-policy.cjs
 *   6. local VERSION file                → gsd-core/VERSION
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

// The version the restaged payload must carry. The tarball ships NO VERSION file, yet
// stage.cjs L242 reads gsd-core/VERSION and throws ENOENT without it (RESEARCH §2).
const TARGET_VERSION = '1.6.1';

// Only the .md documentation subdirs are normalized. bin/ is EXCLUDED: a text transform
// over bin/**/*.cjs would corrupt legitimate code (e.g. runtime-slash.cjs's legacy-colon
// input parser). bin/lib stays a patch-only target for steps 3/4/5b — never normalized.
const NORMALIZE_DIRS = ['workflows', 'references', 'templates', 'contexts'];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo']);

// ---------------------------------------------------------------------------
// Canonical Bob blocks — captured BYTE-IDENTICAL from the vendored tree before the
// Plan-02 nuke (RESEARCH Open Question 1: inline constants, self-contained for the
// runbook narrative). Stored as per-line JSON strings joined by "\n" so backticks,
// ${...}, and backslashes survive verbatim without template-literal interference.
// ---------------------------------------------------------------------------

const REGISTRY_BLOCK = [
  "  // gsd-bob HAND-EDIT to this GENERATED registry (vendored-payload approach;",
  "  // RESEARCH Pitfall 2). The upstream PR will add a capabilities/bob/capability.json",
  "  // source so the generator emits this same data — the resulting object is identical.",
  "  // Backend-agnostic by design: no model/backend brand names appear in this entry.",
  "  \"bob\": {",
  "    \"id\": \"bob\",",
  "    \"role\": \"runtime\",",
  "    \"title\": \"IBM Bob\",",
  "    \"description\": \"IBM Bob (bob.ibm.com) — backend-agnostic; .bob/skills + .bob/commands; text_mode prompts; isolated subagents with parallel fan-out.\",",
  "    \"tier\": \"core\",",
  "    \"requires\": [],",
  "    \"runtime\": {",
  "      \"configHome\": {",
  "        \"kind\": \"dot-home\",",
  "        \"name\": \".bob\",",
  "        \"env\": []",
  "      },",
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
  "      \"commandStyle\": \"slash-hyphen\",",
  "      \"hooksSurface\": \"none\",",
  "      \"hookEvents\": \"none\",",
  "      \"sandboxTier\": \"none\",",
  "      \"supportTier\": 2,",
  "      \"installSurface\": \"profile-marker-only\",",
  "      \"writesSharedSettings\": false,",
  "      \"permissionWriter\": null,",
  "      \"extendedHookEvents\": []",
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
  " * @param {boolean} [isGlobal=false] whether this is a global install. NOTE: the live",
  " *                               stageCommandsForRuntimeFlat dispatch calls the converter",
  " *                               with only (content, commandName) (install-profiles.cjs:604),",
  " *                               so isGlobal defaults to the local `.bob/` mapping — correct",
  " *                               for both global and local Bob installs, which both reference",
  " *                               `.bob/...` relative paths in command bodies.",
  " * @returns {string} command markdown with description+argument-hint-only frontmatter",
  " */",
  "function convertClaudeCommandToBobCommand(content, _commandName, isGlobal = false) {",
  "    const { frontmatter, body } = extractFrontmatterAndBody(content);",
  "    const description = (frontmatter && extractFrontmatterField(frontmatter, 'description')) || null;",
  "    const argumentHint = (frontmatter && extractFrontmatterField(frontmatter, 'argument-hint')) || null;",
  "    let fm = '---\\n';",
  "    if (description !== null)",
  "        fm += `description: ${yamlQuote(description)}\\n`;",
  "    if (argumentHint !== null)",
  "        fm += `argument-hint: ${yamlQuote(argumentHint)}\\n`;",
  "    fm += '---\\n';",
  "    // Neutralize the body FIRST (.claude→.bob, gsd:→gsd-), THEN project $ARGUMENTS",
  "    // -> $1 (order matters — neutralize then project; documented simple/no-arg case).",
  "    const neutralizedBody = convertClaudeToBobContent(body, isGlobal);",
  "    const projectedBody = neutralizedBody.replace(/\\$ARGUMENTS\\b/g, '$1');",
  "    return `${fm}${projectedBody}`;",
  "}"
].join("\n");

// The three export symbols added inside runtime-artifact-conversion.cjs's module.exports.
const CONVERTER_EXPORT_LINES = [
  'convertClaudeToBobContent,',
  'convertClaudeCommandToBobSkill,',
  'convertClaudeCommandToBobCommand,'
];

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
  const files = [];
  for (const sub of NORMALIZE_DIRS) {
    collectMd(path.join(GSD_CORE, sub), files);
  }
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
  const file = path.join(GSD_CORE, 'bin', 'lib', 'capability-registry.cjs');
  const content = readFileOrNull(file);
  if (content === null) { console.log('  [3] registry: SKIP (file absent)'); return; }
  if (content.includes('"id": "bob"')) { console.log('  [3] registry: already applied — no-op'); return; }

  const runtimesIdx = content.indexOf('const runtimes = {');
  if (runtimesIdx === -1) throw new Error('[3] registry: anchor `const runtimes = {` not found');

  const before = content.slice(0, runtimesIdx);
  const after = content.slice(runtimesIdx);
  // First "claude": { AFTER const runtimes — never the earlier const capabilities object.
  const claudeRe = /^[ \t]*"claude": \{$/m;
  if (!claudeRe.test(after)) throw new Error('[3] registry: sibling anchor `"claude": {` not found inside const runtimes');
  const patchedAfter = after.replace(claudeRe, (m) => `${REGISTRY_BLOCK}\n${m}`);

  fs.writeFileSync(file, before + patchedAfter, 'utf8');
  console.log('  [3] registry: "bob" block inserted before "claude" in const runtimes');
}

// ---------------------------------------------------------------------------
// Delta step 4 — converter block + 3 exports into runtime-artifact-conversion.cjs.
// ---------------------------------------------------------------------------

function patchConverter() {
  const file = path.join(GSD_CORE, 'bin', 'lib', 'runtime-artifact-conversion.cjs');
  let content = readFileOrNull(file);
  if (content === null) { console.log('  [4] converter: SKIP (file absent)'); return; }

  let touched = false;

  // 4a — inject the ~105-line block before module.exports (function decls hoist).
  if (content.includes('function convertClaudeCommandToBobSkill')) {
    console.log('  [4a] converter block: already applied — no-op');
  } else {
    if (!content.includes('module.exports = {')) throw new Error('[4a] converter: anchor `module.exports = {` not found');
    content = content.replace('module.exports = {', `${CONVERTER_BLOCK}\nmodule.exports = {`);
    touched = true;
    console.log('  [4a] converter block: inserted before module.exports');
  }

  // 4b — add the three export symbols, anchored on the Cursor command export line.
  if (content.includes('convertClaudeCommandToBobSkill,')) {
    console.log('  [4b] converter exports: already applied — no-op');
  } else {
    const exportRe = /^([ \t]*)convertClaudeCommandToCursorCommand,$/m;
    if (!exportRe.test(content)) throw new Error('[4b] converter: export anchor `convertClaudeCommandToCursorCommand,` not found');
    content = content.replace(exportRe, (m, indent) =>
      CONVERTER_EXPORT_LINES.map((l) => indent + l).join('\n') + '\n' + m);
    touched = true;
    console.log('  [4b] converter exports: 3 symbols added');
  }

  if (touched) fs.writeFileSync(file, content, 'utf8');
}

// ---------------------------------------------------------------------------
// Delta step 5a — "bob" alias into the JSON manifest (structured edit; drift-proof).
// ---------------------------------------------------------------------------

function patchAliasManifest() {
  const file = path.join(GSD_CORE, 'bin', 'shared', 'runtime-aliases.manifest.json');
  const raw = readFileOrNull(file);
  if (raw === null) { console.log('  [5a] alias manifest: SKIP (file absent)'); return; }

  const obj = JSON.parse(raw);
  if (Object.prototype.hasOwnProperty.call(obj, 'bob')) {
    console.log('  [5a] alias manifest: already applied — no-op');
    return;
  }
  obj.bob = ['bob', 'bob-cli'];
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log('  [5a] alias manifest: "bob" key added');
}

// ---------------------------------------------------------------------------
// Delta step 5b — bob alias into FALLBACK_ALIASES (anchor: cline entry).
// ---------------------------------------------------------------------------

function patchNamePolicyAlias() {
  const file = path.join(GSD_CORE, 'bin', 'lib', 'runtime-name-policy.cjs');
  const content = readFileOrNull(file);
  if (content === null) { console.log('  [5b] name-policy alias: SKIP (file absent)'); return; }
  if (/\bbob:\s*\['bob'/.test(content)) { console.log('  [5b] name-policy alias: already applied — no-op'); return; }

  const clineRe = /^([ \t]*)cline: \['cline', 'cline-cli'\],$/m;
  if (!clineRe.test(content)) throw new Error('[5b] name-policy: anchor `cline: [...]` not found in FALLBACK_ALIASES');
  const patched = content.replace(clineRe, (m, indent) => `${m}\n${indent}bob: ['bob', 'bob-cli'],`);

  fs.writeFileSync(file, patched, 'utf8');
  console.log('  [5b] name-policy alias: "bob" entry added after "cline"');
}

// ---------------------------------------------------------------------------
// Delta step 6 — write the local VERSION file (tarball ships none; stage.cjs requires it).
// ---------------------------------------------------------------------------

function writeVersion() {
  const file = path.join(GSD_CORE, 'VERSION');
  const current = readFileOrNull(file);
  if (current === TARGET_VERSION) {
    console.log(`  [6] VERSION: already ${TARGET_VERSION} — no-op`);
    return;
  }
  // Match the current file shape: no trailing newline.
  fs.writeFileSync(file, TARGET_VERSION, 'utf8');
  console.log(`  [6] VERSION: wrote ${TARGET_VERSION}`);
}

// ---------------------------------------------------------------------------
// Orchestrator.
// ---------------------------------------------------------------------------

function applyAll() {
  console.log(`apply-bob-patches: reproducing local deltas over ${path.relative(process.cwd(), GSD_CORE) || GSD_CORE}`);
  runNormalization();
  patchRegistry();
  patchConverter();
  patchAliasManifest();
  patchNamePolicyAlias();
  writeVersion();
  console.log('apply-bob-patches: done (idempotent — safe to re-run).');
}

if (require.main === module) {
  applyAll();
}

module.exports = {
  applyAll,
  runNormalization,
  normalizeHomePath,
  patchRegistry,
  patchConverter,
  patchAliasManifest,
  patchNamePolicyAlias,
  writeVersion,
  REGISTRY_BLOCK,
  CONVERTER_BLOCK,
  CONVERTER_EXPORT_LINES,
  TARGET_VERSION,
  NORMALIZE_DIRS
};
