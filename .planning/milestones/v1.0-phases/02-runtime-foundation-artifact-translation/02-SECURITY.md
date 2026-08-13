---
phase: 02
slug: runtime-foundation-artifact-translation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-18
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: **authored at plan time** (all four PLAN.md files carried a parseable `<threat_model>` block). Verification mode: **verify mitigations exist** (not retroactive-STRIDE). Every `mitigate` threat names a test in the Phase 2 suite (50/50 passing) or a confirmed code structure; every `accept` threat is documented below.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| env → descriptor resolution | `BOB_CONFIG_DIR` crosses into `path.join`/tilde-expansion to produce the resolved config-home path | filesystem path (operator-controlled) |
| vendored payload → runtime | hand-edited generated `capability-registry.cjs` is loaded as the runtime registration surface | code/data (build-time, reviewed) |
| GSD source markdown body → Bob converter | skill/command bodies (path refs, command dialect, YAML flow chars) are rewritten and emitted into `.bob/` artifacts | markdown text |
| GSD frontmatter → converter | source frontmatter is reduced to Bob's whitelist and re-quoted | YAML scalar values |
| user-authored `custom_modes.yaml` → mergeCustomModes | hand-edited / possibly malformed YAML (nested modes, comments, scalar/sequence/null root) is parsed and re-emitted | YAML document |
| skill metadata → gateArtifact/buildSupportRoster | candidate objects (possibly null/nameless) drive the supported/loadable set | object metadata |
| install-written config → workflow | `workflow.text_mode:true` steers whether interactive flows degrade | config boolean |
| acceptance-checklist `Cmd:` → on-device shell | every `Cmd:` runs unattended on the user's real Bob machine in Phase 6 | shell command |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | `BOB_CONFIG_DIR` resolving to an attacker-chosen path | accept | Operator-set shim override; reuses gsd-core `resolveConfigHomeFromDescriptor` (no new path logic); same trust model as `CLAUDE_CONFIG_DIR`. No untrusted source sets it. | closed |
| T-02-02 | Tampering | Hand-edit to generated `capability-registry.cjs` diverging from intent | mitigate | `descriptor.test.cjs` asserts `configHome.name === '.bob'` + valid install axes; head-comment (registry L3043–3044) documents the generated-file edit. | closed |
| T-02-03 | Information Disclosure | Model-backend brand leaking into core paths | mitigate | `backend-neutrality.test.cjs` (passing) asserts zero model-name literals in the bob entry + adapter; confirmed no brand literal references `bob`. | closed |
| T-02-SC | Tampering (supply chain) | npm install of `js-yaml` | mitigate | `js-yaml` pinned EXACT `4.1.0` in package.json + lockfile; legitimacy audit confirmed genuine `nodeca/js-yaml` (no postinstall). | closed |
| T-02-04 | Tampering | Malicious `custom_modes.yaml` dropping/corrupting non-gsd user modes | mitigate | `yaml.load` safe schema; slug-scoped filter touches only owned `gsd-*` slugs; `merge.test.cjs` asserts non-gsd preservation + idempotency. | closed |
| T-02-05 | DoS (skill silently dropped) | Frontmatter injection — YAML flow chars breaking Bob's parser | mitigate | Every emitted description/argument-hint passes through `yamlQuote` (conversion lib L261/263); `skill-golden.test.cjs` asserts `[BETA]` is quoted. | closed |
| T-02-06 | Elevation | Converter interpolating an unescaped value into a shell string | accept | Converters emit markdown only; no shell interpolation in conversion. Shell-out seam is `command`→`gsd_run` with GSD-workflow args, not raw user text. | closed |
| T-02-07 | Tampering | Parity-first gap going silent — unsupported skill emitted broken | mitigate | `gateArtifact` omits + records a loud `unsupported on Bob: <reason>` line; `unsupported-gate.test.cjs` asserts the marker. | closed |
| T-02-08a | Tampering | Acceptance-checklist `Cmd:` mutating the machine when run unattended (Phase 6) | mitigate | T-01-SC invariant: every appended `Cmd:` is read-only; verified programmatically (zero install/write/delete/move/copy verbs across AC-06..AC-12). | closed |
| T-02-08b | Tampering (correctness) | Emitted Bob artifact pointing at a non-existent `.claude` path under a `.bob` install | mitigate | `convertClaudeToBobContent` (conversion lib L698) rewrites all `.claude`→`.bob` + `gsd:`→`gsd-`; golden tests assert zero `.claude`/`gsd:` in emitted bodies. | closed |
| T-02-09a | Repudiation | `text_mode` silently NOT degrading, stalling an interactive flow under Bob | mitigate | `text-mode-golden.test.cjs` asserts the config seam carries `text_mode:true` and the flow captures a validated numbered choice; bob default recorded for Phase 3. | closed |
| T-02-09b | Tampering / DoS (silent loss) | Malformed `custom_modes.yaml` (non-mapping root) silently dropping the gsd mode | mitigate | `mergeCustomModes` throws a concrete error on a non-mapping root (adapter L93–94); regression tests assert the loud failure. | closed |
| T-02-10a | Information Disclosure | Support roster going stale / silent | mitigate | `SUPPORT-ROSTER.md` generated from the gate via `scripts/generate-support-roster.cjs` (never hand-maintained); asserted to contain the `unsupported on Bob:` marker. | closed |
| T-02-10b | Spoofing / Tampering | Null/nameless candidate admitted to the loadable set or corrupting the roster as `undefined:` | mitigate | `gateArtifact` rejects null/nameless with a concrete reason (adapter L155); `buildSupportRoster` uses `<unnamed candidate>` placeholder (L190); regression tests assert exclusion. | closed |
| T-02-11 | Injection | YAML flow chars / block scalars in a rewritten description breaking Bob's parser | accept | Out of scope for gap closure; existing `yamlQuote` already wraps description/argument-hint, and today's payload uses single-line quoted descriptions. Block-scalar hardening tracked as a non-blocking follow-up (no high-severity surface). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*
*Note: T-02-08/09/10 IDs were reused across plans 02-03 and 02-04 for distinct components; disambiguated here with `a`/`b` suffixes.*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-02-01 | `BOB_CONFIG_DIR` is an operator-set shim override on the same trust footing as `CLAUDE_CONFIG_DIR`/`CURSOR_CONFIG_DIR`; reuses gsd-core's existing path resolver with no new logic and no untrusted source. | gsd-bob (plan 02-01) | 2026-06-18 |
| AR-02 | T-02-06 | Converters emit markdown only; no shell interpolation occurs during conversion. The shell-out seam takes GSD-workflow args, not raw user text. | gsd-bob (plan 02-02) | 2026-06-18 |
| AR-03 | T-02-11 | Block-scalar / YAML-flow-char hardening is a latent follow-up (WR-02). Existing `yamlQuote` already wraps emitted scalar fields and the current payload uses single-line quoted descriptions — no high-severity surface in this change. | gsd-bob (plan 02-04) | 2026-06-18 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-18 | 15 | 15 | 0 | gsd-secure-phase (orchestrator, short-circuit: plan-time register, all CLOSED) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-18
