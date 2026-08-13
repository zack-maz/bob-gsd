# Phase 1: Bob Capability Mapping - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a **documentation-grounded capability map** of IBM Bob's load-bearing primitives — the four SPIKEs — so the rest of the adapter can be designed against Bob's most constrained *documented* behavior. For each gating primitive: record a conservative lower-bound default, cite its source, and author a device-runnable verification step that will later confirm or refute the assumption on real hardware (no live Bob exists during development).

**This phase is research + specification, not code.** It produces two artifacts:
1. `CAPABILITY-MAP.md` — the per-primitive decision record
2. The first entries of `.planning/ACCEPTANCE-CHECKLIST.md` — the device-runnable verification steps

**Locked upstream by ROADMAP (do NOT re-decide):** the conservative defaults themselves are fixed — subagents → **sequential inline** (assume no isolation); prompts → **conversational `text_mode`** (assume no structured-choice primitive). This phase records and sources them; it does not relitigate them.

</domain>

<decisions>
## Implementation Decisions

### Capability map artifact shape
- **D-01:** The phase produces a single `CAPABILITY-MAP.md` in the phase directory. Each primitive is a fixed-schema block, not prose.
- **D-02:** Per-primitive row schema: `primitive | conservative default | rationale | doc source (URL) | verbatim quote | confidence (HIGH/MEDIUM/LOW) | state | verification-step ref (AC-ID)`.
- **D-03:** The machine-readable `bob` runtime descriptor (JSON/code) is **NOT** built here — it is Phase 2 work. Phase 1 stops at the documented map. Phase 2 SC#4 verifies the emitter by *inspecting its output against this map*, so the map is a review-grade reference, not an import target.

### Verification step format & home
- **D-04:** A single central `.planning/ACCEPTANCE-CHECKLIST.md` lives at the **planning root** (not inside the Phase 6 directory) and exists from Phase 1 onward.
- **D-05:** Each step has a stable ID (`AC-01`, `AC-02`, …) and a fixed schema: `Cmd:` (exact command) / `Expect:` (expected output) / `Confirms:` (which SPIKE/SC it validates) / `Result: [ ] pass [ ] fail`.
- **D-06:** `CAPABILITY-MAP.md` rows reference steps by AC-ID only — map and checklist evolve independently.
- **D-07 (cross-phase convention — planner must carry forward):** **Phases 2–5 append their own device-runnable steps to this same `.planning/ACCEPTANCE-CHECKLIST.md` using the same AC-ID + schema.** Phase 6 runs the accumulated file with zero gathering/merge work. This is a project-wide convention established here, not a Phase 1 local detail.

### Evidence rigor
- **D-08:** Every recorded default cites the exact `bob.ibm.com` doc URL **plus a short verbatim quote** of the supporting text, **plus** a HIGH/MEDIUM/LOW confidence tier.
- **D-09:** Absence-based defaults (the default rests on a primitive *not* being documented) are quoted as such — e.g. quote the nearest relevant text and annotate "(no spawn/completion-signal API documented)".
- **D-10:** LOW and MEDIUM rows constitute Phase 6's explicit "assumption may be wrong" watch-list.

### Undocumented-primitive handling
- **D-11:** When Bob's docs are *silent* on a primitive, the row still records a **buildable conservative lower-bound default** so the design never blocks (e.g. SPIKE-04: "no env override — `~/.bob` is fixed; descriptor drops the override").
- **D-12:** Such a row is tagged with a distinct **`state` value** so the gap is loud, not silent. The `state` field takes one of: `Documented` (positively confirmed), `Absence-based` (default rests on a documented absence), `UNKNOWN` (docs entirely silent — discover on-device). UNKNOWN rows always also get an AC step to probe the truth on hardware and are confidence LOW.

### Research scope & reuse
- **D-13:** The researcher **re-fetches the live `bob.ibm.com` doc pages** (WebFetch) to capture citation-grade URLs + verbatim quotes. The Bob research already in `.claude/CLAUDE.md` is used as the **scaffold / map of where to look**, NOT as citable source-of-truth (some of it is flagged MEDIUM / "search synthesis"). Re-fetching also catches any doc drift since the original project research.
- **D-14 (map breadth):** The **4 SPIKE primitives get the full treatment** (default + evidence + dedicated AC verification step) because they are the uncertain, design-gating ones. The **well-documented adjacent surface that Phase 2 will need** — `SKILL.md` + slash-command frontmatter contract, MCP, Bob Rules, AGENTS.md — gets **lighter reference rows** (documented contract + source, confidence) but **no per-row AC step**. This gives Phase 2 one source of truth without authoring verification for primitives that aren't in doubt.

### Claude's Discretion
- Exact markdown table/column rendering of the row schema (as long as all D-02 fields are present).
- Ordering of primitives within the map.
- Whether the adjacent-surface reference rows live in the same `CAPABILITY-MAP.md` (recommended) or a clearly-labeled second section.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Project planning contract
- `.planning/ROADMAP.md` §"Phase 1: Bob Capability Mapping" — the four Success Criteria; the locked conservative defaults; the test-deferred cross-cutting principle.
- `.planning/REQUIREMENTS.md` §"Bob Capability Spike" — SPIKE-01..04 definitions; §"On-Device Verification" — VERIFY-01/02 (the acceptance-checklist contract Phase 1 seeds).
- `.planning/PROJECT.md` §Context, §Constraints — backend-neutrality, no-local-Bob testing, upstream-readiness principles.

### Bob research scaffold (leads only — re-verify against live docs per D-13)
- `.claude/CLAUDE.md` §"IBM Bob Extension Surface" — the primitive→GSD mapping table and per-assumption confidence notes that seed where to look.
- `.claude/CLAUDE.md` §"Open Items / Assumptions to Validate in a Spike" — the exact MEDIUM/unverified items this phase must resolve to documented rows.

### Live Bob docs to fetch (citation-grade sources — SPIKE targets)
- `bob.ibm.com/docs/ide/features/skills` — SKILL.md `name`+`description` contract (adjacent reference row).
- `bob.ibm.com/docs/ide/features/slash-commands` — command frontmatter (`description`, `argument-hint`), `$1/$2` args (adjacent reference row).
- Bob docs on **subagents / modes** — SPIKE-01 (isolated spawning + completion signals vs in-session mode switching).
- Bob docs on **prompt / interactive primitives** — SPIKE-02 (structured-choice primitive vs conversational only).
- Bob docs on the **`command` tool group** — SPIKE-03 (can a GSD-shipped Bob mode shell out to `node gsd-tools.cjs`).
- Bob docs on **config home / settings location** + any env override — SPIKE-04 (`~/.bob`, `BOB_CONFIG_DIR`?, IDE-vs-Shell detection signal).

*Note: the exact live URLs for the subagent/prompt/command-tool/config-home pages are to be located by the researcher during fetch; the `skills` and `slash-commands` URLs above are confirmed in CLAUDE.md.*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **gsd-core runtime descriptor vocabulary** (`~/.claude/gsd-core/bin/lib/runtime-homes.cjs`, `runtime-name-policy.cjs`, `capability-registry.cjs`, `runtime-artifact-conversion.cjs`): the documented map should be expressed in terms gsd-core already uses (config home, artifact layout, aliases, capabilities) so Phase 2 can translate it into a `bob` descriptor as a *move, not a rewrite* (UP-01).
- **Cline/Cursor-family converters** in gsd-core: the closest analogs for how a constrained runtime is described — use as the shape template for the adjacent-surface reference rows.

### Established Patterns
- **Conservative-lower-bound principle** (ROADMAP cross-cutting): every default assumes Bob's most constrained documented behavior. The map's `state`/`confidence` fields operationalize this.
- **Hyphen command form only** (`gsd-<cmd>`, not `gsd:<cmd>`) and **strip unsupported frontmatter keys** — already established in CLAUDE.md; relevant to the adjacent reference rows.

### Integration Points
- This phase's `CAPABILITY-MAP.md` is the **input contract** to Phase 2 (descriptor + emitter) and Phase 2 SC#4's inspection check.
- `.planning/ACCEPTANCE-CHECKLIST.md` is the **append target** for Phases 2–6 and the **run target** for Phase 6.

</code_context>

<specifics>
## Specific Ideas

- Row schema preview the user endorsed (table form), illustrative:
  ```
  | primitive | SPIKE-01 Subagents |
  | default   | sequential-inline (assume no isolation) |
  | rationale | docs show in-session mode-switch only |
  | source    | bob.ibm.com/docs/... |
  | quote     | "switch modes within a session" (no spawn/completion-signal API documented) |
  | confidence| MEDIUM |
  | state     | Absence-based |
  | verify    | AC-01 |
  ```
- Checklist step preview the user endorsed:
  ```
  ## AC-01 — Subagent isolation
  Cmd:    <bob run stub mode>
  Expect: sequential output, no parallel completion signal
  Confirms: SPIKE-01 default
  Result: [ ] pass  [ ] fail
  ```

</specifics>

<deferred>
## Deferred Ideas

- **Machine-readable `bob` descriptor (JSON/code).** Belongs to Phase 2 (Runtime Foundation). Phase 1 stops at the documented map. (D-03)
- **Per-row AC steps for the adjacent surface** (skills/commands/MCP/rules/AGENTS.md). Their in-Bob load is verified by Phase 2's TRANS-01/02 acceptance steps, not by Phase 1 rows. (D-14)
- **Rich Bob-native re-modeling** of subagents/prompts (vs the v1 flag/degrade approach) — already PROJECT-level v2 (NATIVE-01); out of every v1 phase.

</deferred>

---

*Phase: 1-Bob Capability Mapping*
*Context gathered: 2026-06-17*
