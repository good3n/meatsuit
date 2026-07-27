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

test('detects the split-sentence / arbitrary-subject reframe', () => {
  // Two innocent-looking declaratives with a plain noun subject — the joined "it..it"
  // patterns miss this, but it is the same contrastive-negation move.
  const r = scan("The headline isn't the speed. The real story is the margins nobody discusses.");
  assert.ok(typesIn(r).has('reframe'), 'expected reframe flag on split-sentence form');
});

test('does not double-count the joined reframe form', () => {
  const r = scan('It is not just a product, it is a movement that changes how people work.');
  const n = r.issues.filter((i) => i.type === 'reframe').length;
  assert.strictEqual(n, 1, `expected exactly one reframe flag, got ${n}`);
});

test('does not flag a factual correction as a reframe', () => {
  // Allowed contrast: numeric/date corrections are not the rhetorical reframe.
  const a = scan('The meeting is not Tuesday, it is Thursday, so please update your calendars.');
  const b = scan('The file is not 12 MB, it is 12 GB, which is why the upload keeps timing out.');
  assert.ok(!typesIn(a).has('reframe'), 'weekday correction should not be a reframe');
  assert.ok(!typesIn(b).has('reframe'), 'size correction should not be a reframe');
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

test('detects citation leakage from assistants beyond the ChatGPT-era set', () => {
  // Each is a distinct leaked markup token that survives a copy-paste into finished text.
  const samples = [
    'The model reached the top score on the shared task :contentReference[oaicite:3]{index=3}.',
    'Coverage of the release was strong across the usual outlets [cite: 7] that week.',
    'The full dataset is archived at https://ppl-ai-file-upload.s3.amazonaws.com/web/report.pdf online.',
    'The launch card rendered inline as grok_render_citation_card_json when the post was shared.',
    'The passage was stitched together with a [span_5](start_span) marker left in the paste.',
  ];
  for (const s of samples) {
    const r = scan(s + ' It stayed visible after the edit because nobody scrubbed the source.');
    assert.ok(typesIn(r).has('citation-leak'), `expected citation-leak flag on: ${s}`);
  }
});

test('does not flag ordinary prose that merely mentions cite, span, card, or upload', () => {
  // The bare words are innocent; only the bracketed/hosted markup shapes are the tell.
  const clean = 'Please cite the source in your write-up, note the time span of the study, hand the'
    + ' reviewer a card with the details, and upload the final file to the shared drive before noon.';
  const r = scan(clean);
  assert.ok(!typesIn(r).has('citation-leak'), 'plain cite/span/card/upload prose should stay clean');
});

test('detects a speculative scenario opener', () => {
  const r = scan('Imagine a world where every deploy is instant and no test ever flakes for the whole team.');
  assert.ok(typesIn(r).has('dead-opening'), 'expected dead-opening flag on "imagine a world where"');
});

test('does not flag instructional "imagine you have…" as a speculative opener', () => {
  // Teaching device pointing at a concrete example — not the speculative-world move.
  const r = scan('Imagine you have a sorted array of integers and you need to find a target value quickly.');
  assert.ok(!typesIn(r).has('dead-opening'), 'instructional imagine should not flag dead-opening');
});

test('detects vague third-party validation claims', () => {
  const a = scan('Independent testing confirms our platform leads the market by a wide margin this year.');
  const b = scan('Analysts agree it is the fastest option available for teams that care about raw speed.');
  assert.ok(typesIn(a).has('vague-attribution'), 'expected vague-attribution on "independent testing confirms"');
  assert.ok(typesIn(b).has('vague-attribution'), 'expected vague-attribution on "analysts agree"');
});

test('does not flag named, checkable attribution as vague', () => {
  // The tell is the vagueness. A named source before the verb is legitimate.
  const r = scan('On the HELM leaderboard published in April, the model ranked first on reasoning latency overall.');
  assert.ok(!typesIn(r).has('vague-attribution'), 'named attribution should not flag vague-attribution');
});

test('detects the "load-bearing" metaphor as tier-1', () => {
  const a = scan('The retry logic is a load-bearing assumption here, and every guarantee rests on it.');
  const b = scan('That was the load-bearing claim in the whole proposal, so we should prove it first.');
  assert.ok(typesIn(a).has('tier1'), 'expected tier1 on "load-bearing assumption"');
  assert.ok(typesIn(b).has('tier1'), 'expected tier1 on "load-bearing claim"');
});

test('does not flag literal construction "load-bearing wall" as a tell', () => {
  // The compound before a physical structural noun is standard building terminology.
  const r = scan('The load-bearing wall between the kitchen and the dining room cannot come out without a steel beam.');
  assert.ok(!r.issues.some((i) => i.type === 'tier1' && /load-bearing/i.test(i.text)),
    'literal load-bearing wall/column should not flag tier1');
});

test('unhyphenated "load bearing" is ordinary English, not a tell', () => {
  const r = scan('The engineers measured the load bearing down on the old bridge during the afternoon rush.');
  assert.ok(!r.issues.some((i) => i.type === 'tier1' && /load/i.test(i.text)),
    'unhyphenated "load bearing" should not flag');
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
