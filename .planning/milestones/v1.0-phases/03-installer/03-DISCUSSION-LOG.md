# Phase 3: Installer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 3-Installer
**Areas discussed:** Manifest design, Update/uninstall safety, What v1 stages, Install UX + config.json

---

## Discussion mode

The user was presented all four gray areas and responded **"auto for everything"** — delegating every decision to Claude's judgment. No per-question interactive turns were run. The selected options below reflect Claude's recommended decision for each area, grounded in the locked Phase 1/2 decisions, CLAUDE.md constraints, and gsd-core conventions. See CONTEXT.md `<decisions>` (D-01..D-15) for the full rationale.

---

## Manifest design

| Option | Description | Selected |
|--------|-------------|----------|
| Single JSON manifest with content hashes | Hidden dotfile at install-target root; entries `{path, sha256, kind}`; hash distinguishes owned-untouched from user-edited | ✓ |
| Path-only manifest (no hashes) | Lists written paths but cannot detect user edits to tracked files | |
| No manifest / filesystem scan | Diff against a known layout at update time | |

**Claude's choice:** Single JSON manifest with mandatory `sha256` per entry and a `kind` of `file` (fully owned) vs `merged` (slice-owned: custom_modes.yaml slugs, config.json keys). The manifest is the single source of truth; unlisted files are never touched. (D-01..D-03)
**Notes:** Hashes are the load-bearing safety mechanism for INSTALL-04/05 — without them, update/clean cannot tell "we wrote it and own it" from "the user changed it."

---

## Update / uninstall safety

| Option | Description | Selected |
|--------|-------------|----------|
| Hash-gated skip+warn on collision | Overwrite only when on-disk hash matches manifest; user-modified tracked files are skipped + warned; orphans removed only if still owned | ✓ |
| Always overwrite tracked files | Simpler, but clobbers user edits to tracked files | |
| Backup-on-overwrite (`.bak`) | Preserves edits but proliferates files | |

**Claude's choice:** Hash-gated update (D-04/D-05); `--uninstall` (the clean half) removes only owned-unchanged files, un-merges the gsd slugs/keys from custom_modes.yaml and config.json without deleting those files, and **never touches `.planning/`** (D-06/D-07).
**Notes:** `--force` and `.bak` backups deferred to v2. `.planning/` is user artifact data, explicitly out of uninstall scope.

---

## What v1 stages

| Option | Description | Selected |
|--------|-------------|----------|
| Roster-agnostic, convert at install time | Enumerate whatever the `bob` runtime emits today, stage supported artifacts, roster the skipped; scales as Phases 4-5 port more | ✓ |
| Hardcoded structural skeleton | Stage a fixed minimal layout; blocked on Phase 4 to fill in | |
| Vendor pre-converted `.bob/` artifacts | Ship pre-built outputs in the npm package | |

**Claude's choice:** Roster-agnostic install-time conversion from the vendored payload (D-08/D-09); always-staged structural pieces = gsd mode + gsd-core shim payload + config.json (D-10).
**Notes:** Researcher confirm-item — verify exactly which GSD payload is vendored today and how the `bob` runtime enumerates it.

---

## Install UX + config.json

| Option | Description | Selected |
|--------|-------------|----------|
| Interactive readline prompt (default local), config.json merged | No-flag → prompt (installer is a plain Node CLI, not a Bob skill); print target before write; merge text_mode into `.planning/config.json` preserving user keys | ✓ |
| Require explicit scope flag | Error if neither `--local` nor `--global` given | |
| Overwrite config.json | Simpler but destroys user config settings | |

**Claude's choice:** Interactive prompt defaulting to local, path printed before write, `--dry-run` previews (D-11/D-12); config.json written by merge at the workspace root, with descriptor-level text_mode as the primary guarantee for global installs (D-13/D-14).
**Notes:** Researcher confirm-item — confirm the `bob` descriptor already forces text_mode at the runtime level (load-bearing for global scope where there is no project `.planning/`).

---

## Claude's Discretion

- Exact manifest schema field names and dotfile name (`.gsd-bob-manifest.json` proposed).
- Internal installer module layout (arg-parse / scope-resolve / stage / manifest-write).
- Readline prompt copy and the written/skipped/removed report format.
- `node:test` file naming and fixture layout (consistent with Phase 2 D-11).

## Deferred Ideas

- `--force` to overwrite user-modified tracked files on update (v1 = skip+warn).
- `--profile=<core|standard|full>` profile selection — premature for v1's partial roster.
- Backup-on-overwrite (`.bak` files) — rejected for v1.
- Multi-mode staging — Phase 2 / CLAUDE.md v2 deferral; v1 stages the single `gsd` mode.
