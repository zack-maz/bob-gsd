# gsd-bob Architecture

> **Audience:** a `@opengsd/gsd-core` maintainer (or a gsd-bob contributor) who needs
> to understand *how the Bob adapter works and why* before reviewing, extending, or
> upstreaming it. This is a **map of live code, not aspirational prose**: every
> architectural claim below is anchored to a real `file:symbol` you can open. If an
> anchor stops resolving, the doc is wrong — re-verify it on the next version bump
> (see `MAINTAINING.md`).

gsd-bob makes the GSD planning framework — today a Claude Code skill/command system —
run natively inside **IBM Bob**, regardless of which model backend Bob routes to. It is
deliberately thin: gsd-core's runtime architecture is data-driven, so most of Bob support
is a **move** (descriptor + alias data), and the net-new substance is one isolated adapter
module plus a small pair of vendored converters. `UPSTREAM.md` is the companion inventory of
exactly what a maintainer lifts upstream; this document explains the *design* those artifacts
implement.

The adapter differs from a traditional open-gsd runtime along **four axes**, each grounded in
a live anchor:

| # | Axis | Live authority |
|---|------|----------------|
| 1 | Converter/descriptor model (vendor-as-source, transform-at-emit) | `src/installer/stage.cjs` convertible loop; the two Bob converters in `gsd-core/bin/lib/runtime-artifact-conversion.cjs`; the `"bob"` entry in `gsd-core/bin/lib/capability-registry.cjs` |
| 2 | Capability-map gate (conservative lower-bound defaults) | `src/bob-adapter.cjs` `gateArtifact` / `buildSupportRoster`; `BOB_CAPABILITY_DECL` in `src/installer/stage.cjs` |
| 3 | Backend-neutrality (model-neutralization pass) | `src/bob-adapter.cjs` `neutralizeModelReferences` / `scanModelLiterals` |
| 4 | `.planning/` interchange (byte-compatible artifact contract) | `src/installer/stage.cjs` `workspaceRoot` vs `repoRoot` split + `.planning/` prune guards |

---

## Axis 1 — Converter/descriptor model (vendor-as-source, transform-at-emit)

gsd-bob does **not** ship pre-converted Bob artifacts and it does **not** hand-rewrite each
command. It vendors the pristine Claude command sources under `commands/gsd/<stem>.md` and
**transforms them at emit time** through gsd-core's own converter machinery. This is the
"**move, not rewrite**" framing from `UPSTREAM.md`: a Bob runtime is defined by a *descriptor*
plus *aliases*, and adding one is mostly mechanical data, not new architecture.

Three pieces implement this axis:

1. **The roster-agnostic convertible-artifact loop** — `src/installer/stage.cjs`
   (the "Convertible-artifact loop", around L252–L295). For every `commands/gsd/<stem>.md`
   source, a supported stem emits **two** Bob-conformant artifacts, matching the `bob`
   `artifactLayout` exactly:
   - a flat command `commands/gsd-<stem>.md` (via `convertClaudeCommandToBobCommand`), and
   - a nested skill `skills/gsd-<stem>/SKILL.md` (via `convertClaudeCommandToBobSkill`).

   The loop is **roster-agnostic**: it enumerates whatever sources exist, gates each through
   the adapter (Axis 2), and scales to the full GSD command set with zero changes. Absence of
   the source directory is a clean no-op (an `fs.existsSync` guard), and the converters are
   `require`d **lazily** — only when there is something to convert — so the absent-source path
   never depends on the vendored conversion library.

2. **The two vendored Bob converters** — `convertClaudeCommandToBobCommand` and
   `convertClaudeCommandToBobSkill` in `gsd-core/bin/lib/runtime-artifact-conversion.cjs`.
   These are the *one* piece of genuinely net-new logic: a ~105-line hand-edit vendored into a
   generated file (marked in-file `gsd-bob HAND-EDIT to this GENERATED file`), written as a
   **parameterized rewrite** of gsd-core's existing `convertClaudeCommandTo<Runtime>{Skill,Command}`
   family and reusing its helpers. The skill converter reduces Claude's richer frontmatter to
   Bob's documented two fields — `name` + `description` — because Bob reads only those. A
   maintainer folds these into gsd-core's converter family rather than lifting them verbatim
   (`UPSTREAM.md`, artifacts #2/#3).

3. **The `"bob"` runtime descriptor** — the registry entry in
   `gsd-core/bin/lib/capability-registry.cjs` (the `"bob"` block inside `const runtimes`,
   immediately before `"claude"`). It declares Bob's surface: `configHome` as a generic
   `dot-home` `.bob` with an empty `env` list — Bob 2.0.1 reads no config-home relocation
   variable, so declaring one would only point the installer at a directory Bob ignores
   (BOB2-04) — the `artifactLayout` naming the two
   converters above, and `commandStyle: slash-hyphen`. It is **pure data** — the generic
   `dot-home` resolver in `runtime-homes.cjs` already resolves the `.bob` home, and the
   `gsd-tools.cjs` shim resolves it with **no Bob-specific branch** (grep-confirmed zero `bob`
   references in the shim; see `UPSTREAM.md` artifact #6).

**Contrast with traditional open-gsd:** a native Claude Code install stages the command/skill
tree more or less directly for its home runtime. gsd-bob keeps the vendored payload as the
*source of truth* and derives every Bob artifact from it by conversion, so re-vendoring a new
gsd-core version (`MAINTAINING.md`) automatically re-derives correct Bob output with no
per-command edits.

---

## Axis 2 — Capability-map gate (conservative lower-bound defaults)

Bob cannot express every primitive GSD assumes. Rather than emit a broken artifact, gsd-bob
**gates** each candidate against a conservative lower-bound capability declaration and records
every exclusion **loud**.

- **The gate authority** is `src/bob-adapter.cjs` — `gateArtifact(candidate, capabilityDecl)`
  (around L325–L345) and `buildSupportRoster(candidates, capabilityDecl)` (around L356–L371).
  A candidate is **Supported** iff (a) it has a valid name, (b) it is not on the curated
  `BOB_SKIP_LIST`, and (c) every primitive in its `requires[]` is present in the capability
  declaration. Otherwise it is **excluded from the loadable set** and a concrete reason is
  returned. The gate is fail-closed: a null or nameless candidate is *never* admitted
  (it returns `{ supported: false, reason: 'invalid candidate: missing or non-string name' }`),
  and `buildSupportRoster` never interpolates a possibly-undefined name into a roster line.

- **The capability declaration** is `BOB_CAPABILITY_DECL`, exported from
  `src/bob-adapter.cjs` and imported by the staging engine and all three doc generators
  (one authority, never re-declared):

  ```js
  const BOB_CAPABILITY_DECL = Object.freeze({
    parallelSubagentFanout: true,
    structuredPrompts: false,
  });
  ```

  Two entries, explained in prose:
  - **Parallel subagent fan-out — supported (observed).** Verified in Phase 12 against a live
    Bob Shell 2.0.1 install: Bob's own `spawn_subagent` tool description states *"Multiple
    spawn_subagent calls in one turn run in parallel."* alongside *"Subagents cannot spawn
    other subagents."* Isolation was already confirmed (isolated context window, `subagent`
    tool group). Only NESTED spawning is unavailable, and no GSD workflow needs it. This
    value was `false` through v0.2.2 purely because Bob's 1.0.x docs were silent.
  - **No structured-choice prompts** → Bob supports **`text_mode` prompting only** (numbered
    text choices), not a structured-choice prompt primitive. This one is still a conservative
    default; it was *not* re-verified in Phase 12.

  The human-readable rationale for each lives in `PRIMITIVE_REASONS` in `src/bob-adapter.cjs`.
  With fan-out supported, the generated `SUPPORT-ROSTER.md` has an **empty** Unsupported set:
  all 28 curated commands emit. The gate itself is unchanged and still proves its flag/skip
  path in `test/unsupported-gate.test.cjs` and `test/bob2-capability.test.cjs` — the former
  synthetic `gsd-parallel-fanout` roster row was removed rather than allowed to appear as an
  emitted skill with no source file.

- **Context-window consequence.** GSD's loop on Bob shares **one** context window in the
  common case, so Bob's **270k** runtime window is the operative token budget. gsd-core keys its read-depth / advisory scaling on
  a top-level `context_window` integer in `.planning/config.json` (defaulting to a conservative
  **200000** when absent). So the installer seeds `context_window: 270000` into the
  workspace-root `.planning/config.json` — via `mergeTextMode` (constant `BOB_CONTEXT_WINDOW`)
  in `src/installer/config-merge.cjs`, unconditionally, exactly as it forces
  `workflow.text_mode` — so gsd-core's budget math reflects Bob's real shared window instead of
  the 200k default.

- **Loud, not silent.** Every excluded artifact produces an `unsupported on Bob: <reason>`
  line (`UNSUPPORTED_MARKER` in `src/bob-adapter.cjs`), rendered into `SUPPORT-ROSTER.md` by
  `renderRoster()` in `src/installer/stage.cjs`. The roster is **generated from the gate**,
  never hand-maintained — `stage.cjs` calls `gateArtifact` / `buildSupportRoster` directly, so
  a reason can never drift from the code that produced it.

**On the deleted capability-map document.** The original per-primitive rationale once lived in
a Phase 1 capability-map document that was **deleted in commit `459d992`** and no longer
exists in the tree — so this doc does not link it (a dead link would itself be a
maintainer-standard failure). The authoritative source of the gate rationale is now the **live
code** (`src/bob-adapter.cjs` `PRIMITIVE_REASONS` + `BOB_CAPABILITY_DECL`), the generated
`SUPPORT-ROSTER.md`, and the ROADMAP/PROJECT decision records. If you want the original
verbatim wording, recover it from git history — this command opens the deleted file as
**git-recovered history** (not a live path):
`git show 459d992~1:.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md`.
(Note: the `stage.cjs` comments that read "CAPABILITY-MAP §1/§2" are historical prose section
references, not file links — do not turn them into a path.)

---

## Axis 3 — Backend-neutrality (model-neutralization pass)

gsd-bob is **backend-agnostic**: Bob owns model routing, so no emitted artifact — and the
adapter itself — may embed a bare model-backend brand or capability-tier literal (RUNTIME-04).
This is enforced at two levels.

- **The emit-time neutralization pass** is `neutralizeModelReferences(content)` in
  `src/bob-adapter.cjs` (around L103–L112), applied as a post-pass wrapping **each** converter
  output in `src/installer/stage.cjs` (the flat command and the nested skill are both wrapped).
  It performs three ordered, ReDoS-safe replacements: (1) collapse a full vendor-prefixed
  model id to a neutral phrase (`the configured model`) *before* the bare-tier rewrite so an
  inner tier token is never mangled; (2) strip any residual machine-readable model-directive
  line (e.g. a `model:` / `effort:` / `model_profile:` line); (3) rewrite bare
  capability-tier prose to capability-neutral wording (`a higher-capability model` /
  `a balanced model` / `a faster model`). The pass is idempotent — a second application is a
  no-op — because none of its replacements reintroduce a tier token or directive line.

- **The zero-literal invariant** is `scanModelLiterals(content)` in `src/bob-adapter.cjs`
  (around L132–L147), the shared detector built from the **same** SOURCE regex constants the
  rewrite consumes, so detector and rewrite can never drift. It is exercised by
  `test/model-neutrality.test.cjs` — whose NEUTRAL-03 invariant stages the **full real
  emission** and asserts the converted `commands/` + `skills/` set contains **zero** model
  literals, failing loud with every `file:line:token`.

- **The adapter carries no brand literal itself.** The capability-tier tokens are decoded from
  a base64 array at runtime (`MODEL_TIER_TOKENS` in `src/bob-adapter.cjs`, around L41–L43), so
  this backend-neutral module never ships a bare brand string in source. A separate invariant,
  `test/backend-neutrality.test.cjs` (RUNTIME-04), brace-walks the `"bob"` registry block out
  of `capability-registry.cjs` and scans `src/bob-adapter.cjs` against a programmatically-built
  forbidden-token set to prove neither embeds a model-backend brand.

**Contrast with traditional open-gsd:** a native Claude Code runtime is free to name its
model tiers directly. gsd-bob must strip them, because the same `.bob/` artifacts run under
whichever backend Bob routes to — the neutralization pass is what makes a single emitted
artifact correct across backends.

---

## Axis 4 — `.planning/` interchange (byte-compatible artifact contract)

The whole point of a second runtime is that the two stay **interchangeable**. gsd-bob upholds
the RUNTIME-03 contract: the `.planning/` artifacts produced under Bob (PROJECT.md,
REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json, phase plans) are **byte-compatible** with
those produced under Claude Code, so a project can move between runtimes without translation.
This is exercised by the byte-compatibility and core-loop-equivalence suites in `test/`.

Two design guarantees in `src/installer/stage.cjs` protect the interchange surface:

- **Two roots, never conflated** (`stage.cjs` header + the `stage()` signature). `repoRoot` is
  the gsd-bob **package** root — the *only* source of the vendored `gsd-core/` payload.
  `workspaceRoot` is `process.cwd()` — where `.planning/` is anchored and the local `.bob/`
  tree is written. The payload copy is sourced strictly from `repoRoot`, never from
  `workspaceRoot`/cwd; under real npx these differ, and conflating them would either stage an
  empty payload or write into the wrong tree. `stage()` fails loud if `repoRoot` (or its
  vendored `gsd-core/` payload) is missing, before any structural write.

- **`.planning/` is never pruned.** The installer's orphan sweep and empty-dir prune pass both
  explicitly skip anything under `.planning/` (the sweep pushes any `.planning/` entry to the
  surviving set, and the dir-prune loop `continue`s past `.planning/`). The interchange surface
  is **user-owned and runtime-independent**: installing, re-installing, or uninstalling gsd-bob
  never touches the planning artifacts, so the byte-compatible contract cannot be violated by
  the staging engine.

**Contrast with traditional open-gsd:** both runtimes read and write the *same* `.planning/`
contract — that is the interchange guarantee. gsd-bob adds the discipline that its installer is
a pure overlay on `.bob/` (plus the vendored payload) and treats `.planning/` as read-only
territory it must never sweep.

---

## Where the substance lives (one-screen recap)

- **Descriptor + aliases (a move):** `gsd-core/bin/lib/capability-registry.cjs` `"bob"` entry,
  `runtime-aliases.manifest.json`, `runtime-name-policy.cjs` `FALLBACK_ALIASES` — pure data
  (`UPSTREAM.md` artifacts #1/#4/#5).
- **The two converters (net-new logic):** `gsd-core/bin/lib/runtime-artifact-conversion.cjs`
  (`convertClaudeCommandToBobCommand` / `convertClaudeCommandToBobSkill`).
- **The one isolated adapter (net-new substance):** `src/bob-adapter.cjs` — the gate
  (`gateArtifact` / `buildSupportRoster`), the neutralization pass
  (`neutralizeModelReferences` / `scanModelLiterals`), the idempotent
  `custom_modes.yaml` merge (`mergeCustomModes` / `unmergeCustomModes`), and the
  Bob 2.0 surface constants verified in Phase 12 (`BOB_CAPABILITY_DECL`,
  `BOB_TOOL_GROUPS`, `modesRelPathForScope` / `isModesRelPath`).

  **The custom-modes path is scope-asymmetric (BOB2-04)** and this is the single
  easiest thing to get silently wrong: Bob 2.0 resolves the *global* modes file as
  `~/.bob/settings/custom_modes.yaml` (via its `getGlobalSettingsDirectory()`), but
  the *project* one as `<workspace>/.bob/custom_modes.yaml` — no `settings/`
  segment. `modesRelPathForScope()` owns that asymmetry so no call site re-inlines
  a literal. Writing the global mode to the home root (what gsd-bob did through
  v0.2.2) produces a file Bob never reads, with no error surfaced anywhere.
- **The staging engine that wires them:** `src/installer/stage.cjs` — node:fs/node:path only,
  it *calls* the adapter and converters, never reimplements them.

For the exact upstream-move inventory (with re-verified `file:line` pointers) see `UPSTREAM.md`;
for the repeatable gsd-core version-bump procedure that keeps every anchor above honest, see
`MAINTAINING.md`.
