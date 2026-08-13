#!/usr/bin/env node
'use strict';

/**
 * generate-command-reference.cjs — emit COMMANDS.md from commands/gsd/*.md frontmatter.
 *
 * A per-command reference GENERATED from the emitted `commands/gsd/*.md` source
 * set — the same directory the installer iterates and the source-of-truth for the
 * roster (D-02, generated-not-hand-edited discipline). Each `<stem>.md` maps to an
 * emitted `gsd-<stem>` command whose one-line description is lifted VERBATIM from
 * the source frontmatter `description:` field (never invented). Mirrors
 * `scripts/generate-support-roster.cjs`: directory enumeration, the SAME bob-adapter
 * gate for "emitted", a GENERATED banner, and a fixed `repoRoot`-relative write path
 * (a stem is NEVER interpolated into the write path — path-traversal mitigation,
 * T-10-01).
 *
 * Fail-loud + drift-proof discipline (Phase 10 code review, WR-01/02/03):
 *   - Row set is filtered through `adapter.gateArtifact(...)` — the SAME gate the
 *     roster and installer use — so a skip-listed or unmet-`requires` stem is never
 *     listed as emitted (WR-01).
 *   - A missing/empty frontmatter `description:` throws (WR-03) — a malformed source
 *     fails regeneration instead of silently shipping a blank row.
 *   - Pipes in a description are escaped (WR-02) so a value containing `|` cannot
 *     split the markdown row into extra columns.
 *
 * Run: `node scripts/generate-command-reference.cjs`.
 */

const fs = require('node:fs');
const path = require('node:path');

const adapter = require(path.join(__dirname, '..', 'src', 'bob-adapter.cjs'));

// The SAME declaration generate-support-roster.cjs uses, so "emitted" means exactly
// one thing across both generators (WR-01) — now enforced by importing the adapter's
// single authority rather than re-typing the literal (BOB2-05).
const bobCapabilityDecl = adapter.BOB_CAPABILITY_DECL;

// Candidate set DERIVED from `commands/gsd/*.md` — never a hardcoded name list, so
// the reference cannot drift from what actually emits (D-02, drift-proof spine).
const commandsDir = path.join(__dirname, '..', 'commands', 'gsd');
const stems = fs.existsSync(commandsDir)
  ? fs
      .readdirSync(commandsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.basename(f, '.md'))
      .sort()
  : [];

/**
 * Extract the single-line frontmatter `description:` from a source command file.
 * Slices the frontmatter block (between the first `---` and the next `---`, the
 * same fm-slice idiom as command-expansion.test.cjs) then matches the anchored,
 * linear pattern `^description:\s*(.+)$` (ReDoS-safe, no nested quantifiers).
 */
function extractDescription(stem) {
  const src = fs.readFileSync(path.join(commandsDir, `${stem}.md`), 'utf8');
  const fmEnd = src.indexOf('---', 3);
  const fm = fmEnd > 0 ? src.substring(3, fmEnd) : '';
  const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1];
  return desc ? desc.trim() : '';
}

// Only stems the bob-adapter gate admits as SUPPORTED get a row — the SAME gate the
// roster (`generate-support-roster.cjs`) and installer use, so a skip-listed
// (`BOB_SKIP_LIST`) or unmet-`requires` stem is never listed as emitted (WR-01).
// Today all 28 sources pass; the gate keeps the reference honest under change.
const emitted = stems.filter(
  (stem) => adapter.gateArtifact({ name: `gsd-${stem}`, requires: [] }, bobCapabilityDecl).supported,
);

const rows = emitted.map((stem) => {
  const desc = extractDescription(stem);
  // Fail loud (WR-03): a missing/empty frontmatter description is a broken source,
  // not a blank cell — the generated-not-hand-edited discipline is fail-loud.
  if (!desc) {
    throw new Error(
      `commands/gsd/${stem}.md has no frontmatter description: — refusing to emit a blank COMMANDS.md row`,
    );
  }
  // Escape table-breaking pipes (WR-02) so a description containing `|` (e.g. the
  // gsd-ns-* namespaced commands) cannot split the row into extra columns.
  const cell = desc.replace(/\|/g, '\\|');
  // The emitted command name is always `gsd-<stem>`; the source's colon
  // `name: gsd:<stem>` field is ignored (Bob uses the hyphen form).
  return `| \`gsd-${stem}\` | ${cell} |`;
});

const header = `# Bob Command Reference

> **GENERATED — do not hand-edit.** Regenerate with \`node scripts/generate-command-reference.cjs\`.
> One row per emitted command, derived from the \`commands/gsd/*.md\` source set and filtered
> through the same bob-adapter gate the roster uses. Each description is lifted VERBATIM from
> the source frontmatter \`description:\` field, so this reference cannot silently drift from
> what actually installs (D-02). The set-equality drift guard \`test/docs-conformance.test.cjs\`
> pins this list to the generated \`SUPPORT-ROSTER.md\` Supported set.
`;

const body = `
| Command | Description |
| ------- | ----------- |
${rows.join('\n')}
`;

const outPath = path.join(__dirname, '..', 'COMMANDS.md');
fs.writeFileSync(outPath, `${header}${body}`);
process.stdout.write(`wrote ${outPath} (${rows.length} commands)\n`);
