# Upstreaming gsd-bob into gsd-core

> **Audience:** a `@opengsd/gsd-core` maintainer evaluating a PR that adds `bob` as a
> first-class runtime. This document is an **inventory, not a proposal of new architecture**:
> gsd-core is already built to absorb new runtimes. Most of the Bob support is a
> **move** — pure descriptor + alias data. The **only** hand-written logic is a small
> pair of Bob converters (a parameterized rewrite of gsd-core's per-runtime converter
> family) plus one isolated adapter module. Everything below already lives in this repo's
> vendored `gsd-core/` copy — lifting it upstream is mostly mechanical, with the converters
> being the one piece a maintainer would fold into gsd-core's converter family.

**Targeted gsd-core version:** `1.14.0` (from `gsd-core/VERSION`). Every `file:line` below was
re-grepped against that re-vendored source on 2026-09-16, not carried over from the 1.6.1
edition. `MAINTAINING.md` step 10 re-verifies them on every bump.

> **Why this one document still spells other runtimes' names.** gsd-bob's own human-facing docs
> are written host-neutral — Bob is the only agent they name. This document is the exception,
> and deliberately so: its whole job is to point a gsd-core maintainer at **gsd-core's own
> code**, whose symbol names, registry keys and filenames are what they are. Those literals
> appear only inside code spans in the inventory tables below (and in `MAINTAINING.md`'s anchor
> table, which greps upstream source byte-for-byte). Nowhere else.

## The contribution shape under 1.14.0: one `capability.json`

Since ADR-1239, gsd-core's registry is **generated**:
`scripts/gen-capability-registry.cjs` reads `capabilities/<id>/capability.json`, and for
`role === 'runtime'` copies the capability **verbatim** into `runtimes[capId]` before emitting
`const runtimes = ` + `JSON.stringify(...)`. Confirmed by diffing
another runtime's `capabilities/<id>/capability.json` against its emitted block: identical.

So the descriptor half of the PR is **one new file** — `capabilities/bob/capability.json`,
byte-for-byte the registry entry inventoried below — plus the regenerated
`gsd-core/bin/lib/capability-registry.cjs`. That is materially cleaner than the 1.6.1-era story
this document used to tell, where the entry was described as a registry hand-edit.

## The external/pluggable descriptor path: verified NO-GO

gsd-bob asked (DESC-01) whether `bob` could live **outside** the generated registry, as an
installed overlay, retiring the vendored hand-edit. The answer, verified against 1.14.0 source,
is **no**.

The overlay mechanism exists and would load: `gsd-core/bin/lib/capability-loader.cjs`
(`loadRegistry({ includeInstalled: true })`) reads
`${GSD_HOME || ~}/.gsd/capabilities/<id>/capability.json` and
`<projectRoot>/.gsd/capabilities/<id>/capability.json`, applies the reserved-id refusal
(a prefix denylist covering `gsd-`, `gsd-core-` and the upstream vendor prefix), full
conformance validation, `engines.gsd` satisfaction,
first-party-wins collision resolution, and the project-scope consent store keyed on
`(realpath(projectRoot), id, bundleContentHash)`; ADR-1239 Phase C-2's configHome trust gate
(`external-descriptor-trust.cjs` `assertDescriptorConfined`) passes trivially for
`destSubpath` values of `"skills"` / `"commands"`. It then calls the shipped generator's
`buildRegistry` over the merged map, so `loadRegistry({includeInstalled:true}).runtimes.bob`
**would** exist.

**But nothing that resolves a runtime reads the composed registry.** Every one of
`runtime-homes.cjs` (`getRegistry()` → `isRegisteredRuntimeId`, `getGlobalConfigDir`),
`runtime-artifact-layout.cjs`, `runtime-config-adapter-registry.cjs` (top-level destructure),
`runtime-name-policy.cjs`, `install-profiles.cjs`, `install-engine.cjs`, `install-scope.cjs`,
`runtime-slash.cjs`, `runtime-hooks-surface.cjs` and `surface.cjs` `require`s the **frozen**
`capability-registry.cjs` directly. `loadRegistry` has zero references to `runtimes` outside a
comment — the overlay path serves *feature* and *reviewer* capabilities, not runtime descriptors.

**Consequence for this PR:** the `bob` descriptor must be a first-party
`capabilities/bob/capability.json` in the gsd-core tree; gsd-bob keeps hand-patching the
generated registry until that lands. Full evidence, with line numbers:
[`.planning/research/260916-gsd-core-1.14.0-delta.md`](./.planning/research/260916-gsd-core-1.14.0-delta.md)
§2.6. (A separate, smaller PR routing `runtime-homes` / `runtime-artifact-layout` through
`loadRegistry` would change this verdict, and is worth proposing on its own merits.)

## Mostly a move, with two small converters

gsd-core's runtime architecture is data-driven. A runtime is defined by a **registry
entry** (a descriptor) and **aliases**; config-home resolution is handled by a **generic
`dot-home` resolver**. Adding Bob therefore required:

- **One new runtime capability** (`"bob"`) describing Bob's surface: `.bob/skills`,
  `.bob/commands`, `slash-hyphen` command style, a `dot-home` `.bob` config home with an
  **empty `env` list** (Bob honours no config-home relocation variable — verified against the
  shipped bundle; the field must stay present because the `dot-home` branch iterates it
  unconditionally), plus the `localConfigDir` and `hostIntegration` bodies 1.14.0 requires.
- **Two new aliases** — the CLI/flag alias in `runtime-aliases.manifest.json`
  (`"bob": ["bob", "bob-cli"]`) and the name-policy `FALLBACK_ALIASES` entry in
  `runtime-name-policy.cjs` (`bob: ['bob', 'bob-cli']`). Both are pure data.
- **A small pair of Bob converters** — `convertClaudeCommandToBobSkill` and
  `convertClaudeCommandToBobCommand` (plus their shared `convertClaudeToBobContent`). These are
  **not stock upstream**: they are a ~105-line local hand-edit vendored into
  `runtime-artifact-conversion.cjs` (marked in-file `gsd-bob HAND-EDIT to this GENERATED file`).
  They are a **parameterized rewrite** of the same shape as gsd-core's existing
  `convertClaudeCommandTo<Runtime>{Skill,Command}` family (reusing its helpers — `yamlQuote`,
  `extractFrontmatterAndBody`, `extractFrontmatterField`), reducing skill frontmatter to Bob's
  `name` + `description` and command frontmatter to `description` + `argument-hint`. Both
  convert the whole document *before* slicing frontmatter, so a description that names a sibling
  command in the legacy colon dialect is emitted in the routable hyphen form too. A maintainer
  would fold these into gsd-core's per-runtime converter family rather than lift them verbatim.
- **Two allowlist entries** — `VALID_CONVERTER_NAMES` in `capability-validator.cjs` is a
  **closed** set since 1.14.0, enforced on every registry-driven staging path
  (`capability-validator.cjs:1247`). A descriptor that names a converter absent from it is
  rejected, so the converter pair is not complete without its two allowlist lines.
- **One line in the `gsd_run` resolver reference** — the shim-resolver preamble
  (`references/gsd-run-resolver.md`, inlined into every workflow bash block) probes 19 runtime
  homes, and none of them was `.bob`. A `<repo>/.bob/gsd-core` or `~/.bob/gsd-core` install is
  therefore unreachable from workflow bash unless `gsd_run` is on `PATH`. Adding the two `.bob`
  probes is a one-line change to the canonical preamble, which the doc tree inherits.
- **No new config-home resolver** — Bob's `dot-home` descriptor is resolved by the generic
  `dot-home` case already in `runtime-homes.cjs`; the `gsd-tools.cjs` shim resolves the
  `.bob` home generically with **no Bob-specific branch** (grep-confirmed: zero `bob`
  references in the shim).

The **net-new substance** is therefore the two vendored converters plus one isolated
adapter module, `src/bob-adapter.cjs` (the support-roster gate, the neutralization pass,
and the idempotent `custom_modes.yaml` merge). Everything else — the capability entry, both
aliases, the allowlist entries, the resolver line — is data.

## Backend-neutrality guarantee (RUNTIME-04)

The `"bob"` registry entry and `src/bob-adapter.cjs` contain **zero model-backend brand
literals** — no agent, vendor or model-family name of any kind. Bob owns model routing; gsd-bob is
backend-agnostic, and the descriptor says so structurally via
`hostIntegration.modelMode: "passive"`. This is enforced by `test/backend-neutrality.test.cjs`,
which brace-walks the `"bob"` block out of `capability-registry.cjs` and scans
`bob-adapter.cjs` against a programmatically-built forbidden-token set (stripping comment lines
and the universal `convert…CommandTo<Runtime>` converter-name prefix, which is a
source-format token, not a backend reference).

```
$ node --test test/backend-neutrality.test.cjs
✔ RUNTIME-04: the bob registry entry contains no model-backend brand literal
✔ RUNTIME-04: the bob adapter module (when present) contains no brand literal
✔ RUNTIME-04 self-check: the forbidden-token set is non-empty and built programmatically
```

Separately, the **emitted** `.bob/` artifact set is held at zero model literals by
`test/model-neutrality.test.cjs` (NEUTRAL-03), which stages the full real emission and fails
with every `file:line:token`.

### Not part of this contribution: the stage-time Bob-ification pass

gsd-bob additionally rewrites **every markdown the model reads** at install time — host paths
re-pointed at the install, the multi-runtime `gsd_run` resolver preamble replaced by a Bob-only
one, and agent/vendor/model names in prose and non-shell fences neutralized (see
`ARCHITECTURE.md` Axis 3, `bobifyRuntimeDoc` in `src/bob-adapter.cjs`, enforced by
`test/agent-neutrality.test.cjs`). That pass is **gsd-bob-only and explicitly NOT part of the
upstream move.** Upstream's doc tree is authored for its own reference runtime and legitimately
names it; the pass exists because gsd-bob redistributes that tree to a *different* host. A
maintainer merging `bob` upstream inherits none of it — upstream already has
`filterRuntimeNotesForTarget` for the runtime-conditional half, and the rest is a distribution
concern of this adapter. It is listed here only so a reviewer who diffs a gsd-bob install
against the pristine payload is not surprised by the rewrites.

## The 9-artifact upstream-move inventory

All pointers **re-verified against the re-vendored 1.14.0 source**. The `"bob"` entry lives in
the active runtime object of `capability-registry.cjs` (inside `const runtimes`, immediately
before the reference runtime's entry).

| # | Artifact | File:line | Role in the move | Net-new? |
|---|----------|-----------|------------------|----------|
| 1 | `"bob"` runtime capability | `gsd-core/bin/lib/capability-registry.cjs` **L5849–5939** | The descriptor: `configHome` `dot-home` `.bob` with `env: []` (**L5861**), `localConfigDir` (**L5866**), `artifactLayout` global+local naming the 2 converters (**L5868–5905**), `triggerPrecedence` (**L5906**), `commandStyle: slash-hyphen` (**L5910**), `hostIntegration` incl. `dispatch.isolation: "none"` (**L5918–5936**) | **YES** (data only — upstream as `capabilities/bob/capability.json`) |
| 2 | Command converter | `convertClaudeCommandToBobCommand` — named in registry **L5884 / L5902**; impl in `gsd-core/bin/lib/runtime-artifact-conversion.cjs` **L3666** (exported **L3700**) | upstream source command → `.bob/commands/gsd-<x>.md`, frontmatter reduced to `description` + `argument-hint` | **YES** — vendored hand-edit (banner **L3578**), a parameterized rewrite of gsd-core's converter family |
| 3 | Skill converter | `convertClaudeCommandToBobSkill` — named in registry **L5876 / L5894**; impl in `runtime-artifact-conversion.cjs` **L3639** (exported **L3699**) | upstream source command → `.bob/skills/gsd-<x>/SKILL.md`, frontmatter reduced to `name` + `description` | **YES** — same vendored block |
| 3b | Shared content pass | `convertClaudeToBobContent` — impl **L3602** (exported **L3698**) | upstream dot-home → `.bob` path rewrite + colon→hyphen command dialect, scope-aware via `isGlobal` | **YES** — same vendored block |
| 4 | Runtime alias (manifest) | `gsd-core/bin/shared/runtime-aliases.manifest.json` **L79–82** (`"bob": ["bob", "bob-cli"]`) | CLI flag/alias routing for `--bob` | **YES** (data only) |
| 5 | Runtime alias (name-policy) | `gsd-core/bin/lib/runtime-name-policy.cjs` **L46** (`bob: ['bob', 'bob-cli']` in `FALLBACK_ALIASES`) | Name-policy fallback so `--bob` / `bob-cli` normalize to the `bob` runtime | **YES** (data only) |
| 6 | Converter allowlist entries | `gsd-core/bin/lib/capability-validator.cjs` **L849–850** (`'convertClaudeCommandToBobSkill'`, `'convertClaudeCommandToBobCommand'` in `VALID_CONVERTER_NAMES`, **L844**) | Without these the closed allowlist (enforced at **L1247**) rejects the converters the descriptor names | **YES** (data only) — new in 1.14.0 |
| 7 | `gsd_run` resolver probes | `gsd-core/references/gsd-run-resolver.md` **L7** — `"${_GSD_RUNTIME_ROOT}/.bob/gsd-core/bin/${_GSD_SHIM_NAME}"` in the project probe and `"$HOME/.bob/gsd-core/bin/${_GSD_SHIM_NAME}"` in the global probe | Makes a `.bob` install reachable from every workflow bash block; the preamble is inlined into ~114 workflow files | **YES** (one line in the canonical preamble) |
| 8 | Per-install runtime marker | `gsd-core/.gsd-runtime` (contents: `bob`) | gsd-core resolves the active runtime as `GSD_RUNTIME` > `config.runtime` > this marker > the reference runtime. Upstream's `bin/install.js` already writes it for every install; gsd-bob ships it in the payload because its installer copies the tree wholesale. **Not an upstream code change** — listed because a maintainer reviewing a `bob` install must know the marker is how `dispatch-*` queries resolve `bob` | No — existing upstream mechanism |
| 9 | configHome / shim resolution | `gsd-core/bin/lib/runtime-homes.cjs` generic `dot-home` case in `resolveConfigHomeFromDescriptor` **L166–174** (+ the `gsd-tools.cjs` shim, which resolves generically — **no bob-specific branch**, grep-confirmed 0 refs) | Resolves the `bob` home so `gsd_run query` works under Bob | No — generic resolver already handles `dot-home` descriptors |

**Plus the single net-new substance module:**

| Module | File | Role |
|--------|------|------|
| Bob adapter | `src/bob-adapter.cjs` | The gate (`gateArtifact` **L448**) + support-roster builder (`buildSupportRoster` **L479**) + neutralization pass (`neutralizeModelReferences` **L104** / `scanModelLiterals` **L133**, plus the gsd-bob-only `bobifyRuntimeDoc` family — see "Not part of this contribution" above) + idempotent `custom_modes.yaml` merge (`mergeCustomModes` **L298** / `unmergeCustomModes` **L354**) + the scope-asymmetric modes path (`modesRelPathForScope` **L217**). The one isolated Bob-specific component. Fails loud: throws on a non-mapping YAML root, rejects null/nameless candidates, never emits an `undefined:` roster line. |

### What a maintainer actually lifts

- **Add `capabilities/bob/capability.json`** and regenerate the registry (artifact #1). The JSON
  is exactly the L5849–5939 block with its trailing comma dropped; `gen-capability-registry.cjs`
  copies a `role: "runtime"` capability into `runtimes[id]` verbatim, so the emitted block is
  byte-identical to what is vendored here. Validating it costs one call:
  `validateCapability(entry, 'bob')` + `validateRuntimeBody(entry)` — both return `[]` today.
- **Add to `runtime-aliases.manifest.json`:** the `"bob"` alias (artifact #4) — copy L79–82.
- **Add to `runtime-name-policy.cjs`:** the `bob` `FALLBACK_ALIASES` entry (artifact #5) — copy L46.
- **Add to `capability-validator.cjs`:** the two `VALID_CONVERTER_NAMES` entries (artifact #6) —
  copy L849–850. Mechanical, but the descriptor is inert without them.
- **Fold in the converters:** artifacts #2/#3/#3b are the one piece of net-new logic — a
  ~105-line hand-edited block (banner at `runtime-artifact-conversion.cjs` L3578) that mirrors
  the existing per-runtime `convert…CommandTo<Runtime>{Skill,Command}` family and reuses its
  helpers. A
  maintainer would fold this into the converter family (parameterizing on the registry entry)
  rather than vendor it verbatim. It is **not** stock upstream — it must be added.
- **Add the two `.bob` probes** to the canonical `gsd_run` resolver preamble (artifact #7) and
  let the doc tree regenerate. Without this, a `.bob`-scoped install cannot find the shim from
  workflow bash — a pre-existing gap for any runtime whose home is not on the 19-entry list.
- **No resolver changes:** artifact #9 is the existing generic `dot-home` case; the shim
  resolves the `.bob` home with no new branch. Artifact #8 is an existing install mechanism.
- **Decide on `bob-adapter.cjs`:** the gate + model-neutralization pass + `custom_modes.yaml` merge is
  the other new logic. Upstream can vendor it as-is or fold its gate into the generic install
  path; it is self-contained, node-builtins-only, and dependency-light.

Six of the nine inventory items are pure descriptor/alias/allowlist data, a one-line preamble
addition, or a reference to an existing generic mechanism; the net-new logic is the Bob
converter trio plus the self-contained adapter module. The upstream PR diff is pre-scoped to:
one `capability.json` + the regenerated registry, two alias entries, two allowlist entries, one
converter trio folded into the converter family, one resolver-preamble line, and one adapter
module — a mostly-**move** change with a small, well-bounded converter rewrite.

## One divergence a maintainer will ask about: the Node floor

gsd-core 1.14.0 declares `engines.node >= 24.0.0`; gsd-bob declares `>= 22.15.0`. This is
deliberate and verified, not stale. The floor was raised upstream for `RegExp.escape`
(ADR-3212), and then #3499 re-shimmed it — `bin/lib/pattern.cjs` binds
`typeof RegExp.escape === 'function' ? RegExp.escape.bind(RegExp) : <in-file metachar escape>`
once at module load. A grep of the vendored `gsd-core/bin` finds no other Node-24-only API, and
the tree was executed on a downloaded Node 22.15.0 during the 1.14.0 re-vendor (`--help`,
`query state.load` at exit 0, all three patched libs loading). `>= 22.15.0` is the union of that
and Bob Shell's own documented floor. The caveat is honest: upstream retired its Node 22 CI
lane, so this is an *untested* configuration there — `MAINTAINING.md` step 8 re-checks it on
every bump.
