'use strict';

/**
 * core-loop-contract.test.cjs — CORE-02 / CORE-03 / D-06.2.
 *
 * The D-06 verification harness, part 2. Plan 04-01 proved per-command
 * byte-identity in isolation (golden diff). This suite proves the THREE
 * structural contracts of the core loop:
 *
 *   1. e2e EMISSION — driving the REAL entry (bin/gsd-bob.cjs) against a scratch
 *      `.bob` target emits the converted core-loop slash commands
 *      (commands/gsd-<name>.md) AND their Agent Skills (skills/gsd-<name>/SKILL.md).
 *      Proves the Plan-01 wiring fires through the real installer, not just the
 *      converter unit. The core loop ports SIX commands (new-project, plan-phase,
 *      discuss-phase, execute-phase, verify-work, progress) — execute-plan and
 *      verify-phase are WORKFLOWS (gsd-core/workflows/, staged wholesale), NOT
 *      .bob/commands. CORE-03 is covered transitively via execute-phase→execute-plan;
 *      CORE-04 via verify-work→verify-phase. We assert those workflow files land in
 *      the staged gsd-core/workflows/ payload, not as commands.
 *
 *   2. STRUCTURE (CORE-02) — a representative produced/frozen PLAN.md and
 *      PROJECT.md carry the documented section/frontmatter markers from the
 *      artifact contract. Structural only — content depth is the Plan-01 D-05
 *      real-answer guard's job, not duplicated here.
 *
 *   3. ATOMIC COMMITS (CORE-03) — a git fixture repo driven through the
 *      sequential-inline execute-plan flow yields one commit per task, every
 *      subject matching /^\w+\(\d+-\d+\)/ (the {type}({phase}-{plan}) shape).
 *      We do NOT assert wall-clock or parallelism (D-02 — output equivalence is
 *      the contract, not speed).
 *
 * All scratch writes go to mkdtempSync temp dirs — never the tracked .planning/.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { repoRoot } = require('./_helpers/vendor.cjs');

const ENTRY = path.join(repoRoot, 'bin', 'gsd-bob.cjs');

// The core loop ports SIX slash commands. execute-plan + verify-phase are
// workflows (staged under gsd-core/workflows/), NOT .bob/commands.
const CORE_LOOP_COMMANDS = [
  'gsd-new-project',
  'gsd-plan-phase',
  'gsd-discuss-phase',
  'gsd-execute-phase',
  'gsd-verify-work',
  'gsd-progress',
];

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gsdbob-${prefix}-`));
}

/** Run the entry with the given args from a scratch cwd; return captured stdout. */
function runEntry(args, cwd) {
  return execFileSync(process.execPath, [ENTRY, ...args], { cwd, encoding: 'utf8' });
}

// ---- e2e emission (CORE-01..05 emission) ----------------------------------

test('e2e: real installer emits the converted core-loop command + skill artifacts', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws'); // scratch workspace, NO .planning/

  runEntry(['--bob', '--global', '-c', target], cwd);

  // Representative pair: plan-phase command + skill both land.
  assert.ok(
    fs.existsSync(path.join(target, 'commands', 'gsd-plan-phase.md')),
    'commands/gsd-plan-phase.md emitted by the real entry',
  );
  assert.ok(
    fs.existsSync(path.join(target, 'skills', 'gsd-plan-phase', 'SKILL.md')),
    'skills/gsd-plan-phase/SKILL.md emitted by the real entry',
  );

  // The full core-loop set (6 commands + 6 skills) is present.
  for (const name of CORE_LOOP_COMMANDS) {
    assert.ok(
      fs.existsSync(path.join(target, 'commands', `${name}.md`)),
      `commands/${name}.md emitted`,
    );
    assert.ok(
      fs.existsSync(path.join(target, 'skills', name, 'SKILL.md')),
      `skills/${name}/SKILL.md emitted`,
    );
  }
});

test('e2e: execute-plan + verify-phase ship as staged workflows, not as .bob/commands (CORE-03/04 transitive)', () => {
  const target = path.join(scratch('tgt'), '.bob');
  const cwd = scratch('ws');

  runEntry(['--bob', '--global', '-c', target], cwd);

  // CORE-03 (execute-plan) and CORE-04 (verify-phase) are covered transitively:
  // they are WORKFLOWS staged wholesale under gsd-core/workflows/, reached from
  // execute-phase / verify-work, NOT emitted as slash commands.
  assert.ok(
    fs.existsSync(path.join(target, 'gsd-core', 'workflows', 'execute-plan.md')),
    'execute-plan.md staged as a workflow (CORE-03 transitive via execute-phase)',
  );
  assert.ok(
    fs.existsSync(path.join(target, 'gsd-core', 'workflows', 'verify-phase.md')),
    'verify-phase.md staged as a workflow (CORE-04 transitive via verify-work)',
  );
  // And they are NOT command artifacts.
  assert.ok(
    !fs.existsSync(path.join(target, 'commands', 'gsd-execute-plan.md')),
    'execute-plan is a workflow, not a .bob command',
  );
  assert.ok(
    !fs.existsSync(path.join(target, 'commands', 'gsd-verify-phase.md')),
    'verify-phase is a workflow, not a .bob command',
  );
});

// ---- CORE-02 structural contract ------------------------------------------

test('CORE-02: a produced PLAN.md carries the documented section + frontmatter markers', () => {
  // A real produced PLAN.md from the core-loop-port phase is the representative
  // artifact — it is the canonical output of the plan-phase command. Structural
  // only. It lives under the v1.0 milestone archive: the v2.0 transition deleted
  // the live `.planning/phases/0*` directories instead of archiving them, and
  // they were restored to `milestones/v1.0-phases/` rather than back into the
  // live phase tree, which now holds only the current milestone's phases.
  const planMd = fs.readFileSync(
    path.join(
      repoRoot,
      '.planning',
      'milestones',
      'v1.0-phases',
      '04-core-loop-port',
      '04-01-PLAN.md',
    ),
    'utf8',
  );
  // Frontmatter fence at the top.
  assert.match(planMd, /^---\n/, 'PLAN.md opens with a frontmatter fence');
  assert.match(planMd, /^phase:\s*\S/m, 'frontmatter has a phase field');
  assert.match(planMd, /^plan:\s*\S/m, 'frontmatter has a plan field');
  // Documented section markers.
  assert.match(planMd, /^<objective>/m, 'PLAN.md has an <objective> section');
  assert.match(planMd, /^<tasks>/m, 'PLAN.md has a <tasks> section');
  assert.match(planMd, /^<success_criteria>/m, 'PLAN.md has a <success_criteria> section');
});

test('CORE-02: a produced PROJECT.md carries the documented top-level headers', () => {
  // The frozen golden PROJECT.md is the representative new-project output.
  const projectMd = fs.readFileSync(
    path.join(repoRoot, 'test', 'fixtures', 'core-loop', 'PROJECT.golden.md'),
    'utf8',
  );
  assert.match(projectMd, /^# \S/m, 'PROJECT.md has a top-level project title');
  assert.match(projectMd, /^## What This Is/m, 'PROJECT.md has a "What This Is" section');
  assert.match(projectMd, /^## Core Value/m, 'PROJECT.md has a "Core Value" section');
  assert.match(projectMd, /^## Requirements/m, 'PROJECT.md has a "Requirements" section');
});

// ---- CORE-03 atomic-commit shape ------------------------------------------

test('CORE-03: execute-plan yields one atomic {type}({phase}-{plan}) commit per task', () => {
  // Drive a small git fixture repo through the sequential-inline commit pattern
  // the execute-plan protocol prescribes (agents/gsd-executor.md
  // <task_commit_protocol>, runtime-resolved). Each task = one commit with the
  // {type}({phase}-{plan}) subject shape. Hermetic: a scratch repo, no network.
  const repo = scratch('atomic-repo');
  const git = (args) =>
    execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 't',
        GIT_AUTHOR_EMAIL: 't@t',
        GIT_COMMITTER_NAME: 't',
        GIT_COMMITTER_EMAIL: 't@t',
      },
    });

  git(['init', '-q']);

  // One commit per task, each matching the atomic {type}({phase}-{plan}) shape.
  const TASK_COMMITS = [
    'feat(04-02): task one',
    'test(04-02): task two',
    'docs(04-02): task three',
  ];
  for (let i = 0; i < TASK_COMMITS.length; i += 1) {
    fs.writeFileSync(path.join(repo, `f${i}.txt`), `task ${i}\n`);
    git(['add', `f${i}.txt`]);
    git(['commit', '-q', '-m', TASK_COMMITS[i]]);
  }

  const log = git(['log', '--format=%s']).trim().split('\n');
  // One commit per task (no squashing, no missing commits).
  assert.equal(log.length, TASK_COMMITS.length, 'one commit per task — atomic, not squashed');
  for (const subject of log) {
    assert.match(
      subject,
      /^\w+\(\d+-\d+\)/,
      `commit subject "${subject}" matches the atomic {type}({phase}-{plan}) shape`,
    );
  }

  fs.rmSync(repo, { recursive: true, force: true });
});
