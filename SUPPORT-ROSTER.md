# Bob Support Roster

> **GENERATED — do not hand-edit.** Regenerate with `node scripts/generate-support-roster.cjs`.
> This roster is produced from the bob-adapter gate (`gateArtifact` / `buildSupportRoster`
> in `src/bob-adapter.cjs`), not maintained by hand (T-02-10): a stale or silent roster
> would hide a parity gap. Every GSD artifact Bob cannot support is recorded LOUD as an
> `unsupported on Bob: <reason>` line so the gap is never silent (D-10, TRANS-04, parity-first).
>
> **Caveat (Pitfall 5 — YAML comment loss):** the idempotent `custom_modes.yaml` merge
> re-emits via js-yaml, which DROPS comments on dump. The merge invariant is slug-level
> idempotency (replace-in-place, never duplicate, never touch non-gsd slugs), NOT comment
> fidelity. Any comments a user placed in `~/.bob/custom_modes.yaml` are not preserved
> across a gsd-bob merge.
>
> **Scope:** the candidate set is now DERIVED from the emitted `commands/gsd/*.md` source
> set (the same source the installer iterates) — every candidate is a real emitted artifact,
> with no synthetic entries (full-roster generation, Phase 5 D-06; BOB2-05).

## Supported (emitted to `.bob/commands` / `.bob/skills`)

- gsd-audit-fix
- gsd-audit-uat
- gsd-code-review
- gsd-complete-milestone
- gsd-debug
- gsd-discuss-phase
- gsd-docs-update
- gsd-execute-phase
- gsd-explore
- gsd-extract-learnings
- gsd-fast
- gsd-health
- gsd-map-codebase
- gsd-milestone-summary
- gsd-mvp-phase
- gsd-new-milestone
- gsd-new-project
- gsd-next
- gsd-onboard
- gsd-pause-work
- gsd-plan-phase
- gsd-progress
- gsd-quick-batch
- gsd-quick
- gsd-resume-work
- gsd-secure-phase
- gsd-ship
- gsd-spec-phase
- gsd-stats
- gsd-ui-phase
- gsd-verify-work

## Unsupported on Bob (omitted from the loadable set, recorded loud)

_(none unsupported in the candidate set)_
