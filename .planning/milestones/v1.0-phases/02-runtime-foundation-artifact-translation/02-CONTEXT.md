# Phase 2: Runtime Foundation & Artifact Translation - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the two irreducible cores of gsd-bob, both verifiable WITHOUT a live Bob:

1. **Backend-agnostic runtime spine** — a `bob` runtime descriptor (config home, artifact layout, aliases) expressed in gsd-core's existing descriptor vocabulary, so `gsd_run query` resolves a Bob home when invoked under Bob (RUNTIME-01, RUNTIME-02). Plus the cross-cutting guarantees: `.planning/` byte-compatibility Claude↔Bob (RUNTIME-03) and zero model-backend branching in core (RUNTIME-04).
2. **Bob-native emitter / converters** — translate a GSD command → `.bob/commands/*.md` slash command and a GSD skill → `.bob/skills/<name>/SKILL.md` Agent Skill conforming to Bob's documented frontmatter contract (TRANS-01, TRANS-02); degrade `AskUserQuestion` → numbered `text_mode` choices (TRANS-03); flag/skip skills whose primitives Bob can't support (TRANS-04); and merge a GSD custom mode into `custom_modes.yaml` idempotently (TRANS-05).

**This phase proves the translation machinery on representative examples** (SC#2 reads "a command" / "a skill" — singular) plus the foundation guarantees. It does **NOT** port the full skill roster — the core loop is Phase 4, quality gates Phase 5.

**Locked upstream — do NOT re-decide:**
- Conservative defaults from Phase 1: subagents → **sequential-inline**; prompts → **conversational `text_mode`** (recorded in CAPABILITY-MAP.md; not relitigated).
- Vendored gsd-core payload; CJS source; dependency-free **install/staging** path (PROJECT.md / CLAUDE.md decisions).
- Adjacent-surface contracts (CAPABILITY-MAP §2): SKILL.md reads only `name`+`description`; command frontmatter `description`+`argument-hint`; **strip** unsupported keys; hyphen command form; `$1`/`$2` positional args.

</domain>

<decisions>
## Implementation Decisions

### GSD custom mode (the shell-out seam) — discussed
- **D-01:** Emit **one** dedicated `gsd` custom mode in Phase 2. SPIKE-03 established that shelling out to `node gsd-tools.cjs` requires running in a Bob mode that holds the `command` tool group — a dedicated mode *guarantees* this seam rather than betting on Bob's built-in modes (unverifiable with no live Bob). One mode keeps v1 simple; multi-mode context partitioning stays a v2 idea (CLAUDE.md already deferred it).
- **D-02:** The `gsd` mode declares tool groups **`[read, edit, command, mcp]`** — `command` is the `gsd_run` shell-out seam, `edit` writes `.planning/` artifacts, `read` is baseline, `mcp` covers context7. Whether to also declare `skill` (Bob skill-invocation) and/or `browser` is a **researcher confirm-item** against the IDE custom-modes doc — add only if the converter relies on in-mode skill invocation.
- **D-03:** `roleDefinition` / `customInstructions` / `whenToUse` content is **Claude's discretion** — minimal, pointing users at the GSD slash commands and noting that planning artifacts live in `.planning/`. The load-bearing field is `groups` (D-02).

### custom_modes.yaml merge (TRANS-05) — discussed
- **D-04:** Use **`js-yaml ^4.1.0`** for parse-based merge, scoped to the **descriptor/converter + merge code only** — the **install/staging path stays `node:fs`-only** so the audited install surface remains dependency-free. CLAUDE.md deferred js-yaml *to the Modes milestone*; TRANS-05 pulls Modes' YAML need into v1, so the trigger condition CLAUDE.md named is now met. Hand-slicing arbitrary user YAML (nested modes, multiline `roleDefinition`, comments) for a correctness-critical idempotent merge is too error-prone.
- **D-05:** Merge **ownership by slug convention**: our entry is slug **`gsd`** (future modes `gsd-*`). The merge replaces any `gsd`/`gsd-*` slug in place, inserts if absent, and **never touches other slugs**. Phase 3's INSTALL-04 already says "preserving … `gsd-*` mode entries," so this is the convention the roadmap already assumes — self-contained (no external state), and exactly what the SC#5 merge unit test asserts. (Sentinel-comment markers were rejected: js-yaml drops comments on re-emit.)
- **D-06:** The **merge logic lives in the Phase 2 descriptor/converter layer** (UP-01 wants it self-contained, not in the installer); the Phase 3 installer *calls* it. Phase 2 proves it with a merge **unit test** + golden fixtures (pre-seeded user modes), not by writing to a real `~/.bob`.

### Adapter injection seam (RUNTIME-01/02, UP-01) — Claude's recommendation (delegated)
- **D-07:** Add the `bob` runtime by editing the vendored gsd-core registry at the **same ~5 touchpoints the eventual upstream PR will use** (registry entry, alias, configHome/getDirName, converter wiring, shim branch — per CLAUDE.md "Stack Patterns"), so the vendored diff **equals** the future PR diff (a "move, not a rewrite," UP-01). Keep **all net-new Bob substance** (the bob converter specifics, mode emitter, yaml merge) behind **one isolated `bob`-named adapter module** that those registry one-liners point to — satisfying "Bob-specific code isolated to one adapter component." **Researcher confirm-item:** check whether gsd-core exposes a cleaner runtime-registration hook (which would be even more upstream-friendly than in-place edits); if so, prefer it.

### Config-home env override (RUNTIME-01, ROADMAP SC#1) — Claude's recommendation (delegated)
- **D-08:** The `bob` descriptor uses the `dot-home` kind: `{ kind:'dot-home', name:'bob', env:['BOB_CONFIG_DIR'] }` → default `~/.bob`, project scope `<project>/.bob/`. **Include `BOB_CONFIG_DIR`** as **gsd-bob's own shim-level override** (resolved by `gsd-tools`) — this is required to satisfy ROADMAP SC#1 ("running the shim with `BOB_CONFIG_DIR` overridden"). This does **not contradict** CAPABILITY-MAP D-11 / SPIKE-04(b): the map only says *no Bob-honored relocation var is documented*; we are not asserting Bob itself reads it. Whether Bob honors it is probed on-device (AC step).

### text_mode degradation (TRANS-03) — Claude's recommendation (delegated)
- **D-09:** Satisfy TRANS-03 by **reusing gsd-core's existing `text_mode` seam** — the `bob` runtime defaults `workflow.text_mode: true` (and/or declares no structured-prompt capability), so gsd-core's existing `text_mode` path renders numbered choices and captures a validated answer. **No prompt-rewriting in the converters.** Verified by a golden test that the configured flow asks + captures a validated answer in the Claude runtime with `text_mode` forced on (cleaner and directly upstreamable; leverages the seam PROJECT.md §Context already names).

### Unsupported-primitive flag/skip (TRANS-04) — Claude's recommendation (delegated)
- **D-10:** Gate each candidate artifact **programmatically**: check its required primitives against the `bob` capability declaration (no isolated subagents, no structured prompts beyond text_mode) and CAPABILITY-MAP; if a hard dependency is unmet, **omit the artifact** from `.bob/commands` & `.bob/skills` (so Bob never loads something broken) **and record "unsupported on Bob: <reason>" in a generated support roster** so the gap is loud, never silent (TRANS-04). Back the programmatic check with a small curated skip-list for cases skill metadata can't express. Phase 2 proves the mechanism on **at least one representative unsupported case** — full-roster gating rides with Phases 4–5.

### Verification approach (cross-cutting) — Claude's recommendation (delegated)
- **D-11:** Dev-time verification is **golden-file + Claude-runtime-equivalence + doc-conformance** (no live Bob): golden tests for emitted command/skill/mode shape (TRANS-01/02), text_mode golden (TRANS-03), merge unit test (TRANS-05), `.planning/` byte-compat golden diff (RUNTIME-03), and a **backend-neutrality grep** asserting zero model-name literals in core paths (RUNTIME-04). Test runner = **`node:test`** (zero-dep, matches CLAUDE.md preference) unless the planner finds a strong reason for vitest. Each requirement also **appends device-runnable AC steps (AC-05+) to `.planning/ACCEPTANCE-CHECKLIST.md`** per the Phase 1 D-07 convention.

### Claude's Discretion
- `gsd` mode `roleDefinition`/`customInstructions`/`whenToUse` prose (D-03).
- Golden-fixture directory layout and test-file naming; choice of `node:test` vs vitest if a reason emerges (D-11).
- Exact representative command + skill chosen to prove the converter (SC#2).
- The internal structure of the isolated `bob` adapter module (D-07).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Project planning contract
- `.planning/ROADMAP.md` §"Phase 2: Runtime Foundation & Artifact Translation" — the 5 Success Criteria and the test-deferred cross-cutting principle.
- `.planning/REQUIREMENTS.md` §"Runtime Foundation" (RUNTIME-01..04) and §"Artifact Translation" (TRANS-01..05) — the 9 requirements this phase covers.
- `.planning/PROJECT.md` §Constraints, §Key Decisions — backend-neutrality, vendoring-then-upstream, parity-first (flag/skip gaps), no-local-Bob test-deferred development.

### Phase 1 input contract (the design's source of truth)
- `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` — **INPUT CONTRACT. MUST read.** SC#5 inspects the emitter's output *against this map*. §1 = SPIKE defaults (subagents, prompts, `command` shell-out, config-home/env/IDE-vs-Shell); §2 = adjacent-surface contracts (SKILL.md, slash-command, custom-mode `groups`, MCP/Rules/AGENTS.md).
- `.planning/phases/01-bob-capability-mapping/01-CONTEXT.md` — Phase 1 decisions: D-03 (machine-readable descriptor is THIS phase's work), D-07 (ACCEPTANCE-CHECKLIST append convention).
- `.planning/ACCEPTANCE-CHECKLIST.md` — **append target** for this phase's device-runnable steps (AC-05+), same AC-ID + `Cmd/Expect/Confirms/Result` schema.

### gsd-core source to extend (live at `~/.claude/gsd-core/`; vendored under `gsd-bob/gsd-core/`)
- `~/.claude/gsd-core/bin/lib/runtime-homes.cjs` — descriptor kinds (`dot-home`/`dot-home-nested`/`xdg`/`generic-agents-root`) and `resolveConfigHomeFromDescriptor`. The `bob` descriptor (D-08) is a `dot-home`.
- `~/.claude/gsd-core/bin/lib/capability-registry.cjs` — the runtime registry the `bob` entry is added to.
- `~/.claude/gsd-core/bin/lib/runtime-name-policy.cjs` — runtime aliases.
- `~/.claude/gsd-core/bin/lib/runtime-artifact-conversion.cjs` + `runtime-artifact-layout.cjs` — converter machinery; **cline/cursor are the closest constrained-runtime analogs** to template the bob converter on.
- `~/.claude/gsd-core/bin/lib/runtime-slash.cjs` — slash-command emission (TRANS-01).
- `~/.claude/gsd-core/bin/lib/runtime-config-adapter-registry.cjs` — config adapter registration (the ~5-touchpoint set, D-07).

### Bob documentation (citation-grade — from CAPABILITY-MAP)
- `https://bob.ibm.com/docs/ide/features/skills` — SKILL.md `name`+`description` contract (TRANS-02).
- `https://bob.ibm.com/docs/ide/features/slash-commands` — command frontmatter + `$1`/`$2` args (TRANS-01).
- `https://bob.ibm.com/docs/ide/configuration/custom-modes` + `https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell` — `custom_modes.yaml` shape and `groups` (D-01/D-02/TRANS-05).
- `https://bob.ibm.com/docs/ide/core-concepts/tools` — `command`/`execute_command` group (SPIKE-03 shell-out seam); `ask_followup_question` (TRANS-03 degrade).
- `https://bob.ibm.com/docs/shell/configuration/configuring` — `~/.bob` config home; setting precedence (D-08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **gsd-core descriptor + converter system** (the ~6 `runtime-*.cjs` files above): extend with a `bob` entry rather than build fresh. `dot-home` descriptor kind already does exactly what Bob needs (`~/.bob` + optional env override).
- **gsd-core `text_mode` seam** (PROJECT.md §Context: "a `text_mode` concept for runtimes lacking `AskUserQuestion`"): reused wholesale for TRANS-03 (D-09) — no new prompt machinery.
- **cline/cursor converters**: the closest analogs for a constrained runtime emitting flat skills + slash commands (carried forward from Phase 1 code_context).

### Established Patterns
- **Conservative-lower-bound** (ROADMAP cross-cutting): the bob capability declaration assumes no isolated subagents / no structured prompts; D-10's gating reads from it.
- **Strip unsupported frontmatter keys** + **hyphen command form** (CLAUDE.md / CAPABILITY-MAP §2): the converter must reduce GSD's richer frontmatter to Bob's `name`+`description` (skills) / `description`+`argument-hint` (commands).
- **Isolate Bob code as "a move, not a rewrite"** (UP-01): registry wiring matches the future upstream PR; substance behind one adapter module (D-07).

### Integration Points
- `CAPABILITY-MAP.md` → SC#5 inspection target for the emitter's output.
- `.planning/ACCEPTANCE-CHECKLIST.md` → append AC-05+ here (D-07 convention).
- The `bob` descriptor is the seam Phase 3 (installer) stages artifacts into and Phase 4 (core loop) runs against.

</code_context>

<specifics>
## Specific Ideas

- `bob` descriptor literal (D-08): `{ kind:'dot-home', name:'bob', env:['BOB_CONFIG_DIR'] }` → default `~/.bob`, project `<project>/.bob/`.
- `gsd` mode `groups` (D-02): `[read, edit, command, mcp]` (confirm `skill`/`browser` against docs).
- Unsupported marker string (D-10): `unsupported on Bob: <reason>` in a generated support roster; artifact omitted from the loadable set.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-mode context partitioning** (planning vs execution vs review modes) — v2; v1 ships one `gsd` mode (D-01, CLAUDE.md Modes-as-v2).
- **Rich Bob-native re-modeling of subagents/prompts** (vs the v1 flag/text_mode-degrade approach) — PROJECT-level v2 (NATIVE-01).
- **Full skill-roster gating** — the TRANS-04 mechanism is proven on a representative case here; applying it across the whole roster rides with Phases 4–5 (D-10).
- **Worktree-isolated parallel execution** — v2 (PAR-01), gated on Bob proving isolated subagents exist on-device.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Runtime Foundation & Artifact Translation*
*Context gathered: 2026-06-17*
