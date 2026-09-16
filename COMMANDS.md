# Bob Command Reference

> **GENERATED — do not hand-edit.** Regenerate with `node scripts/generate-command-reference.cjs`.
> One row per emitted command, derived from the `commands/gsd/*.md` source set and filtered
> through the same bob-adapter gate the roster uses. Each description is lifted VERBATIM from
> the source frontmatter `description:` field, so this reference cannot silently drift from
> what actually installs (D-02). The set-equality drift guard `test/docs-conformance.test.cjs`
> pins this list to the generated `SUPPORT-ROSTER.md` Supported set.

| Command | Description |
| ------- | ----------- |
| `gsd-audit-fix` | Autonomous audit-to-fix pipeline — find issues, classify, fix, test, commit |
| `gsd-audit-uat` | Cross-phase audit of all outstanding UAT and verification items |
| `gsd-code-review` | Review source files changed during a phase for bugs, security issues, and code quality problems |
| `gsd-complete-milestone` | Archive completed milestone and prepare for next version |
| `gsd-debug` | Systematic debugging with persistent state across context resets |
| `gsd-discuss-phase` | Gather phase context through adaptive questioning before planning. |
| `gsd-docs-update` | Generate or update project documentation verified against the codebase |
| `gsd-execute-phase` | SDD phase execution — execute all plans in a phase with dependency-aware wave parallelization |
| `gsd-explore` | Socratic ideation and idea routing — think through ideas before committing to plans |
| `gsd-extract-learnings` | Extract decisions, lessons, patterns, and surprises from completed phase artifacts |
| `gsd-fast` | Execute a trivial task inline — no subagents, no planning overhead |
| `gsd-health` | Diagnose planning directory health and optionally repair issues |
| `gsd-map-codebase` | Analyze codebase with parallel mapper agents to produce .planning/codebase/ documents |
| `gsd-milestone-summary` | Generate a comprehensive project summary from milestone artifacts for team onboarding and review |
| `gsd-mvp-phase` | Plan a phase as a vertical MVP slice — user story, SPIDR splitting, then plan-phase |
| `gsd-new-milestone` | Start a new milestone cycle — update PROJECT.md and route to requirements |
| `gsd-new-project` | Initialize a new project with deep context gathering and PROJECT.md |
| `gsd-next` | Smart entry — detect project state and route to the right next GSD action. |
| `gsd-onboard` | Guide existing codebase onboarding through mapping, doc ingest, and planning setup |
| `gsd-pause-work` | Create context handoff when pausing work mid-phase |
| `gsd-plan-phase` | Create detailed phase plan (PLAN.md) with verification loop |
| `gsd-progress` | Check progress, advance workflow, or dispatch freeform intent — the unified GSD situational command |
| `gsd-quick` | Execute a quick task with GSD guarantees (atomic commits, state tracking) but skip optional agents |
| `gsd-quick-batch` | Batch several /gsd:quick-shaped tasks together — planned, dispatched, and merged as one run |
| `gsd-resume-work` | Resume work from previous session with full context restoration |
| `gsd-secure-phase` | Retroactively verify threat mitigations for a completed phase |
| `gsd-ship` | Create PR, run review, and prepare for merge after verification passes |
| `gsd-spec-phase` | Clarify WHAT a phase delivers with ambiguity scoring; produces a SPEC.md before discuss-phase. |
| `gsd-stats` | Display project statistics — phases, plans, requirements, git metrics, and timeline |
| `gsd-ui-phase` | Generate UI design contract (UI-SPEC.md) for frontend phases |
| `gsd-verify-work` | Validate built features through conversational UAT |
