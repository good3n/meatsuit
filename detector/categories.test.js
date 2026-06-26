'use strict';

// Anti-drift contract: every detector `type` must be documented in CATEGORIES.md, and every
// type documented in CATEGORIES.md must exist in the detector. No test framework needed.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { TYPE_LABELS } = require('./meatsuit.js');

const catsDoc = fs.readFileSync(path.join(__dirname, 'CATEGORIES.md'), 'utf8');

// Pull every `backticked-type` token out of the doc.
const documented = new Set((catsDoc.match(/`([a-z0-9-]+)`/g) || []).map((s) => s.replace(/`/g, '')));
const codeTypes = Object.keys(TYPE_LABELS);

let failures = 0;
function check(name, fn) {
  try { fn(); process.stdout.write(`ok   - ${name}\n`); }
  catch (e) { failures++; process.stdout.write(`FAIL - ${name}\n       ${e.message}\n`); }
}

check('every detector type is documented in CATEGORIES.md', () => {
  for (const t of codeTypes) {
    assert.ok(documented.has(t), `type "${t}" emitted by detector but missing from CATEGORIES.md`);
  }
});

check('every documented type exists in the detector', () => {
  // documented set also contains non-type backticks (file names, code) — only enforce the
  // tokens that look like our kebab type ids and appear in a table row with a pipe.
  const docTypeRows = (catsDoc.match(/^\|\s*`([a-z0-9-]+)`\s*\|/gm) || [])
    .map((s) => s.replace(/^\|\s*`/, '').replace(/`\s*\|$/, ''));
  for (const t of docTypeRows) {
    assert.ok(TYPE_LABELS[t], `type "${t}" documented in CATEGORIES.md but not in TYPE_LABELS`);
  }
});

check('no duplicate type ids in TYPE_LABELS', () => {
  assert.strictEqual(codeTypes.length, new Set(codeTypes).size);
});

if (failures) { process.stderr.write(`\n${failures} category test(s) failed\n`); process.exit(1); }
process.stdout.write('\nall category tests passed\n');
