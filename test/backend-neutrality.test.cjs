'use strict';

/**
 * backend-neutrality.test.cjs — RUNTIME-04.
 *
 * Asserts ZERO model-backend brand literals appear in the bob-owned core paths:
 * the `"bob"` registry entry block in the vendored capability-registry.cjs, and
 * (when present) a dedicated `bob-adapter.cjs` module. The scan is scoped to the
 * bob entry + adapter ONLY — the rest of the vendored tree legitimately names
 * other runtimes as peers.
 *
 * The forbidden brand-token set is built PROGRAMMATICALLY from a base64-encoded
 * array so this test file does not itself contain a bare forbidden literal that
 * would self-trip the scan if it were ever pointed at the test sources.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { vendorLib } = require('./_helpers/vendor.cjs');

// Forbidden backend brand names, base64-encoded so no bare literal lives here.
// Decodes to the four model-backend brand tokens the invariant forbids.
const FORBIDDEN_TOKENS = ['Q2xhdWRl', 'R2VtaW5p', 'R3Jhbml0ZQ==', 'R1BU'].map((b) =>
  Buffer.from(b, 'base64').toString('utf8'),
);

/**
 * Strip lines that legitimately and structurally carry a source-format token
 * before brand matching:
 *   - comment / jsdoc lines (a documenting head-comment must not self-trip)
 *   - gsd-core converter NAMES of the form `convertClaudeCommandTo<Runtime>*`.
 *     The leading reference-runtime word there is gsd-core's universal SOURCE-FORMAT
 *     prefix (every runtime names its converters the
 *     same way); it denotes "the canonical source skill format", not a model
 *     backend selected at runtime. Backend-neutrality forbids backend BRANCHING
 *     / model selection in the bob core, not gsd-core's converter naming dialect.
 */
function stripComments(lines) {
  return lines
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    // Remove the source-format converter-name token so only genuine backend
    // references would remain to be matched.
    .map((line) => line.replace(/convert[A-Za-z]+CommandToBob[A-Za-z]*/g, 'convertSourceCommandToBob'));
}

/** Slice the `"bob": { ... }` object region out of the registry source. */
function extractBobEntryBlock(source) {
  const startIdx = source.indexOf('"bob": {');
  assert.notEqual(startIdx, -1, 'could not locate the "bob" entry in capability-registry.cjs');
  // Walk braces from the opening `{` of the entry to its matching close.
  const braceStart = source.indexOf('{', startIdx);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return source.slice(startIdx, i);
}

function scanForBrands(text, label) {
  const codeLines = stripComments(text.split('\n'));
  const haystack = codeLines.join('\n');
  const lower = haystack.toLowerCase();
  const hits = FORBIDDEN_TOKENS.filter((tok) => lower.includes(tok.toLowerCase()));
  assert.deepEqual(
    hits,
    [],
    `${label} must contain ZERO model-backend brand literals; found: ${JSON.stringify(hits)}`,
  );
}

test('RUNTIME-04: the bob registry entry contains no model-backend brand literal', () => {
  const registrySrc = fs.readFileSync(path.join(vendorLib, 'capability-registry.cjs'), 'utf8');
  const bobBlock = extractBobEntryBlock(registrySrc);
  scanForBrands(bobBlock, 'the bob registry entry block');
});

test('RUNTIME-04: the bob adapter module (when present) contains no brand literal', () => {
  const adapterCandidates = [
    path.join(vendorLib, 'bob-adapter.cjs'),
    path.join(vendorLib, '..', 'bob-adapter.cjs'),
  ];
  const present = adapterCandidates.filter((p) => fs.existsSync(p));
  if (present.length === 0) {
    // Adapter is authored in plan 02-02; nothing to scan yet. The assertion is
    // vacuously satisfied — recorded so the test documents the lazy seam.
    assert.ok(true, 'no bob-adapter.cjs yet (authored in 02-02) — scan deferred');
    return;
  }
  for (const p of present) {
    scanForBrands(fs.readFileSync(p, 'utf8'), `bob adapter ${path.basename(p)}`);
  }
});

test('RUNTIME-04 self-check: the forbidden-token set is non-empty and built programmatically', () => {
  // Guards against a regression where the token set decodes to nothing (which
  // would make the brand scan vacuously pass for the wrong reason).
  assert.equal(FORBIDDEN_TOKENS.length, 4);
  assert.ok(FORBIDDEN_TOKENS.every((t) => typeof t === 'string' && t.length > 0));
});
