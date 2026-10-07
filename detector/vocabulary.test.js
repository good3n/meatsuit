'use strict';

// Anti-drift contract for vocabulary: every word in references/banned-vocabulary.md must be
// caught by the detector at its documented tier (or a stricter one), and every word in the
// detector's lists must be documented. categories.test.js does the same job for issue types.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { scan, TIER1, TIER2, TIER3 } = require('./meatsuit.js');

const doc = fs.readFileSync(path.join(__dirname, '..', 'references', 'banned-vocabulary.md'), 'utf8');

// Words the doc lists that the detector deliberately leaves to the skill's read-through.
const NOT_DETECTED = {
  // The doc means the adjective ("the key takeaway"). A regex can't tell it from the noun in
  // "API key" or "the key to the shed", and technical prose would trip the density check.
  'key': 'adjective use needs a parser',
};

function section(heading) {
  const start = doc.indexOf(heading);
  assert.ok(start >= 0, `heading "${heading}" not found in banned-vocabulary.md`);
  // Skip the rest of the heading line ("## Tier 2 — flag on clustering …").
  const rest = doc.slice(doc.indexOf('\n', start));
  const end = rest.search(/\n## /);
  return end >= 0 ? rest.slice(0, end) : rest;
}

// "navigate / navigating (abstract)" -> ["navigate", "navigating"]
function variants(cell) {
  return cell.replace(/\([^)]*\)/g, '').split('/').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

const tier1Doc = section('## Tier 1')
  .split('\n')
  .filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/Word \/ phrase/.test(l))
  .flatMap((l) => variants(l.split('|')[1]));

function listWords(heading) {
  const body = section(heading).split('\n').filter((l) => l.trim() && !/^---/.test(l)).join(' ');
  return body.split(',').flatMap(variants);
}
const tier2Doc = listWords('## Tier 2');
const tier3Doc = listWords('## Tier 3');

let failures = 0;
function check(name, fn) {
  try { fn(); process.stdout.write(`ok   - ${name}\n`); }
  catch (e) { failures++; process.stdout.write(`FAIL - ${name}\n       ${e.message}\n`); }
}

check('the doc parses into non-empty tier lists', () => {
  assert.ok(tier1Doc.length >= 30, `only ${tier1Doc.length} Tier 1 entries parsed`);
  assert.ok(tier2Doc.length >= 30, `only ${tier2Doc.length} Tier 2 entries parsed`);
  assert.ok(tier3Doc.length >= 15, `only ${tier3Doc.length} Tier 3 entries parsed`);
});

check('every documented Tier 1 word or phrase is flagged as tier1', () => {
  const missing = [];
  for (const v of tier1Doc) {
    const r = scan(`The team said that it ${v} a plan for the coming year and the year after.`);
    const hit = r.issues.some((i) => {
      if (i.type !== 'tier1') return false;
      const t = i.text.toLowerCase();
      return t.includes(v) || v.includes(t);
    });
    if (!hit) missing.push(v);
  }
  assert.deepStrictEqual(missing, [], `Tier 1 entries the detector misses: ${missing.join(', ')}`);
});

check('every documented Tier 2 word is detected at Tier 1 or 2', () => {
  const missing = tier2Doc.filter((w) => !(w in TIER1) && !TIER2.includes(w) && !(w in NOT_DETECTED));
  assert.deepStrictEqual(missing, [], `Tier 2 entries the detector misses: ${missing.join(', ')}`);
});

check('every documented Tier 3 word is detected at some tier', () => {
  const missing = tier3Doc.filter((w) => !(w in TIER1) && !TIER2.includes(w) && !TIER3.includes(w)
    && !(w in NOT_DETECTED));
  assert.deepStrictEqual(missing, [], `Tier 3 entries the detector misses: ${missing.join(', ')}`);
});

check('every detector Tier 1 word is documented', () => {
  // Inflections count: "leveraging" is documented by "leverage".
  const undocumented = Object.keys(TIER1).filter((w) => !tier1Doc.some((v) => w === v
    || (v.length > 4 && w.startsWith(v.replace(/e$/, '')))));
  assert.deepStrictEqual(undocumented, [], `in TIER1 but not the doc: ${undocumented.join(', ')}`);
});

check('every detector Tier 2 and Tier 3 word is documented in that tier', () => {
  const t2 = TIER2.filter((w) => !tier2Doc.includes(w));
  const t3 = TIER3.filter((w) => !tier3Doc.includes(w));
  assert.deepStrictEqual(t2, [], `in TIER2 but not the doc's Tier 2: ${t2.join(', ')}`);
  assert.deepStrictEqual(t3, [], `in TIER3 but not the doc's Tier 3: ${t3.join(', ')}`);
});

check('NOT_DETECTED only lists words the doc still has', () => {
  const all = [...tier1Doc, ...tier2Doc, ...tier3Doc];
  const stale = Object.keys(NOT_DETECTED).filter((w) => !all.includes(w));
  assert.deepStrictEqual(stale, [], `stale NOT_DETECTED entries: ${stale.join(', ')}`);
});

if (failures) { process.stderr.write(`\n${failures} vocabulary test(s) failed\n`); process.exit(1); }
process.stdout.write('\nall vocabulary tests passed\n');
