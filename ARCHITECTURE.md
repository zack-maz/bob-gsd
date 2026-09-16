# gsd-bob Architecture

> **Audience:** a `@opengsd/gsd-core` maintainer (or a gsd-bob contributor) who needs
> to understand *how the Bob adapter works and why* before reviewing, extending, or
> upstreaming it. This is a **map of live code, not aspirational prose**: every
> architectural claim below is anchored to a real `file:symbol` you can open. If an
> anchor stops resolving, the doc is wrong — re-verify it on the next version bump
> (see `MAINTAINING.md`).

gsd-bob makes the GSD planning framework — today a skill/command system authored for a
single reference runtime —
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
| 2 | Capability-map gate (conservative lower-bound defaults) | `src/bob-adapter.cjs` `gateArtifact` / `buildSupportRoster` / `BOB_CAPABILITY_DECL` (imported by `src/installer/stage.cjs` and all three doc generators) |
| 3 | Agent-neutrality (stage-time Bob-ification of every doc the model reads) | `src/bob-adapter.cjs` `bobifyRuntimeDoc` / `neutralizeAgentNamesInProse` / `rewriteUpstreamHostPaths` / `bobResolverPreamble` / `neutralizeModelReferences` / `scanModelLiterals` |
| 4 | `.planning/` interchange (byte-compatible artifact contract) | `src/installer/stage.cjs` `workspaceRoot` vs `repoRoot` split + `.planning/` prune guards |

**Targeted upstream:** gsd-core **1.14.0** (`gsd-core/VERSION`). Line numbers below are from the
re-vendored 1.14.0 tree; `MAINTAINING.md` step 8 re-verifies them on every bump.

**Targeted host:** **Bob 2.0.x** (Bob Shell 2.0.0–2.0.4, Bob IDE 2.x) — the first generation with
Agent Skills and subagents. Bob Shell 1.0.x is out of support: it has neither, so only
`.bob/commands/` and the `gsd` mode would load, and 2.0.0 requires a fresh install regardless.
There is no version probe anywhere in the adapter; the artifact set is single-target by design.

---

## Axis 0 — The nine local deltas over the vendored payload

The tracked `gsd-core/` tree is **not** the pristine npm tarball. It is the tarball plus a
fixed, replayable set of local deltas, all re-injected by `scripts/apply-bob-patches.cjs`
(header, L17–41). The 1.6.1-era model had **six**; the 1.14.0 re-sync grew it to **nine**.
Nothing else in the payload is hand-edited, and a second run of the script is a byte-identical
no-op — that idempotency is what makes "nuke the five subdirs, restage the tarball, re-run the
script" a safe, repeatable bump.

| # | Delta | Target | Why it exists |
|---|-------|--------|----------------|
| 1 | colon→hyphen command form (`gsd:<cmd>` → `gsd-<cmd>`) | the `.md` doc tree (`workflows`, `references`, `templates`, `contexts`) | Bob routes a slash command by **filename**; the legacy colon dialect is not routable (and is deprecated upstream). |
| 2 | upstream dot-home normalization (`~/<dot-home>` → `$HOME/<dot-home>`) | same doc tree | Makes the subsequent converter path rewrite deterministic; `verifyAll()` fails if any tilde form survives. |
| 3 | the `"bob"` runtime registry block | `gsd-core/bin/lib/capability-registry.cjs` (before the reference runtime's entry in `const runtimes`) | The descriptor. Data-only, but it **must** live in the generated registry — see the NO-GO below. |
| 4 | the Bob converter block + its three export symbols | `gsd-core/bin/lib/runtime-artifact-conversion.cjs` | The one piece of genuinely net-new conversion logic (Axis 1). |
| 5 | both aliases (`"bob"` in the JSON manifest, `bob` in `FALLBACK_ALIASES`) | `bin/shared/runtime-aliases.manifest.json`, `bin/lib/runtime-name-policy.cjs` | `--bob` / `bob-cli` normalize to the `bob` runtime. |
| 6 | the local `VERSION` file | `gsd-core/VERSION` | The tarball ships none, and since 1.7.0 `resolveVersionFrom` reads it **first**. |
| 7 | the two Bob converter names in `VALID_CONVERTER_NAMES` | `gsd-core/bin/lib/capability-validator.cjs` **L849–850** | 1.14.0 added a **closed allowlist**; `_resolveNamedConverter` refuses any converter the descriptor names that is not on it. |
| 8 | `.bob` probes in the `gsd_run` resolver preamble | the `.md` doc tree + `gsd-core/references/gsd-run-resolver.md` **L7** | See "the resolver probe" below. |
| 9 | the per-install runtime marker `bob` | `gsd-core/.gsd-runtime` | See "the runtime marker" below. |

Two safety properties were added with deltas 7–9, after the 1.6.1-era script aborted
**half-applied** on the 1.14.0 tree (its step-4b export anchor had been deleted upstream):

- **`preflight()`** (`scripts/apply-bob-patches.cjs`) checks every anchor-based step *before the
  first write*, so a moved anchor aborts with nothing touched.
- **`verifyAll()`** re-checks all nine deltas after the run and throws on any gap — including a
  structural check that `bob.runtime` carries `localConfigDir`, `hostIntegration` and
  `triggerPrecedence` and does **not** carry `hookEvents`.

**Why the descriptor cannot be an external file.** 1.14.0 *does* ship a runtime-overlay loader
(`capability-loader.cjs`, `loadRegistry({includeInstalled:true})`) that would compose an
external `capability.json` into `registry.runtimes.bob`. But every module that actually
*resolves* a runtime — `runtime-homes.cjs`, `runtime-artifact-layout.cjs`,
`runtime-config-adapter-registry.cjs`, `runtime-name-policy.cjs`, `install-engine.cjs`,
`runtime-slash.cjs` and the rest — `require`s the frozen `capability-registry.cjs` **directly**
and never calls the loader. So the hand-patch (delta 3) stays. Evidence:
[`.planning/research/260916-gsd-core-1.14.0-delta.md`](./.planning/research/260916-gsd-core-1.14.0-delta.md)
§2.6; verdict recorded in `UPSTREAM.md`.

---

## Axis 1 — Converter/descriptor model (vendor-as-source, transform-at-emit)

gsd-bob does **not** ship pre-converted Bob artifacts and it does **not** hand-rewrite each
command. It vendors the pristine upstream command sources under `commands/gsd/<stem>.md` and
**transforms them at emit time** through gsd-core's own converter machinery. This is the
"**move, not rewrite**" framing from `UPSTREAM.md`: a Bob runtime is defined by a *descriptor*
plus *aliases*, and adding one is mostly mechanical data, not new architecture.

Five pieces implement this axis — the emit loop, the converters, the descriptor, and the two
payload-level seams (the resolver probe and the runtime marker) that make the descriptor
reachable at all:

1. **The roster-agnostic convertible-artifact loop** — `src/installer/stage.cjs`
   (the "Convertible-artifact loop", from L275). For every `commands/gsd/<stem>.md`
   source, a supported stem emits **two** Bob-conformant artifacts, matching the `bob`
   `artifactLayout` exactly:
   - a flat command `commands/gsd-<stem>.md` (via the vendored Bob **command converter**), and
   - a nested skill `skills/gsd-<stem>/SKILL.md` (via the vendored Bob **skill converter**).
     (Both converters' literal upstream symbol names are listed once, in `UPSTREAM.md`'s
     inventory table.)

   The loop is **roster-agnostic**: it enumerates whatever sources exist, gates each through
   the adapter (Axis 2), and scales to the full GSD command set with zero changes — it grew
   from 28 to 31 sources in the 1.14.0 re-sync with no code change. Absence of
   the source directory is a clean no-op (an `fs.existsSync` guard), and the converters are
   `require`d **lazily** — only when there is something to convert — so the absent-source path
   never depends on the vendored conversion library.

   **Emission is scope-aware.** Both converters take an `isGlobal` flag (`scope === 'global'`),
   which switches their path rewrite from the workspace-relative `.bob/…` form to the global
   `~/.bob/…` form; `absolutizeGlobalHome()` (`src/installer/stage.cjs` L67) then rewrites
   `~/.bob/` — and the bare `~/.bob` — to the **absolute install target**, and the `gsd` custom
   mode's shell-out instruction names `<target>/gsd-core/bin/gsd-tools.cjs` rather than a
   relative `.bob/gsd-core/…` that does not exist under `~/.bob` (`stage()`'s `gsdCoreDir`
   split, L221–223). Through v0.2.3 every install — global included — emitted the
   workspace-relative form. The bare-form rewrite runs *after* the slash form so a path is
   never double-rewritten, and both replacements are linear/ReDoS-safe.

   **The staged roster is derived, not listed.** `rosterCandidates(repoRoot)`
   (`src/installer/stage.cjs` L50) builds the candidate set by reading the very same
   `commands/gsd/*.md` directory the loop iterates — the same derivation
   `scripts/generate-support-roster.cjs` uses for the repo-root roster — so the staged
   `SUPPORT-ROSTER.md` and the emitted artifact set cannot disagree, and no synthetic
   exemplar row can appear as a skill with no source file (BOB2-05).

   **One staged sibling, not two.** The vendored shim eagerly `require`s
   `scripts/fix-slash-commands.cjs` as a *sibling* of `gsd-core/` (three `../` up, via
   `command-roster.cjs`), so the installer stages that one file through the manifest. The
   synthetic sibling `package.json` gsd-bob used to stage alongside it is **gone**: since
   gsd-core 1.7.0 `resolveVersionFrom` reads `gsd-core/VERSION` first and every remaining
   `../../../package.json` require in the shim is lazy and `try`-wrapped. The payload's own
   `VERSION` and the `.gsd-runtime` marker beside it are what the shim reads, and
   `test/installer/staged-shim-loads.test.cjs` proves the staged shim still loads out of tree.

2. **The two vendored Bob converters** — the **command converter** (**L3666**) and the
   **skill converter** (**L3639**) in
   `gsd-core/bin/lib/runtime-artifact-conversion.cjs` (banner **L3578**, exports **L3698–3700**).
   These are the *one* piece of genuinely net-new logic: a ~105-line hand-edit vendored into a
   generated file (marked in-file `gsd-bob HAND-EDIT to this GENERATED file`), written as a
   **parameterized rewrite** of gsd-core's existing per-runtime `convert…To<Runtime>{Skill,Command}`
   family and reusing its helpers. The skill converter reduces the upstream source format's
   richer frontmatter to
   Bob's documented two fields — `name` + `description` — because Bob reads only those. A
   maintainer folds these into gsd-core's converter family rather than lifting them verbatim
   (`UPSTREAM.md`, artifacts #2/#3). Both are now registered in 1.14.0's closed
   `VALID_CONVERTER_NAMES` allowlist (delta 7) — without that, any registry-driven staging path
   refuses a converter the descriptor names.

   **Both converters convert the full content first, then rebuild the frontmatter.** The skill
   converter always did; the command converter did not, so `quick-batch`'s *description* shipped
   the unroutable colon dialect (`/gsd:quick-shaped tasks`) while its body was correctly
   hyphenated. It now runs the shared Bob content pass over the whole document before slicing
   frontmatter, so the two allowed command fields (`description`, `argument-hint`) get the same
   path- and command-dialect rewrite as the body.

3. **The `"bob"` runtime descriptor** — the registry entry in
   `gsd-core/bin/lib/capability-registry.cjs` **L5849–5939** (the `"bob"` block inside
   `const runtimes`, immediately before the reference runtime's entry). It declares Bob's
   surface: `configHome` as
   a generic `dot-home` `.bob` with an empty `env` list (**L5861**) — Bob reads no config-home
   relocation variable, so declaring one would only point the installer at a directory Bob
   ignores (BOB2-04 / FU-08) — `localConfigDir: ".bob"` (**L5866**), the `artifactLayout`
   naming the two converters above (**L5868–5905**), `triggerPrecedence` (**L5906**) and
   `commandStyle: slash-hyphen` (**L5910**). It is **pure data** — the generic `dot-home` case
   in `runtime-homes.cjs` (`resolveConfigHomeFromDescriptor`, **L166–174**) already resolves the
   `.bob` home, and the `gsd-tools.cjs` shim resolves it with **no Bob-specific branch**
   (grep-confirmed zero `bob` references in the shim).

   Three of those fields are new in the 1.14.0 re-sync, because 1.14.0's own
   `capability-validator.cjs` now requires them: `localConfigDir` (required since 1.7.0 —
   `getDirName` derives from it), `hostIntegration` (required since ADR-1239 — every
   `dispatch-*` query reads it), and `version`/`engines`. The old `hookEvents: "none"` was
   **removed**: the only legal values are hook-event *families*, and "emits none" is expressed
   by omission. Running 1.14.0's `validateCapability(runtimes.bob, 'bob')` and
   `validateRuntimeBody(runtimes.bob)` over the vendored entry returns **zero errors**, and
   `test/descriptor.test.cjs` keeps it that way.

   **`hostIntegration` — the axes and what each one buys** (consumed by
   `host-integration.cjs` `resolveDispatchType` and the `query dispatch-*` verbs):

   | Axis | Value | Consequence |
   |---|---|---|
   | `embeddingMode` / `commandSurface` | `imperative` / `slash-file` | Bob loads a command as a file whose name *is* the command; no declarative manifest. |
   | `dispatch.namedDispatch` | `true` | GSD role names (`gsd-planner`, `gsd-executor`) dispatch directly instead of being mapped onto a built-in. |
   | `dispatch.nested` / `maxDepth` | `false` / `1` | Bob forbids a subagent spawning a subagent, so `shouldFlattenDispatch` flattens any second level into the parent turn. |
   | `dispatch.background` | `true` | The parent turn continues while subagents run — real parallel fan-out in one turn (BOB2-05). |
   | `dispatch.backgroundDispatch` | `false` | Bob has no documented fire-and-forget-across-turns primitive. |
   | `dispatch.subagentToolkit` | `full` | Spawned subagents get the full tool set. |
   | `dispatch.maxConcurrency` | `undocumented` | `query dispatch-capacity` degrades to a safe floor of 1 with a warning; set a real integer once Bob documents its fan-out width. |
   | `dispatch.isolation` | **`none`** | See below. |
   | `modelMode` | `passive` | Bob owns model routing (RUNTIME-04) — the adapter never selects one. |
   | `hookBus` / `effortSurface` | `none` / `none` | No managed hook bus and no reasoning-effort argv surface to drive. |
   | `stateIO` / `transport` / `runtime` | `filesystem` / `mcp` / `node` | State lives in `.planning/`; the tool transport is MCP; the host runs on Node. |

   **Why `isolation` is `"none"`, and what it costs.** That axis is about **git worktrees**
   (`{harness-worktree, orchestrator-worktree, none}`), not about context isolation. Bob's
   `spawn_subagent` gives an isolated *context window*; it does not check out a worktree. Since
   1.14.0, `gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md` **fails
   closed** on `isolation: none` — `FATAL: runtime '$RUNTIME' declares no executor-isolation
   primitive (dispatch.isolation=none) … Set workflow.use_worktrees=false.` (L51) — unless the
   project sets exactly that key. `quick-batch`'s `steps/worktree-dispatch.md` reads the same
   `gsd_run query dispatch-isolation` and caps concurrency to 1 on `none`. Seeding the key is
   therefore not a workaround but the declared way to run a no-worktree runtime (Axis 2).
   Declaring
   `orchestrator-worktree` instead would require a valid `runtime.orchestratorExec` (a headless
   `bob` argv), which is plausible with Bob Shell but must be spike-verified before it is
   declared — deferred, not assumed.

   **The descriptor has two copies, kept equal by test.** The live one is the vendored registry
   block; the source one is `REGISTRY_BLOCK` in `scripts/apply-bob-patches.cjs`. They drifted
   once already (Phase 12 found the two disagreeing on `description`), so
   `readVendoredBobEntry()` / `canonicalBobEntry()` are exported from the patch script and
   deep-equalled by `test/descriptor.test.cjs`.

4. **The `gsd_run` resolver probe.** Every workflow bash block inlines gsd-core's shim-resolver
   preamble, which probes a fixed list of runtime homes for `gsd-core/bin/gsd-tools.cjs`.
   Upstream's list covers 19 runtimes and **none of them is `.bob`** — so a
   `<repo>/.bob/gsd-core` or `~/.bob/gsd-core` install was unreachable from workflow bash unless
   `gsd_run` happened to be on `PATH`. This was true in 1.6.1 too; it was simply never noticed.
   Delta 8 inserts `"${_GSD_RUNTIME_ROOT}/.bob/gsd-core/bin/${_GSD_SHIM_NAME}"` into the
   project-local probe and `"$HOME/.bob/gsd-core/bin/${_GSD_SHIM_NAME}"` into the global one,
   and rewrites the "not found" hint to gsd-bob's own install one-liner. It is applied by
   `patchResolverContent()` over the whole doc tree (114 workflow files plus
   `references/gsd-run-resolver.md` **L7**), each replacement removing its own search key so the
   transform is idempotent, and `verifyAll()` fails if **any** file carrying `_gsd_at` lacks the
   `.bob` probe.

5. **The runtime marker.** gsd-core resolves the active runtime as
   `GSD_RUNTIME` > `config.runtime` > `gsd-core/.gsd-runtime` > the reference runtime. Upstream's
   `bin/install.js` writes that marker beside `VERSION` for every install; gsd-bob's installer
   copies the whole vendored tree, so delta 9 ships the marker **in the payload**
   (`gsd-core/.gsd-runtime` = `bob`). Without it every `dispatch-*` query silently answered for
   the **reference runtime's** descriptor — i.e. for harness-worktree isolation Bob does not have.
   `.planning/config.json` is deliberately **not** given a `runtime` key: that file is the
   cross-runtime interchange surface (Axis 4) and must not pin a runtime.

**Contrast with traditional open-gsd:** a native install on the reference runtime stages the
command/skill tree more or less directly for its home runtime. gsd-bob keeps the vendored payload as the
*source of truth* and derives every Bob artifact from it by conversion, so re-vendoring a new
gsd-core version (`MAINTAINING.md`) automatically re-derives correct Bob output with no
per-command edits.

---

## Axis 2 — Capability-map gate (conservative lower-bound defaults)

Bob cannot express every primitive GSD assumes. Rather than emit a broken artifact, gsd-bob
**gates** each candidate against a conservative lower-bound capability declaration and records
every exclusion **loud**.

- **The gate authority** is `src/bob-adapter.cjs` — `gateArtifact(candidate, capabilityDecl)`
  (L448) and `buildSupportRoster(candidates, capabilityDecl)` (L479).
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
  all 31 curated commands emit. The gate itself is unchanged and still proves its flag/skip
  path in `test/unsupported-gate.test.cjs` and `test/bob2-capability.test.cjs` — the former
  synthetic `gsd-parallel-fanout` roster row was removed rather than allowed to appear as an
  emitted skill with no source file.

- **Config consequence — four seeded keys, one authority.** Some capability facts cannot be
  expressed in the descriptor at all; they have to be seeded into the project's own config.
  `BOB_OWNED_CONFIG` in `src/installer/config-merge.cjs` is the single declaration of what the
  adapter owns there, merged by `mergeTextMode()` on every install and removed — key by key,
  never the whole file — by `unmergeOwnedKeys()` on uninstall:

  ```js
  const BOB_OWNED_CONFIG = Object.freeze({
    workflow: Object.freeze({ text_mode: true, use_worktrees: false }),
    context_window: BOB_CONTEXT_WINDOW,          // 200000 — the documented floor
    resolve_model_ids: 'omit',
  });
  ```

  - `workflow.text_mode: true` — Bob has no structured-choice prompt primitive, and the
    descriptor has no field that forces text prompting; this merge is the sole guarantee.
  - `workflow.use_worktrees: false` — **the behavioural gate added in 1.14.0.** With
    `dispatch.isolation: "none"` in the descriptor (Axis 1), `execute-phase`'s
    isolation-dispatch step exits `FATAL` unless this key is `false` (and `quick-batch` caps its
    wave to concurrency 1). Bob has no
    git-worktree primitive, so executors run in the main checkout — which is exactly how they
    ran under 1.6.1. The gate is new; the behaviour is not.
  - `context_window: 200000` — **the conservative floor of Bob's own documented window.**
    Bob's 2.0.0 release notes give the runtime window as *"200,000 to 270,000 tokens"*; which
    end applies depends on the backend Bob routes the session to, and Bob owns that routing, so
    the adapter cannot know it at install time. gsd-core keys its read-depth / advisory scaling
    on this top-level integer, so the adapter seeds the floor — a budget correct on every
    backend rather than one that overflows on the smaller ones. (v0.2.x–v0.3.0 seeded the
    270000 ceiling; that was the optimistic end of the same range.) GSD's loop on Bob shares
    **one** window in the common case, so this is the operative budget.
  - `resolve_model_ids: "omit"` — **Bob owns model routing.** gsd-core's own installer writes
    this for every non-reference runtime; with it, workflow dispatches carry **no** model
    parameter (a capability-tier alias would 404 on a host with no native tier names) and no
    flow asks the user to pick a model. This is the config half of Axis 3.

  `.planning/config.json` is deliberately **not** given a `runtime` key — that would pin the
  interchange surface (Axis 4) to one runtime. Runtime identity is carried by the payload's
  `gsd-core/.gsd-runtime` marker instead.

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

## Axis 3 — Agent-neutrality (stage-time Bob-ification)

Under Bob the model must see **one** host named in its instructions: Bob. gsd-bob is also
**backend-agnostic** — Bob owns model routing, so no emitted artifact, and not the adapter
itself, may embed a bare model-backend brand or capability-tier literal (RUNTIME-04). What
began in v2.0 as a model-tier pass is now a full agent-neutralization pass, applied at
**stage time** to every markdown the model reads: the converted `commands/` and `skills/`
**and** the vendored `gsd-core/` doc tree (`workflows`, `references`, `templates`, `contexts`).

**Why stage time and not the vendored tree.** The correct replacement for an upstream
config-home path differs by install scope — workspace-relative `.bob/gsd-core/…` for
`--local`, the absolute target for `--global` — so the payload *copy* is the only place that
knows the answer. Keeping the tracked `gsd-core/` tree upstream-shaped also keeps the
re-vendor replay (Axis 0) small.

- **The one entry point is `bobifyRuntimeDoc(content, loc)`** in `src/bob-adapter.cjs`, called
  by `src/installer/stage.cjs` for every runtime `.md` in the payload copy and as the `finish()`
  wrapper around **both** converter outputs. `bobifyRuntimeShell()` is its sibling for the
  payload's `.sh` files. `loc` carries `{ gsdCoreDir, bobHome }`, computed once from the scope.
  It composes four transforms, in order:

  1. **`rewriteUpstreamHostPaths(content, loc)`** — the upstream reference runtime's
     config-home forms (`$HOME/<dot-home>`, `~/<dot-home>`, the `${…_CONFIG_DIR:-…}` form,
     workspace-relative and `<any-root>/<dot-home>/`) are re-pointed at **this install's**
     location, and the upstream project-instruction filename becomes `AGENTS.md` (what
     gsd-core's own `getProjectInstructionFile('bob')` resolves). These are **functional**, not
     cosmetic: the workflows `@`-read and `cat` sibling files by these paths.
  2. **`bobResolverPreamble(gsdCoreDir)` via `swapResolverPreamble()`** — upstream emits a
     one-line `gsd_run` shim resolver that probes the config homes of **19** runtimes (Axis 1,
     delta 8). Every occurrence is replaced wholesale with a **Bob-only** probe: this install's
     `gsd-core/bin` → the workspace `.bob/gsd-core/bin` → `$HOME/.bob/gsd-core/bin` → a
     `gsd_run` already on `PATH`, keeping the package-identity check and rewriting the
     not-found hint to gsd-bob's install one-liner.
  3. **Upstream's own note filter** — `filterRuntimeNotesForTarget(…, 'bob')` (in
     `gsd-core/bin/lib/runtime-artifact-conversion.cjs`, applied in `stage.cjs`'s `finish()`)
     drops the runtime-conditional notes addressed to other hosts, so guidance written for a
     different runtime never reaches the model at all.
  4. **`neutralizeAgentNamesInProse(prose)`** — the name rules, ordered so compounds resolve
     before bare words: the **reference runtime's** own name (in any compound form) → `Bob`;
     **any other runtime** → `another runtime`; a `<OTHER> RUNTIME` rule label → `non-Bob
     runtime`; a `--<runtime>` reviewer-lane/offload selector → `--<lane>`; **vendors** → `the
     model vendor`; model families and local model servers → `a model` / `a local model
     server`; and finally `neutralizeModelReferences()` (below) for the tier/id/directive
     shapes. Replacements are **case-shaped** (`shapedReplacement`): an ALL-CAPS match (a
     heading or rule label) yields an upper-case phrase, everything else the lower-case one.

- **Prose *and* non-shell fences are neutralized.** `bobifyRuntimeDoc` splits the document on
  fenced code blocks. Prose segments and every fence that is **not** shell (the json / xml /
  markdown / text examples the model reads as templates) get the full name rules.

- **The shell-fence policy — the one deliberate residual.** Inside a fence whose info-string is
  `bash`/`sh`/`shell`/`zsh`/`console` (`SHELL_FENCE_RE`), `neutralizeShellBlock()` neutralizes
  **only** comment lines and `echo`/`printf` message lines — the parts a person reads. Bare
  identifiers are left exactly as upstream wrote them: `case … in <runtime-id>)` arms, dead
  `$<RUNTIME>_*` env-var probes, `--<runtime>` tokens inside a command line. Renaming those
  would either **activate another host's branch** on Bob or leave a live arm under a misleading
  name. Roughly **130** such identifiers remain across the vendored tree. The residual is
  *bounded by test*, not ignored: `test/agent-neutrality.test.cjs` counts it and fails if it
  grows, so a transform that silently stops running is caught.

- **The model-routing sub-pass** is `neutralizeModelReferences(content)` in
  `src/bob-adapter.cjs`, three ordered ReDoS-safe replacements: (1) collapse a full
  vendor-prefixed model id to `the configured model` *before* the bare-tier rewrite so an inner
  tier token is never mangled; (2) strip any residual machine-readable model-directive line
  (a `model:` / `effort:` / `model_profile:` / `resolve_model_ids:` line); (3) rewrite bare
  capability-tier prose to capability-neutral wording (`a higher-capability model` /
  `a balanced model` / `a faster model`). Idempotent — none of its replacements reintroduce a
  tier token or directive line, and the same holds for every rule in step 4 above.

- **The invariants.** `scanModelLiterals(content)` is the shared detector built from the
  **same** SOURCE regex constants the rewrite consumes, so detector and rewrite cannot drift;
  `test/model-neutrality.test.cjs` (NEUTRAL-03) stages the full real emission and asserts zero
  model literals in `commands/` + `skills/`. `test/agent-neutrality.test.cjs` (NEUTRAL-04)
  extends that to agent names and to the doc tree, over **both** scopes, asserting: zero tokens
  anywhere in `commands/`, `skills/`, `custom_modes.yaml` and `SUPPORT-ROSTER.md`; zero in
  doc-tree prose and non-shell fences; the shell residual bounded; **no** upstream config-home
  path or instruction filename surviving anywhere (shell included); every resolver preamble the
  Bob one, pointing at this install; and the four seeded config keys pinned.

- **The adapter carries no brand literal itself.** Every name table — other runtimes, vendors,
  model products, the upstream instruction file / dot-home / home env var — and the
  capability-tier tokens are **base64-decoded at load**, so this neutral module never ships a
  bare brand string in source. `test/backend-neutrality.test.cjs` (RUNTIME-04) brace-walks the
  `"bob"` registry block out of `capability-registry.cjs` and scans `src/bob-adapter.cjs`
  against a programmatically-built forbidden-token set; `test/agent-neutrality.test.cjs` asserts
  the same for the adapter's non-comment source.

**Contrast with traditional open-gsd:** the reference runtime is free to name itself and its
model tiers directly throughout the doc tree — it *is* the host being described. On Bob the
same text would name a host the user is not running, next to paths that do not exist, so
gsd-bob rewrites it at stage time. That is what makes a single vendored payload correct under
Bob and across whichever backend Bob routes to.

---

## Axis 4 — `.planning/` interchange (byte-compatible artifact contract)

The whole point of a second runtime is that the two stay **interchangeable**. gsd-bob upholds
the RUNTIME-03 contract: the `.planning/` artifacts produced under Bob (PROJECT.md,
REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json, phase plans) are **byte-compatible** with
those produced on the reference runtime, so a project can move between runtimes without
translation.
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
  (the command converter / the skill converter — symbol names in `UPSTREAM.md`).
- **The one isolated adapter (net-new substance):** `src/bob-adapter.cjs` — the gate
  (`gateArtifact` / `buildSupportRoster`), the stage-time Bob-ification pass
  (`bobifyRuntimeDoc` / `bobifyRuntimeShell` / `rewriteUpstreamHostPaths` /
  `bobResolverPreamble` / `neutralizeAgentNamesInProse` / `neutralizeModelReferences` /
  `scanModelLiterals`), the idempotent
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
  it *calls* the adapter and converters, never reimplements them. It owns the scope-aware
  emission (`absolutizeGlobalHome`, the `gsdCoreDir` split), the derived roster candidate set
  (`rosterCandidates`), and the one staged sibling (`scripts/fix-slash-commands.cjs`).
- **The seeded project config:** `src/installer/config-merge.cjs` — `BOB_OWNED_CONFIG`
  (`workflow.text_mode`, `workflow.use_worktrees`, `context_window`, `resolve_model_ids`),
  merged on install and
  un-merged on uninstall.
- **The replayable payload deltas:** `scripts/apply-bob-patches.cjs` — the nine deltas
  (Axis 0) with `preflight()` before the first write and `verifyAll()` after the run, plus the
  per-install `gsd-core/.gsd-runtime` marker that makes every `dispatch-*` query resolve the
  `bob` descriptor instead of falling back to the reference runtime.

For the exact upstream-move inventory (with re-verified `file:line` pointers) see `UPSTREAM.md`;
for the repeatable gsd-core version-bump procedure that keeps every anchor above honest, see
`MAINTAINING.md`.
