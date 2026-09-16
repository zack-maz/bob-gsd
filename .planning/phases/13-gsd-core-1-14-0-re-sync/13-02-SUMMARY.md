# Phase 13-02 Summary — Agent/Product-Name Neutralization (NEUTRAL-04 / Phase 18)

**Executed:** 2026-09-16 · **Requirement:** NEUTRAL-04 · **Roadmap phase:** 18, run as Phase 13's second pass
**Suite:** 389/389 green (was 380/380 at 13-01; +9 from `test/agent-neutrality.test.cjs`)

## Goal

Under Bob, the only agent the user or the model ever sees named should be **Bob** — in the
emitted `.bob/` set *and* in the vendored `gsd-core/` doc tree the model reads once a workflow
starts. Extend v2.0's NEUTRAL-03 (zero *model* literals in commands/skills) to agent, vendor and
product names, and to every markdown the model reads.

## Why D-10's deferral was right, and what changed

Phase 13's D-10 deferred NEUTRAL-04 on the grounds that it was fuzzy prose rewriting across 31
commands, not required for 1.14.0 correctness, and that 1.6.1-era edits would have been discarded
by the re-vendor. All three held. What changed is the **shape of the fix**: it is not 31 prose
rewrites but **one stage-time transform** over every runtime document, which a re-vendor cannot
discard — so it could be done in a single pass, immediately after the re-sync landed.

## What was built

`bobifyRuntimeDoc(content, loc)` in `src/bob-adapter.cjs`, called from `src/installer/stage.cjs`
for every runtime `.md` in the payload copy and as the `finish()` wrapper around both converter
outputs (`bobifyRuntimeShell` is its `.sh` sibling). Four composed transforms:

1. `rewriteUpstreamHostPaths` — upstream config-home forms (`$HOME/<dot-home>`, `~/<dot-home>`,
   the `${…_CONFIG_DIR:-…}` form, workspace-relative and `<any-root>/<dot-home>/`) re-pointed at
   **this install's** location, and the upstream project-instruction filename → `AGENTS.md`.
   Functional, not cosmetic: the workflows `@`-read and `cat` sibling files by these paths.
2. `bobResolverPreamble` via `swapResolverPreamble` — upstream's one-line `gsd_run` resolver
   probes 19 runtimes' config homes; every occurrence is replaced with a Bob-only probe
   (this install → workspace `.bob` → `$HOME/.bob` → `gsd_run` on `PATH`), keeping the
   package-identity check.
3. Upstream's own `filterRuntimeNotesForTarget(…, 'bob')` — notes addressed to other hosts are
   dropped before the model ever sees them.
4. `neutralizeAgentNamesInProse` — reference runtime → `Bob`; any other runtime →
   `another runtime`; `<OTHER> RUNTIME` label → `non-Bob runtime`; `--<runtime>` selector →
   `--<lane>`; vendors → `the model vendor`; model families / local model servers → `a model` /
   `a local model server`; then `neutralizeModelReferences` for the tier/id/directive shapes.
   Replacements are case-shaped and idempotent.

**Why stage time, not the vendored tree:** the correct host-path replacement is scope-dependent
(workspace-relative `.bob/gsd-core/…` for `--local`, the absolute target for `--global`), so only
the payload *copy* knows the answer. Keeping the tracked tree upstream-shaped also keeps the
re-vendor replay small.

**Prose and non-shell fences** are fully neutralized (the json/xml/markdown examples the model
reads as templates). **Inside shell fences only comment and `echo`/`printf` lines are** —
~130 bare identifiers (`case … in <runtime-id>)` arms, dead env-var probes, `--<runtime>` tokens
in a command line) deliberately survive, because renaming them could **activate another host's
branch** on Bob or leave a live arm under a misleading name. The residual is asserted by test.

Every name table in the adapter is **base64-decoded at load**, so the neutral module carries no
bare brand literal in source.

## The config half — four seeds, one changed value

`BOB_OWNED_CONFIG` in `src/installer/config-merge.cjs` grew from three keys to four:

| Key | Value | Note |
|---|---|---|
| `workflow.text_mode` | `true` | unchanged |
| `workflow.use_worktrees` | `false` | unchanged (13-01) |
| `context_window` | **`200000`** | **CHANGED from `270000`.** Bob's own 2.0.0 release notes give the window as *"200,000 to 270,000 tokens"* depending on the backend Bob routes to, and Bob owns that routing. gsd-core scales read-depth on this integer, so the adapter seeds the **floor** — correct on every backend, where the ceiling overflows on the smaller ones. |
| `resolve_model_ids` | **`"omit"`** | **NEW.** Bob owns model routing; gsd-core's own installer writes this for every non-reference runtime. Dispatches carry no model parameter and no flow asks the user to pick a model. |

## Verification

`test/agent-neutrality.test.cjs` (NEUTRAL-04) drives a **real install at both scopes** into
mkdtemp targets and asserts:

- zero tokens anywhere in `commands/`, `skills/`, `custom_modes.yaml`, `SUPPORT-ROSTER.md`;
- zero in doc-tree **prose and every non-shell fence**;
- the shell-fence residual **bounded** (`<= 200`; ~130 today);
- **no** upstream config-home path or instruction filename surviving anywhere, shell included;
- every `gsd_run` resolver preamble is the Bob one, pointing at this install (seen in >=100 files);
- doc-tree `gsd-core` references resolve to this install's `gsd-core`;
- the four config seeds pinned, including the 200000 floor;
- the adapter's own non-comment source carries no bare brand literal.

Its forbidden-word table is derived from the adapter's own tables, so test and transform cannot
drift — the same discipline as NEUTRAL-03.

## Docs

`README.md` (new *Bob limitations the installer encodes* and *What the model sees* sections),
`ARCHITECTURE.md` (Axis 3 grew from model-neutralization to full agent-neutrality),
`MAINTAINING.md` (step 10 invariants + step 11 scratch-install neutrality check + the standing
"a new upstream runtime name must be added to the adapter's base64 table" note), `UPSTREAM.md`
(inventory unchanged; a section stating the stage-time pass is **gsd-bob-only and not part of the
upstream move**), `THIRD-PARTY-NOTICES.md` (the install is a *modified* copy of the upstream doc
tree), `.claude/CLAUDE.md` (the four seeds + the neutrality rule) and both covers were all
neutralized and re-stamped/re-rendered.

**Declared exceptions:** `UPSTREAM.md`'s inventory tables and `MAINTAINING.md`'s anchor table may
quote upstream symbol names, registry keys and grep anchors verbatim — they exist to point a
gsd-core maintainer at gsd-core's own code, and `preflight()` greps those anchors byte-for-byte.
Each file says so once. **Historical planning records** (phase summaries, research, quick-task
records, `ACCEPTANCE-*`) were **not** rewritten — history stays as written.

## Housekeeping

`prompt.md`, `improving-covers-plan.md`, `improving-covers.md` moved from the repo root to
`.planning/notes/` (historical working notes, never shipped).
