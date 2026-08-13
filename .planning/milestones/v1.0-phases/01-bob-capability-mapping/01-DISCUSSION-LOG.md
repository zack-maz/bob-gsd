# Phase 1: Bob Capability Mapping - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 1-Bob Capability Mapping
**Areas discussed:** Map artifact shape, Verification step format, Evidence rigor, Research scope & reuse, Undocumented-primitive handling

---

## Map artifact shape

| Option | Description | Selected |
|--------|-------------|----------|
| Structured MD, table-per-primitive | One CAPABILITY-MAP.md, fixed-schema block per primitive; bob descriptor built in Phase 2 | ✓ |
| MD map + descriptor stub | Markdown map plus a machine-readable descriptor Phase 1 emits for Phase 2 to import | |
| Prose per primitive | Narrative paragraphs, no fixed schema | |

**User's choice:** Structured MD, table-per-primitive.
**Notes:** User leaned to it and asked for rec; agreed — Phase 2's check is a review-grade comparison against the map (SC#4), markdown is upstream-review-native, and the descriptor stub would bleed Phase 2's work backward.

---

## Verification step format

| Option | Description | Selected |
|--------|-------------|----------|
| Central checklist file, phases append | Single `.planning/ACCEPTANCE-CHECKLIST.md` from Phase 1; phases append AC-IDs; Phase 6 just runs it | ✓ |
| Steps inline in map, Phase 6 gathers | Steps inside map rows; Phase 6 sweeps all artifacts to assemble | |
| Per-phase checklist fragments | Each phase writes NN-ACCEPTANCE.md; Phase 6 concatenates | |

**User's choice:** Central checklist file, phases append — confirmed location at `.planning/` root (not Phase 6 dir).
**Notes:** User revisited the question, asked for rec, confirmed. Matches ROADMAP's "assembled from steps each earlier phase contributed"; planning-root location avoids cross-phase-directory writes; AC-IDs decouple map from checklist.

---

## Evidence rigor

| Option | Description | Selected |
|--------|-------------|----------|
| URL + verbatim quote + confidence | Exact doc URL, verbatim quote, HIGH/MEDIUM/LOW tier; absence-based defaults quoted as such | ✓ |
| URL + confidence only | Doc URL + tier, no quotes | |
| Confidence tier only | Just a tier, no source | |

**User's choice:** URL + verbatim quote + confidence.
**Notes:** Doc-grounded phase with no live Bob — the verbatim quote is what separates a default from a guess; LOW/MEDIUM rows become Phase 6's watch-list.

---

## Research scope & reuse — sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch fresh, reuse as scaffold | WebFetch live bob.ibm.com pages for citation-grade quotes; CLAUDE.md research as leads | ✓ |
| Formalize CLAUDE.md research | Treat existing CLAUDE.md Bob research as source of truth, just restructure | |

**User's choice:** Re-fetch fresh, reuse as scaffold.
**Notes:** Verbatim-quote evidence bar requires live doc pages; some CLAUDE.md findings are MEDIUM/"search synthesis". Catches doc drift.

---

## Research scope & reuse — map breadth

| Option | Description | Selected |
|--------|-------------|----------|
| 4 SPIKEs full + adjacent reference rows | 4 SPIKEs get default+evidence+AC; skills/commands/MCP/rules/AGENTS.md get lighter reference rows, no AC | ✓ |
| 4 SPIKEs only | Strictly the 4 SPIKE primitives | |
| Full surface, all get AC steps | Every primitive gets full verification treatment | |

**User's choice:** 4 SPIKEs full + adjacent reference rows.
**Notes:** Gives Phase 2 one source of truth without authoring verification for primitives that aren't in doubt.

---

## Undocumented-primitive handling

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative default + UNKNOWN tag | Always record a buildable lower-bound default AND tag a distinct UNKNOWN state + AC probe | ✓ |
| UNKNOWN only, no default | Record undetermined with no default | |
| Force default, no special state | Pick a default, treat doc-silence as ordinary LOW-confidence | |

**User's choice:** Conservative default + UNKNOWN tag.
**Notes:** Adds a `state` field to the row schema (`Documented` / `Absence-based` / `UNKNOWN`). Design never blocks; the gap stays loud. e.g. SPIKE-04 `BOB_CONFIG_DIR`.

---

## Claude's Discretion

- Exact markdown table/column rendering (so long as all schema fields present).
- Ordering of primitives within the map.
- Whether adjacent-surface reference rows share CAPABILITY-MAP.md or a labeled second section.

## Deferred Ideas

- Machine-readable `bob` descriptor → Phase 2.
- Per-row AC steps for the adjacent surface → covered by Phase 2 TRANS-01/02 acceptance steps.
- Rich Bob-native re-modeling of subagents/prompts → v2 (NATIVE-01).
