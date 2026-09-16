# Maintaining gsd-bob — the gsd-core version-bump runbook

> **Audience:** a gsd-bob maintainer performing the next `@opengsd/gsd-core` version bump.
> This is a **checklist you run**, not a retrospective. Every step is a real command with
> `<old>`/`<new>` placeholders — substitute the current vendored version for `<old>` (read
> it from `gsd-core/VERSION`) and the target for `<new>`, then execute top to bottom.
>
> **Provenance:** this runbook is corrected from the real **`1.6.1 → 1.14.0`** re-vendor
> recorded live in
> [`.planning/phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md`](./.planning/phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md)
> (command log + "What the runbook got wrong"). The previous edition was distilled from the
> `1.5.0 → 1.6.1` run and **broke** on 1.14.0: one of its anchors had been deleted upstream and
> the script aborted half-applied. Everything below reflects the eight-version jump that was
> actually performed, including what it cost.
>
> The mechanics are owned by two scripts: `scripts/apply-bob-patches.cjs` (re-injects the
> **nine** local Bob deltas, with a preflight and a post-verify) and
> `scripts/generate-support-roster.cjs` (regenerates the roster).

## What the vendored payload actually is

The tracked `gsd-core/` tree is **not** the pristine npm tarball. It is:

```
pristine @opengsd/gsd-core tarball
  + colon→hyphen normalization pass          (over the .md doc tree)            [delta 1]
  + ~/.claude → $HOME/.claude normalization  (over the .md doc tree)            [delta 2]
  + the "bob" runtime registry block         (bin/lib/capability-registry.cjs)  [delta 3]
  + the Bob converter block + 3 exports      (bin/lib/runtime-artifact-conversion.cjs) [delta 4]
  + both runtime aliases                     (manifest JSON + FALLBACK_ALIASES) [delta 5a/5b]
  + a local VERSION file                     (the tarball ships none)           [delta 6]
  + 2 converter names in VALID_CONVERTER_NAMES (bin/lib/capability-validator.cjs) [delta 7]
  + `.bob` probes in the gsd_run resolver    (over the .md doc tree)            [delta 8]
  + a per-install runtime marker `bob`       (gsd-core/.gsd-runtime)            [delta 9]
```

A naive "nuke and restage the raw tarball" drops every one of those and leaves the payload
broken under Bob: the colon command form leaks back in, `stage.cjs` destructures missing
converters, the registry-driven staging path refuses the converters it *does* find, workflow
bash cannot locate the shim, and every `dispatch-*` query answers for the **`claude`**
descriptor. The bump procedure is therefore: **nuke → restage the clean tarball → re-run
`scripts/apply-bob-patches.cjs` → validate.** The script is idempotent by design, so the whole
thing is replayable.

---

## Before you start — the placeholders

| Placeholder | Meaning | How to read it |
|-------------|---------|----------------|
| `<old>` | The currently-vendored gsd-core version | `cat gsd-core/VERSION` (e.g. `1.14.0`) |
| `<new>` | The target gsd-core version | the version you are bumping to |

> Also update `scripts/apply-bob-patches.cjs`'s `TARGET_VERSION` constant (currently around
> L67) to `<new>` **before** step 5 — the script writes `gsd-core/VERSION` from that constant.
> If the descriptor's `engines.gsd` / `version` fields should track the new upstream, edit
> `REGISTRY_BLOCK` in the same file at the same time; `test/descriptor.test.cjs` deep-equals the
> vendored entry against that block, so the two can never silently diverge.

## Step 1 — Capture provenance + record the test baseline (BEFORE any mutation)

Record these four anchors so every post-vendor delta is attributable, then capture the
**pre-vendor `npm test` baseline**. Do this while the tree is still untouched.

```bash
git rev-parse --short HEAD          # e.g. 2d4c78c — the pre-vendor HEAD
cat gsd-core/VERSION                # the <old> version
date -u +%Y-%m-%d                   # the date, for the notes log
npm ci                              # a fresh clone has no node_modules — this bit the 1.14.0 run
npm test 2>&1 | tail -n 5           # record: "tests N / pass P / fail F"
```

The `1.6.1 → 1.14.0` run started from **334 tests / 334 pass / 0 fail**. A non-zero baseline is
a bug to investigate before you vendor, not noise to subtract forever — see
[Caveats](#caveats--read-these-they-are-real).

## Step 2 — Pack the target tarball (immutable) and confirm its layout

`npm pack` fetches the **registry-signed immutable tarball** — this requires **network**.
Extract into a scratch dir and **`ls` to confirm the payload root before you copy anything**.
Packing `<old>` as well is cheap and gives you a real diff to read when something surprises you
(the 1.14.0 run did exactly this).

```bash
SCRATCH=$(mktemp -d /tmp/gsdbump.XXXXXX)
cd "$SCRATCH"
npm pack @opengsd/gsd-core@<new>                 # → opengsd-gsd-core-<new>.tgz
npm pack @opengsd/gsd-core@<old>                 # optional, for the diff
tar -xzf opengsd-gsd-core-<new>.tgz
ls package/gsd-core/                             # MUST show: bin contexts references templates workflows
test -f package/gsd-core/VERSION && echo "UNEXPECTED: tarball shipped a VERSION" || echo "OK: no VERSION in tarball (expected)"
cd -                                             # back to the repo root
SRC="$SCRATCH/package"
```

## Step 3 — Nuke the tracked curated subset

Remove the five tracked subdirs. This is the only mechanic that guarantees no `<old>`/`<new>`
payload mixing. `VERSION` and `.gsd-runtime` are deliberately **not** nuked (the tarball has
neither; the patch script writes both in step 5).

```bash
rm -rf gsd-core/{bin,contexts,references,templates,workflows}
```

## Step 4 — Restage the identical five subdirs from the extracted tarball

```bash
for d in bin contexts references templates workflows; do cp -R "$SRC/gsd-core/$d" "gsd-core/$d"; done
for d in bin contexts references templates workflows; do test -d "gsd-core/$d"; done && echo "restage ok"
```

## Step 5 — Re-sync ALL command sources from the same tarball

**Do this before the patch run**, in lockstep with the payload — the 1.14.0 run moved it here
and it belongs here. The `commands/gsd/*.md` sources feed nothing inside the patch script, but
they *are* the conversion source of truth (D-03: the curated Claude command sources, not
upstream's pre-hyphenated `skills/`), and leaving them at `<old>` while the payload moves to
`<new>` is exactly the version-mix the nuke-and-restage exists to prevent. 15 of the 28 curated
sources had drifted across the eight-version jump.

Re-sync **every** existing stem — not only the ones you expect to have changed:

```bash
for s in $(ls commands/gsd); do cp "$SRC/commands/gsd/$s" "commands/gsd/$s"; done
git diff --stat commands/gsd/                     # read what drifted; each drift explains a golden later
```

**To add a new upstream command** (the 1.14.0 run added three — `next`, `onboard`,
`quick-batch`, taking the set 28 → 31):

```bash
# 1. see what upstream has that we do not
diff <(ls "$SRC/commands/gsd" ) <(ls commands/gsd)

# 2. copy the ones the gate should admit
for s in next.md onboard.md quick-batch.md; do cp "$SRC/commands/gsd/$s" "commands/gsd/$s"; done
```

Then, because the whole pipeline is derived from that directory, the additions flow through by
themselves — but four things must be updated by hand in the same commit:

1. **The gate decision.** If a new command hard-requires a primitive Bob lacks, put it on
   `BOB_SKIP_LIST` in `src/bob-adapter.cjs` **with a loud reason** rather than shipping a broken
   artifact. (`quick-batch` was checked against `workflow.use_worktrees=false` and passed: on
   `isolation: none` its wave caps to concurrency 1 rather than failing.)
2. **The pinned count.** `test/docs-conformance.test.cjs` and `test/command-expansion.test.cjs`
   each carry a single pinned stem count (the `28`→`31`-style literal). Everything else derives
   from it.
3. **The README prose counts.** docs-conformance assertion 4 requires the literal strings
   `The <N> skills below` and `for each of the <N> emitted commands`, and assertions 2/3 require
   README's `## Supported skills` token set and `COMMANDS.md`'s table to equal the roster
   Supported set exactly. Put each new stem in a cluster list.
4. **The acceptance checklist.** Append one read-only `AC-NN` emission/recognition step per new
   command in the existing schema — `test/acceptance-delta-coverage.test.cjs` (ACCEPT-01)
   requires a `Cmd:` line naming `gsd-<stem>.md` for **every** Supported command.

## Step 6 — Re-inject the nine local Bob deltas + prove idempotency

Run the patch script once, then a **second** time and confirm it is a pure no-op.

```bash
node scripts/apply-bob-patches.cjs               # RUN 1 — preflight, then all nine deltas, then verify
git add gsd-core/                                # stage the post-run-1 tree as the comparison baseline
node scripts/apply-bob-patches.cjs               # RUN 2 — every step "already applied — no-op" / "0 changed"
git diff --quiet gsd-core/ && echo "IDEMPOTENT" || echo "FAIL: second run changed the tree"
```

A healthy RUN 1 on the 1.14.0 tree looked like: `[1]` 134 files, `[2]` 88 files, `[3]`–`[7]`
applied, `[8]` 115 files changed (114 now probing `.bob`), `[9]` wrote `bob`,
`[✓] verify: all nine deltas present`.

**Two safety rails, both of which exist because the old runbook failed:**

- **`preflight()`** validates every anchor *before the first write*. A moved anchor now aborts
  with **nothing touched**. Previously step 4a wrote the converter block and step 4b then threw
  on a missing export anchor, leaving a tree with the converters present and unexported —
  `stage.cjs` destructuring `undefined`.
- **`verifyAll()`** re-checks all nine deltas after the run and throws on any gap: VERSION
  content, the `"bob"` entry plus its required `runtime` fields, the converter block and its
  three exports, both aliases, both allowlist entries, a `.bob` probe in **every** doc file
  carrying `_gsd_at`, no surviving `~/.claude`, and the `.gsd-runtime` marker.

### The anchors, and what to do when one moves

Every anchor lives in one place — the `ANCHORS` object in `scripts/apply-bob-patches.cjs`
(around L397) — so preflight and the patch steps can never disagree.

| Step | Anchor | If it moves |
|---|---|---|
| `[3]` registry | `const runtimes = {` then the first `"claude": {` inside it | Re-anchor on another sibling runtime key; never on the earlier `const capabilities` object. |
| `[4a]` converter block | `module.exports = {` | Stable; it is the file's own export statement. |
| `[4b]` converter exports | `extractFrontmatterField,` | Deliberately a **helper the Bob converters call**, so anchor loss and real breakage coincide. Do **not** re-anchor on a per-runtime converter name — the `convertClaudeCommandToCursorCommand,` anchor this used to key on was deleted upstream in 1.7.0, which is what broke the 1.14.0 run. |
| `[5b]` name-policy alias | `cline: ['cline', 'cline-cli'],` | Re-anchor on another `FALLBACK_ALIASES` entry that still exists. |
| `[7]` converter allowlist | `'convertClaudeCommandToClineSkill',` | Re-anchor on another entry of `VALID_CONVERTER_NAMES`. |
| `[8]` resolver preamble | the verbatim `_gsd_at "…"` probe lists + the install hint, as `RESOLVER_*_FROM` constants | Upstream reformatted the preamble: diff `references/gsd-run-resolver.md` against the previous version and re-derive the `FROM` strings. `verifyAll()` fails loudly if any preamble file lacks the `.bob` probe, so this cannot pass silently. |

`[5a]` (the alias manifest) is a **structured JSON edit**, not an anchor, and `[1]`/`[2]`/`[6]`/
`[9]` are content transforms or file writes — none of them can lose an anchor.

> **Caveat (d):** the two converters are a **LOCAL hand-edit** vendored into a generated file
> (banner `gsd-bob HAND-EDIT to this GENERATED file`), grep-confirmed absent from the pristine
> tarball. A "does the function still exist upstream?" check is meaningless — the re-injection
> contract is what matters: grep-absent in the tarball, present after the script runs. Confirm:
> ```bash
> grep -c convertClaudeCommandToBobSkill "$SRC/gsd-core/bin/lib/runtime-artifact-conversion.cjs"  # → 0 (absent in pristine)
> grep -c convertClaudeCommandToBobSkill gsd-core/bin/lib/runtime-artifact-conversion.cjs         # → >0 (present post-script)
> node --check gsd-core/bin/lib/capability-registry.cjs   # anchor inserts must not corrupt JS
> node --check gsd-core/bin/lib/runtime-artifact-conversion.cjs
> node --check gsd-core/bin/lib/runtime-name-policy.cjs
> node --check gsd-core/bin/lib/capability-validator.cjs
> ```

## Step 7 — Validate the descriptor with `<new>`'s OWN validator

This step is new and it is the cheapest bug-catcher in the runbook. Upstream keeps adding
required descriptor fields; nothing validates the frozen registry at load, so a stale entry
fails **late and silently** (1.14.0 had made `localConfigDir` and `hostIntegration` required and
`hookEvents: "none"` illegal — the 1.6.1-era block was invalid on all three counts).

```bash
node -e '
const { runtimes } = require("./gsd-core/bin/lib/capability-registry.cjs");
const v = require("./gsd-core/bin/lib/capability-validator.cjs");
const errs = [].concat(v.validateCapability(runtimes.bob, "bob"), v.validateRuntimeBody(runtimes.bob));
console.log(errs.length ? errs : "descriptor OK: 0 errors");
process.exit(errs.length ? 1 : 0);
'
```

Then prove the runtime actually resolves end to end, on a scratch project:

```bash
node -e 'const h=require("./gsd-core/bin/lib/runtime-homes.cjs"); console.log(h.getGlobalConfigDir("bob"))'
node gsd-core/bin/gsd-tools.cjs query dispatch-isolation --json     # → {"runtime":"bob","isolation":"none"}
node gsd-core/bin/gsd-tools.cjs query state.load                    # → exit 0, real .planning/ JSON
```

If `dispatch-isolation` reports a runtime other than `bob`, delta 9 (`gsd-core/.gsd-runtime`)
is missing — that marker is what stops every dispatch query answering for `claude`.

## Step 8 — Node floor: grep for Node-24-only APIs, then smoke on the floor

Upstream's `engines.node` is `>=24.0.0` and its Node 22 CI lane is retired; gsd-bob's is
`>=22.15.0` (the union of Bob Shell's documented floor and what the payload actually needs).
**That divergence has to be re-earned on every bump**, in two moves:

```bash
# 1. grep the restaged bin for Node-24-only APIs
grep -rn 'RegExp\.escape\|Error\.isError\|node:sqlite\|Promise\.try\|Array\.fromAsync\|Object\.groupBy\|Map\.groupBy\|Iterator\.from\|ArrayBuffer\.prototype\.transfer\|process\.getBuiltinModule\|fs\.globSync\|Float16Array\|await using' gsd-core/bin/ | grep -v '^Binary'
```

Every hit must be **feature-detected with a fallback**, or the floor has to move. At 1.14.0 the
only hit was `RegExp.escape` in `bin/lib/pattern.cjs`, bound once at module load as
`typeof RegExp.escape === 'function' ? … : <in-file metachar escape>` (upstream re-shimmed it in
#3499 after raising the floor). Then actually run it on the floor:

```bash
# 2. download the floor binary and run the staged shim on it
#    (n / nvm / a plain tarball from nodejs.org all work; the point is a real 22.15 binary)
N22=/path/to/node-v22.15.0/bin/node
"$N22" --version
"$N22" gsd-core/bin/gsd-tools.cjs --help
"$N22" gsd-core/bin/gsd-tools.cjs query state.load           # → exit 0
"$N22" -e 'require("./gsd-core/bin/lib/capability-registry.cjs");
           require("./gsd-core/bin/lib/runtime-artifact-conversion.cjs");
           require("./gsd-core/bin/lib/capability-validator.cjs");
           console.log("all patched libs load on", process.version)'
```

If any of that fails, raise `engines.node` in `package.json` and say so in README's
*Targeted gsd-core version* section — do not quietly keep a floor the payload no longer meets.

## Step 9 — Regenerate every generated doc

All four are generated from their generators, never hand-edited (T-02-10). Run them in this
order; the roster is the source the other three derive from.

```bash
node scripts/generate-support-roster.cjs         # SUPPORT-ROSTER.md, from the bob-adapter gate
node scripts/generate-command-reference.cjs      # COMMANDS.md, from commands/gsd/*.md frontmatter
node scripts/stamp-covers.cjs                    # covers/*.svg version + emitted/withheld stamps
node scripts/render-covers.cjs                   # covers/png/* (needs IBM Plex installed locally)
git diff --stat SUPPORT-ROSTER.md COMMANDS.md covers/
```

Then hand-update README's `## Supported skills` lists and the two prose counts (step 5, item 3)
and run `node scripts/stamp-covers.cjs --check` to confirm the stamps are current.

## Step 10 — Run the suites, subtract the baseline, sweep the version

Run the **invariants first** — they must pass **unmodified** (they are never drift-eligible):

```bash
node --test test/backend-neutrality.test.cjs test/descriptor.test.cjs test/model-neutrality.test.cjs
```

Then the full suite, compared against the step-1 baseline. Classify every *non-baseline* failure:

```bash
npm test 2>&1 | tail -n 5
```

- **Expected drift** → regenerate that one fixture and record a **one-line justification keyed
  by the fixture name** in the phase's re-vendor notes. Do **not** blanket-regenerate.
- **Regression** → fix the code, do not touch the fixture.

### The guaranteed drifts

These three will fail on a clean bump. They are expected; each still needs its one-line
justification.

1. **The staged-shim version literal.** `test/installer/staged-shim-loads.test.cjs` asserts the
   version the staged shim reports. Flip `<old>` → `<new>`. (It no longer asserts a synthetic
   sibling `package.json` — that staged file was removed in the 1.14.0 re-sync, because
   `resolveVersionFrom` has read `gsd-core/VERSION` first since 1.7.0.)
2. **Goldens for every drifted command stem.** `test/command-golden.test.cjs`,
   `test/skill-golden.test.cjs`, `test/core-loop-equivalence.test.cjs`,
   `test/quality-gate-equivalence.test.cjs` and `test/text-mode-golden.test.cjs` compare emitted
   output byte-for-byte against `test/fixtures/**`. Regenerate **only** the fixtures whose
   source stem actually drifted in step 5 (`git diff --stat commands/gsd/` is the list), and
   justify each by naming the upstream change.
3. **The pinned stem count.** The `28`→`31`-style literal in `test/docs-conformance.test.cjs`
   and `test/command-expansion.test.cjs`, plus README's two prose counts (step 5, item 3) and
   the acceptance steps for any new command.

### Version-consistency sweep (no `<old>`/`<new>` mix left anywhere)

```bash
cat gsd-core/VERSION                                              # → <new>
cat gsd-core/.gsd-runtime                                         # → bob
grep -rn '<old>' gsd-core/ | grep -v 'legacy-cleanup.cjs'         # → empty (except the stock exception below)
grep -rn '<old>' README.md UPSTREAM.md ARCHITECTURE.md src/ scripts/ test/   # → empty
```

Finally, re-verify every `file:line` pointer in `UPSTREAM.md` and `ARCHITECTURE.md` against the
`<new>` source — **grep the real line numbers, never copy the stale `<old>` ones**:

```bash
grep -n '"bob": {' gsd-core/bin/lib/capability-registry.cjs
grep -n 'function convertClaudeCommandToBobSkill\|function convertClaudeCommandToBobCommand\|function convertClaudeToBobContent' gsd-core/bin/lib/runtime-artifact-conversion.cjs
grep -n 'convertClaudeToBobContent,\|convertClaudeCommandToBobSkill,\|convertClaudeCommandToBobCommand,' gsd-core/bin/lib/runtime-artifact-conversion.cjs
grep -n "'convertClaudeCommandToBob" gsd-core/bin/lib/capability-validator.cjs
grep -n 'bob:' gsd-core/bin/lib/runtime-name-policy.cjs
grep -n '"bob"' gsd-core/bin/shared/runtime-aliases.manifest.json
grep -n '\.bob/gsd-core/bin' gsd-core/references/gsd-run-resolver.md
```

## Step 11 — Real install into a scratch target, both scopes

The suites are hermetic; this is the only step that exercises the installer end to end.

```bash
TMP=$(mktemp -d); (cd "$TMP" && mkdir -p .planning && node /path/to/bob-gsd/bin/gsd-bob.cjs --bob --local)
ls "$TMP/.bob/commands" | wc -l          # → the current command count (31 at 1.14.0)
ls "$TMP/.bob/skills"   | wc -l          # → the same count
test -f "$TMP/.bob/custom_modes.yaml" && echo "local modes path ok"
grep -n 'use_worktrees' "$TMP/.planning/config.json"     # → false
cat "$TMP/.bob/gsd-core/.gsd-runtime"                    # → bob
node "$TMP/.bob/gsd-core/bin/gsd-tools.cjs" runtime-identity --raw   # shim loads OUT OF TREE
```

For a global install, point `HOME` at a scratch dir and check the **scope-asymmetric** modes
path — `settings/custom_modes.yaml`, not the home root — and that emitted refs are **absolute**:

```bash
HOME=$TMP/home node /path/to/bob-gsd/bin/gsd-bob.cjs --bob --global
test -f "$TMP/home/.bob/settings/custom_modes.yaml" && echo "global modes path ok"
test -f "$TMP/home/.bob/custom_modes.yaml" && echo "BUG: wrote the file Bob ignores"
grep -c "$TMP/home/.bob/gsd-core" "$TMP/home/.bob/settings/custom_modes.yaml"   # → >=1 (absolute, not .bob/…)
```

---

## Caveats — read these, they are real

**(a) Record the step-1 baseline and subtract it — but do not assume there are any failures.**
The `1.5.0 → 1.6.1` run had three, and the old edition of this runbook called them permanent
environmental noise. That was wrong: they were reading `.planning/` sources that had *moved*.
Both were repaired in Phase 12 and the suite has been fully green (334/334) since; the
`1.6.1 → 1.14.0` run started from that green baseline. A non-zero baseline is a bug to
investigate, not a fact of life. Only a **new** failing test ID is a real re-vendor delta.

**(b) The stock `gsd-core/bin/lib/legacy-cleanup.cjs` `1.5.0` comment is a permanent expected
exception.** It is an immutable upstream historical comment (a Codex-migration reference),
byte-identical in every tarball. **Grep-exclude it** in every version-residue sweep
(`grep -v 'legacy-cleanup.cjs'`). Editing it would introduce an undocumented **tenth** delta
that `scripts/apply-bob-patches.cjs` does not reproduce, breaking idempotency and the
"pristine + exactly nine deltas" integrity contract.

**(c) `npm pack` requires network.** Run the bump on a connected machine.

**(d) The converters are LOCAL hand-edits, not stock upstream.** See step 6.

**(e) Anchors expire; the export anchor did.** The single most expensive surprise of the
`1.6.1 → 1.14.0` jump was an anchor deleted upstream eight versions earlier. Always read
[the anchors table](#the-anchors-and-what-to-do-when-one-moves) before you run the script, and
trust `preflight()` to stop you rather than a half-patched tree.

**(f) `scripts/fix-slash-commands.cjs` is still an eager sibling require.** The vendored shim
resolves it three `../` up from `gsd-core/bin/lib/` (via `command-roster.cjs`), so the installer
must keep staging it. The **synthetic sibling `package.json` is gone** and must not come back.

**(g) Upstream's `skills/` tree is now the tidier conversion source, and we deliberately do not
use it.** Its command stems are already hyphenated and it carries 63 stems against the curated
sources' 57 with `argument-hint` parity. Switching would churn every golden, the roster and all
three doc generators for no behavioural gain. Recorded (D-03), not adopted.

### What the previous edition got wrong — do not reintroduce it

- "**The six deltas**" — there are **nine**. 7/8/9 (`VALID_CONVERTER_NAMES`, the resolver `.bob`
  probes, the `.gsd-runtime` marker) are each load-bearing.
- "**Step 5's anchor list**" pointed 4b at `convertClaudeCommandToCursorCommand,`, deleted
  upstream in 1.7.0.
- "**Step 6: diff `commands/gsd/` and re-sync as needed**" — too soft, and in the wrong place.
  Re-sync **all** sources, **before** the patch run (step 5).
- "**The one guaranteed golden drift**" — there are three classes of guaranteed drift (step 10).
- The synthetic sibling `package.json` is no longer staged, so no test asserts it.

---

## Packaging note

`MAINTAINING.md` is a **repo/GitHub-facing doc** — it is intentionally **not** in the
`package.json` `files` allowlist and does **not** ship in the npm tarball. Do not add it there.

## Provenance / sources

- [`.planning/phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md`](./.planning/phases/13-gsd-core-1-14-0-re-sync/13-REVENDOR-NOTES.md)
  — the live `1.6.1 → 1.14.0` log this edition is corrected from (command log; "What the runbook
  got wrong" 1–7; fixture/pin justifications).
- [`.planning/research/260916-gsd-core-1.14.0-delta.md`](./.planning/research/260916-gsd-core-1.14.0-delta.md)
  — the sourced code delta: registry schema (§2), converter exports (§3), `resolveVersionFrom`
  (§3.3), the Node floor (§5), the dispatch-isolation gate (§2.4), ranked risks.
- `.planning/phases/07-gsd-core-1-6-1-sync/07-REVENDOR-NOTES.md` — the earlier `1.5.0 → 1.6.1`
  log the previous edition was distilled from (kept for the caveat history).
- `scripts/apply-bob-patches.cjs` — the nine-delta re-injection, `preflight()`, `verifyAll()`,
  `ANCHORS`, `TARGET_VERSION`.
- `scripts/generate-support-roster.cjs`, `scripts/generate-command-reference.cjs`,
  `scripts/stamp-covers.cjs`, `scripts/render-covers.cjs` — the generated-doc pipeline (step 9).
- `gsd-core/VERSION`, `gsd-core/.gsd-runtime` — the two payload markers step 10 sweeps.
- `UPSTREAM.md` — the targeted version + the `file:line` inventory step 10 re-verifies.
