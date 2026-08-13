# Phase 12 — Bob 2.0 Capability Evidence

**Verified:** 2026-08-13
**Subject:** Bob Shell **2.0.1** (`bobshell@2.0.1`, `/opt/homebrew/lib/node_modules/bobshell`,
commit `e6a3e508`), installed and SSO-authenticated on the development machine.
**Supersedes:** the doc-derived capability model carried from v1.0/v2.0, including the deleted
`CAPABILITY-MAP.md` and the open questions B1/B6/B7 in
[`research/v3.0-UPSTREAM-DELTA.md`](../../research/v3.0-UPSTREAM-DELTA.md).

## Method, and why it is stronger than the docs

The v3.0 premise was that a live Bob would let us settle by observation what v1/v2 could only
assume. It did — but not primarily through running sessions. The decisive instrument turned out
to be **the shipped 2.0.1 bundle itself** (`dist/bob.js`), because the questions at issue are
questions about what Bob's *code* accepts and reads, and the bundle answers those exactly, with
no interpretation:

- Where Bob resolves each config path → read the path-resolution functions.
- Which tool-group names are real → read the schema and the built-in mode table.
- Whether subagents fan out → read the tool description Bob ships to its own model.

Two of the three findings below **contradict the documentation**, and one contradicts a
correction gsd-bob made in July. The bundle is the authority in every such conflict: it is what
actually runs.

**Live-session limits, stated plainly.** `bob run` (headless) requires `BOB_API_KEY`; this
install is SSO-authenticated for interactive use, so no inference-driven probe was executed.
Nothing below depends on one. The two claims that genuinely need a live session — the mode
appearing in Bob's picker, and `gsd_run` invoked *from inside* a Bob turn — are marked as such
and carried to the Phase 17 acceptance run.

---

## BOB2-01 — Surfaces gsd-bob writes to

Each row: what gsd-bob writes, what Bob 2.0.1 actually reads, and the observation.

| Surface | Bob 2.0.1 reads | Observed | Verdict |
|---|---|---|---|
| Config home | `join(os.homedir(), '.bob')` — fixed | `zCr()` in the bundle | ✅ Holds |
| Global skills | `~/.bob/skills` | bundle path list (also `~/.agents/skills`, `~/.claude/skills`) | ✅ Holds |
| Global commands | `~/.bob/commands` | bundle path list (also `~/.agents/commands`) | ✅ Holds |
| Workspace roots | `.bob`, `.agents`, `.claude` | `Drc=[WORKSPACE_BOB_DIR,".agents",".claude"]` | ✅ Holds |
| Settings | `~/.bob/settings/settings.json` | present on disk; `bobShell.lastRunVersion: "2.0.1"` | ✅ Relocated as documented |
| **Global custom modes** | **`~/.bob/settings/custom_modes.yaml`** | see BOB2-04 | ❌ **gsd-bob wrote the wrong path** |
| Project custom modes | `<workspace>/.bob/custom_modes.yaml` | `getModesFilePath(ws)` | ✅ Holds |
| MCP config | `~/.bob/settings/mcp.json` | present on disk | ✅ (Phase 15 will use it) |

Bob also reads `~/.agents/` and `~/.claude/` skill and command directories. That is worth
recording for Phase 15/16: a user with GSD installed for another runtime may see GSD skills in
Bob through a path gsd-bob never wrote, which is a duplicate-exposure risk MCP-03 must consider.

---

## BOB2-02 — The tool-group contradiction, resolved

The two doc pages disagreed: `configuration/custom-modes-bobshell` lists `command`,
`core-concepts/tools` lists `execute`. **Both describe real behaviour.**

**Observation 1 — `groups` is not an enum.** The custom-mode schema validates it as an open
string union:

```js
Pws = z.union([z.string(), z.tuple([z.string(), Dws /* {fileRegex} */])])
Nws = z.array(Pws).refine(/* duplicate-group check only */)
modeConfigSchema = z.object({ …, groups: Nws.optional(), … })
```

There is **no closed vocabulary**. An unrecognised group name passes validation, loads without
warning, and then simply never matches a tool. **A typo in `groups` costs the mode a capability
and reports nothing.** This is the single most important thing learned in this phase, and it is
why the emitted set is now pinned by test.

**Observation 2 — `command` is a back-compat alias.** Bob normalizes it, in both the modes-file
loader and the mode importer, for bare strings and `[name, {fileRegex}]` tuples alike:

```js
for (const m of f.groups || [])
  if (typeof m === "string") h.push(m === "command" ? "execute" : m);
  else if (typeof m === "object") { const d = m[0] === "command" ? "execute" : m[0]; … }
```

**Observation 3 — the canonical vocabulary**, from the built-in mode table and tool declarations:

| Group | Evidence |
|---|---|
| `read` `edit` `execute` `mcp` `skill` `todo` `subagent` `mode` | built-in `agent` mode `groups` |
| `artifact` `subtask` | extended mode table |
| `workflow` | tool id exists, ships `hidden: true` |
| `browser` | **not a mode group** — appears only in approval `allowed_permissions` seeding |

Corroborated on the live install: Bob wrote `allowed_permissions: ["read","edit","execute","mcp",
"mode","subtask","subagent","skill","todo"]` into this machine's `settings.json` itself, and the
user's working `ibm-researcher` mode declares eight of these groups.

**Consequence for gsd-bob.** The emitted `['read','edit','execute','mcp']` is correct and
canonical. But quick task `260707-ey1`'s **stated rationale was wrong**: it claimed Bob has no
`command` group and that the pre-change mode's `gsd_run` seam was therefore "dead". Bob would
have normalized `command` to `execute` and the seam would have worked. The change was right; the
reason recorded for it was not. → logged for ACCEPT-05.

---

## BOB2-03 — The `gsd_run` shell seam

Proven mechanically. A clean global install was staged to a scratch target and the staged shim
invoked exactly as the mode's `execute` group would invoke it:

```
$ node <target>/gsd-core/bin/gsd-tools.cjs state --cwd <gsd-bob repo>
{ "config": { "model_profile": "balanced", … } }      # real .planning/ state, exit 0
```

The shim loads **out of tree** (target ≠ package root) and returns real JSON, so the seam itself
— staged payload, sibling resolution, project-root discovery — is intact under Bob 2.0's Node.

The mode holds `execute` (pinned by `test/bob2-capability.test.cjs`), so it has the group needed
to make that call.

**Not yet observed:** the call issued from *inside* a live Bob turn. That needs an interactive
session and an approval, and it needs the BOB2-04 fix installed first — until then the `gsd` mode
is not selectable at global scope. Carried to Phase 17 (ACCEPT-04).

---

## BOB2-04 — Settings relocation, and the P0 this exposed

Bob 2.0.1 resolves the **global** modes file through the settings directory:

```js
static getGlobalModesFilePath() { return path.join(getGlobalSettingsDirectory(), "custom_modes.yaml"); }
function snc() { const t = path.join(zCr(), "settings"); fs.mkdirSync(t, {recursive:true}); return t; }
function zCr() { return path.join(os.homedir(), ".bob"); }
```

→ **`~/.bob/settings/custom_modes.yaml`**. The *project* path is unchanged:
`getModesFilePath(ws)` → `join(ws, '.bob', 'custom_modes.yaml')`, with no `settings/` segment.
The two scopes are **not symmetric**.

gsd-bob wrote the global mode to `~/.bob/custom_modes.yaml` (`stage.cjs`, `modesRel` as a bare
literal). **Bob 2.0 never reads that file**, so a global install produced no usable GSD mode and
raised no error anywhere.

Corroborated on this machine, and it is worth noting the shape of the evidence: `~/.bob/settings/
custom_modes.yaml` holds the user's real, working `ibm-researcher` mode, while `~/.bob/custom_
modes.yaml` holds *only* the gsd mode, written by the installer on 2026-06-19. Two files, same
name, one read.

> The v3.0-UPSTREAM-DELTA note "`custom_modes.yaml` stayed at `~/.bob/`, *not* under `settings/`"
> is **refuted**. → ACCEPT-05.

**Also settled — no config-home env override (closes SPIKE-04 / B7).** The only `BOB*` variables
the bundle reads are `BOB_API_KEY`, `BOB_DEV_KEY`, `BOB_GATEWAY_URL`, `BOB_LOG_LEVEL`,
`BOB_SUPPORT_KEY`, `BOB_USE_MODEL_ENV`, `BOBSHELL_API_KEY`. There is no `BOB_CONFIG_DIR` and no
relocation variable of any name. The descriptor advertised one; it could only ever have pointed
the installer at a directory Bob ignores. Now declared as an empty `env: []` — the field must
stay present because gsd-core's `dot-home` branch iterates it unconditionally.

**Approval behaviour (2.0.1 changelog B12)** — not exercised. Writes into `~/.bob` are said to be
excluded from auto-approval, which affects the *acceptance UX*, not the artifact contract. It is
a Phase 17 observation.

---

## BOB2-05 — Parallel subagent fan-out: SUPPORTED

Bob 2.0.1's `SubAgentTool` ships this sentence to its own model, in the tool description:

> **"Multiple spawn_subagent calls in one turn run in parallel."**
> "Subagents cannot spawn other subagents."

and enforces the second with:

```js
id = "spawn_subagent"; groups = ["subagent"]; permission = "subagent";
SUBAGENT_FORBIDDEN_TOOLS  = ["spawn_subagent","start_subtask","start_workflow","switch_mode","update_todo_list"];
SUBAGENT_FORBIDDEN_GROUPS = ["subagent","subtask"];
```

A subagent inherits its parent mode's groups minus the forbidden ones:
`(getCurrentMode()?.groups ?? ["read","edit","execute"]).filter(v => !SUBAGENT_FORBIDDEN_GROUPS.includes(v))`.

**Fan-out is supported; only *nesting* is not.** No GSD workflow requires nesting.

`parallelSubagentFanout` therefore carries an **observed `true`**, replacing the conservative
default. Adjacent facts recorded for Phase 14: modes may declare `allowedSubagents` to restrict
which personas they can spawn; agents are loaded from `.bob/agents/` and require a trusted
workspace; `session.subagents` and `--disable-subagents` can switch the tool off entirely.

> The v1 lower bound "no parallel fan-out" is **refuted**. → ACCEPT-05. This also unblocks
> PAR-01 (worktree-isolated parallel execution), which REQUIREMENTS gated on this finding.

---

## Incidental findings (carried forward, not acted on here)

1. **`.bob/agents/` persona schema** (Phase 14 / NATIVE-02). Frontmatter parsed as:
   `name`, `description`, `groups` (default `["read","edit","execute"]`), `model`, `maxTurns`,
   `rawPrompt`, `allowForkContext`, `allowTools`; body split on a `## Output Constraints`
   heading into system prompt + output constraints. This machine already has 34 `gsd-*.md`
   persona files under `~/.bob/agents/` dated 2026-06-17, which the gsd-bob manifest does **not**
   list — provenance unknown, and worth resolving before NATIVE-02 emits into that directory.
2. **Descriptor drift between the vendored registry and the patch script.** The `description`
   string differed between `gsd-core/bin/lib/capability-registry.cjs` and the canonical block in
   `scripts/apply-bob-patches.cjs`. A Phase 13 re-vendor would have silently adopted the patch
   script's wording. Both are now identical. Phase 13 should add a guard.
3. **Mode consolidation confirmed** (B3): built-in modes are `agent` and `plan`; "Code" and
   "Advanced" are gone.

## Refuted assumptions → ACCEPT-05

| # | Assumption | Refuted by |
|---|---|---|
| R-01 | Global `custom_modes.yaml` lives at `~/.bob/` | `getGlobalModesFilePath()` → `~/.bob/settings/` |
| R-02 | Bob has no `command` tool group (`260707-ey1`) | loader normalizes `command` → `execute` |
| R-03 | The pre-`ey1` mode's `gsd_run` seam was dead | same alias — it would have resolved |
| R-04 | No parallel subagent fan-out | `spawn_subagent` description states it runs in parallel |
| R-05 | `BOB_CONFIG_DIR` may relocate the config home | no such variable in the 2.0.1 bundle |
