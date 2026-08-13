# Phase 2: Runtime Foundation & Artifact Translation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 2-Runtime Foundation & Artifact Translation
**Areas discussed:** Mode + custom_modes.yaml (user-selected; other three delegated to Claude's recommendation)

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Adapter injection seam | How the `bob` descriptor + converters attach to vendored gsd-core (~5 touchpoints): edit-in-place vs load-time overlay | delegated → Claude rec |
| Mode + custom_modes.yaml | Emit a GSD mode for the `command` shell-out seam; idempotent custom_modes.yaml merge; YAML parser tension | ✓ discussed |
| BOB_CONFIG_DIR override | Include a shim-level config-home override (SC#1) vs drop it (CAPABILITY-MAP D-11) | delegated → Claude rec |
| text_mode + unsupported-flag | TRANS-03 degrade approach; TRANS-04 detection mechanism | delegated → Claude rec |

**User's choice:** "Mode + custom_modes.yaml, your rec for everything else"

---

## Mode + custom_modes.yaml

### Q1 — Emit a GSD custom mode?

| Option | Description | Selected |
|--------|-------------|----------|
| Emit one `gsd` mode | Single mode, groups [read, edit, command, mcp]; guarantees the shell-out seam; keeps v1 simple | ✓ |
| Rely on Bob default modes | Assume built-in modes have `command`; zero mode surface but unverified, leaves TRANS-05 nothing to merge | |
| Emit several gsd modes | Planning/execution/review modes; multi-mode partitioning deferred to v2 | |

**User's choice:** Emit one `gsd` mode
**Notes:** Becomes D-01/D-02/D-03. Groups `[read, edit, command, mcp]`; `skill`/`browser` flagged as researcher confirm-item.

### Q2 — custom_modes.yaml merge / YAML parser

| Option | Description | Selected |
|--------|-------------|----------|
| Add js-yaml (merge path only) | Parse-based merge in converter/merge code; install/staging stays node:fs-only | ✓ |
| Hand-slice YAML | Zero deps but error-prone for correctness-critical idempotent merge of arbitrary user YAML | |
| Defer merge to Phase 3 | Installer owns merge; conflicts with SC#5 (test in Phase 2) and UP-01 | |

**User's choice:** Add js-yaml (merge path only)
**Notes:** Becomes D-04/D-06. CLAUDE.md deferred js-yaml *to the Modes milestone*; TRANS-05 meets that trigger. Install surface stays dependency-free.

### Q3 — Merge ownership / idempotency signal

| Option | Description | Selected |
|--------|-------------|----------|
| Slug convention (`gsd`) | Own slug `gsd` / `gsd-*`; replace in place, never touch other slugs; matches INSTALL-04 wording | ✓ |
| Installer manifest | Track written slugs in Phase 3 manifest; couples Phase 2 to a not-yet-existing artifact | |
| Marker comment | Sentinel comments around our block; js-yaml drops comments on re-emit | |

**User's choice:** Slug convention (`gsd`)
**Notes:** Becomes D-05. Self-contained; exactly what the SC#5 merge unit test asserts.

---

## Claude's Discretion (delegated areas — recommendations recorded as decisions)

- **Adapter injection seam (D-07):** edit vendored gsd-core at the same ~5 touchpoints the upstream PR will use; net-new Bob substance behind one isolated `bob` adapter module. Researcher to confirm whether a cleaner registration hook exists.
- **BOB_CONFIG_DIR (D-08):** include as gsd-bob's own shim-level override (satisfies SC#1); does not assert Bob honors it (consistent with CAPABILITY-MAP D-11).
- **text_mode (D-09):** reuse gsd-core's existing `text_mode` seam (bob defaults `text_mode:true`); no prompt-rewriting.
- **Unsupported-flag (D-10):** programmatic gating vs capability declaration + curated skip-list; omit broken artifact + record `unsupported on Bob: <reason>` in a support roster; proven on one representative case.
- **Verification (D-11):** golden + Claude-equivalence + doc-conformance; `node:test`; append AC-05+ to ACCEPTANCE-CHECKLIST.md.
- Mode prose, fixture layout, representative artifact choice, adapter module internals.

## Deferred Ideas

- Multi-mode context partitioning → v2.
- Rich Bob-native re-modeling of subagents/prompts → v2 (NATIVE-01).
- Full skill-roster gating → Phases 4–5.
- Worktree-isolated parallel execution → v2 (PAR-01).
