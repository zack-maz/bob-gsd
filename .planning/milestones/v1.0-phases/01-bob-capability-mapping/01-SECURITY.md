# Security Audit — Phase 1: Bob Capability Mapping

**Audited:** 2026-06-17
**Auditor:** gsd-security-auditor (retroactive mitigation verification)
**ASVS Level:** default
**block_on:** high
**Result:** SECURED — 3/3 threats closed

This audit verifies that every threat declared in the Phase 1 PLAN.md `<threat_model>` block is mitigated, accepted, or transferred as declared. It does not scan for new vulnerabilities; the threat register was authored at plan time and is treated as complete. Implementation artifacts (CAPABILITY-MAP.md, ACCEPTANCE-CHECKLIST.md) are read-only inputs to this audit.

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-SC | Tampering / DoS | mitigate | CLOSED | All 4 seeded `Cmd:` lines in `.planning/ACCEPTANCE-CHECKLIST.md` (lines 21, 28, 35, 42) are read-only / side-effect-free. Mutation-token grep guard (install/`rm`/`mkdir`/`cp`/`mv`/write-redirection) returns clean across the full file. AC-04 env-override probe (line 42) only READS resolved paths (`echo $BOB_CONFIG_DIR`, `echo $BOB_HOME`) and lists (`ls -la ~/.bob`) — never creates/moves/deletes a `.bob` directory; the line explicitly states "without relocating anything" and "No `.bob` directory is created, moved, or deleted." |
| T-01-IG | Information disclosure (false design assumption) | mitigate | CLOSED | Every SPIKE row in `CAPABILITY-MAP.md` carries a live `bob.ibm.com/docs/...` URL + verbatim quote + confidence (11 distinct doc URLs cited; ≥6 required). Absence-based rows tagged `Absence-based` (3 occurrences), silent-doc rows tagged `UNKNOWN` (2 occurrences) — loud per D-09/D-12. No source/quote/citation cell references `CLAUDE.md` (0 occurrences anywhere in file); no `ibm.com/us-en/products/` host. Watch-list marker derived mechanically from confidence: SPIKE-01/MEDIUM→yes (L28/L31), SPIKE-02/MEDIUM→yes (L42/L45), SPIKE-03/HIGH→no (L56/L59), SPIKE-04a/HIGH→no (L74/L77), SPIKE-04b/LOW→yes (L88/L91), SPIKE-04c/MEDIUM→yes (L102/L105). D-10 watch-list note present (L107). |
| T-01-SC2 | Tampering | accept | CLOSED | Accepted-risk entry logged below. Verified no install actually occurred: phase directory contains only `*.md` files (no `.json`/`.cjs`/`.js` descriptor artifact); SUMMARY.md `tech-stack.added: []` and "no installs — D-03 defers the descriptor to Phase 2." |

**Files verified:**
- `/Users/zackmaz/Documents/Claude/Projects/open-gsd-bob/.planning/ACCEPTANCE-CHECKLIST.md` (T-01-SC)
- `/Users/zackmaz/Documents/Claude/Projects/open-gsd-bob/.planning/phases/01-bob-capability-mapping/CAPABILITY-MAP.md` (T-01-IG)
- `/Users/zackmaz/Documents/Claude/Projects/open-gsd-bob/.planning/phases/01-bob-capability-mapping/` (T-01-SC2 — directory contents)

---

## Accepted Risks Log

| Threat ID | Risk | Rationale | Accepted By | Date |
|-----------|------|-----------|-------------|------|
| T-01-SC2 | Supply-chain tampering via package-manager installs (npm/pip/cargo) | This phase performs zero package-manager installs — it writes only Markdown documentation. Verified: phase directory contains only `*.md` artifacts, no descriptor code, SUMMARY.md declares `added: []`. No install means no legitimacy checkpoint applies. Risk re-enters scope in Phase 2 (descriptor build) and must be re-evaluated there. | PLAN.md threat_model (plan-time disposition) | 2026-06-17 |

---

## Unregistered Flags

None. SUMMARY.md (`01-01-SUMMARY.md`) contains no `## Threat Flags` section — the executor declared no new attack surface during implementation. No new file paths or capabilities appeared outside the two declared Markdown artifacts.

---

## Carry-Forward to Phase 2 / Phase 6

- **T-01-SC (Phase 6 owner):** The read-only invariant on seeded `Cmd:` lines is a *standing* contract. Every later phase that appends `AC-NN` steps to `.planning/ACCEPTANCE-CHECKLIST.md` (D-07 append convention) must preserve the read-only mandate. Re-audit the appended steps before the Phase 6 unattended on-device run.
- **T-01-SC2 (Phase 2 owner):** Accepted only because this phase installs nothing. Phase 2 introduces the machine-readable `bob` runtime descriptor and may introduce dependencies — a package-legitimacy checkpoint becomes required there.
- **T-01-IG watch-list:** The 4 LOW/MEDIUM rows (SPIKE-01, SPIKE-02, SPIKE-04b env-override, SPIKE-04c IDE-vs-Shell) are documented assumptions, not verified facts. Phase 6 must confirm them on hardware before they harden into load-bearing design.
