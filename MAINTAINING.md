# Maintaining gsd-bob — the gsd-core version-bump runbook

> **Audience:** a gsd-bob maintainer performing the next `@opengsd/gsd-core` version bump.
> This is a **checklist you run**, not a retrospective. Every step is a real command with
> `<old>`/`<new>` placeholders — substitute the current vendored version for `<old>` (read
> it from `gsd-core/VERSION`) and the target for `<new>`, then execute top to bottom.
>
> **Provenance:** this runbook is distilled from the real `1.5.0 → 1.6.1` re-vendor recorded
> live in `.planning/phases/07-gsd-core-1-6-1-sync/07-REVENDOR-NOTES.md` (the "Runbook seed",
> L284–296). It reflects the *actual* dance — including the gotchas — not an aspirational one.
> The mechanics are owned by two scripts: `scripts/apply-bob-patches.cjs` (re-injects the six
> local Bob deltas) and `scripts/generate-support-roster.cjs` (regenerates the roster).

## What the vendored payload actually is

The tracked `gsd-core/` tree is **not** the pristine npm tarball. It is:

```
pristine @opengsd/gsd-core tarball
  + colon→hyphen normalization pass          (over the .md doc tree)
  + ~/.claude → $HOME/.claude normalization  (over the .md doc tree)
  + three Bob data/code deltas               (registry, converters, both aliases)
  + a local VERSION file                     (the tarball ships none)
```

A naive "nuke and restage the raw tarball" drops every one of those deltas and leaves the
payload broken under Bob. The bump procedure is therefore: **nuke → restage the clean
tarball → re-run `scripts/apply-bob-patches.cjs` → validate.** The patch script is idempotent
by design, so the whole thing is replayable.

---

## Before you start — the placeholders

| Placeholder | Meaning | How to read it |
|-------------|---------|----------------|
| `<old>` | The currently-vendored gsd-core version | `cat gsd-core/VERSION` (e.g. `1.6.1`) |
| `<new>` | The target gsd-core version | the version you are bumping to (e.g. `1.7.0`) |

> Also update `scripts/apply-bob-patches.cjs`'s `TARGET_VERSION` constant (currently around
> L46) to `<new>` **before** step 5 — the script writes `gsd-core/VERSION` from that constant.

---

## Step 1 — Capture provenance + record the test baseline (BEFORE any mutation)

Record these four anchors so every post-vendor delta is attributable, then capture the
**pre-vendor `npm test` baseline** — the number of pre-existing failures you will subtract
later. Do this while the tree is still untouched.

```bash
git rev-parse --short HEAD          # e.g. d832efa — the pre-vendor HEAD
cat gsd-core/VERSION                # the <old> version, e.g. 1.6.1
date -u +%Y-%m-%d                   # the date, for the notes log
npm test 2>&1 | tail -n 5           # record: "tests N / pass P / fail F"
```

Write the baseline down (e.g. `334 tests / 334 pass / 0 fail`, which is where Phase 12 left it).
**Caveat (a):** if the baseline is *not* zero, treat the failures as a bug to investigate before
you vendor, not as noise to subtract forever — see [Caveats](#caveats-read-these-they-are-real).

## Step 2 — Pack the target tarball (immutable) and confirm its layout

`npm pack` fetches the **registry-signed immutable tarball** — this requires **network**
(caveat (c)). Extract into a scratch dir and **`ls` to confirm the payload root before you
copy anything** — never assume the structure.

```bash
SCRATCH=$(mktemp -d /tmp/gsdbump.XXXXXX)
cd "$SCRATCH"
npm pack @opengsd/gsd-core@<new>                 # → opengsd-gsd-core-<new>.tgz
tar -xzf opengsd-gsd-core-<new>.tgz
ls package/gsd-core/                             # MUST show: bin contexts references templates workflows
test -f package/gsd-core/VERSION && echo "UNEXPECTED: tarball shipped a VERSION" || echo "OK: no VERSION in tarball (expected)"
cd -                                             # back to the repo root
```

The tarball ships the five curated subdirs `package/gsd-core/{bin,contexts,references,templates,workflows}`
and **no `VERSION` file** — the patch script writes `VERSION` in step 5.

## Step 3 — Nuke the tracked curated subset

Remove the five tracked subdirs. This is the only mechanic that guarantees no `<old>`/`<new>`
payload mixing. `VERSION` is deliberately **not** nuked here (the tarball has none; the patch
script overwrites it in step 5).

```bash
rm -rf gsd-core/{bin,contexts,references,templates,workflows}
```

## Step 4 — Restage the identical five subdirs from the extracted tarball

Copy the same five subdirs back from the scratch extraction. Keep the curated-subset boundary
unchanged — five subdirs in, five subdirs out.

```bash
SRC="$SCRATCH/package/gsd-core"
for d in bin contexts references templates workflows; do cp -R "$SRC/$d" "gsd-core/$d"; done
# sanity: the new dirs exist and a <new>-only file landed
for d in bin contexts references templates workflows; do test -d "gsd-core/$d"; done && echo "restage ok"
```

## Step 5 — Re-inject the six local Bob deltas + prove idempotency

Run the patch script once to reproduce all six local deltas over the pristine tree, then run
it a **second** time and confirm it is a pure no-op — this is the idempotency contract.

```bash
node scripts/apply-bob-patches.cjs               # RUN 1 — applies all six deltas
git add gsd-core/                                # stage the post-run-1 tree as the comparison baseline
node scripts/apply-bob-patches.cjs               # RUN 2 — every step must report "already applied — no-op" / "0 changed"
git diff --quiet gsd-core/ && echo "IDEMPOTENT" || echo "FAIL: second run changed the tree"
```

The **six deltas** `scripts/apply-bob-patches.cjs` re-injects (see its header, L17–24):

1. **colon→hyphen** command form (`gsd:<cmd>` → `gsd-<cmd>`) over the `.md` doc tree.
2. **home-path normalization** (`~/.claude` → `$HOME/.claude`) over the `.md` doc tree.
3. the **`"bob"` runtime registry block** → `gsd-core/bin/lib/capability-registry.cjs`
   (inserted before the `"claude"` entry in `const runtimes`).
4. the **Bob converter code block** (~105 lines) + its three export symbols →
   `gsd-core/bin/lib/runtime-artifact-conversion.cjs`.
5. **both aliases** — `"bob"` in `gsd-core/bin/shared/runtime-aliases.manifest.json` **and**
   `bob` in `gsd-core/bin/lib/runtime-name-policy.cjs` `FALLBACK_ALIASES`.
6. the **local `VERSION` file** → `gsd-core/VERSION` (written from `TARGET_VERSION`; set it to
   `<new>` before running — see [placeholders](#before-you-start--the-placeholders)).

> **Caveat (d):** the two converters are a **LOCAL hand-edit** vendored into a generated file
> (banner `gsd-bob HAND-EDIT to this GENERATED file`), grep-confirmed absent from the pristine
> tarball. A "does the function still exist upstream?" check is meaningless — the re-injection
> contract is what matters: grep-absent in the tarball, present after the script runs. Confirm:
> ```bash
> grep -c convertClaudeCommandToBobSkill "$SCRATCH/package/gsd-core/bin/lib/runtime-artifact-conversion.cjs"  # → 0 (absent in pristine)
> grep -c convertClaudeCommandToBobSkill gsd-core/bin/lib/runtime-artifact-conversion.cjs                     # → >0 (present post-script)
> node --check gsd-core/bin/lib/capability-registry.cjs   # anchor inserts must not corrupt JS
> node --check gsd-core/bin/lib/runtime-artifact-conversion.cjs
> node --check gsd-core/bin/lib/runtime-name-policy.cjs
> ```

## Step 6 — Re-sync any drifted `commands/gsd/*.md` sources to `<new>`

The Phase 9 version-consistency lesson: the `commands/gsd/*.md` sources are curated from the
gsd-core command payload and can drift from `<new>`. Re-sync any that changed upstream so the
emitted command set matches the new version, then move on to regenerating the roster.

```bash
# diff the vendored command sources against the freshly-restaged payload and re-sync any drift
diff -rq commands/gsd/ "$SCRATCH/package/gsd-core/"  2>/dev/null || true   # inspect divergence, re-sync as needed
```

## Step 7 — Regenerate the support roster

Regenerate `SUPPORT-ROSTER.md` from the gate (it derives the candidate set from
`commands/gsd/*.md`, so it stays in lock-step with step 6).

```bash
node scripts/generate-support-roster.cjs         # rewrites SUPPORT-ROSTER.md from the bob-adapter gate
git diff --stat SUPPORT-ROSTER.md
```

## Step 8 — Run suites, subtract the baseline, bump the version markers

Run the **invariants first** — they must pass **unmodified** (they are never drift-eligible):

```bash
node --test test/backend-neutrality.test.cjs test/descriptor.test.cjs   # must be all-pass, files UNCHANGED
```

Then run the full suite and **subtract the step-1 baseline**. Classify every *non-baseline*
failure:

```bash
npm test 2>&1 | tail -n 5        # compare against the step-1 baseline (e.g. 334 pass / 0 fail)
```

- **Expected drift** → regenerate that one fixture and record a **one-line justification keyed
  by the fixture name**. Do **not** blanket-regenerate.
- **Regression** → fix the code, do not touch the fixture.

The **guaranteed golden drift** is `test/installer/staged-shim-loads.test.cjs` — the staged
`package.json` version fixture flips `<old>` → `<new>`. Regenerate it and justify:

```bash
# test/installer/staged-shim-loads.test.cjs asserts pkg.version — update the literal <old> → <new>
node --test test/installer/staged-shim-loads.test.cjs   # → pass
npm test 2>&1 | tail -n 5                                # → back to exactly the step-1 baseline
```

Finally, bump the version markers and re-verify the upstream pointers:

```bash
cat gsd-core/VERSION                             # → <new> (written by the patch script in step 5)
# Update UPSTREAM.md's "Targeted gsd-core version" to <new>, then RE-VERIFY every file:line
# pointer against the <new> source — grep the real line numbers, never copy the stale <old> ones:
grep -n '"bob": {' gsd-core/bin/lib/capability-registry.cjs
grep -n 'function convertClaudeCommandToBobSkill\|function convertClaudeCommandToBobCommand' gsd-core/bin/lib/runtime-artifact-conversion.cjs
```

### Version-consistency check (no `<old>`/`<new>` mix left in the payload)

```bash
cat gsd-core/VERSION                                              # → <new>
grep -rn '<old>' gsd-core/ | grep -v 'legacy-cleanup.cjs'        # → empty (except the stock exception below)
grep -rn '<old>' README.md UPSTREAM.md src/installer/stage.cjs   # → empty (sweep non-payload references too)
```

---

## Caveats — read these, they are real

These are the four environment gotchas from the real `1.5.0 → 1.6.1` run
(`07-REVENDOR-NOTES.md` L273–281, L296). Frame them as **expected**, never as failures.

**(a) Subtract whatever baseline failures you record — but do not assume there are any.**
The `1.5.0 → 1.6.1` run had **3** (`acceptance-coverage.test.cjs:114`, `:128`;
`core-loop-contract.test.cjs:126`), and this caveat used to call them permanent environmental
noise and tell you never to fix them. That was wrong. They were reading `.planning/` sources
that had *moved* — the v1 phase directories were deleted rather than archived at the v2.0
transition, and v3.0 relocated the v1/v2.0 requirement text into `milestones/`. Both were
repaired in Phase 12 by pointing the derivations at the archive, and **the suite is now fully
green (334/334)**. So: still record the step-1 baseline and still subtract it in step 8 — but a
non-zero baseline is a bug to investigate, not a fact of life. Only a **new** failing test ID is
a real re-vendor delta.

**(b) The stock `gsd-core/bin/lib/legacy-cleanup.cjs:225` `1.5.0` comment is a permanent
expected exception.** It is an immutable upstream historical comment (a Codex-migration
reference: `// When Codex upgrades to gsd-core 1.5.0 it writes fresh skill files to`),
byte-identical in every tarball. **Grep-exclude it** in every version-residue sweep
(`grep -v 'legacy-cleanup.cjs'`). Editing it would introduce an **undocumented seventh delta**
that `scripts/apply-bob-patches.cjs` does not reproduce — breaking idempotency and the
nuke-and-restage "pristine + exactly six deltas" integrity contract.

**(c) `npm pack` requires network.** It fetches the registry-signed immutable tarball
(step 2). Run the bump on a connected machine.

**(d) The converters are LOCAL hand-edits, not stock upstream.** A "does the upstream function
still exist?" check is meaningless — the two Bob converters are a ~105-line vendored hand-edit
re-injected by the patch script. The contract to verify is **re-injection**: grep-absent in
the pristine tarball, present after `scripts/apply-bob-patches.cjs` runs (step 5).

**Plus the one guaranteed golden drift:** `test/installer/staged-shim-loads.test.cjs` asserts
the staged `package.json` version and will flip `<old>` → `<new>`. This is expected — regenerate
it with a one-line justification (step 8), it is not a regression.

---

## Packaging note

`MAINTAINING.md` is a **repo/GitHub-facing doc** — it is intentionally **not** in the
`package.json` `files` allowlist and does **not** ship in the npm tarball. Do not add it there.

## Provenance / sources

- `.planning/phases/07-gsd-core-1-6-1-sync/07-REVENDOR-NOTES.md` — the live `1.5.0 → 1.6.1`
  log this runbook distills (runbook seed L284–296; baseline L24–53; caveats L273–281, L296).
- `scripts/apply-bob-patches.cjs` — the six-delta re-injection + idempotency (header L17–24,
  `TARGET_VERSION` L46).
- `scripts/generate-support-roster.cjs` — roster regeneration (step 7).
- `gsd-core/VERSION` — the version marker step 8 bumps.
- `UPSTREAM.md` — the targeted version + the 6-artifact file:line pointers step 8 re-verifies.
