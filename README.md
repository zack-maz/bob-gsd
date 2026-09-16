# gsd-bob

[![npm version](https://img.shields.io/npm/v/%40zack-maz%2Fgsd-bob?label=npm%20%40zack-maz%2Fgsd-bob)](https://www.npmjs.com/package/@zack-maz/gsd-bob)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![IBM Bob 2.x](https://img.shields.io/badge/IBM%20Bob-2.0.x-0f62fe.svg)](https://bob.ibm.com)
[![gsd-core 1.14.0](https://img.shields.io/badge/gsd--core-1.14.0-6929c4.svg)](https://github.com/open-gsd/gsd-core)

**GSD for IBM Bob** — an installable adapter that makes [open-gsd](https://github.com/open-gsd/gsd-core),
the spec-driven "Getting Stuff Done" planning framework, run natively inside
[IBM Bob](https://bob.ibm.com). Install with one command and run the full GSD planning loop
(new-project → plan-phase → execute-phase → verify) as Bob-native slash commands and Agent
Skills, producing the same `.planning/` artifacts GSD produces on the reference runtime it was
authored for — regardless of which model backend Bob routes to.

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

## Bob limitations the installer encodes

The install merges exactly **four** adapter-owned keys into the workspace-root
`.planning/config.json` (and removes exactly those four on `--uninstall`). Each one encodes a
Bob **limitation or ownership boundary**, not a user preference — the authority is
`BOB_OWNED_CONFIG` in `src/installer/config-merge.cjs`:

| Key | Value | The Bob limitation it encodes |
|---|---|---|
| `workflow.text_mode` | `true` | Bob has no structured-choice prompt primitive, so interactive GSD flows must render as numbered text choices. |
| `workflow.use_worktrees` | `false` | Bob has no **git-worktree** primitive (its `spawn_subagent` gives context isolation, not a worktree). Since gsd-core 1.14.0 the `execute-phase` / `quick-batch` isolation gate exits `FATAL: runtime declares no executor-isolation primitive` on a runtime whose descriptor sets `dispatch.isolation: "none"` **unless** this key is `false`. Executors then run in the main checkout — exactly how they ran under 1.6.1; the gate is new, the behaviour is not. |
| `context_window` | `200000` | **The conservative floor of Bob's own documented window.** Bob's 2.0.0 release notes give the runtime window as *"200,000 to 270,000 tokens"* — which end applies depends on the backend Bob routes the session to, and Bob owns that routing, so the adapter cannot know it at install time. gsd-core keys its read-depth and advisory scaling on this top-level integer, so gsd-bob seeds the **floor**: a budget that is correct on every backend rather than one that overflows on the smaller ones. (v0.2.x–v0.3.0 seeded the 270k ceiling — the optimistic end of the same range.) The GSD loop shares one window in the common case, so this is the operative budget. |
| `resolve_model_ids` | `"omit"` | **Bob owns model routing.** gsd-core's own installer writes this for every non-reference runtime. With it, workflow dispatches carry **no model parameter** (a capability-tier alias would 404 on a host with no native tier names) and no flow asks the user to pick a model. This is the config half of the neutrality rule below. |

Your own keys are never touched, and an unparseable `config.json` is left exactly as-is with a
note rather than clobbered.

## What the model sees

Every markdown document the model reads under Bob — the converted `.bob/commands/` and
`.bob/skills/`, **and** the vendored `gsd-core/` doc tree (workflows, references, templates,
contexts) — is rewritten at **install (stage) time**, never left upstream-shaped on disk:

- **Host paths are re-pointed at this install.** The upstream reference runtime's config-home
  paths become this install's location, scope-aware: workspace-relative `.bob/gsd-core/…` for
  `--local`, the absolute target for `--global`. The upstream project-instruction filename
  becomes `AGENTS.md`. These are functional, not cosmetic — the workflows read sibling files by
  these paths.
- **One resolver preamble, Bob's.** Upstream ships a `gsd_run` resolver line that probes the
  config homes of 19 different runtimes. It is replaced wholesale with a Bob-only probe (this
  install → workspace `.bob` → `~/.bob` → `gsd_run` on `PATH`), keeping the
  package-identity check.
- **Notes for other hosts are dropped.** Upstream's own runtime-note filter is run with `bob`
  as the target, so guidance addressed to a different host never reaches the model.
- **Agent, vendor and model names are neutralized** in prose *and* in every non-shell fenced
  block (the json/xml/markdown examples the model reads as templates): the reference runtime's
  name becomes **Bob**, any other runtime becomes *"another runtime"*, vendors become *"the
  model vendor"*, and model products/tiers become capability-neutral phrases
  (*"a higher-capability model"*, *"a balanced model"*, *"a faster model"*).

**Shell-fence policy — the one deliberate residual.** Inside a *shell* fenced block only
comment lines and `echo`/`printf` message lines are neutralized. Bare identifiers are left
exactly as upstream wrote them: `case … in <runtime-id>)` arms, dead `$<RUNTIME>_*` env-var
probes, `--<runtime>` tokens inside a command line. Renaming those would either activate
another host's branch on Bob or leave a live arm under a misleading name. Roughly **130** such
identifiers remain across the vendored tree; the count is bounded by
`test/agent-neutrality.test.cjs`, so if the transform ever stops running the number jumps and
the suite fails loud.

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
`workflow.use_worktrees: false` (see [Bob limitations the installer encodes](#bob-limitations-the-installer-encodes)).
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
reference-runtime equivalence** — never an on-device Bob 2.x run. The standing suites prove the
contract holds without a live Bob:

- `test/backend-neutrality.test.cjs` — zero model-backend literals in the bob runtime entry
  and adapter.
- `test/agent-neutrality.test.cjs` — the neutrality invariant: zero agent/vendor/model names in
  the emitted commands, skills, mode and roster; zero in doc-tree prose and non-shell fences;
  the shell-fence residual bounded; no upstream host path surviving anywhere; every resolver
  preamble the Bob one; and the four seeded config keys pinned.
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
