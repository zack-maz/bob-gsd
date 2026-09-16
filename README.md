# gsd-bob

**GSD for IBM Bob** — an installable adapter that makes [open-gsd](https://github.com/open-gsd/gsd-core),
the spec-driven "Getting Stuff Done" planning framework, run natively inside
[IBM Bob](https://bob.ibm.com). Install with one command and run the full GSD planning loop
(new-project → plan-phase → execute-phase → verify) as Bob-native slash commands and Agent
Skills, producing the same `.planning/` artifacts GSD produces in Claude Code — regardless
of which model backend Bob routes to.

## Requirements

| Requirement | Value | Why |
|---|---|---|
| **IBM Bob** | **2.0.x** (Bob Shell 2.0.0–2.0.4, Bob IDE 2.x) | Bob 2.0 is the first generation with Agent Skills and subagents. Both the Shell and the IDE read the same surfaces gsd-bob writes: `.bob/commands/`, `.bob/skills/`, `~/.bob/settings/custom_modes.yaml` (global) / `.bob/custom_modes.yaml` (project). |
| **Node.js** | `>=22.15.0` (the `engines` floor) | The floor for running the **installer** and the vendored `gsd-core/bin` shim. Bob Shell 2.x itself requires Node **24** or later, so a Bob 2.x machine already satisfies this. |

**Bob Shell 1.0.x is not supported.** 1.0.x has no skills (*"Skills were not available in Bob
Shell 1.0.x"* — Bob Shell 2.0.0 changelog; the shipped 1.0.4 bundle contains no `SKILL.md`
handling at all) and no subagent tool, so of the artifacts gsd-bob emits only `.bob/commands/`
and the `gsd` custom mode would load — the Agent Skills would sit inert on disk and every
subagent-dispatching workflow would have nothing to dispatch to. Bob Shell 2.0.0 requires a
fresh install anyway (there is no automated 1.0.x upgrade path), so gsd-bob targets 2.0.x only:
no version probe, no compatibility matrix. Sources:
[`.planning/research/260916-bob-shell-docs.md`](./.planning/research/260916-bob-shell-docs.md),
[`.planning/research/260916-bob-1.0.4-bundle.md`](./.planning/research/260916-bob-1.0.4-bundle.md).

## Install

```bash
npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local
```

This stages GSD as Bob `.bob/commands/*.md` slash commands and `.bob/skills/<name>/SKILL.md`
Agent Skills.

## Scope

Pick where the artifacts are written with `--local` or `--global`:

| Flag | Target | Use when |
|------|--------|----------|
| `--local` / `-l` | `<project>/.bob/` | Per-project install, next to the project's `.planning/`. |
| `--global` / `-g` | `~/.bob/` | Available to every Bob session on the machine. |

The installer **prints the resolved absolute target path before writing** (e.g.
`Installing into: /…/.bob`), so you always know where artifacts land. A global install in a
non-project directory skips the per-project `.planning/config.json` write and emits a
known-limitation note (the seeded keys below are a per-project guarantee written into
`<project>/.planning/config.json`, not enforced at the runtime/descriptor level).

**Global installs emit absolute paths.** Every path reference inside a globally-installed
artifact — and the `gsd` custom mode's shell-out instruction — names the **absolute** install
target (`<target>/gsd-core/bin/gsd-tools.cjs`), not a workspace-relative `.bob/gsd-core/…`.
A local install keeps the workspace-relative form. Through v0.2.3 global installs emitted
workspace-relative references that do not exist under `~/.bob`; that is fixed.

Two things to expect on a **global** install under Bob 2.0.1+:

- **An approval prompt.** Bob 2.0.1 stopped auto-approving tool calls that write into Bob's
  home directory (*"Auto-approve blocked for Bob home directory writes"*), and writes to
  `~/.bob/*/settings/` always require explicit one-time approval. If you run the installer
  from inside a Bob session, approve the write; running it in a plain terminal is unaffected.
- **The global mode lives under `settings/`.** Bob resolves the global modes file as
  `~/.bob/settings/custom_modes.yaml` and the project one as `<workspace>/.bob/custom_modes.yaml`
  — the two scopes are asymmetric, and gsd-bob writes each at the path Bob actually reads.

**Trusted folders.** When Bob's folder-trust feature is enabled, project-scoped commands,
skills and modes are **not loaded in an untrusted folder** (nor are `.bob/settings.json`,
`AGENTS.md`, project rules or project MCP servers). A `--local` install in such a folder stages
correctly but Bob ignores it until the folder is trusted — trust it interactively, or pass
`bob run --trust` / `bob --trust` for a non-interactive session.

## Modes: update and clean

There are **no dedicated update or clean flags** — gsd-bob mirrors gsd-core's convention exactly:

- **Update:** re-run the same install command. It re-stages artifacts idempotently,
  preserving your user-authored commands, rules, and any non-`gsd-*` custom modes (the `gsd`
  slug is replaced in place, never duplicated).
- **Clean:** run `--uninstall` and then install again:

  ```bash
  npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local --uninstall
  npx -y --package=@zack-maz/gsd-bob@latest -- gsd-bob --bob --local
  ```

Uninstall is manifest-driven: it un-merges merged slices (the `gsd` custom mode, inline
config JSON) and hash-match deletes tracked file entries. It **never deletes `.planning/`**.

Use `--dry-run` on any install to print the full staging plan without writing anything.

## What the installer seeds into `.planning/config.json`

The install merges exactly **three** adapter-owned keys into the workspace-root
`.planning/config.json` (and removes exactly those three on `--uninstall`). Each is a Bob
runtime constant, not a user preference — the authority is `BOB_OWNED_CONFIG` in
`src/installer/config-merge.cjs`:

| Key | Value | Why |
|---|---|---|
| `workflow.text_mode` | `true` | Bob has no structured-choice prompt primitive, so interactive GSD flows must render as numbered text choices. |
| `workflow.use_worktrees` | `false` | Bob has no **git-worktree** primitive (its `spawn_subagent` gives context isolation, not a worktree). Since gsd-core 1.14.0 the `execute-phase` / `quick-batch` isolation gate exits `FATAL: runtime declares no executor-isolation primitive` on a runtime whose descriptor sets `dispatch.isolation: "none"` **unless** this key is `false`. Executors then run in the main checkout — exactly how they ran under 1.6.1; the gate is new, the behaviour is not. |
| `context_window` | `270000` | Bob's real runtime window. gsd-core keys its read-depth / advisory scaling on this top-level integer and defaults to a conservative `200000` when it is absent. |

Your own keys are never touched, and an unparseable `config.json` is left exactly as-is with a
note rather than clobbered.

## Supported skills

The 31 skills below are the supported (emitted) set, sourced from
[`SUPPORT-ROSTER.md`](./SUPPORT-ROSTER.md) — the roster is **generated** from the bob-adapter
gate (`node scripts/generate-support-roster.cjs`), never hand-maintained, so this list cannot
silently drift from what actually installs. Each emits both a Bob slash command and an Agent
Skill. They are grouped below by cluster; the full one-line reference for each lives in
[`COMMANDS.md`](./COMMANDS.md), and the drift between this list, `COMMANDS.md`, and the roster
is guarded by `test/docs-conformance.test.cjs`.

### Core loop

The primary `new-project` → `discuss-phase` → `plan-phase` → `execute-phase` → `verify-work`
spine, plus the situational `progress` and `next` entry points.

- `gsd-new-project`
- `gsd-discuss-phase`
- `gsd-plan-phase`
- `gsd-execute-phase`
- `gsd-verify-work`
- `gsd-progress`
- `gsd-next`

### Quality gates

Review, debug, audit, and security passes run against completed work.

- `gsd-code-review`
- `gsd-debug`
- `gsd-audit-fix`
- `gsd-audit-uat`
- `gsd-secure-phase`

### Milestone lifecycle

Opening, shipping, closing, and summarizing a milestone.

- `gsd-new-milestone`
- `gsd-complete-milestone`
- `gsd-milestone-summary`
- `gsd-ship`

### Planning aids

Alternate planning entry points and quick-turnaround task runners.

- `gsd-spec-phase`
- `gsd-mvp-phase`
- `gsd-ui-phase`
- `gsd-explore`
- `gsd-quick`
- `gsd-quick-batch`
- `gsd-fast`

### Context & maintenance

Codebase intelligence, onboarding, documentation, session continuity, and health/stats.

- `gsd-map-codebase`
- `gsd-onboard`
- `gsd-docs-update`
- `gsd-extract-learnings`
- `gsd-health`
- `gsd-stats`
- `gsd-pause-work`
- `gsd-resume-work`

This covers the GSD **core loop** (`new-project` → `discuss-phase` → `plan-phase` →
`execute-phase` → `verify-work`, plus `progress` and the state-detecting `next`), the **quality
gates** (`code-review`, `debug`, `audit-fix`, `audit-uat`, `secure-phase`), the **milestone
lifecycle**, alternate **planning aids** (including the batched `quick-batch`), and the
**context & maintenance** commands (including `onboard` for an existing codebase) — the
daily-driver GSD surface.

## Flagged gaps (parity-first)

Skills that depend on a primitive Bob does not provide are **omitted from the loadable set
and recorded loud** in `SUPPORT-ROSTER.md` as `unsupported on Bob: <reason>` lines — never
silently broken.

**Current gaps: none.** All 31 curated commands emit.

The one long-standing flag was lifted in Phase 12, after re-verification against a live
Bob Shell 2.0.1 install. Bob has isolated subagents (`spawn_subagent`, an isolated context
window, a `subagent` tool group) **and** parallel fan-out — its own `spawn_subagent` tool
description states that multiple calls in one turn run in parallel. Fan-out was previously
flagged only because Bob's 1.0.x docs were silent on it. Nested spawning (a subagent
spawning another) is still forbidden by Bob, and no GSD workflow requires it.

What Bob still does **not** have is a git-worktree isolation primitive, which is why the
runtime descriptor declares `dispatch.isolation: "none"` and the installer seeds
`workflow.use_worktrees: false` (see [what the installer seeds](#what-the-installer-seeds-into-planningconfigjson)).
Interactive prompts likewise still degrade to numbered `text_mode` choices rather than a
structured-choice payload — that remains a conservative default, not a re-verified one.

## Targeted gsd-core version

gsd-bob vendors and targets **gsd-core `1.14.0`** (from `gsd-core/VERSION`). See
[`UPSTREAM.md`](./UPSTREAM.md) for the re-verified `file:line` inventory of what lifts upstream
as a mostly-mechanical move (one `capabilities/bob/capability.json` descriptor plus the
regenerated registry, two aliases, a converter pair, two allowlist entries, the resolver
reference, and the single `src/bob-adapter.cjs` adapter module), and for why expressing `bob`
as an **external/pluggable** descriptor is a verified NO-GO under 1.14.0.

gsd-bob keeps its own `engines.node` at `>=22.15.0` even though upstream gsd-core declares
`>=24.0.0`. The only Node-24 API the vendored payload reaches for (`RegExp.escape`) is
feature-detected with an in-file fallback, and the vendored `gsd-core/bin` was executed on a
downloaded Node 22.15.0 as part of the re-vendor. `>=22.15.0` is the union of that and Bob's
own documented floor. This is an untested configuration *upstream* (the Node 22 CI lane is
retired there), so the check is a standing step in `MAINTAINING.md` for every bump.

## Verification posture (test-deferred)

There is still **no live Bob 2.x on the development device** — the machine currently has Bob
Shell **1.0.4**, the unsupported generation (the Bob Shell 2.0.1 install that Phase 12 verified
against is gone). All dev-time verification is therefore **doc-conformance, golden-diff, and
Claude-runtime equivalence** — never an on-device Bob 2.x run. The standing suites prove the
contract holds without a live Bob:

- `test/backend-neutrality.test.cjs` — zero model-backend literals in the bob runtime entry
  and adapter.
- `test/descriptor.test.cjs` / `test/bob2-capability.test.cjs` — the `"bob"` descriptor's shape
  and the Bob 2.0 surface facts, pinned so a drift fails loud.
- `test/quality-gate-equivalence.test.cjs` / `test/quality-gate-contract.test.cjs` — the
  four quality gates convert byte-identically and emit through the real installer.
- `test/debug-state-persistence.test.cjs` — debug start→reset→continue→restore round-trip.
- `test/core-loop-equivalence.test.cjs` / `test/core-loop-contract.test.cjs` — the core
  loop's golden + structural contract.

The on-device run stays **deferred to a single unattended acceptance pass on real Bob 2.x
hardware**. Every device-runnable step lives in
[`.planning/ACCEPTANCE-CHECKLIST.md`](./.planning/ACCEPTANCE-CHECKLIST.md) (`AC-01..AC-50`),
the on-device complement to these hermetic suites.

## Documentation

- [`COMMANDS.md`](./COMMANDS.md) — the generated per-command reference: a one-line description
  for each of the 31 emitted commands, sourced from source frontmatter.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how the Bob adapter maps open-gsd primitives onto
  Bob (converters, capability-map gate, backend-neutrality, `.planning/` interchange).
- [`MAINTAINING.md`](./MAINTAINING.md) — the maintainer runbook for bumping the vendored
  gsd-core payload to a new version.
- [`.planning/ACCEPTANCE-CHECKLIST.md`](./.planning/ACCEPTANCE-CHECKLIST.md) — the consolidated,
  device-runnable on-device acceptance pass.
- [`UPSTREAM.md`](./UPSTREAM.md) — the upstream-move inventory for a gsd-core maintainer.
- [`SUPPORT-ROSTER.md`](./SUPPORT-ROSTER.md) — the generated supported / unsupported skill roster.

## License

gsd-bob is released under the [MIT License](./LICENSE). The vendored `gsd-core/` payload and
the `commands/gsd/*.md` sources are a patched copy of [`@opengsd/gsd-core`](https://github.com/open-gsd/gsd-core),
also MIT-licensed (Copyright (c) 2026 Open GSD); its license and the notices for every other
redistributed component are reproduced in [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md),
which ships in the npm package.

gsd-bob is an independent, community-maintained adapter. It is not affiliated with, endorsed by,
or supported by IBM.

Source, issues and releases: [github.com/zack-maz/bob-gsd](https://github.com/zack-maz/bob-gsd) ·
npm: [`@zack-maz/gsd-bob`](https://www.npmjs.com/package/@zack-maz/gsd-bob).
