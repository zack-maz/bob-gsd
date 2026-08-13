# Phase 2: Runtime Foundation & Artifact Translation - Research

**Researched:** 2026-06-17
**Domain:** Extending gsd-core's descriptor/converter runtime system with a `bob` runtime (CJS, node:fs-only install path, vendored-then-upstream)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Emit **one** dedicated `gsd` custom mode in Phase 2 (the `command`-group shell-out seam). Multi-mode partitioning is v2.
- **D-02:** The `gsd` mode declares tool groups **`[read, edit, command, mcp]`**. Whether to also declare `skill`/`browser` is a researcher confirm-item (resolved below).
- **D-03:** `roleDefinition`/`customInstructions`/`whenToUse` prose is Claude's discretion; the load-bearing field is `groups`.
- **D-04:** Use **`js-yaml ^4.1.0`** for parse-based `custom_modes.yaml` merge, scoped to **descriptor/converter + merge code only**; the **install/staging path stays `node:fs`-only**.
- **D-05:** Merge ownership by **slug convention** — our slug is `gsd` (future `gsd-*`). Replace `gsd`/`gsd-*` in place, insert if absent, **never touch other slugs**. (Comments dropped on re-emit — accepted.)
- **D-06:** Merge logic lives in the **Phase 2 descriptor/converter layer** (self-contained, UP-01); Phase 3 installer calls it. Phase 2 proves it with a **merge unit test + golden fixtures**, not by writing to a real `~/.bob`.
- **D-07:** Add the `bob` runtime by editing the vendored gsd-core registry at the **same ~5 touchpoints the upstream PR will use** (registry entry, alias, configHome/getDirName, converter wiring, shim branch) so the vendored diff == future PR diff ("a move, not a rewrite"). All net-new Bob substance behind **one isolated `bob`-named adapter module**. Confirm-item: prefer a cleaner registration hook if one exists (resolved below).
- **D-08:** `bob` descriptor uses `dot-home` kind: `{ kind:'dot-home', name:'bob', env:['BOB_CONFIG_DIR'] }` → default `~/.bob`, project `<project>/.bob/`. **Include `BOB_CONFIG_DIR`** as gsd-bob's own shim-level override (required by ROADMAP SC#1). (See finding below: `name` must be `'.bob'` not `'bob'`.)
- **D-09:** Satisfy TRANS-03 by **reusing gsd-core's existing `text_mode` seam** — the `bob` runtime defaults `workflow.text_mode: true`; gsd-core's existing path renders numbered choices. **No prompt-rewriting in converters.** Golden test: configured flow asks + captures a validated answer in the Claude runtime with `text_mode` forced on.
- **D-10:** Gate each artifact **programmatically** against the `bob` capability declaration + CAPABILITY-MAP; on unmet hard dependency, **omit** the artifact from `.bob/commands`/`.bob/skills` **and** record `"unsupported on Bob: <reason>"` in a generated support roster. Back with a small curated skip-list. Prove on ≥1 representative case.
- **D-11:** Dev-time verification = **golden-file + Claude-runtime-equivalence + doc-conformance** (no live Bob). Test runner = **`node:test`** unless the planner finds a strong reason for vitest. Append device-runnable AC steps (AC-05+) to `.planning/ACCEPTANCE-CHECKLIST.md`.

### Claude's Discretion
- `gsd` mode `roleDefinition`/`customInstructions`/`whenToUse` prose (D-03).
- Golden-fixture directory layout and test-file naming; `node:test` vs vitest (D-11).
- Exact representative command + skill chosen to prove the converter (SC#2).
- Internal structure of the isolated `bob` adapter module (D-07).

### Deferred Ideas (OUT OF SCOPE)
- Multi-mode context partitioning (v2). Rich Bob-native re-modeling of subagents/prompts (v2 NATIVE-01). Full skill-roster gating (Phases 4–5). Worktree-isolated parallel execution (v2 PAR-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUNTIME-01 | `gsd-tools.cjs` shim resolves a `bob` runtime home so `gsd_run query` works under Bob | `resolveConfigHomeFromDescriptor` (`runtime-homes.cjs`) already implements `dot-home`; empirically proven below with a synthetic bob descriptor + `BOB_CONFIG_DIR` override |
| RUNTIME-02 | A `bob` runtime descriptor (config home, artifact layout, aliases) in gsd-core's existing vocabulary | The `runtimes` object in `capability-registry.cjs` + `runtime-name-policy.cjs` alias manifest + `artifactLayout` shape — exact literal templated from `cursor`/`cline` below |
| RUNTIME-03 | `.planning/` artifacts byte-compatible Claude↔Bob | `.planning/` is written by `gsd-tools.cjs` (runtime-agnostic); converters never touch `.planning/`. Golden-diff test = run an init/plan op under both runtime configs, diff outputs |
| RUNTIME-04 | GSD core contains no model-backend branching | `commandStyle`/`hookEvents` are dialect axes, NOT model names; backend-neutrality grep target identified below |
| TRANS-01 | GSD commands → `.bob/commands/*.md` (frontmatter + `$1` args) | `convertClaudeCommandToCursorCommand` is the exact analog (flat markdown command); Bob keeps `description`+`argument-hint` frontmatter (unlike Cursor which strips it) |
| TRANS-02 | GSD skills → `.bob/skills/<name>/SKILL.md` Agent Skills | `convertClaudeCommandToAntigravitySkill` is the exact analog (reduces frontmatter to `name`+`description` only) |
| TRANS-03 | `AskUserQuestion` → `text_mode` numbered choices | gsd-core `text_mode` seam: config default + workflow-markdown branch (no converter rewriting) — D-09 |
| TRANS-04 | Unsupported-primitive skills flagged/skipped | Programmatic gate against `bob` capability declaration + support roster (D-10) |
| TRANS-05 | `custom_modes.yaml` merged idempotently | js-yaml parse → replace/insert by slug → dump; merge unit test + golden fixtures (D-04/05/06) |
</phase_requirements>

## Summary

Phase 2 is overwhelmingly an **extension of gsd-core's existing data-driven runtime system, not new machinery**. The live source at `~/.claude/gsd-core/bin/lib/` confirms three load-bearing facts that shape the whole plan:

1. **Runtime registration is data-driven through one generated object.** Every runtime (claude, cursor, cline, codex, antigravity, …) is a JSON-shaped entry in the `runtimes` object inside `capability-registry.cjs`, and every consumer (`runtime-homes.cjs`, `runtime-artifact-layout.cjs`, `runtime-config-adapter-registry.cjs`, `runtime-slash.cjs`) reads that one object by `runtime[id].runtime.*`. There is **no separate "register a runtime" function/hook** — the registry *is* the API. So D-07's confirm-item resolves: **there is no cleaner hook; the ~5-touchpoint edit IS the canonical mechanism**, and it's already maximally upstream-friendly because the entry is pure data.

2. **The converter pattern is a per-runtime function that the registry names by string.** A runtime's `artifactLayout` entry carries a `converter` field (e.g. `"convertClaudeCommandToCursorSkill"`); `runtime-artifact-layout.cjs` resolves that string against `runtime-artifact-conversion.cjs`'s exports and applies it during staging. The two closest analogs to `bob` are **Cursor** (skills + flat converted commands) and **Antigravity** (skill converter that reduces frontmatter to `name`+`description` only — exactly Bob's contract).

3. **`text_mode` is already a first-class config axis with a workflow-level degradation path.** The converters do NOT rewrite prompts; the *workflow markdown* reads `text_mode` from init JSON and swaps `AskUserQuestion` for numbered text. D-09 is therefore "set the default + verify the existing seam," not "build a degrader."

**Primary recommendation:** Add the `bob` runtime as a pure-data `runtimes['bob']` entry (templated on `cursor`, with the Antigravity-style `name`+`description` skill converter), keep all net-new Bob substance (skill/command converters, mode emitter, `custom_modes.yaml` merge, support-roster gate) in one `runtime-artifact-conversion`-style `bob`-named module referenced by string from the registry, default `workflow.text_mode: true` for bob, and verify everything with `node:test` golden/unit tests against the doc-confirmed contracts — no live Bob required.

**Two corrections to locked assumptions (low-risk, mechanical):**
- D-08's descriptor `name` should be **`'.bob'`** (leading dot), not `'bob'` — `dot-home` joins `path.join(home, name)`, so every existing entry uses the dotted dir name (`.claude`, `.cline`, `.codex`). `name:'bob'` would resolve to `~/bob`. Empirically confirmed below.
- D-02's `skill` group: the IDE custom-modes doc **does** document a `skill` group ("Access skills"). Whether the `gsd` mode needs it depends on whether GSD's Bob skills invoke *other* Bob skills/commands in-mode. Recommendation below: **omit `skill` for v1** (GSD's seam is `command`→`gsd_run`, not skill→skill), keep `[read, edit, command, mcp]` as decided.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resolve `~/.bob` config home + `BOB_CONFIG_DIR` override | gsd-core runtime descriptor (`runtime-homes.cjs` via `capability-registry.cjs`) | gsd-tools shim | The shim asks the descriptor; the descriptor owns path logic. Pure data + existing resolver. |
| Emit `.bob/commands/*.md` | `bob` converter (`convertClaudeCommandToBobCommand`) wired via `artifactLayout.*.commands.converter` | install-profiles staging | Per-runtime converter function named by the registry; analog = `convertClaudeCommandToCursorCommand`. |
| Emit `.bob/skills/<name>/SKILL.md` | `bob` converter (`convertClaudeCommandToBobSkill`) via `artifactLayout.*.skills.converter` | install-profiles staging | Reduces frontmatter to `name`+`description`; analog = `convertClaudeCommandToAntigravitySkill`. |
| `AskUserQuestion` → numbered text | gsd-core `text_mode` config axis + workflow markdown | (none — NOT the converter) | Degradation is a runtime-config behavior, not an artifact transform (D-09). |
| Flag/skip unsupported skills | `bob` adapter module gate + generated support roster | curated skip-list | Reads the `bob` capability declaration + CAPABILITY-MAP; omits + records reason. |
| `custom_modes.yaml` idempotent merge | `bob` adapter module (js-yaml parse→merge→dump) | Phase 3 installer (caller only) | Self-contained merge fn (UP-01); installer invokes it. js-yaml allowed here, never in the install/staging path. |
| Backend-neutrality (no model names in core) | gsd-core (existing — verify only) | — | Verified by grep, not built. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `>=22.15.0` | Runtime for descriptor + converters + tests | Tighter of gsd-core (`>=22`) and Bob Shell (`>=22.15.0`) `[VERIFIED: CLAUDE.md + npm]` |
| `node:test` | built-in | Test runner for golden/unit tests (D-11) | Zero-dep, CLAUDE.md preference; `require('node:test')` confirmed available on this machine `[VERIFIED: node -e require]` |
| `node:assert` | built-in | Assertions (golden diffs, merge invariants) | Pairs with `node:test`; zero-dep |
| `node:fs` / `node:path` / `node:os` | built-in | Path resolution, golden-fixture read/write, staging | The ONLY deps gsd-core's runtime resolver uses `[VERIFIED: runtime-homes.cjs source]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-yaml` | `^4.1.0` (latest 4.2.0) | Parse + dump `custom_modes.yaml` for the idempotent merge (TRANS-05) | **Only** in the `bob` adapter/merge code — NEVER in the install/staging path (D-04). Not bundled with gsd-core (`require.resolve('js-yaml')` → MODULE_NOT_FOUND), so gsd-bob adds it as its own `dependency`. `[VERIFIED: npm view + gsd-core node check]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `js-yaml` for the merge | Hand-slice YAML with regex (node:fs-only) | Rejected by D-04: nested modes, multiline `roleDefinition`, comments make hand-slicing a correctness-critical idempotent merge too error-prone. |
| `node:test` | `vitest` | vitest adds a dev-dep + config surface and diverges from gsd-core's zero-dep test posture. No feature `node:test` lacks for golden/unit tests here. Stay on `node:test` (D-11). |
| In-place registry edits (D-07) | A dedicated `registerRuntime()` hook | **No such hook exists** — the `runtimes` object IS the registration surface; every consumer reads it directly. In-place data edit is already the canonical, upstream-friendly path. |

**Installation:**
```bash
# gsd-bob's own dependency (merge code only)
npm install js-yaml@^4.1.0
```

**Version verification (performed this session):**
- `js-yaml`: latest `4.2.0`, satisfies `^4.1.0`; repo `github.com/nodeca/js-yaml`, created 2011-11-02, ~254M weekly downloads `[VERIFIED: npm view]`
- `node:test` / `node:assert`: available on Node `v25.6.1` (dev machine) `[VERIFIED: node -e]`

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `js-yaml` | npm | 15 yrs (created 2011-11-02) | ~254M/wk | github.com/nodeca/js-yaml | SUS (`too-new` heuristic on 4.2.0) | **Approved** — false positive: 15-yr history, 254M downloads, no postinstall, not deprecated. Already named in CLAUDE.md. |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `js-yaml` — flagged solely because **4.2.0 was published 2026-05-31** (recent point release), which trips the `too-new` recency heuristic. All other signals are pristine (254M weekly downloads, 15-year-old repo, no postinstall script, not deprecated). This is a recency false-positive, NOT a slopsquat risk.

**Mitigation recommendation for the planner:** pin to a known-stable prior release (e.g. `js-yaml@4.1.0` exact, the version CLAUDE.md names) rather than floating to the just-published `4.2.0`, OR add a one-line `checkpoint:human-verify` confirming the lockfile resolves to the genuine `nodeca/js-yaml`. Either satisfies the gate; pinning is simpler and matches CLAUDE.md's stated `^4.1.0`.

## Architecture Patterns

### System Architecture Diagram

```
                         gsd-bob runtime registration (data, ~5 touchpoints)
                                              │
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  capability-registry.cjs  runtimes['bob'] = { runtime: {                   │
   │     configHome: {kind:'dot-home', name:'.bob', env:['BOB_CONFIG_DIR']},    │
   │     artifactLayout: { global/local: [ {kind:'commands', converter:'…'},    │
   │                                        {kind:'skills',   converter:'…'} ]},│
   │     commandStyle:'slash-hyphen', configFormat:'…', supportTier:2, … } }    │
   └───────────┬───────────────────────┬───────────────────────┬───────────────┘
               │ reads .configHome      │ reads .artifactLayout  │ reads .commandStyle
               ▼                        ▼                        ▼
   runtime-homes.cjs          runtime-artifact-layout.cjs   runtime-slash.cjs
   resolveConfigHome…()        dispatchKindEntry()→          formatGsdSlash()
   (RUNTIME-01/02)             skillsKind/convertedCommandsKind  (/gsd-<cmd>)
               │                        │ resolves converter STRING
               │                        ▼
               │             runtime-artifact-conversion.cjs (+ NEW bob fns)
               │             convertClaudeCommandToBobCommand  → .bob/commands/*.md  (TRANS-01)
               │             convertClaudeCommandToBobSkill    → .bob/skills/<n>/SKILL.md (TRANS-02)
               ▼
   gsd-tools.cjs  ──(gsd_run query)──►  ~/.bob  or  $BOB_CONFIG_DIR  or  <proj>/.bob

   ── separate, NOT a converter ───────────────────────────────────────────────
   bob adapter module (isolated, D-07):
     • emitGsdMode()      → custom_modes.yaml entry (slug:gsd, groups:[read,edit,command,mcp])
     • mergeCustomModes() → js-yaml parse → replace/insert gsd|gsd-* by slug → dump   (TRANS-05)
     • gateArtifact()     → checks bob capability decl → omit + "unsupported on Bob:<reason>" roster (TRANS-04)

   ── runtime-config behavior, NOT an artifact transform ───────────────────────
   workflow.text_mode:true (bob default) → workflow markdown swaps AskUserQuestion
        for numbered text choices at runtime  (TRANS-03, D-09)
```

### Recommended Project Structure
```
gsd-bob/
├── gsd-core/                         # vendored payload (the ~5 touchpoints are edited HERE)
│   └── bin/lib/
│       ├── capability-registry.cjs   # + runtimes['bob'] entry          (touchpoint 1: registry)
│       ├── runtime-name-policy.cjs    # + bob alias (or manifest entry)  (touchpoint 2: alias)
│       ├── runtime-homes.cjs          # (no edit — descriptor-driven; falls through to registry)
│       ├── runtime-artifact-conversion.cjs  # + convertClaudeCommandToBob* (touchpoint 4: converter)
│       └── ...
│   └── bin/shared/runtime-aliases.manifest.json  # + "bob": ["bob","bob-cli"] (preferred alias home)
├── src/ (or adapter/)
│   └── bob-adapter.cjs               # ISOLATED net-new substance (D-07): mode emitter, yaml merge, gate
└── test/
    ├── descriptor.test.cjs           # RUNTIME-01/02: BOB_CONFIG_DIR override
    ├── command-golden.test.cjs       # TRANS-01
    ├── skill-golden.test.cjs         # TRANS-02
    ├── text-mode-golden.test.cjs     # TRANS-03
    ├── unsupported-gate.test.cjs     # TRANS-04
    ├── merge.test.cjs                # TRANS-05
    ├── planning-bytecompat.test.cjs  # RUNTIME-03
    ├── backend-neutrality.test.cjs   # RUNTIME-04 (grep)
    └── fixtures/                      # golden inputs + expected outputs
```

### Pattern 1: Data-driven runtime entry (RUNTIME-02)
**What:** A runtime is a pure-data object in `runtimes`; consumers read `runtimes[id].runtime.*`.
**When to use:** Always — this is how cursor/cline/codex/antigravity are all defined.
**Example (the `bob` entry, templated on `cursor` + Antigravity skill converter):**
```js
// Source: capability-registry.cjs runtimes object (cursor entry, lines ~2976–3040)
"bob": {
  "id": "bob",
  "role": "runtime",
  "title": "IBM Bob",
  "description": "IBM Bob (bob.ibm.com) — backend-agnostic; .bob/skills + .bob/commands; text_mode prompts; sequential-inline subagents.",
  "tier": "core",
  "requires": [],
  "runtime": {
    "configHome": { "kind": "dot-home", "name": ".bob", "env": ["BOB_CONFIG_DIR"] },
    "configFormat": "none",
    "artifactLayout": {
      "global": [
        { "kind": "skills",   "destSubpath": "skills",   "prefix": "gsd-", "nesting": "nested", "recursive": false, "converter": "convertClaudeCommandToBobSkill" },
        { "kind": "commands", "destSubpath": "commands", "prefix": "gsd-", "nesting": "flat",   "recursive": false, "converter": "convertClaudeCommandToBobCommand" }
      ],
      "local": [ /* same two entries — Bob supports project .bob/ scope */ ]
    },
    "commandStyle": "slash-hyphen",
    "hooksSurface": "none",        // VERIFIED valid enum value (used by existing runtime entries)
    "sandboxTier": "none",
    "supportTier": 2,
    "installSurface": "profile-marker-only",  // no settings.json; custom_modes.yaml merge is a separate adapter call
    "writesSharedSettings": false,
    "permissionWriter": null,
    "extendedHookEvents": []
  }
}
```
> NOTE: `skills` entries **require** a non-null converter (`runtime-artifact-layout.cjs` throws `TypeError` if `converter:null` for skills). `commands` entries may use `converter:null` (raw copy) — but Bob needs frontmatter normalization, so use a real converter.

### Pattern 2: Skill converter reducing to `name`+`description` (TRANS-02)
**What:** Strip all frontmatter except `name`+`description`; pass body through.
**When to use:** Bob SKILL.md reads only `name`+`description` (doc-confirmed); `effort`/`allowed-tools`/`argument-hint` must be stripped.
**Example (Antigravity analog — the closest existing template):**
```js
// Source: runtime-artifact-conversion.cjs:662 convertClaudeCommandToAntigravitySkill
function convertClaudeCommandToBobSkill(content, skillName, _runtime, _cmdNames, _isGlobal) {
  const { frontmatter, body } = extractFrontmatterAndBody(content);
  if (!frontmatter) return content;
  const name = skillName || extractFrontmatterField(frontmatter, 'name') || 'unknown';
  const description = extractFrontmatterField(frontmatter, 'description') || '';
  // yamlQuote() (= JSON.stringify) guards YAML flow chars like "[BETA] …"
  const fm = `---\nname: ${name}\ndescription: ${yamlQuote(description)}\n---`;
  return `${fm}\n${body}`;
}
```
Reuse the shipped helpers `extractFrontmatterAndBody`, `extractFrontmatterField`, `yamlQuote` (exported by `runtime-artifact-conversion.cjs`).

### Pattern 3: Flat command converter keeping `description`+`argument-hint` (TRANS-01)
**What:** Emit plain `.bob/commands/<name>.md`. Unlike Cursor (which **strips** all frontmatter), **Bob keeps** `description`+`argument-hint`.
**Example (Cursor command analog, adapted to retain Bob's two frontmatter fields):**
```js
// Source: runtime-artifact-conversion.cjs:791 convertClaudeCommandToCursorCommand
function convertClaudeCommandToBobCommand(content, _commandName) {
  const { frontmatter, body } = extractFrontmatterAndBody(content);
  const description  = frontmatter ? extractFrontmatterField(frontmatter, 'description')   : null;
  const argumentHint = frontmatter ? extractFrontmatterField(frontmatter, 'argument-hint') : null;
  let fm = '---\n';
  if (description)  fm += `description: ${yamlQuote(description)}\n`;
  if (argumentHint) fm += `argument-hint: ${yamlQuote(argumentHint)}\n`;
  fm += '---\n';
  // Strip effort/allowed-tools/agent/etc. by reconstructing fm from only the two allowed fields.
  return `${fm}\n${body.trimStart()}`;
}
```
> `$1`/`$2` positional args: Bob commands use `$1`,`$2` (NOT `$ARGUMENTS`, doc-confirmed). The GSD command bodies that reference `$ARGUMENTS` need projection to `$1` (and a documented "args after the command" convention). The cursor converter maps `$ARGUMENTS → {{GSD_ARGS}}`; the bob converter should map `$ARGUMENTS → $1` (or a documented note). Confirm which GSD source commands use `$ARGUMENTS` when choosing the representative command for SC#2.

### Pattern 4: `text_mode` degradation is runtime-config, not converter (TRANS-03)
**What:** `workflow.text_mode` is a config axis (`config-schema.manifest.json`, default `false`). When `true`, **workflow markdown** (not the converter) replaces `AskUserQuestion` with numbered text prompts.
**Evidence (live source):**
```
config-schema.manifest.json:  "workflow.text_mode"
config-defaults.manifest.json: "text_mode": false        # global default
config-loader.cjs:557/663:     text_mode flows into init JSON
plan-phase.md:160:  "Set TEXT_MODE=true if --text … OR text_mode from init JSON is true.
                     When TEXT_MODE is active, replace every AskUserQuestion call with a
                     plain-text numbered list and ask the user to type their choice number."
discuss-phase.md:108: "Text mode … do not use AskUserQuestion at all."
debug.md:153: "TEXT_MODE fallback: when workflow.text_mode is true, replace AskUserQuestion
               calls with plain-text numbered prompts and wait for typed replies."
```
**bob wiring (D-09):** make `workflow.text_mode` default to `true` whenever runtime == bob. Two options for the planner:
- (a) Set `"text_mode": true` in the config written at install for the bob runtime (preferred — explicit, inspectable in `.planning/config.json`), or
- (b) Add a per-runtime default override in `config-loader.cjs` (heavier; touches shared core). Prefer (a).

### Anti-Patterns to Avoid
- **Writing a prompt-rewriting converter for AskUserQuestion.** The seam already exists at the workflow layer; rewriting in the converter duplicates it and is NOT upstreamable (D-09).
- **Setting `name:'bob'` in the descriptor.** `dot-home` does `path.join(home, name)` → `~/bob`. Use `name:'.bob'`.
- **Letting `js-yaml` leak into the install/staging path.** D-04 confines it to the merge code. The install path stays node:fs-only for audit minimalism.
- **Passing unsupported frontmatter keys through.** Bob reads only `name`+`description` (skills) / `description`+`argument-hint` (commands). A skill *without a usable description is ignored* by Bob — reconstruct frontmatter from a whitelist, don't filter-in-place.
- **`converter:null` on a `skills` artifactLayout entry.** `runtime-artifact-layout.cjs` throws on this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config-home resolution + env override | A custom path resolver | `resolveConfigHomeFromDescriptor` (`runtime-homes.cjs`) with a `dot-home` descriptor | Already handles env precedence, tilde expansion, project/global; proven below |
| Runtime alias canonicalization | A switch on runtime strings | `runtime-name-policy.cjs` + `runtime-aliases.manifest.json` | Existing alias-manifest mechanism; one JSON entry |
| Slash-command form (`/gsd-<cmd>`) | String concatenation | `formatGsdSlash` (`runtime-slash.cjs`) reads `commandStyle` from registry | Already descriptor-driven; bob's `slash-hyphen` is the default branch |
| Frontmatter parse/extract/quote | Regex from scratch | `extractFrontmatterAndBody`, `extractFrontmatterField`, `yamlQuote`, `yamlIdentifier` (exported from `runtime-artifact-conversion.cjs`) | Battle-tested across 15 runtimes; handles edge cases (YAML flow chars) |
| Artifact staging (copy + per-file convert) | Custom fs walk | `skillsKind`/`convertedCommandsKind` dispatch in `runtime-artifact-layout.cjs` | The registry's `converter` string wires into these automatically |
| YAML round-trip for `custom_modes.yaml` | Hand-sliced regex merge | `js-yaml` `load`/`dump` | Nested/multiline mode fields make hand-slicing unsafe (D-04) |

**Key insight:** Nearly everything Phase 2 needs already exists in gsd-core as descriptor-driven machinery. The net-new code is small: two converter functions (skill, command), one mode-emitter + yaml-merge + gate adapter module, and a handful of `node:test` golden tests. The "registry entry" is data, not code.

## Common Pitfalls

### Pitfall 1: Descriptor `name` resolves to the wrong directory
**What goes wrong:** `{ kind:'dot-home', name:'bob' }` resolves to `~/bob`, not `~/.bob`.
**Why it happens:** `dot-home` does `path.join(home, configHome.name)` with no dot inserted; existing entries pre-dot the name (`.claude`, `.cline`, `.codex`).
**How to avoid:** Use `name:'.bob'`. **Empirically confirmed this session:** with `name:'.bob'`, default → `~/.bob`, `BOB_CONFIG_DIR=/tmp/xbob` → `/tmp/xbob`, `BOB_CONFIG_DIR=~/custom-bob` → tilde-expanded.
**Warning signs:** Descriptor unit test resolves to a path missing the leading dot.

### Pitfall 2: `capability-registry.cjs` is generated — "DO NOT EDIT BY HAND"
**What goes wrong:** The file header says it's generated by `scripts/gen-capability-registry.cjs` from `capabilities/<id>/capability.json` sources. Hand-editing the generated file works at runtime but diverges from the upstream PR shape (which adds a `capability.json` source, not a hand-edit).
**Why it happens:** The installed/vendored payload ships the **generated** `.cjs` but **not** the `scripts/` generator or the `capability.json` sources (confirmed: `find` for `capability.json` and `gen-capability-registry*` returns nothing in `~/.claude/gsd-core/`).
**How to avoid:** For the **vendored** gsd-bob payload, hand-edit the generated `runtimes` object (it's the only available surface). For the **upstream PR** (later), add `capabilities/bob/capability.json` + regenerate. Document this divergence explicitly so the "move not rewrite" promise (UP-01) is honest: the vendored edit is to the generated file; the PR edit is to the source. The *resulting data* is identical.
**Warning signs:** Planner assumes a `capability.json` source exists in the vendored tree (it doesn't).

### Pitfall 3: `installSurface`/`hooksSurface`/`sandboxTier` must be valid enum values
**What goes wrong:** `runtime-config-adapter-registry.cjs` throws `TypeError` if `installSurface`/`hooksSurface`/`sandboxTier` are missing or invalid (`resolveInstallPlanFromRuntimes`).
**Why it happens:** These axes are validated against fixed enums.
**How to avoid (RESOLVED — verified valid values this session):**
- `hooksSurface`: valid values are `none`, `settings-json`, `cline-rules`, `codex-hooks-json`, `copilot-inline`, `cursor-hooks-json`. **Use `"none"`** — it's a real, used value; Bob has no hook surface.
- `installSurface`: valid values are `settings-json`, `cline-rules`, `codex-toml`, `copilot-instructions`, `cursor-hooks-json`, `profile-marker-only`. **Use `"profile-marker-only"`** (early-returns after writing only the profile marker — no settings.json).
- `sandboxTier`: `none` (the only non-codex value).
**Warning signs:** `resolveInstallPlan('bob')` throws `TypeError` in a unit test — means one of the three axes is missing/invalid.

### Pitfall 4: Bob keeps command frontmatter; the Cursor analog strips it
**What goes wrong:** Copying `convertClaudeCommandToCursorCommand` verbatim drops ALL frontmatter, but Bob slash commands read `description`+`argument-hint` from frontmatter.
**How to avoid:** Reconstruct a 2-field frontmatter block (Pattern 3) rather than stripping wholesale.
**Warning signs:** Golden command output has no `---` block; command menu shows no description in Bob.

### Pitfall 5: js-yaml drops comments on re-emit (idempotent merge)
**What goes wrong:** `dump(load(yaml))` loses user comments in `custom_modes.yaml`.
**Why it happens:** js-yaml is a data round-tripper, not a CST preserver. D-05 already accepted this (sentinel-comment markers were rejected for this reason).
**How to avoid:** Document the comment-loss caveat in the support roster/README; the merge invariant the unit test asserts is *slug-level idempotency* (other slugs' data preserved exactly), not comment preservation.
**Warning signs:** Merge golden test compares comments — it should compare parsed mode entries by slug instead.

## Code Examples

### Resolve bob config home with BOB_CONFIG_DIR override (RUNTIME-01/02 — proven this session)
```js
// Source: runtime-homes.cjs resolveConfigHomeFromDescriptor (dot-home branch)
const { resolveConfigHomeFromDescriptor } = require('gsd-core/bin/lib/runtime-homes.cjs');
const desc = { kind: 'dot-home', name: '.bob', env: ['BOB_CONFIG_DIR'] };

resolveConfigHomeFromDescriptor(desc, { env:{},                         home:'/home/u', existsSync:()=>false }); // → /home/u/.bob
resolveConfigHomeFromDescriptor(desc, { env:{BOB_CONFIG_DIR:'/tmp/x'},  home:'/home/u', existsSync:()=>false }); // → /tmp/x
resolveConfigHomeFromDescriptor(desc, { env:{BOB_CONFIG_DIR:'~/cbob'},  home:'/home/u', existsSync:()=>false }); // → /home/u/cbob
```
The descriptor unit test (RUNTIME-01/02) can call this directly with injected `env`/`home` — hermetic, no real filesystem, no live Bob. `[VERIFIED: executed against live runtime-homes.cjs]`

### Idempotent custom_modes.yaml merge by slug (TRANS-05)
```js
// In the isolated bob adapter module (js-yaml allowed here only)
const yaml = require('js-yaml');
function mergeCustomModes(existingYamlText, gsdModeEntry /* {slug:'gsd', ...} */) {
  const doc = existingYamlText ? (yaml.load(existingYamlText) || {}) : {};
  const modes = Array.isArray(doc.customModes) ? doc.customModes : [];
  const isOwned = (slug) => slug === 'gsd' || (typeof slug === 'string' && slug.startsWith('gsd-'));
  const next = modes.filter(m => !(m && isOwned(m.slug) && m.slug === gsdModeEntry.slug));
  next.push(gsdModeEntry);                       // replace-or-insert OUR slug; never touch others
  doc.customModes = next;
  return yaml.dump(doc, { lineWidth: -1 });      // -1 = no line wrapping, stable output
}
```
Unit-test invariants: (1) running twice == running once (idempotent); (2) a pre-seeded non-gsd user mode is byte-identical in the parsed output; (3) an existing `gsd` slug is replaced, not duplicated.

### gsd custom mode entry (D-01/D-02/D-03)
```yaml
# emitted by the adapter; merged into custom_modes.yaml
customModes:
  - slug: gsd
    name: GSD
    roleDefinition: >-
      You run GSD (Getting Stuff Done) spec-driven planning workflows. Invoke the
      installed /gsd-* slash commands; planning artifacts live in .planning/.
    whenToUse: Use for GSD planning, execution, and verification workflows.
    customInstructions: >-
      Shell out to `node gsd-tools.cjs` via the command tool for all gsd_run queries.
    groups: [read, edit, command, mcp]   # D-02; see skill/browser recommendation below
```

## Runtime State Inventory

> This phase is greenfield additive (new runtime entry + new converters + new adapter module). It does NOT rename or migrate existing runtime state. No stored data, live service config, OS registrations, secrets, or build artifacts are renamed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keyed on a renamed string | none |
| Live service config | None — no external service config touched | none |
| OS-registered state | None | none |
| Secrets/env vars | `BOB_CONFIG_DIR` is **new** (added by this phase as gsd-bob's shim override), not a rename | code adds the env name to the descriptor only |
| Build artifacts | The vendored `capability-registry.cjs` is a generated artifact; editing it by hand is the documented vendored-payload approach (Pitfall 2). No stale artifact removal needed. | none |

**Nothing found in categories Stored data / Live service config / OS-registered state — verified: Phase 2 is purely additive to the runtime registry + converter layer.**

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `runtime === '...'` branching in install.js | Descriptor-driven `runtimes` registry + dispatch tables (ADR-857/ADR-894) | gsd-core 1.x | Adding a runtime = adding data, not code branches — this is why the bob entry is mostly data |
| Hand-written `.cjs` lib files | TS source-of-truth compiled to `.cjs` at publish (ADR-457) | gsd-core 1.x | Vendored payload ships generated `.cjs` only; upstream PR edits TS/json source (Pitfall 2) |
| Legacy `/gsd:<cmd>` colon command form | Hyphen form `/gsd-<cmd>` only (#2808) | gsd-core 1.x | bob's `commandStyle:'slash-hyphen'` is the default; colon form never emitted |

**Deprecated/outdated:**
- `/gsd:<cmd>` colon form — never emit; `formatGsdSlash` strips it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ~~installSurface/hooksSurface validity~~ **RESOLVED:** `installSurface:'profile-marker-only'` + `hooksSurface:'none'` + `sandboxTier:'none'` are all verified-valid enum values; the bob entry passes `resolveInstallPlan` with no settings.json writer and no new enum value | Pattern 1 / Pitfall 3 | None — confirmed valid this session |
| A2 | Bob's project-scope custom mode lives at `<project>/.bob/custom_modes.yaml` (mirrors `~/.bob/custom_modes.yaml`) | TRANS-05 / mode emit | Merge target path wrong; low risk — doc states both global and project `.bob/` config locations |
| A3 | Defaulting `workflow.text_mode:true` via the install-written `.planning/config.json` (option a) is sufficient for all GSD workflows to degrade prompts | Pattern 4 / D-09 | If some workflow reads text_mode only from a global default file, option (b) per-runtime override may be needed — verify by grepping `text_mode` consumers in target workflows |
| A4 | GSD's Bob skills do NOT invoke other Bob skills in-mode (so the `gsd` mode does not need the `skill` group) | D-02 resolution | If a ported GSD workflow relies on skill→skill invocation under Bob, add `skill` to groups — but the GSD seam is `command`→`gsd_run`, so this is low risk for v1's representative scope |
| A5 | The vendored `capability-registry.cjs` can be hand-edited and gsd-bob does not need to ship the `gen-capability-registry` generator for v1 | Pitfall 2 | If the planner wants generator-parity, it must vendor `scripts/` + `capabilities/*/capability.json` too (heavier); not required for a working vendored runtime |

## Open Questions (RESOLVED)

1. **`$ARGUMENTS` → `$1` projection scope**
   - What we know: Bob commands use `$1`/`$2`, not `$ARGUMENTS`; GSD source commands reference `$ARGUMENTS`.
   - What's unclear: how many GSD commands rely on multi-arg `$ARGUMENTS` semantics that don't map cleanly to `$1`.
   - Recommendation: For SC#2's single representative command, pick one with simple/no args first; document the `$ARGUMENTS→$1` mapping as a converter transform and defer complex multi-arg cases to Phases 4–5.
   - **RESOLVED:** For SC#2, the representative command is a simple/no-arg command (so `$ARGUMENTS→$1` projection reduces to a no-op for the chosen command); the general multi-arg `$ARGUMENTS→$1` projection transform is deferred to Phases 4–5. This resolution is incorporated in plan 02-02 Task 1, which scopes the converter to the single representative command and records the deferral. No multi-arg `$ARGUMENTS` projection is required to land Phase 2.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | descriptor + converters + tests | ✓ | v25.6.1 (≥22.15.0 floor) | — |
| `node:test` / `node:assert` | golden/unit tests (D-11) | ✓ | built-in | — |
| `js-yaml` | custom_modes.yaml merge | ✗ (not yet a dep) | latest 4.2.0 on npm | none needed — `npm install js-yaml@^4.1.0` |
| Vendored `gsd-core/bin/lib/*.cjs` | the registry/converter surface being extended | ✓ (live at `~/.claude/gsd-core/`; vendor into `gsd-bob/gsd-core/`) | 1.5.0 | — |
| Live IBM Bob | end-to-end execution | ✗ (by design) | — | All Phase 2 verification is doc-conformance/golden/equivalence (D-11); on-device pass is Phase 6 |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `js-yaml` — install as gsd-bob's own dependency (merge code only, never the install path).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert` (Node ≥22.15.0; verified on v25.6.1) |
| Config file | none — `node:test` needs no config (CLAUDE.md zero-dep preference) |
| Quick run command | `node --test test/<file>.test.cjs` |
| Full suite command | `node --test test/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUNTIME-01/02 | `bob` descriptor resolves `~/.bob`; `BOB_CONFIG_DIR` overrides; tilde expands; project scope = `<proj>/.bob` | unit | `node --test test/descriptor.test.cjs` | ❌ Wave 0 |
| RUNTIME-03 | `.planning/` artifact from bob-config run byte-identical to claude-config run | golden diff | `node --test test/planning-bytecompat.test.cjs` | ❌ Wave 0 |
| RUNTIME-04 | Zero model-name literals (Claude/Gemini/Granite/GPT) in core paths | grep assertion | `node --test test/backend-neutrality.test.cjs` | ❌ Wave 0 |
| TRANS-01 | GSD command → `.bob/commands/<name>.md` with only `description`+`argument-hint` frontmatter + `$1` args | golden file | `node --test test/command-golden.test.cjs` | ❌ Wave 0 |
| TRANS-02 | GSD skill → `.bob/skills/<name>/SKILL.md` with only `name`+`description` (effort/allowed-tools stripped) | golden file | `node --test test/skill-golden.test.cjs` | ❌ Wave 0 |
| TRANS-03 | With `text_mode:true`, configured flow asks + captures a validated numbered answer (Claude runtime) | golden | `node --test test/text-mode-golden.test.cjs` | ❌ Wave 0 |
| TRANS-04 | A representative unsupported skill is absent from emitted set AND recorded as `unsupported on Bob: <reason>` | unit | `node --test test/unsupported-gate.test.cjs` | ❌ Wave 0 |
| TRANS-05 | Merge is idempotent; pre-seeded user modes preserved; `gsd` slug replaced not duplicated | unit | `node --test test/merge.test.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the single test file covering the touched requirement (e.g. `node --test test/skill-golden.test.cjs`).
- **Per wave merge:** `node --test test/` (full suite).
- **Phase gate:** Full suite green before `/gsd-verify-work`; plus AC-05+ appended to `.planning/ACCEPTANCE-CHECKLIST.md` for the Phase 6 on-device pass.

### Wave 0 Gaps
- [ ] `test/descriptor.test.cjs` — RUNTIME-01/02 (inject env/home into `resolveConfigHomeFromDescriptor`)
- [ ] `test/command-golden.test.cjs` + `test/fixtures/command/` — TRANS-01
- [ ] `test/skill-golden.test.cjs` + `test/fixtures/skill/` — TRANS-02
- [ ] `test/text-mode-golden.test.cjs` — TRANS-03
- [ ] `test/unsupported-gate.test.cjs` — TRANS-04
- [ ] `test/merge.test.cjs` + `test/fixtures/custom_modes/` (pre-seeded user modes) — TRANS-05
- [ ] `test/planning-bytecompat.test.cjs` — RUNTIME-03
- [ ] `test/backend-neutrality.test.cjs` — RUNTIME-04
- [ ] Dependency install: `npm install js-yaml@^4.1.0` (merge code only)
- [ ] Vendor `gsd-core/bin/lib/*` into `gsd-bob/gsd-core/` so tests import the extended registry

`node:test` is sufficient — no vitest needed. Every test is hermetic (injected env/home, in-memory fixtures, string comparisons); none requires a live Bob.

## Security Domain

> `security_enforcement` is not explicitly set to false; included for completeness. This phase emits config artifacts and shells out, so input-handling and supply-chain controls apply.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface in Phase 2 |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | The YAML merge consumes user-authored `custom_modes.yaml` — use `js-yaml` `load` (safe schema by default in v4; it does NOT execute arbitrary tags). Never `eval` or template-interpolate YAML values into shell. |
| V6 Cryptography | no | — |
| V14 Configuration / Supply Chain | yes | Pin `js-yaml` (Package Legitimacy Audit); keep install/staging path `node:fs`-only (D-04) to minimize audited dependency surface |

### Known Threat Patterns for {gsd-bob descriptor/converter + yaml merge}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/oversized `custom_modes.yaml` triggering a merge that drops/corrupts user modes | Tampering | js-yaml `load` (safe schema), slug-scoped replace (never touch non-`gsd` slugs), idempotency unit test |
| Slopsquat / typosquat dependency | Tampering | Package Legitimacy gate — `js-yaml` verified (254M dl, nodeca repo); pin to `4.1.0` |
| Command tool shell-out (`node gsd-tools.cjs`) executing attacker-controlled args | Elevation | `gsd_run` args come from GSD workflows, not raw user text; the `command` group is scoped to the `gsd` mode; no arg is interpolated unescaped into a shell string by the converter |
| Frontmatter injection (YAML flow chars breaking Bob's parser → skill ignored) | DoS (skill silently dropped) | `yamlQuote` (= `JSON.stringify`) every emitted description; golden test asserts well-formed frontmatter |

## Sources

### Primary (HIGH confidence)
- `~/.claude/gsd-core/bin/lib/runtime-homes.cjs` — `resolveConfigHomeFromDescriptor` (dot-home/dot-home-nested/xdg/generic-agents-root), `getGlobalConfigDir`, descriptor-driven lookup. Read directly + **executed** to prove the bob descriptor.
- `~/.claude/gsd-core/bin/lib/capability-registry.cjs` — the `runtimes` object (claude/cline/cursor/codex/antigravity/augment/codebuddy/copilot entries read in full, lines 2591–3040); header "generated by scripts/gen-capability-registry.cjs — DO NOT EDIT BY HAND."
- `~/.claude/gsd-core/bin/lib/runtime-artifact-layout.cjs` — `dispatchKindEntry`, `skillsKind`/`convertedCommandsKind`, converter-string resolution, skills-require-converter TypeError.
- `~/.claude/gsd-core/bin/lib/runtime-artifact-conversion.cjs` — `convertClaudeCommandToAntigravitySkill` (name+description reduction), `convertClaudeCommandToCursorCommand`/`convertClaudeCommandToCursorSkill` (flat command + AskUserQuestion→conversational degradation), shared helpers + module.exports list.
- `~/.claude/gsd-core/bin/lib/runtime-config-adapter-registry.cjs` — `resolveInstallPlanFromRuntimes` validation (installSurface/hooksSurface/sandboxTier enums), `INSTALL_SURFACES`.
- `~/.claude/gsd-core/bin/lib/runtime-name-policy.cjs` + `bin/shared/runtime-aliases.manifest.json` — alias mechanism (FALLBACK_ALIASES + manifest).
- `~/.claude/gsd-core/bin/lib/runtime-slash.cjs` — `formatGsdSlash`, `commandStyle` read from registry, `/gsd-<cmd>` default.
- `~/.claude/gsd-core/bin/shared/config-schema.manifest.json` + `config-defaults.manifest.json` + `bin/lib/config-loader.cjs` — `workflow.text_mode` axis, default `false`, flow into init JSON.
- `~/.claude/gsd-core/workflows/{plan-phase,discuss-phase,debug}.md` — workflow-layer `AskUserQuestion`→numbered-text degradation driven by `text_mode`.
- `~/.claude/gsd-core/bin/gsd_run` — the standalone shim that execs `gsd-tools.cjs`.
- IBM Bob docs (live fetch this session): `bob.ibm.com/docs/ide/configuration/custom-modes` (six tool groups incl. `skill`/`browser`; customModes shape), `bob.ibm.com/docs/ide/core-concepts/tools` (read/write/command/mcp/mode/question tools; `ask_followup_question` free-text only), `bob.ibm.com/docs/ide/features/slash-commands` (`description`+`argument-hint`, `$1`/`$2`, no `$ARGUMENTS`), `bob.ibm.com/docs/ide/features/skills` (`name`+`description`, no-description→ignored).
- `npm view js-yaml` + `gsd-tools query package-legitimacy check` — version, downloads, repo, verdict.
- Phase 1 `CAPABILITY-MAP.md` §1/§2 — input contract.

### Secondary (MEDIUM confidence)
- Inference that GSD Bob skills don't need the `skill` group (A4) — based on the GSD seam being `command`→`gsd_run`; not empirically tested under live Bob.

### Tertiary (LOW confidence)
- BobShell custom-modes variant `skill`-group parity (referenced via CAPABILITY-MAP, not re-fetched this session).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against live source + npm; node:test/js-yaml confirmed.
- Architecture (registry/converter/text_mode wiring): HIGH — read and (for the descriptor) executed live gsd-core source.
- D-02 tool groups: HIGH — fetched IDE custom-modes doc; six groups confirmed incl. `skill`/`browser`.
- D-07 registration mechanism: HIGH — confirmed the `runtimes` object is the only registration surface (no hook).
- Pitfalls (name dot, generated registry, hooksSurface enum): HIGH for #1/#2 (source-confirmed), MEDIUM for #3 (valid hooksSurface set needs one more file read by the planner).

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (gsd-core is the moving dependency; re-verify the `runtimes` shape if gsd-core bumps past 1.5.0)
