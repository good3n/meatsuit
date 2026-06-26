'use strict';

// Behavior + regression tests for the meatsuit detector. Zero dependencies — run with
// `node meatsuit.test.js`. Each test asserts a direction (AI text scores high, human text
// stays low) or guards a specific false-positive we care about.

const assert = require('node:assert');
const { scan, bandFor } = require('./meatsuit.js');

let failures = 0;
function test(name, fn) {
  try { fn(); process.stdout.write(`ok   - ${name}\n`); }
  catch (e) { failures++; process.stdout.write(`FAIL - ${name}\n       ${e.message}\n`); }
}
const typesIn = (r) => new Set(r.issues.map((i) => i.type));

// --- Heavy AI text scores high ---------------------------------------------

test('buzzword-laden marketing copy scores Moderate+', () => {
  const text = `In today's fast-paced world, our cutting-edge platform empowers teams to
  unlock their full potential. By leveraging robust, seamless workflows, we deliver a vibrant,
  transformative experience. It's not just a tool, it's a revolution. Furthermore, experts say
  this is a testament to innovation.`;
  const r = scan(text);
  assert.ok(['Moderate', 'Heavy'].includes(r.label), `expected Moderate/Heavy, got ${r.label} (${r.score})`);
  assert.ok(r.issues.length >= 6, `expected many tells, got ${r.issues.length}`);
});

test('detects a reframe construction', () => {
  const r = scan('It is not just a product, it is a movement that changes everything for users.');
  assert.ok(typesIn(r).has('reframe'), 'expected reframe flag');
});

test('detects tier-1 vocabulary every time (single occurrence)', () => {
  const r = scan('We need to delve into the data before the meeting tomorrow afternoon, ok.');
  assert.ok(typesIn(r).has('tier1'), 'expected tier1 flag on "delve"');
});

test('detects chatbot artifacts as critical', () => {
  const r = scan('Great question! I hope this helps you understand the topic a lot better now.');
  const chatbot = r.issues.filter((i) => i.type === 'chatbot-artifact');
  assert.ok(chatbot.length >= 1, 'expected chatbot-artifact');
  assert.strictEqual(chatbot[0].severity, 'critical');
});

test('detects a bullet point with a bolded lead-in title', () => {
  const r = scan('Here is the list of features we shipped this quarter for the platform:\n\n- **Speed:** It is fast now.\n- **Scale:** It handles load.\n');
  assert.ok(typesIn(r).has('bullet-bold-title'), 'expected bullet-bold-title');
});

test('detects an unfilled placeholder', () => {
  const r = scan('Thank you for your interest in our product. Best regards, [Your Name] and the whole team here.');
  assert.ok(typesIn(r).has('placeholder'), 'expected placeholder flag');
});

test('detects citation leakage', () => {
  const r = scan('The market grew sharply last year according to the latest figures oai_citation and analysts.');
  assert.ok(typesIn(r).has('citation-leak'), 'expected citation-leak flag');
});

// --- Tier behavior ----------------------------------------------------------

test('a single tier-2 word does NOT flag (needs a cluster)', () => {
  const r = scan('We want to foster a sense of belonging on the team this year and into the next one.');
  assert.ok(!typesIn(r).has('tier2-cluster'), 'single tier-2 word should not cluster-flag');
});

test('two tier-2 words in one paragraph DO flag', () => {
  const r = scan('We foster a thriving culture and elevate the whole ecosystem around our product every day.');
  assert.ok(typesIn(r).has('tier2-cluster'), 'expected tier2 cluster flag');
});

test('one tier-3 intensifier does NOT trip density', () => {
  const r = scan('This was a significant change for the team and it took about three weeks to roll out fully.');
  assert.ok(!typesIn(r).has('tier3-density'), 'one intensifier should not trip density');
});

// --- Clean human text stays low --------------------------------------------

test('plain human prose stays Clean or Light', () => {
  const text = `I missed the train by about a minute. Stood on the platform watching it pull
  out, coffee going cold in my hand. The next one was twenty minutes off, so I sat on a bench
  and answered email I'd been dodging all week. Not how I wanted to start a Monday.`;
  const r = scan(text);
  assert.ok(['Clean', 'Light'].includes(r.label), `expected Clean/Light, got ${r.label} (${r.score})`);
});

test('a real technical paragraph is not classified Heavy', () => {
  const text = `The parser reads tokens one at a time and builds an abstract syntax tree. When
  it hits an unexpected token it records the position and tries to recover by skipping to the
  next statement boundary. We cache the tree so re-renders don't re-parse the same file. The
  cache is keyed on a hash of the source plus the compiler flags.`;
  const r = scan(text, { context: 'technical' });
  assert.ok(r.label !== 'Heavy', `technical prose should not be Heavy, got ${r.label} (${r.score})`);
});

// --- Stylometry -------------------------------------------------------------

test('metronome rhythm is flagged on uniform sentences', () => {
  const text = `The team met on Monday morning today. They talked about the plan for a while.
  Everyone agreed the work was going well now. The deadline was still two weeks away then. Nobody
  raised a single real concern today. The meeting ended right on time again.`;
  const r = scan(text);
  assert.ok(typesIn(r).has('even-rhythm'), 'expected even-rhythm flag on uniform sentences');
});

test('bursty human rhythm is NOT flagged as metronome', () => {
  const text = `It broke. I spent the next six hours of an otherwise ordinary Thursday tracing a
  single off-by-one error through four layers of caching that nobody had touched in a year. Then I
  found it. One character. I fixed it, wrote a test so it could never happen again, and went home.`;
  const r = scan(text);
  assert.ok(!typesIn(r).has('even-rhythm'), 'bursty prose should not flag even-rhythm');
});

// --- Robustness -------------------------------------------------------------

test('repeated phrases do not multiply the score unboundedly', () => {
  const once = scan('We will delve into this. ' + 'The weather was fine and the day went by slowly. '.repeat(5));
  const many = scan('We will delve into this. ' + 'The weather was fine and the day went by slowly. '.repeat(40));
  assert.ok(many.score <= once.score * 2, 'long clean text should not inflate score via length');
});

test('homoglyph bypass is undone and counted as evidence', () => {
  // "delve" with a Cyrillic 'е'
  const r = scan('We need to dеlve into the quarterly numbers before the big meeting on Friday.');
  assert.ok(typesIn(r).has('tier1'), 'homoglyph "delve" should still flag tier1');
  assert.ok(r.bypassFlags & 2, 'should record a homoglyph bypass flag');
});

test('text under 10 words is not scored', () => {
  const r = scan('Delve into the vibrant tapestry.');
  assert.strictEqual(r.label, 'Too short to score');
});

test('code blocks are not scanned as prose', () => {
  const text = `Here is how you run it on your machine locally without any extra configuration:\n\n\`\`\`\nnpm run build --robust\n\`\`\`\n\nThat command builds the whole project from scratch in one go.`;
  const r = scan(text);
  assert.ok(!r.issues.some((i) => i.type === 'tier1' && /robust/i.test(i.text)), 'robust inside code should not flag');
});

test('bandFor thresholds are monotonic', () => {
  assert.strictEqual(bandFor(0), 'Clean');
  assert.strictEqual(bandFor(5), 'Light');
  assert.strictEqual(bandFor(10), 'Some');
  assert.strictEqual(bandFor(20), 'Moderate');
  assert.strictEqual(bandFor(40), 'Heavy');
});

if (failures) { process.stderr.write(`\n${failures} test(s) failed\n`); process.exit(1); }
process.stdout.write('\nall detector tests passed\n');
