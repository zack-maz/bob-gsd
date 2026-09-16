'use strict';

/**
 * agent-neutrality.test.cjs — NEUTRAL-04 (the agent/product-name invariant).
 *
 * The emitted `.bob/` set names no agent, assistant, vendor or model other than
 * Bob, and the runtime documents it ships point at Bob's own paths. This
 * extends v2.0's NEUTRAL-03 (zero MODEL literals in commands/skills) to
 * agent/product names AND to the vendored doc tree the model reads at runtime.
 *
 * Contract, exactly as `bobifyRuntimeDoc` in src/bob-adapter.cjs implements it:
 *   - commands/, skills/, custom_modes.yaml, SUPPORT-ROSTER.md: ZERO tokens anywhere.
 *   - gsd-core/{workflows,references,templates,contexts}/*.md: ZERO tokens in
 *     prose and in every non-shell fenced block; inside SHELL fences only bare
 *     identifiers may survive (`case … in <id>)`, dead env-var probes) — those
 *     are bounded, never prose, and counted below so a regression fails loud.
 *   - No upstream config-home path (`$HOME/<dot-home>`, `~/<dot-home>`, the
 *     `<ENV>_CONFIG_DIR` form) and no upstream project-instruction filename
 *     survives ANYWHERE in the doc tree, shell blocks included — those are
 *     functional (the model reads files by them), not cosmetic.
 *   - Every workflow's `gsd_run` resolver preamble is the Bob-only one.
 *   - `.planning/config.json` is seeded with `resolve_model_ids: "omit"` (the
 *     config half: no dispatch carries a model, no flow asks for one) and the
 *     conservative `context_window` floor.
 *
 * Hermetic: drives a REAL local and global install into mkdtemp targets. The
 * forbidden-token table is decoded from base64 so this file never contains a
 * bare brand literal (the same discipline as test/backend-neutrality.test.cjs).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { repoRoot } = require('./_helpers/vendor.cjs');
const {
  OTHER_RUNTIME_NAMES,
  MODEL_VENDOR_NAMES,
  MODEL_PRODUCT_NAMES,
  MODEL_TIER_REPLACEMENTS,
  bobResolverPreamble,
} = require(path.join(repoRoot, 'src', 'bob-adapter.cjs'));
const { BOB_OWNED_CONFIG } = require(path.join(repoRoot, 'src', 'installer', 'config-merge.cjs'));

const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');
const b64 = (s) => Buffer.from(s, 'base64').toString('utf8');

// Every brand token the invariant forbids, as WORDS (word-boundary, case-blind):
// the adapter's own tables (other runtimes, vendors, model products) plus the
// three model-tier tokens (decoded from the adapter's replacement map keys) and
// a few extra spellings the tables express as compounds.
const FORBIDDEN_WORDS = [
  ...OTHER_RUNTIME_NAMES.flatMap((n) => n.split(' ')),
  ...MODEL_VENDOR_NAMES,
  ...MODEL_PRODUCT_NAMES.map((n) => n.split('.')[0]),
  ...Object.keys(MODEL_TIER_REPLACEMENTS),
  b64('bWlzdHJhbA=='),
  b64('b2xsYW1h'),
].map((w) => w.toLowerCase()).filter((w, i, a) => w !== 'code' && w !== 'app' && a.indexOf(w) === i);
const FORBIDDEN_RE = new RegExp(`\\b(?:${FORBIDDEN_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

// Upstream host paths / files that must not survive anywhere (functional).
const UPSTREAM_HOME = b64('LmNsYXVkZQ=='); // the upstream dot-home dirname
const UPSTREAM_PATH_RE = new RegExp(
  `(?:\\$HOME|~)/${UPSTREAM_HOME.replace('.', '\\.')}\\b|\\b${b64('Q0xBVURFX0NPTkZJR19ESVI=')}\\b|\\b${b64('Q0xBVURFLm1k').replace('.', '\\.')}\\b`,
);

const RUNTIME_DOC_DIRS = ['workflows', 'references', 'templates', 'contexts'];
const SHELL_FENCE_RE = /^[ \t]*(?:```|~~~)[ \t]*(?:bash|sh|shell|zsh|console)\b/;

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

function walk(dir, ext, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, acc);
    else if (ext.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

/** Split a markdown doc into [{shell:boolean, text}] segments on fenced blocks. */
function segments(md) {
  const parts = md.split(/(^[ \t]*(?:```|~~~)[^\n]*\n[\s\S]*?^[ \t]*(?:```|~~~)[ \t]*$)/m);
  return parts.map((text, i) => ({ text, shell: i % 2 === 1 && SHELL_FENCE_RE.test(text) }));
}

/** Install once per scope; return the target dir and the workspace. */
function install(scope) {
  const ws = scratch(`ws-${scope}`);
  fs.mkdirSync(path.join(ws, '.planning'));
  fs.writeFileSync(path.join(ws, '.planning', 'config.json'), '{}\n');
  execFileSync('git', ['init', '-q'], { cwd: ws });
  let target;
  if (scope === 'local') {
    execFileSync(process.execPath, [ENTRY, '--bob', '--local'], { cwd: ws, stdio: 'pipe' });
    target = path.join(ws, '.bob');
  } else {
    target = path.join(scratch('home'), '.bob');
    execFileSync(process.execPath, [ENTRY, '--bob', '--global', '-c', target], { cwd: ws, stdio: 'pipe' });
  }
  return { ws, target };
}

const local = install('local');
const global = install('global');

test('NEUTRAL-04 self-check: the forbidden-word table is non-empty and built from the adapter tables', () => {
  assert.ok(FORBIDDEN_WORDS.length >= 20, `expected a wide forbidden set, got ${FORBIDDEN_WORDS.length}`);
  assert.ok(FORBIDDEN_WORDS.every((w) => /^[a-z0-9]+$/.test(w)), 'every forbidden word is a plain lowercase word');
});

for (const [scope, inst] of [['local', local], ['global', global]]) {
  test(`NEUTRAL-04 (${scope}): emitted commands, skills, mode and roster carry ZERO agent/vendor/model names`, () => {
    const files = [
      ...walk(path.join(inst.target, 'commands'), ['.md']),
      ...walk(path.join(inst.target, 'skills'), ['.md']),
      path.join(inst.target, 'SUPPORT-ROSTER.md'),
      path.join(inst.target, scope === 'global' ? path.join('settings', 'custom_modes.yaml') : 'custom_modes.yaml'),
    ];
    const hits = [];
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      text.split('\n').forEach((line, i) => {
        const m = line.match(FORBIDDEN_RE);
        if (m) hits.push(`${path.relative(inst.target, f)}:${i + 1}: ${m.join(',')}`);
      });
    }
    assert.deepEqual(hits, [], `agent/vendor/model names survive in emitted artifacts:\n${hits.join('\n')}`);
  });

  test(`NEUTRAL-04 (${scope}): the runtime doc tree carries ZERO names in prose and non-shell fences`, () => {
    const hits = [];
    let shellResidual = 0;
    for (const dir of RUNTIME_DOC_DIRS) {
      const abs = path.join(inst.target, 'gsd-core', dir);
      if (!fs.existsSync(abs)) continue;
      for (const f of walk(abs, ['.md'])) {
        const rel = path.relative(inst.target, f);
        for (const seg of segments(fs.readFileSync(f, 'utf8'))) {
          const m = seg.text.match(FORBIDDEN_RE);
          if (!m) continue;
          if (seg.shell) shellResidual += m.length;
          else hits.push(`${rel}: ${m.slice(0, 5).join(',')}`);
        }
      }
    }
    assert.deepEqual(hits, [], `names survive outside shell fences:\n${hits.join('\n')}`);
    // Bare shell identifiers are the ONLY allowed residual, and they are bounded:
    // upstream ships ~130 today. A jump means the transform stopped running.
    assert.ok(shellResidual <= 200, `shell-fence residual grew to ${shellResidual} (expected <= 200)`);
  });

  test(`NEUTRAL-04 (${scope}): no upstream config-home path or instruction filename survives in the doc tree (shell included)`, () => {
    const hits = [];
    for (const dir of RUNTIME_DOC_DIRS) {
      const abs = path.join(inst.target, 'gsd-core', dir);
      if (!fs.existsSync(abs)) continue;
      for (const f of walk(abs, ['.md', '.sh'])) {
        fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
          if (UPSTREAM_PATH_RE.test(line)) hits.push(`${path.relative(inst.target, f)}:${i + 1}`);
        });
      }
    }
    assert.deepEqual(hits, [], `upstream host paths survive:\n${hits.slice(0, 20).join('\n')}`);
  });

  test(`NEUTRAL-04 (${scope}): every resolver preamble is the Bob-only one, pointing at this install`, () => {
    const gsdCoreDir = scope === 'global' ? path.join(inst.target, 'gsd-core') : path.join('.bob', 'gsd-core');
    const expected = bobResolverPreamble(gsdCoreDir);
    const files = walk(path.join(inst.target, 'gsd-core', 'workflows'), ['.md', '.sh']);
    let seen = 0;
    for (const f of files) {
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!line.includes('_GSD_SHIM_NAME="gsd-tools.cjs"')) continue;
        seen++;
        assert.equal(line.trim(), expected, `${path.relative(inst.target, f)} carries a non-Bob resolver preamble`);
      }
    }
    assert.ok(seen >= 100, `expected the preamble in >=100 workflow files, saw ${seen}`);
  });

  test(`NEUTRAL-04 (${scope}): doc-tree references to gsd-core resolve to THIS install's gsd-core`, () => {
    const wf = fs.readFileSync(path.join(inst.target, 'gsd-core', 'workflows', 'plan-phase.md'), 'utf8');
    const want = scope === 'global' ? `${path.join(inst.target, 'gsd-core')}/` : '.bob/gsd-core/';
    assert.ok(wf.includes(want), `plan-phase.md must reference ${want}`);
  });
}

test('NEUTRAL-04: the seeded config omits model ids and pins the conservative context-window floor', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(local.ws, '.planning', 'config.json'), 'utf8'));
  assert.equal(cfg.resolve_model_ids, 'omit');
  assert.equal(BOB_OWNED_CONFIG.resolve_model_ids, 'omit');
  assert.equal(cfg.context_window, 200000, "Bob documents 200,000–270,000 tokens; the adapter seeds the floor");
  assert.equal(cfg.workflow.text_mode, true);
  assert.equal(cfg.workflow.use_worktrees, false);
});

test('NEUTRAL-04: the adapter itself carries no bare brand literal (tables are base64-decoded)', () => {
  const src = fs.readFileSync(path.join(repoRoot, 'src', 'bob-adapter.cjs'), 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const m = code.match(FORBIDDEN_RE);
  assert.equal(m, null, `bob-adapter.cjs contains a bare brand literal: ${m && m.join(',')}`);
});
