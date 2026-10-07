'use strict';

// Corpus check: real model output must score high and real human writing must stay low. Unit
// tests prove a rule fires on the sentence it was written for. This proves the score means
// something on whole pieces. Samples and their sources are listed in corpus/manifest.json.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { scan } = require('./meatsuit.js');

const BANDS = ['Clean', 'Light', 'Some', 'Moderate', 'Heavy'];
const dir = path.join(__dirname, 'corpus');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

let failures = 0;
function check(name, fn) {
  try { fn(); process.stdout.write(`ok   - ${name}\n`); }
  catch (e) { failures++; process.stdout.write(`FAIL - ${name}\n       ${e.message}\n`); }
}

check('every corpus file is in the manifest, and every manifest entry exists', () => {
  const onDisk = ['ai', 'human'].flatMap((sub) => fs.readdirSync(path.join(dir, sub))
    .filter((f) => f.endsWith('.md')).map((f) => `${sub}/${f}`));
  const listed = manifest.map((e) => e.file);
  assert.deepStrictEqual([...onDisk].sort(), [...listed].sort());
});

for (const entry of manifest) {
  const r = scan(fs.readFileSync(path.join(dir, entry.file), 'utf8'), { context: entry.context || 'general' });
  const band = BANDS.indexOf(r.label);
  check(`${entry.file} scores ${r.label} (${r.score})`, () => {
    assert.ok(band >= 0, `unexpected label ${r.label}`);
    if (entry.expect.atLeast) {
      assert.ok(band >= BANDS.indexOf(entry.expect.atLeast),
        `${entry.origin} sample should score at least ${entry.expect.atLeast}, got ${r.label} (${r.score})`);
    }
    if (entry.expect.atMost) {
      assert.ok(band <= BANDS.indexOf(entry.expect.atMost),
        `${entry.origin} sample should score at most ${entry.expect.atMost}, got ${r.label} (${r.score})`);
    }
  });
}

if (failures) { process.stderr.write(`\n${failures} corpus check(s) failed\n`); process.exit(1); }
process.stdout.write('\nall corpus checks passed\n');
