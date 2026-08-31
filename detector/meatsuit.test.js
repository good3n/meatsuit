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

test('detects the lingering-attention opener', () => {
  const a = scan('Recorded an episode yesterday. The line I keep coming back to is that agents behave like teenagers.');
  const b = scan('The quote I can\'t stop thinking about: we shipped the org chart instead of the product itself.');
  const c = scan('That one bit I keep thinking about is the part where the retry budget silently resets to zero.');
  assert.ok(typesIn(a).has('dead-opening'), 'expected dead-opening on "the line I keep coming back to is"');
  assert.ok(typesIn(b).has('dead-opening'), 'expected dead-opening on "the quote I can\'t stop thinking about:"');
  assert.ok(typesIn(c).has('dead-opening'), 'expected dead-opening on "that one bit I keep thinking about is"');
});

test('handles a curly apostrophe in the lingering-attention opener', () => {
  const r = scan('The quote I can’t stop thinking about: we shipped the org chart instead of the product.');
  assert.ok(typesIn(r).has('dead-opening'), 'curly apostrophe should not defeat the pattern');
});

test('does not flag the bare "I keep coming back to X" form', () => {
  // Legitimate whenever a reason follows, and the reason clause is not regex-detectable, so
  // only the noun-anchored frame fires. This one is a claim about the idea, not throat-clearing.
  const r = scan('I keep coming back to the exit-voice framing because it predicts which engineers quit and which file the RFC.');
  assert.ok(!typesIn(r).has('dead-opening'), 'bare verb-phrase form should not flag dead-opening');
});

test('does not flag mid-sentence or non-introducing attention phrases', () => {
  // Not an opener: the frame is buried in the sentence, doing ordinary work.
  const a = scan('There is one part I keep coming back to when I review these migrations, and it is the rollback step.');
  // No colon or copula follows, so the noun phrase is an object rather than an introduction.
  const b = scan('The line I keep coming back to in rehearsal was hard to deliver on stage without laughing.');
  assert.ok(!typesIn(a).has('dead-opening'), 'mid-sentence use should not flag dead-opening');
  assert.ok(!typesIn(b).has('dead-opening'), 'non-introducing use should not flag dead-opening');
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

test('detects vague relational indirection', () => {
  // The connector stands in for a relationship the writer could name: founded, conducts,
  // plays in. Copular and prepositional forms both count.
  const a = scan('He is associated with the Rajhans Orchestra, an ensemble founded in Belgium.');
  const b = scan('The system has been associated with residential water management applications.');
  const c = scan('The concerts were organised in connection with celebrations of the anniversary.');
  const d = scan('The technique is widely associated with the Flemish school of painting overall.');
  assert.ok(typesIn(a).has('vague-relation'), 'expected vague-relation on "is associated with"');
  assert.ok(typesIn(b).has('vague-relation'), 'expected vague-relation on "has been associated with"');
  assert.ok(typesIn(c).has('vague-relation'), 'expected vague-relation on "in connection with"');
  assert.ok(typesIn(d).has('vague-relation'), 'expected vague-relation on "widely associated with"');
});

test('does not flag "in connection with" in criminal-justice reporting', () => {
  // The phrase is precise there: naming the connection would assert guilt not yet established.
  const a = scan('A 32-year-old man was arrested in connection with the robbery on Mill Street.');
  const b = scan('Prosecutors charged her in connection with the fraud scheme uncovered last spring.');
  assert.ok(!typesIn(a).has('vague-relation'), 'arrest reporting should not flag');
  assert.ok(!typesIn(b).has('vague-relation'), 'charging reporting should not flag');
});

test('does not flag "associated with" in statistical writing', () => {
  // In epidemiology it is the correct term for a measured correlation, and deliberately
  // stops short of claiming cause.
  const a = scan('Higher doses were strongly associated with increased risk of mortality in the cohort.');
  const b = scan('Sleep duration is associated with the odds ratio reported in the regression table.');
  assert.ok(!typesIn(a).has('vague-relation'), 'risk/mortality context should not flag');
  assert.ok(!typesIn(b).has('vague-relation'), 'odds-ratio/regression context should not flag');
});

test('does not flag post-nominal "associated with"', () => {
  // The commonest legitimate use has no copula in front of it and is not the tell.
  const a = scan('The costs associated with maintenance rose sharply after the vendor changed terms.');
  const b = scan('The data associated with each key is written to disk before the commit returns.');
  assert.ok(!typesIn(a).has('vague-relation'), '"costs associated with" should not flag');
  assert.ok(!typesIn(b).has('vague-relation'), '"data associated with" should not flag');
});

test('does not flag the production credit-line idiom', () => {
  // "presented in association with X" is a fixed term for co-production, not vagueness.
  const r = scan('The series was presented in association with the BBC and ran for three seasons.');
  assert.ok(!typesIn(r).has('vague-relation'), 'credit line should not flag');
});

test('detects the trailing participial significance clause', () => {
  // The productive form of significance inflation: a complete factual sentence, a comma, then
  // a participle explaining what the fact meant. Delete the clause and nothing is lost.
  const a = scan('The company opened its Lisbon office in 2019, showcasing the strength of the local market.');
  const b = scan('Hiring rose forty percent last year, underscoring the importance of regional pipelines.');
  const c = scan('Revenue doubled by summer, reflecting the growing appetite for the whole category.');
  const d = scan('The trust bought the mill in 1974, cementing its role in the conservation movement.');
  assert.ok(typesIn(a).has('significance-inflation'), 'expected flag on ", showcasing the strength"');
  assert.ok(typesIn(b).has('significance-inflation'), 'expected flag on ", underscoring the importance"');
  assert.ok(typesIn(c).has('significance-inflation'), 'expected flag on ", reflecting the growing appetite"');
  assert.ok(typesIn(d).has('significance-inflation'), 'expected flag on ", cementing its role"');
});

test('does not flag the same verb and object as a main clause', () => {
  // No leading comma means the claim is the point of the sentence, not a coda appended to it.
  const a = scan('The report highlights the importance of testing before every release goes out.');
  const b = scan('This demonstrates the value of early review across the three teams we surveyed.');
  assert.ok(!typesIn(a).has('significance-inflation'), 'main-verb "highlights the importance" should not flag');
  assert.ok(!typesIn(b).has('significance-inflation'), 'main-verb "demonstrates the value" should not flag');
});

test('does not flag a participial clause reporting what someone said', () => {
  // With a speaking subject the participle reports something that actually happened.
  const a = scan('She spoke for an hour, emphasising the importance of testing on real hardware.');
  const b = scan('In his statement he added, underscoring the significance of the vote, that turnout rose.');
  assert.ok(!typesIn(a).has('significance-inflation'), 'reported speech should not flag');
  assert.ok(!typesIn(b).has('significance-inflation'), 'statement context should not flag');
});

test('does not flag a participial clause with a concrete object', () => {
  // Requiring an abstract significance noun keeps ordinary physical description out.
  const a = scan('The lamp sat on the sill, reflecting the light off the water and onto the wall.');
  const b = scan('He held up the laptop, demonstrating the new keyboard shortcut to the whole room.');
  assert.ok(!typesIn(a).has('significance-inflation'), '"reflecting the light" should not flag');
  assert.ok(!typesIn(b).has('significance-inflation'), '"demonstrating the shortcut" should not flag');
});

test('does not double-count "marking a pivotal moment"', () => {
  // "marking" is kept out of the participle set so the literal and the construction cannot
  // both claim the same span.
  const r = scan('The merger closed in March, marking a pivotal moment for the combined company.');
  const n = r.issues.filter((i) => i.type === 'significance-inflation').length;
  assert.strictEqual(n, 1, `expected exactly one significance-inflation flag, got ${n}`);
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

test('detects the "deep dive" framing as tier-1', () => {
  const a = scan('Let us take a deep dive into the quarterly numbers before the board meeting on Friday.');
  const b = scan('The team did a deep-dive on churn last month and found nothing anyone could act on.');
  assert.ok(a.issues.some((i) => i.type === 'tier1' && /deep dive/i.test(i.text)),
    'expected tier1 on "deep dive into"');
  assert.ok(b.issues.some((i) => i.type === 'tier1' && /deep-dive/i.test(i.text)),
    'expected tier1 on the hyphenated spelling');
});

test('does not flag literal diving with a depth figure', () => {
  // Scuba use in prose nearly always names the depth right after the noun.
  const r = scan('She logged a deep dive to 40 metres off the coast last summer without any trouble at all.');
  assert.ok(!r.issues.some((i) => i.type === 'tier1' && /deep dive/i.test(i.text)),
    'literal diving with a depth figure should not flag tier1');
});

// --- Title Case headings ----------------------------------------------------

test('detects a Title Case heading that lowercases its function words', () => {
  // Title Case leaves short function words lowercase, so counting capitalized tokens against
  // the whole heading let these through. Two or more function words was the blind spot.
  const a = scan('## The Rise of the Machine Age\n\nBody text long enough to clear the ten word minimum the scanner enforces here.');
  const b = scan('## Notes on the Design of Systems\n\nBody text long enough to clear the ten word minimum the scanner enforces here.');
  const c = scan('## Impact of Technology and Digitalization\n\nBody text long enough to clear the ten word minimum the scanner enforces here.');
  assert.ok(typesIn(a).has('title-case-header'), 'expected title-case-header on "The Rise of the Machine Age"');
  assert.ok(typesIn(b).has('title-case-header'), 'expected title-case-header on "Notes on the Design of Systems"');
  assert.ok(typesIn(c).has('title-case-header'), 'expected title-case-header on "Impact of Technology and Digitalization"');
});

test('still detects a Title Case heading with every word capitalized', () => {
  const r = scan('## Benefits And Strategic Considerations\n\nBody text long enough to clear the ten word minimum the scanner enforces here.');
  assert.ok(typesIn(r).has('title-case-header'), 'expected title-case-header on the all-capitalized form');
});

test('does not flag a short proper-noun heading as Title Case', () => {
  // Two content words apiece. The advice attached to the flag ("use sentence case") is wrong
  // for a proper name, so the floor of three content words keeps these out.
  for (const h of ['Terms of Service', 'Bank of America', 'Table of Contents', 'Pride and Prejudice']) {
    const r = scan(`## ${h}\n\nBody text long enough to clear the ten word minimum the scanner enforces here.`);
    assert.ok(!typesIn(r).has('title-case-header'), `"${h}" should not flag title-case-header`);
  }
});

test('does not flag a sentence-case heading', () => {
  for (const h of ['Getting started with Docker', 'How to use the detector', 'Keep the two halves in sync']) {
    const r = scan(`## ${h}\n\nBody text long enough to clear the ten word minimum the scanner enforces here.`);
    assert.ok(!typesIn(r).has('title-case-header'), `"${h}" should not flag title-case-header`);
  }
});

test('a dotted or all-caps token takes a heading out of title-case scope', () => {
  // Deliberately conservative: these are the headings where the two cases look alike.
  const r = scan('## Deploying to Vercel with Next.js\n\nBody text long enough to clear the ten word minimum the scanner enforces here.');
  assert.ok(!typesIn(r).has('title-case-header'), 'a dotted token should keep the heading out of scope');
});

test('title-case headings stay suppressed in technical context', () => {
  const r = scan('## The Rise of the Machine Age\n\nBody text long enough to clear the ten word minimum the scanner enforces here.', { context: 'technical' });
  assert.ok(!typesIn(r).has('title-case-header'), 'technical context should suppress the rule');
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
