---
phase: 3
slug: installer
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-19
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> ASVS L1, block-on: high. Register authored at plan time across the four Phase-3
> plan threat models (03-01..03-04); this audit verifies each declared disposition
> against the implementation rather than performing a fresh scan.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| disk → manifest read | `.gsd-bob-manifest.json` on disk is untrusted input parsed by the installer | tracked-file entries (paths + sha256) |
| disk → custom_modes.yaml | existing user-authored YAML read before un-merge is untrusted | user mode definitions |
| disk → config.json | existing user-authored config read before merge/un-merge is untrusted | user workflow keys |
| CLI args / env → installer | `process.argv`, `-c <path>`, `BOB_CONFIG_DIR` are user-supplied and untrusted | scope target path, flags |
| stage write → scope target | every written/deleted path must land under the resolved target (or workspace `.planning/`), never outside it | staged skills/commands/payload |
| disk → tracked files on re-run/uninstall | on-disk bytes of tracked files (the user may have edited them) decide overwrite/delete | file contents + hashes |
| package root → payload copy | the vendored `gsd-core/` payload must source from the package root, not cwd | staged payload bytes |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | `manifest.cjs` readManifest | mitigate | Corrupt/non-JSON manifest throws loud, never silently empty (`manifest.cjs:130-138`; ENOENT→null at `:127`). Test: `manifest.test.cjs`. | closed |
| T-03-02 | Tampering | `bob-adapter.unmergeCustomModes` | mitigate | Non-mapping YAML root throws; un-merge filters only owned slugs, never deletes file/drops non-owned slug (`bob-adapter.cjs:139-144,155-160`, D-06). Test: `unmerge.test.cjs`. | closed |
| T-03-03 | Information Disclosure | `manifest.cjs` sha256 | accept | sha256 (node:crypto) used for ownership/integrity only, not a security primitive (`manifest.cjs:29,42-44`). See Accepted Risks. | closed |
| T-03-04 | Tampering | js-yaml arbitrary-tag execution | accept | js-yaml v4 SAFE schema does not execute tags; YAML confined to the adapter (`bob-adapter.cjs:10,78,120`). See Accepted Risks. | closed |
| T-03-05 | Tampering | `scope.cjs` target via `-c`/`BOB_CONFIG_DIR` | mitigate | `resolveTarget` delegates to vetted `getGlobalConfigDir` (absolute path, no hand-rolled math); entry prints it before any write (`scope.cjs:34`, `gsd-bob.cjs:298-300`, INSTALL-01). | closed |
| T-03-06 | Elevation of Privilege | `args.cjs` unknown flags | mitigate | Unknown/extra flags (incl. `--clean`/`--update`) throw a concrete error, no silent absorption (`args.cjs:75-80`). Test: `args.test.cjs`. | closed |
| T-03-07 | Tampering | path traversal via `-c` value | accept | Writes only under the user-chosen+printed scope target on the invoking user's own fs (ASVS V4 N/A); CR-01 guards added as defense-in-depth. See Accepted Risks. | closed |
| T-03-08 | Tampering/Repudiation | `stage.cjs` overwrite on update | mitigate | `classifyOnUpdate` gates every overwrite on hash match; modified tracked file skipped+warned (`stage.cjs:166-178`, D-04). Test: `stage.test.cjs`. | closed |
| T-03-09 | Tampering | `stage.cjs` orphan sweep / prune | mitigate | Orphan removal only on hash match; diverged left+warned; `.planning/` excluded; prune limited to `installerDirs` (`stage.cjs:248-290`, D-03/D-05/D-07). Tests: `stage.test.cjs`, `manifest-path-safety.test.cjs`. | closed |
| T-03-09b | Tampering | `stage.cjs` payload copy sourcing | mitigate | Payload read exclusively from `repoRoot`; missing payload fails loud before any structural write (`stage.cjs:129-135`). Test: `stage.test.cjs` (cwd-independence, missing-payload). | closed |
| T-03-10 | Tampering | config-merge clobbering unparseable `config.json` | mitigate | Parse failure → warn + return without writing; byte-equality proven (`config-merge.cjs:59-66`). Test: `config-merge.test.cjs`. | closed |
| T-03-11 | Tampering | writes escaping scope target via crafted paths | mitigate | `safeJoin` + `assertSafeRelpath` containment guards reject `..`/absolute at manifest load and before every destructive op (`manifest.cjs:101-112,68-89`; `stage.cjs:261`; `gsd-bob.cjs:197,214,249`) — CR-01 hardening. Test: `manifest-path-safety.test.cjs`. | closed |
| T-03-12 | Tampering | symlink in scope target redirecting write/delete | accept | Low risk for a user-local tool; manifest hash-gating limits blast radius (`stage.cjs:262-264`). See Accepted Risks. | closed |
| T-03-13 | Tampering | uninstall deleting user data / `.planning/` | mitigate | `file` entries deleted only on hash match; `merged` entries un-merged not deleted; `.planning/` never deleted (`gsd-bob.cjs:189-257`, D-06/D-07). Test: `uninstall.test.cjs`. | closed |
| T-03-14 | Repudiation | writing without showing the user where | mitigate | Resolved absolute target printed before any mutation on every path; all fs ops `if (!dryRun)`-guarded (`gsd-bob.cjs:298-300`, INSTALL-01/D-12). Tests: `install-clean.test.cjs`, `dry-run.test.cjs`. | closed |
| T-03-14b | Tampering | stray `.planning/config.json` in arbitrary global cwd | mitigate | text_mode merge runs only when `<workspaceRoot>/.planning/` exists; else SKIP + KNOWN-LIMITATION note (`gsd-bob.cjs:139-157`, D-14/Q1). Test: `install-clean.test.cjs` (both branches). | closed |
| T-03-14c | Tampering | payload copy sourced from wrong root under real npx | mitigate | `repoRoot = path.resolve(__dirname,'..')` threaded into `stage`; payload never read relative to cwd (`gsd-bob.cjs:56,133`). Test: `install-clean.test.cjs` (cwd ≠ package root). | closed |
| T-03-15 | Tampering | un-merge clobbering user modes/keys | mitigate | `custom_modes.yaml` un-merge slug-scoped via `unmergeCustomModes`; `config.json` un-merge removes only `workflow.text_mode`, preserves user keys (`gsd-bob.cjs:206,231-234`). Test: `uninstall.test.cjs`. | closed |
| T-03-16 | Tampering | manifest absent/corrupt at uninstall | mitigate | Missing manifest → clean no-op; corrupt manifest → `readManifest` throws loud (`gsd-bob.cjs:170-178`; `manifest.cjs:130-138`, D-03). | closed |
| T-03-17 | Elevation of Privilege | bin shipping Claude-coupled/framework dependency | mitigate | bin requires only node builtins + in-repo modules; deps stay `{js-yaml}`; no `@anthropic`/`claude-agent-sdk`, no CLI framework (`gsd-bob.cjs:34-53`; `package.json`). Grep-asserted. | closed |
| T-03-SC | Tampering | npm/pip/cargo supply-chain installs | mitigate | No new packages introduced; `package.json` deps = `{js-yaml}` only (pre-vetted Phase 2, confined to adapter); node builtins for all install IO (`package.json:16-18`). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-03 | sha256 (node:crypto, not hand-rolled) hashes no secret material; the digest only distinguishes "gsd-bob-owned, untouched" from "user-modified". Ownership/integrity use, not a cryptographic-secret use (ASVS V6 N/A). | gsd-security-auditor | 2026-06-19 |
| AR-03-02 | T-03-04 | js-yaml v4 default SAFE schema does not execute arbitrary/custom tags (standing control from Phase 2 T-02-04); the parser is isolated to `bob-adapter.cjs`, never on the install path. | gsd-security-auditor | 2026-06-19 |
| AR-03-03 | T-03-07 | The tool writes only under the user-chosen, printed scope target on the invoking user's own filesystem — no privilege boundary is crossed (ASVS V4 access-control N/A for a single-user local CLI). Defense-in-depth added anyway via CR-01 `safeJoin`/`assertSafeRelpath` (see T-03-11). | gsd-security-auditor | 2026-06-19 |
| AR-03-04 | T-03-12 | Symlink redirection is low risk for a user-local tool on the user's own fs; manifest hash-gating limits blast radius to hash-matching tracked files only. Flagged for future hardening, not a blocker at ASVS L1. | gsd-security-auditor | 2026-06-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-19 | 21 | 21 | 0 | gsd-security-auditor (/gsd-secure-phase 3) |

Corroborating checks at audit time:
- `npm test` → 110 pass / 0 fail.
- `grep -rn "require('js-yaml')" src/ bin/` → only `src/bob-adapter.cjs:19` (install/staging path stays node-builtins-only).
- No `@anthropic`/`claude-agent-sdk`, no `commander`/`yargs`/`oclif` anywhere; `package.json` deps = `{js-yaml: 4.1.0}`, bin = `{gsd-bob: bin/gsd-bob.cjs}`.
- Dry-run zero-writes invariant verified: every `writeFileSync`/`rmSync`/`rmdirSync`/`writeManifest` on install+uninstall paths is `if (!dryRun)`-gated.
- No SUMMARY (03-01..03-04) contained a `## Threat Flags` section — no unmapped attack surface. The only code beyond the register (CR-01 `safeJoin`/`assertSafeRelpath`, commit `dd71762`) strengthens T-03-07/T-03-11/T-03-13.
- Implementation files were not modified by this audit (read-only).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-19
