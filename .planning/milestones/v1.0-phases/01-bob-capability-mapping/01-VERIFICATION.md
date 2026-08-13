---
phase: 01-bob-capability-mapping
verified: 2026-06-17T00:00:00Z
status: passed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: # No previous VERIFICATION.md existed — initial verification
---

# Phase 1: Bob Capability Mapping Verification Report

**Phase Goal:** Resolve the load-bearing Bob primitives from Bob's official documentation — choosing a conservative lower-bound default for each so the adapter is designed against Bob's most constrained documented behavior — and author the device-runnable verification step that will later confirm or refute each assumption on real hardware. No live Bob is available, so this phase grounds the design in docs, not empirical demonstration.
**Verified:** 2026-06-17
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

This is a documentation-only phase. "Achievement" = the documented-conformance contract is satisfied: each SPIKE resolved with a conservative default + live `bob.ibm.com/docs` citation + verbatim quote + confidence + state + AC-ID cross-reference, and every AC step read-only/side-effect-free. All four ROADMAP Success Criteria map directly onto the four SPIKE rows in `CAPABILITY-MAP.md` and the four AC steps in `ACCEPTANCE-CHECKLIST.md`. Every must-have was checked against the files on disk (not SUMMARY claims, not git history — `.planning/` is intentionally gitignored, `commit_docs: false`).

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1 | SPIKE-01 recorded: default 'sequential inline (assume no isolated subagents)', state Absence-based, MEDIUM, bob.ibm.com/docs URL + verbatim quote, AC-01 ref | ✓ VERIFIED | MAP §SPIKE-01: default "sequential inline (assume NO isolated subagents)"; state `Absence-based`; confidence `MEDIUM`; sources `tools` + `features/modes`; quote "coordinates complex tasks by delegating…" traces to RESEARCH L93; ref `AC-01` |
| 2 | SPIKE-02 recorded: default 'conversational text_mode', state Absence-based, MEDIUM, URL + quote, AC-02 ref | ✓ VERIFIED | MAP §SPIKE-02: `text_mode` default; state `Absence-based`; `MEDIUM`; source `core-concepts/tools`; quote "Request clarification or additional detail" traces to RESEARCH L109; ref `AC-02` |
| 3 | SPIKE-03 recorded: command-group shell-out to gsd-tools.cjs, state Documented, HIGH, URL + quote, AC-03 ref | ✓ VERIFIED | MAP §SPIKE-03: `command` group CAN shell out to `node gsd-tools.cjs`; state `Documented`; `HIGH`; sources tools + custom-modes + custom-modes-bobshell; quote "Run CLI commands in your workspace" traces to RESEARCH L125; ref `AC-03` |
| 4 | SPIKE-04 recorded: config home ~/.bob (HIGH), env override UNKNOWN/LOW, IDE signal BOB_SHELL_CLI_IDE_SERVER_PORT (MEDIUM), each URL+quote, AC-04 ref | ✓ VERIFIED | MAP §SPIKE-04 (a/b/c): config-home `~/.bob` Documented/HIGH; env override "none documented — drop the override" UNKNOWN/LOW; IDE signal `BOB_SHELL_CLI_IDE_SERVER_PORT` MEDIUM; quotes (L73, L87, L101) trace verbatim to RESEARCH L142/L147/L152; all share ref `AC-04` |
| 5 | 4 adjacent reference rows (Agent Skill, Slash command, Custom Mode groups, MCP/Rules/AGENTS.md) with contract + URL + confidence and NO AC step | ✓ VERIFIED | MAP §Section 2: 4 rows present, each citing a `bob.ibm.com/docs` URL + confidence (HIGH/HIGH/HIGH/MEDIUM-HIGH); 0 AC tokens in section |
| 6 | D-10 watch-list column: 4 yes (SPIKE-01/02/04b/04c), 2 no (SPIKE-03/04a), mechanically derived from confidence | ✓ VERIFIED | Per-block pairing confirmed: MEDIUM→yes, MEDIUM→yes, HIGH→no, HIGH→no, LOW→yes, MEDIUM→yes; map states yes rows are the Phase 6 watch-list (L107) |
| 7 | ACCEPTANCE-CHECKLIST.md at planning root (not nested) with AC-01..AC-04 | ✓ VERIFIED | `.planning/ACCEPTANCE-CHECKLIST.md` exists; nested copy absent; all four AC IDs present |
| 8 | Each AC step uses D-05 schema (Cmd/Expect/Confirms/Result) | ✓ VERIFIED | 4 Cmd: lines, 4 Confirms: (mapping SPIKE-01..04), 4 step Result lines ("Result: [ ] pass [ ] fail") |
| 9 | Every Cmd: line read-only / side-effect-free | ✓ VERIFIED | All 4 Cmd: lines are `ls -la`, `echo $VAR`, or read-only `gsd-tools.cjs query state.load`; mutation-token guard returns clean; the only "relocat"/"create" tokens are in negations ("without relocating anything", "No .bob directory is created") on the Cmd/Expect prose |
| 10 | Every SPIKE citation points at bob.ibm.com/docs (never CLAUDE.md, never ibm.com/us-en/products) | ✓ VERIFIED | 10 distinct `bob.ibm.com/docs` URLs; 0 CLAUDE.md; 0 ibm.com/us-en/products hosts |
| 11 | SPIKE rows reference AC by ID only — no Cmd:/Expect: bodies leak into MAP (D-06) | ✓ VERIFIED | No `^Cmd:`/`^Expect:` lines in MAP; AC-01..AC-04 all referenced |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Prohibitions (must-NOT)

| # | Prohibition | Status | Evidence |
|---|-------------|--------|----------|
| 1 | No CLAUDE.md cited as source-of-truth (D-13) | ✓ VERIFIED | No `CLAUDE.md` string anywhere in MAP |
| 2 | No adjacent-surface row carries an AC-step ref (D-14) | ✓ VERIFIED | 0 `AC-0N` tokens in Section 2 |
| 3 | No machine-readable bob descriptor (JSON/code) built (D-03) | ✓ VERIFIED | Phase dir contains only `.md` files; no `.json/.cjs/.js` |
| 4 | No AC Cmd: line performs a write/install/delete/state mutation | ✓ VERIFIED | Mutation-token guard clean across all Cmd: lines |

All four prohibitions are judgment-tier negative checks resolved by deterministic grep evidence; none reached verify unenforced.

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` | 4 SPIKE rows + 4 adjacent rows, contains "SPIKE-01", ≥60 lines | ✓ VERIFIED | 120 lines; SPIKE-01 present; all D-02 fields per row |
| `.planning/ACCEPTANCE-CHECKLIST.md` | Root-anchored AC-01..AC-04, contains "AC-01", ≥24 lines | ✓ VERIFIED | 45 lines, planning root; AC-01 present; D-05 schema; D-07 append header |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| CAPABILITY-MAP.md | ACCEPTANCE-CHECKLIST.md | Each SPIKE row references its probe by AC-ID; bodies live in checklist (D-06) | ✓ WIRED | AC-01..AC-04 referenced in MAP; matching AC-01..AC-04 steps exist in checklist; no body duplication |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| SPIKE-01 | 01-01-PLAN | Subagent spawning vs in-session mode switching | ✓ SATISFIED | MAP §SPIKE-01 + AC-01; REQUIREMENTS marks Complete |
| SPIKE-02 | 01-01-PLAN | Structured-choice prompt primitive vs text_mode | ✓ SATISFIED | MAP §SPIKE-02 + AC-02 |
| SPIKE-03 | 01-01-PLAN | command tool group shells out to gsd-tools.cjs | ✓ SATISFIED | MAP §SPIKE-03 + AC-03 |
| SPIKE-04 | 01-01-PLAN | Config home / env override / IDE-vs-Shell signal | ✓ SATISFIED | MAP §SPIKE-04 a/b/c + AC-04 |

All four phase requirement IDs accounted for; no orphaned requirements (REQUIREMENTS.md maps exactly SPIKE-01..04 to Phase 1, all present in the plan's `requirements` frontmatter).

### Anti-Patterns Found

None. No debt markers (TBD/FIXME/XXX/TODO) in either artifact; no stub/placeholder language; no hollow data. The intentional `.planning/` gitignore (commit_docs: false) is documented in the SUMMARY and is not a gap — artifacts verified on disk.

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points — documentation-only phase producing two Markdown artifacts). No state transitions or cancellation/cleanup invariants are asserted by any truth, so no behavior-dependent truths exist; none routed to PRESENT_BEHAVIOR_UNVERIFIED.

### Human Verification Required

None. Every must-have, prohibition, artifact, key link, and requirement was verifiable programmatically against the files on disk. The phase's own deferred empirical checks (AC-01..AC-04) are by-design Phase 6 device probes, not Phase 1 verification items.

### Gaps Summary

No gaps. All 11 must-have truths VERIFIED, all 4 prohibitions VERIFIED, both artifacts present and substantive, the key link is wired, all four SPIKE requirements satisfied. The security-critical must-have (every seeded AC command read-only / side-effect-free, so the unattended Phase 6 on-device pass is safe) holds: all four Cmd: lines are directory-list / `echo $VAR` / read-only `gsd-tools.cjs query` only. Citation discipline holds: 10 distinct `bob.ibm.com/docs` URLs, zero CLAUDE.md or `ibm.com/us-en/products` citations. The D-10 watch-list is mechanically correct (4 yes / 2 no, each derived from its row confidence). Phase goal achieved.

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
