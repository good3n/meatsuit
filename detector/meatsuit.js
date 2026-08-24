/**
 * meatsuit detector
 *
 * A deterministic, zero-dependency scanner that scores how "AI" a piece of text reads.
 * No model, no network. It pattern-matches vocabulary and structure, and measures rhythm
 * statistically (the tell that word lists miss).
 *
 * Usage:
 *   - Node library:   const { scan } = require('./meatsuit.js'); scan(text, { context: 'general' })
 *   - Browser global: window.meatsuit.scan(text)
 *   - CLI:            node meatsuit.js <file> [--json] [--context technical]
 *
 * Every issue carries a `type`. The full set of types is mirrored in CATEGORIES.md and the
 * mapping is enforced by categories.test.js — keep them in sync.
 *
 * These are signals, not proof. AI-writing detectors are unreliable; this is a writing-quality
 * tool, not a verdict on authorship.
 */

'use strict';

// ---------------------------------------------------------------------------
// Type registry (authoritative — must match CATEGORIES.md)
// ---------------------------------------------------------------------------

const TYPE_LABELS = {
  'tier1': 'Tier 1 vocabulary (always flagged)',
  'tier2-cluster': 'Tier 2 vocabulary (clustered in a paragraph)',
  'tier3-density': 'Tier 3 vocabulary (overused by density)',
  'reframe': 'Reframe / negative parallelism',
  'rule-of-three': 'Forced rule of three',
  'weak-verb': 'Weak verb / copula avoidance',
  'dead-transition': 'Dead transition word',
  'dead-opening': 'Dead opening / filler phrase',
  'bullet-bold-title': 'Bullet point with bolded lead-in',
  'em-dash': 'Em dash in prose',
  'title-case-header': 'Title Case heading',
  'significance-inflation': 'Significance inflation',
  'vague-attribution': 'Vague attribution',
  'vague-relation': 'Vague relational indirection',
  'chatbot-artifact': 'Assistant / chatbot artifact',
  'cutoff-disclaimer': 'Knowledge-cutoff disclaimer',
  'placeholder': 'Unfilled placeholder',
  'citation-leak': 'AI citation / tracking leakage',
  'even-rhythm': 'Even sentence rhythm (metronome)',
  'low-ttr': 'Low lexical variety',
};

const SEVERITY_LABELS = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3' };

// Per-type score weight. Deliberately non-flat: strong, unambiguous tells weigh more so a
// short post can still score "heavy" on a single damning signal.
const WEIGHTS = {
  'tier1': 3,
  'tier2-cluster': 2,
  'tier3-density': 2,
  'reframe': 5,
  'rule-of-three': 2,
  'weak-verb': 2,
  'dead-transition': 2,
  'dead-opening': 3,
  'bullet-bold-title': 4,
  'em-dash': 2,
  'title-case-header': 2,
  'significance-inflation': 3,
  'vague-attribution': 3,
  'vague-relation': 2,
  'chatbot-artifact': 8,
  'cutoff-disclaimer': 10,
  'placeholder': 6,
  'citation-leak': 12,
  'even-rhythm': 4,
  'low-ttr': 3,
};

// ---------------------------------------------------------------------------
// Vocabulary (mirrors references/banned-vocabulary.md)
// ---------------------------------------------------------------------------

// Tier 1: single words -> suggested replacement. Always flagged.
const TIER1 = {
  'delve': 'look at, dig into, examine',
  'tapestry': 'mix, range (or cut)',
  'underscore': 'shows, stresses',
  'underscores': 'shows, stresses',
  'pivotal': 'key, central',
  'realm': 'area, field',
  'leverage': 'use, draw on',
  'leveraging': 'using, drawing on',
  'seamless': 'smooth, clean',
  'seamlessly': 'smoothly, cleanly',
  'robust': 'strong, solid, reliable',
  'beacon': '(cut, or be literal)',
  'nestled': 'sits, is',
  'vibrant': 'lively, busy (or cut)',
  'bustling': 'busy, crowded',
  'meticulous': 'careful, exact',
  'meticulously': 'carefully',
  'intricate': 'detailed, complex',
  'intricacies': 'the details',
  'cutting-edge': 'new, latest',
  'unlock': 'open, reach, free up',
  'unleash': 'release, start',
  'harness': 'use, tap',
  'utilize': 'use',
  'commence': 'start, begin',
  'myriad': 'many, countless',
  'paradigm': 'model, approach',
  'embark': 'start, set out',
  'transformative': '(name what it changes)',
  'groundbreaking': 'new, first',
  'revolutionize': 'change, remake',
  'revolutionary': 'new (or name it)',
  'synergy': '(cut, or name the overlap)',
  'holistic': 'whole, complete',
  'supercharge': 'speed up, boost',
};

// Tier 1 multi-word phrases (regex -> replacement). Always flagged.
const TIER1_PHRASES = [
  [/\bdelve\s+into\b/gi, 'look at, dig into'],
  [/\bin\s+order\s+to\b/gi, 'to'],
  [/\bdue\s+to\s+the\s+fact\s+that\b/gi, 'because'],
  [/\bserves?\s+as\b/gi, 'is'],
  [/\bacts?\s+as\b/gi, 'is'],
  [/\bboasts?\s+a\b/gi, 'has'],
  [/\bpave\s+the\s+way\s+for\b/gi, 'lead to, set up'],
  [/\bat\s+its\s+core\b/gi, '(cut)'],
  [/\bgame[-\s]changer\b/gi, '(name the change)'],
  [/\bever[-\s]evolving\b/gi, 'changing'],
  [/\bunlock\s+(?:the\s+|your\s+|its\s+)?(?:full\s+)?potential\b/gi, 'reach more'],
  // "deep dive" as a stand-in for looking at something closely. The verb form is already
  // caught as a dead opening ("let's dive in"), but that pattern needs the "let's" frame,
  // so the commoner noun form ("a deep dive into the numbers," "we did a deep dive on
  // churn") slipped through everywhere. Hyphenated and plural spellings included. The
  // lookahead exempts literal diving, which in prose nearly always carries a depth figure
  // right after the noun ("a deep dive to 40 metres," "deep dives of 100 feet").
  [/\bdeep[-\s]dives?\b(?!\s+(?:to|at|of)\s+\d)/gi, 'a close look, a detailed look, or name what you examined'],
  // "load-bearing" as a portable metaphor for any dependency the argument rests on:
  // "load-bearing assumption / claim / invariant / test," "the load-bearing structure of
  // his argument." A common newer-model tell. Hyphen required —
  // unhyphenated "load bearing" is ordinary English ("the load bearing down on the bridge"),
  // where "bearing" is a participle, not part of the compound. The negative lookahead exempts
  // literal construction use before a physical structural noun, with one optional
  // material/position adjective in between ("load-bearing structural wall"). Abstract-capable
  // nouns (structure, element, frame, foundation) are deliberately left out of the carve-out
  // so the metaphor still fires on them. Predicative metaphor ("the assumption is load-bearing")
  // still flags by design; the rare literal predicative ("the wall is load-bearing") is an
  // accepted edge — a lookahead cannot reach the subject, and one stray flag falls to the
  // cluster discipline in preserve.md.
  [/\bload-bearing\b(?!\s+(?:(?:structural|exterior|interior|internal|external|concrete|steel|timber|wooden|brick|masonry|perimeter|basement|main|primary|existing|original)\s+)?(?:walls?|beams?|columns?|joists?|truss(?:es)?|studs?|footings?|slabs?|lintels?|piers?|rafters?|girders?|partitions?|masonry|capacit(?:y|ies))\b)/gi, 'essential, critical — or say what breaks without it'],
];

// Tier 2: flag only when 2+ distinct appear in one paragraph.
const TIER2 = [
  'foster', 'elevate', 'ecosystem', 'cornerstone', 'landscape', 'interplay', 'enduring',
  'streamline', 'empower', 'optimize', 'scalable', 'frictionless', 'effortless', 'captivate',
  'showcase', 'spearhead', 'multifaceted', 'noteworthy', 'paramount', 'commendable',
  'comprehensive', 'intuitive', 'immersive', 'turnkey', 'visionary', 'disruptive',
  'data-driven', 'mission-critical', 'proactive', 'actionable', 'impactful', 'thriving',
  'garner', 'embrace', 'endeavor', 'ascertain', 'facilitate', 'bolster', 'encompass',
  'underpin', 'augment', 'fortify',
];

// Tier 3: flag only when combined density exceeds ~3% of words (min 3 occurrences).
const TIER3 = [
  'significant', 'innovative', 'innovation', 'compelling', 'unprecedented', 'world-class',
  'valuable', 'essential', 'crucial', 'vital', 'powerful', 'effective', 'efficient',
  'advanced', 'premium', 'enhanced', 'dynamic', 'strategic',
];

// ---------------------------------------------------------------------------
// Structure patterns
// ---------------------------------------------------------------------------

// `it(?:'?s|\s+is)` matches "it's", "its", and "it is"
const REFRAME = [
  /\bit(?:'?s|\s+is)\s+not\s+(?:just\s+)?(?:about\s+)?[^.,;:]{1,60}?,?\s+it(?:'?s|\s+is)\s+(?:about\s+)?/gi,
  /\bthis\s+is\s?n'?t\s+(?:about\s+)?[^.,;:]{1,60}?[.,]\s+it(?:'?s|\s+is)\s+(?:about\s+)?/gi,
  /\bnot\s+just\s+[^.,;:]{1,40}?,?\s+but\s+/gi,
  /\bless\s+[^.,;:]{1,30}?,\s+more\s+/gi,
  /\byou\s+don'?t\s+need\s+[^.,;:]{1,40}?[.,]\s+you\s+need\s+/gi,
  /\bthe\s+(?:question|problem|point)\s+is\s?n'?t\s+[^.,;:]{1,40}?[.,]\s+it(?:'?s|\s+is)\s+/gi,
  /\bit\s+was\s+never\s+about\s+[^.,;:]{1,40}?[.,]\s+it\s+was\s+(?:always\s+)?about\s+/gi,
  /\bmost\s+people\s+think\s+[^.,;:]{1,50}?[.,]\s+(?:the\s+truth|in\s+reality|but)\b/gi,

  // Split-sentence / arbitrary-subject variants. The classic form pivots on a single dash
  // or comma with an "it"/"this" subject (above). These catch the same move when it spans
  // two sentences and uses a plain noun subject ("The headline isn't the speed. The real
  // story is Y.") — a pair that reads as innocent declaratives and slips the joined
  // patterns. The factual-correction guard in the scan loop keeps allowed contrasts like
  // "not 12 MB, it is 12 GB" and "not Tuesday, it is Thursday" out.

  // negation ... "the real/actual/true <noun> is": "... is not the speed. The real story is ..."
  /\b(?:is|are|was|were)(?:\s+not|n'?t)\s+[^.!?;,]{1,60}[.!?;,]\s+(?:the|its|our|your|their)\s+(?:real|actual|true|deeper|bigger|whole|hidden|overlooked|only)\s+[\w'-]+\s+(?:is|are|was|were)\b/gi,
  // imperative dismissal ... "the real/actual <noun> is": "Forget the specs. The real story is ..."
  /\b(?:forget|ignore|never\s+mind)\s+[^.!?;,]{1,50}[.!?;]\s+(?:the|its|our|your|their)\s+(?:real|actual|true|deeper|bigger|whole|hidden|overlooked|only)\s+[\w'-]+\s+(?:is|are|was|were)\b/gi,
  // arbitrary-subject negation corrected by "it is/it's": "The headline is not the speed, it is Y."
  /\b[A-Za-z][\w'-]*(?:\s+[\w'-]+){0,3}\s+(?:is|are|was|were)(?:\s+not|n'?t)\s+(?:just\s+|about\s+)?[^.!?;,]{1,50}[.!?;,]\s+it(?:'?s|\s+is)\s+(?:about\s+|really\s+)?/gi,
];

const WEAK_VERBS = [
  [/\bstands?\s+as\s+a\b/gi, 'is'],
  [/\bmarks?\s+a\b/gi, 'is'],
  [/\brepresents?\s+a\b/gi, 'is'],
  [/\bfeatures?\s+a\b/gi, 'has'],
  [/\boffers?\s+a\b/gi, 'has'],
  [/\bplays?\s+a\s+(?:key\s+|vital\s+|crucial\s+)?role\s+in\b/gi, 'affects, shapes'],
  [/\baims?\s+to\b/gi, '(state what it does)'],
  [/\bseeks?\s+to\b/gi, '(state what it does)'],
  [/\bis\s+designed\s+to\b/gi, 'will'],
  [/\bis\s+positioned\s+to\b/gi, 'will'],
];

const DEAD_TRANSITIONS = [
  'furthermore', 'moreover', 'additionally', 'subsequently', 'accordingly',
  'that said', 'that being said', 'with that in mind', 'as previously mentioned',
  'as noted above', 'on top of that',
];

const DEAD_OPENINGS = [
  /\bin\s+today'?s\s+(?:fast[-\s]paced\s+|digital\s+|modern\s+)?world\b/gi,
  /\bin\s+the\s+ever[-\s]evolving\s+(?:world|landscape)\s+of\b/gi,
  /\bin\s+the\s+age\s+of\b/gi,
  /\bnow\s+more\s+than\s+ever\b/gi,
  /\bfirst\s+and\s+foremost\b/gi,
  /\bit\s+is\s+(?:important|worth)\s+(?:to\s+note|noting)\s+that\b/gi,
  /\bit\s+goes\s+without\s+saying\b/gi,
  /\bneedless\s+to\s+say\b/gi,
  /\blet'?s\s+(?:dive\s+in|explore|unpack)\b/gi,
  /\bwithout\s+further\s+ado\b/gi,
  // Speculative scenario opener: a hypothetical desirable-outcomes world standing in for a
  // claim ("imagine a world where…", "picture a future in which…"). Gated to the
  // world/future/reality object plus where/in-which so instructional or literal uses
  // ("imagine you have a sorted array", "picture the diagram") stay clean.
  /\b(?:imagine|picture|envision)\b[^.!?]{0,30}?\ba\s+(?:world|future|reality)\s+(?:where|in\s+which)\b/gi,
  // Lingering-attention opener: the frame that claims a thing has been occupying the writer,
  // used to introduce the thing rather than say anything about it ("The line I keep coming
  // back to is X," "The quote I can't stop thinking about: X"). Deleting the frame loses no
  // information, which is what makes it throat-clearing.
  //
  // Three guards, because the bare verb phrase is ordinary English. (1) Noun-anchored: a
  // determiner plus an attention noun must come *before* the verb phrase, so the legitimate
  // form that puts its object after the verb stays clean ("I keep coming back to exit-voice
  // because it predicts who quits" — the reason clause is not reachable by regex, so the
  // bare form is left to judgment). (2) Sentence-start lookbehind, so mid-sentence uses that
  // are doing real work don't fire ("there is one part I keep coming back to when I review
  // these"). (3) A colon or copula must follow, so the frame is actually introducing
  // something ("the line I keep coming back to in rehearsal was hard to deliver" is left
  // alone). `['’]?` covers the curly apostrophe, common in this register.
  //
  // Bare first-person idioms ("I can't stop thinking about it," "rattling around in my
  // head") are deliberately not here: they are the same instinct but also ordinary personal
  // writing, and one signal alone is noise under the cluster rule in preserve.md. They live
  // in banned-structures.md §8 as a judgment call.
  /(?<=(?:^|[.!?]|\n)\s*)(?:the|that|this)\s+(?:one\s+)?(?:line|quote|bit|part|passage|sentence|idea|point|framing|comment)\s+(?:that\s+)?i\s+(?:keep\s+(?:coming\s+back\s+to|thinking\s+about)|(?:can['’]?t|cannot)\s+stop\s+thinking\s+about)\s*(?::|\bis\b|\bwas\b)/gi,
  /\bin\s+conclusion\b/gi,
  /\bin\s+summary\b/gi,
  /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
  /\bthe\s+bottom\s+line\s+is\b/gi,
];

const SIGNIFICANCE = [
  /\bmarking\s+a\s+(?:pivotal|significant|major)\s+(?:moment|milestone)\b/gi,
  /\bsetting\s+the\s+stage\s+for\b/gi,
  /\bfar[-\s]reaching\s+implications\b/gi,
  /\ba\s+watershed\s+moment\b/gi,
  /\bushering\s+in\s+a\s+new\s+era\b/gi,
  /\ba\s+testament\s+to\b/gi,
];

const VAGUE_ATTRIBUTION = [
  /\bexperts?\s+(?:say|agree|argue|believe|note)\b/gi,
  /\bstudies\s+show\b/gi,
  /\bit\s+is\s+widely\s+(?:believed|known|accepted)\b/gi,
  /\bobservers\s+(?:note|say|cite)\b/gi,
  /\bindustry\s+reports?\s+(?:suggest|show|indicate)\b/gi,
  // Vague third-party / independent-validation claims: credibility borrowed from an unnamed
  // external test or analyst. Specifically attributed, checkable validation ("on Stanford's
  // HELM leaderboard…", "audited by …") names the source before the verb and won't match.
  /\banalysts?\s+(?:say|agree|argue|believe|note|predict)\b/gi,
  /\b(?:independent|third[-\s]party)\s+(?:testing|tests?|research|benchmarks?|analysis|audits?)\s+(?:confirm|confirms|show|shows|indicate|indicates|suggest|suggests|find|finds)\b/gi,
];

// Vague relational indirection. Where vague-attribution hides *who* said something, this hides
// *how two things relate*: the model knows a link exists but not what kind, so it reaches for
// an abstract connector instead of the plain word that would name the relationship — of, for,
// by, made by, used in, caused by, works at, founded. "He is associated with the orchestra"
// leaves the reader unable to tell whether he founded it, conducts it, or plays in it.
//
// Two shapes, kept separate because they need different guards:
//   1. The prepositional connector: "in connection with", "in association with".
//   2. The copular form: "is/was/has been associated with", with an optional degree adverb
//      ("widely/closely/principally associated with"), which is where this most often
//      compounds with buzzspeak.
//
// The copular restriction is itself the main false-positive guard for shape 2. The commonest
// legitimate use of "associated with" is post-nominal and has no copula in front of it — "the
// costs associated with maintenance", "the risks associated with the change", "the data
// associated with this key" — and none of those match. Sentence-scope guards for the rest live
// in the scan loop (see VAGUE_RELATION_EXEMPT), because the disqualifying context sits too far
// from the phrase for a lookaround to reach it.
const VAGUE_RELATION = [
  /\bin\s+connection\s+with\b/gi,
  /\bin\s+association\s+with\b/gi,
  /\b(?:is|are|was|were|been|being|becomes?|became|remains?|remained)\s+(?:(?:widely|closely|principally|primarily|mainly|chiefly|particularly|commonly|often|frequently|generally|traditionally|historically|strongly|variously|sometimes|typically|long)\s+)?associated\s+with\b/gi,
];

// Sentence-scope carve-outs for VAGUE_RELATION. Each is a register where the phrase is a term
// of art carrying real meaning, not a hedge standing in for a relationship the writer could
// name.
const VAGUE_RELATION_EXEMPT = [
  // Criminal-justice reporting. "Arrested in connection with the robbery" is precise *because*
  // the connection is not yet established — naming it would assert guilt the reporter cannot.
  /\b(?:arrest(?:ed|s)?|charg(?:ed|es)|detain(?:ed|ing)?|question(?:ed|ing)|convict(?:ed|ion)|indict(?:ed|ment)|sentenc(?:ed|ing)|prosecut(?:ed|ion)|custody|suspect(?:ed|s)?|warrant|police|officers?|court|trial|alleged(?:ly)?|homicide|murder|robbery|burglary|assault|fraud|manslaughter)\b/i,
  // Statistics and epidemiology, where "associated with" is the correct term for a measured
  // correlation and deliberately stops short of claiming cause.
  /\b(?:risk|odds|hazard|ratio|incidence|prevalence|mortality|morbidity|correlat(?:ed|ion)|regression|cohort|confidence\s+interval|statistically|significance|p\s*[<=>]|\bCI\b)\b/i,
];

// Production/credit-line idiom: "presented in association with the BBC" is a fixed term for
// co-production, not vagueness. Adjacency is required — the credit verb must sit immediately
// before the phrase — so the AI shape stays caught when the same verb appears elsewhere in the
// sentence ("the concerts were organised in connection with the anniversary").
const VAGUE_RELATION_CREDIT = /\b(?:presented|produced|co-produced|published|released|broadcast|distributed|performed|staged|filmed)\s+in\s+association\s+with\b/i;

const CHATBOT = [
  /\bgreat\s+question\b/gi,
  /\byou'?re\s+absolutely\s+right\b/gi,
  /\bcertainly[!,]/gi,
  /\bi'?d\s+be\s+happy\s+to\b/gi,
  /\bi\s+hope\s+this\s+helps\b/gi,
  /\blet\s+me\s+know\s+if\s+you'?d\s+like\b/gi,
  /\bwould\s+you\s+like\s+me\s+to\b/gi,
];

const CUTOFF = [
  /\bas\s+of\s+my\s+last\s+(?:update|training)\b/gi,
  /\bi\s+(?:do\s+not|don'?t)\s+have\s+(?:real[-\s]time\s+)?access\b/gi,
  /\bmy\s+(?:knowledge|training)\s+cutoff\b/gi,
];

const PLACEHOLDER = [
  /\[(?:your\s+name|company|insert[^\]]*|name|date|x+)\]/gi,
  /\b20\d{2}-XX-XX\b/gi,
  /\bTODO\b/g,
];

// Short words Title Case leaves lowercase (articles, coordinating conjunctions, short
// prepositions). Used to tell a lowercase token that is evidence of sentence case apart from
// one that is just how Title Case spells a function word.
const TITLE_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'nor', 'but', 'so', 'yet',
  'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'off',
  'on', 'over', 'per', 'to', 'up', 'via', 'vs', 'with',
]);

const CITATION_LEAK = [
  /\bcite[​‌‍]?turn\d+\w*/gi,
  /\boai_citation\b/gi,
  /utm_source=chatgpt\.com/gi,
  // The inline-reference wrapper left in pasted text (":contentReference[oaicite:1]{index=1}")
  // and its bare "oaicite" token. The oai_citation rule above only catches the underscore
  // spelling, so the far more common colon form slipped through.
  /:contentReference\[/gi,
  /\boaicite\b/gi,
  // A file-upload host name left behind in a pasted source URL — a dead giveaway that the
  // surrounding text was copied out of an assistant that had attached the file.
  /\bppl-ai-file-upload\b/gi,
  // Leaked citation-card render tokens.
  /\bgrok_(?:card|render_citation_card_json)\b/gi,
  // Inline citation/span markers: "[cite: 3]", "[cite_start]", and the paired
  // "[span_2](start_span)" / "[span_2](end_span)" wrappers. The bracket/paren punctuation is
  // required so a plain "cite" or "span" in ordinary prose is never touched, and so the ML
  // sense of a token "span" stays clean unless it carries the leaked "](start_span)" shape.
  /\[cite[:_]/gi,
  /\]\((?:start|end)_span\)/gi,
];

// ---------------------------------------------------------------------------
// Normalization — undo common bypass tricks; their presence is corroborating evidence.
// ---------------------------------------------------------------------------

const HOMOGLYPHS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c',
  'х': 'x', 'у': 'y', 'і': 'i', 'ο': 'o',
};

function normalize(text) {
  let flags = 0;
  const zw = /[​‌‍⁠﻿]/g;
  if (zw.test(text)) { flags |= 1; text = text.replace(zw, ''); }
  let mapped = '';
  for (const ch of text) {
    if (HOMOGLYPHS[ch]) { mapped += HOMOGLYPHS[ch]; flags |= 2; }
    else mapped += ch;
  }
  return { text: mapped, bypassFlags: flags };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function words(text) {
  return (text.toLowerCase().match(/[a-z][a-z'-]*/g) || []);
}

function sentences(text) {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

function paragraphs(text) {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

// The sentence containing `index`, for rules whose false-positive guard is a property of the
// surrounding sentence rather than of the matched phrase. Boundaries are the nearest sentence
// punctuation or blank line on either side; unlike `sentences()` this keeps offsets intact, so
// it can be called with a match index straight from a regex.
function sentenceAt(text, index) {
  const before = text.slice(0, index);
  const start = Math.max(0, before.search(/[.!?\n][^.!?\n]*$/) + 1);
  const after = text.slice(index);
  const rel = after.search(/[.!?\n]/);
  return text.slice(start, rel === -1 ? text.length : index + rel + 1);
}

// strip fenced code blocks and inline code so we don't scan code as prose
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/`[^`]*`/g, ' ');
}

// ---------------------------------------------------------------------------
// Core scan
// ---------------------------------------------------------------------------

function scan(rawText, options = {}) {
  const context = ['general', 'technical', 'marketing', 'personal'].includes(options.context)
    ? options.context
    : 'general';

  const norm = normalize(String(rawText == null ? '' : rawText));
  const original = norm.text;
  const text = stripCode(original);
  const wordList = words(text);
  const wordCount = wordList.length;

  if (wordCount < 10) {
    return {
      score: 0, label: 'Too short to score', issues: [], wordCount,
      bypassFlags: norm.bypassFlags, context,
    };
  }

  const issues = [];
  const add = (type, matchText, index, suggestion) => {
    const sev = severityFor(type);
    issues.push({
      type,
      label: TYPE_LABELS[type],
      text: matchText.trim().slice(0, 80),
      severity: sev,
      severityLabel: SEVERITY_LABELS[sev],
      suggestion: suggestion || '',
      line: index >= 0 ? lineOf(original, index) : null,
    });
  };

  // --- Tier 1 words (always) ---
  for (const [word, repl] of Object.entries(TIER1)) {
    const re = new RegExp('\\b' + word.replace(/-/g, '[-]') + '\\b', 'gi');
    let m;
    while ((m = re.exec(text))) add('tier1', m[0], m.index, repl);
  }
  for (const [re, repl] of TIER1_PHRASES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) add('tier1', m[0], m.index, repl);
  }

  // --- Tier 2 (cluster: 2+ distinct in a paragraph) ---
  let offset = 0;
  for (const para of original.split(/(\n\s*\n)/)) {
    if (/^\s*$/.test(para)) { offset += para.length; continue; }
    const pl = stripCode(para);
    const found = [];
    for (const word of TIER2) {
      const re = new RegExp('\\b' + word.replace(/-/g, '[-]') + '\\b', 'gi');
      let m;
      while ((m = re.exec(pl))) found.push({ word, text: m[0], index: offset + m.index });
    }
    const distinct = new Set(found.map((f) => f.word));
    if (distinct.size >= 2) {
      for (const f of found) add('tier2-cluster', f.text, f.index, 'cluster of buzzwords — cut or vary');
    }
    offset += para.length;
  }

  // --- Tier 3 (density across whole text) ---
  const threshold = Math.max(3, Math.ceil(wordCount * 0.03));
  const tier3Hits = [];
  for (const word of TIER3) {
    const re = new RegExp('\\b' + word.replace(/-/g, '[-]') + '\\b', 'gi');
    let m;
    while ((m = re.exec(text))) tier3Hits.push({ text: m[0], index: m.index });
  }
  if (tier3Hits.length >= threshold) {
    for (const h of tier3Hits) add('tier3-density', h.text, h.index, 'overused intensifier — thin these out');
  }

  // --- Regex-based structure detectors ---
  const runSet = (set, type, suggestion) => {
    for (const re of set) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) add(type, m[0], m.index, suggestion);
    }
  };
  // Reframe / negative parallelism. Collect matches from every pattern, then keep only
  // non-overlapping spans so the joined and split patterns can't both count one sentence.
  // Skip factual/numeric corrections — "X is not 12 MB, it is 12 GB" and "not Tuesday, it
  // is Thursday" are allowed contrasts, not rhetorical reframes.
  {
    const FACTUAL = /\d|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december)\b/i;
    const hits = [];
    for (const re of REFRAME) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (FACTUAL.test(m[0])) continue;
        hits.push({ text: m[0], index: m.index, end: m.index + m[0].length });
      }
    }
    hits.sort((a, b) => a.index - b.index);
    let lastEnd = -1;
    for (const h of hits) {
      if (h.index < lastEnd) continue;
      add('reframe', h.text, h.index, 'delete the rejected half; state the surviving claim');
      lastEnd = h.end;
    }
  }
  runSet(DEAD_OPENINGS, 'dead-opening', 'cut the throat-clearing');
  runSet(SIGNIFICANCE, 'significance-inflation', 'show it, do not announce it');
  runSet(VAGUE_ATTRIBUTION, 'vague-attribution', 'name the source or drop the claim');

  // Vague relational indirection. Guarded on the sentence rather than the phrase: the context
  // that makes "in connection with" or "associated with" legitimate (a police report, a
  // regression result) is a whole-sentence property, and a lookaround can't reach it.
  {
    for (const re of VAGUE_RELATION) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const sentence = sentenceAt(text, m.index);
        if (VAGUE_RELATION_EXEMPT.some((g) => g.test(sentence))) continue;
        if (VAGUE_RELATION_CREDIT.test(text.slice(Math.max(0, m.index - 20), m.index + m[0].length))) continue;
        add('vague-relation', m[0], m.index, 'name the relationship — of, for, by, made by, used in, caused by');
      }
    }
  }
  runSet(CHATBOT, 'chatbot-artifact', 'remove assistant chatter');
  runSet(CUTOFF, 'cutoff-disclaimer', 'remove disclaimer');
  runSet(PLACEHOLDER, 'placeholder', 'fill in or remove');
  runSet(CITATION_LEAK, 'citation-leak', 'strip leaked markup');

  for (const [re, repl] of WEAK_VERBS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) add('weak-verb', m[0], m.index, repl);
  }

  // dead transitions
  for (const t of DEAD_TRANSITIONS) {
    const re = new RegExp('\\b' + t.replace(/\s+/g, '\\s+') + '\\b', 'gi');
    let m;
    while ((m = re.exec(text))) add('dead-transition', m[0], m.index, 'cut or use a plain connector');
  }

  // em dashes in prose
  {
    const re = /\s—\s|\s—|—\s|—|\s--\s/g;
    let m;
    while ((m = re.exec(text))) add('em-dash', m[0], m.index, 'period, comma, colon, or parentheses');
  }

  // bullet points with bolded lead-in titles — the colon may sit inside or outside the bold,
  // and a description follows ("- **Speed:** It is fast" / "- **Speed**: it is fast")
  {
    const re = /^[\s>]*[-*+]\s+\*\*[^*\n]+?\*\*:?\s+\S/gm;
    let m;
    while ((m = re.exec(original))) add('bullet-bold-title', m[0], m.index, 'fold into prose or drop the bold label');
  }

  // forced rule of three: "a, b, and c" of single adjectives/short nouns
  {
    const re = /\b(\w+),\s+(\w+),\s+and\s+(\w+)\b/gi;
    let m;
    while ((m = re.exec(text))) {
      if ([m[1], m[2], m[3]].every((w) => w.length >= 4 && w.length <= 14)) {
        add('rule-of-three', m[0], m.index, 'vary the count — two, four, or name one proof');
      }
    }
  }

  // Title Case headings (skip in technical context).
  //
  // Counting capitalized tokens against the whole heading, with one word of slack, got this
  // wrong in both directions: it read a lowercase function word as a vote for sentence case.
  // "The Rise of the Machine Age" spends both slack words on "of" and "the" and scored clean,
  // while "Terms of Service" (three tokens, two capitalized) fell inside the slack and flagged
  // a proper name. Title Case, as AP and Chicago define it, capitalizes content words and
  // lowercases short function words, so the function words carry no signal either way and are
  // set aside before the count.
  if (context !== 'technical') {
    const re = /^#{1,6}\s+(.+)$/gm;
    let m;
    while ((m = re.exec(original))) {
      const heading = m[1].trim();
      const w = heading.split(/\s+/).filter(Boolean);

      // Position 0 is capitalized in Title Case and sentence case alike, so a leading "The"
      // is a content word here rather than a function word.
      const contentWords = [];
      const functionIndexes = [];
      w.forEach((word, i) => {
        if (i > 0 && TITLE_FUNCTION_WORDS.has(word)) functionIndexes.push(i);
        else contentWords.push(word);
      });

      // `[a-z]*` rather than `[a-z]+` so a one-letter content word ("A Guide to Python for
      // Beginners") still counts. A dotted, hyphenated, or all-caps token (Next.js, REST)
      // fails the test and takes the whole heading out of scope, which is deliberately
      // conservative: those headings are where sentence case and Title Case look alike.
      const allContentCapitalized = contentWords.every((x) => /^[A-Z][a-z]*$/.test(x));

      // Three content words is the floor that keeps short proper-noun headings out: "Terms of
      // Service," "Bank of America," and "Table of Contents" carry two each. A trailing
      // lowercase function word means the heading is not Title Case at all.
      const trailingFunctionWord = functionIndexes.some((i) => i === w.length - 1);

      if (contentWords.length >= 3 && allContentCapitalized && !trailingFunctionWord) {
        add('title-case-header', heading, m.index, 'use sentence case');
      }
    }
  }

  // --- Stylometry ---
  const sents = sentences(text);
  if (sents.length >= 5) {
    const lengths = sents.map((s) => (s.match(/[a-z][a-z'-]*/gi) || []).length).filter((n) => n > 0);
    if (lengths.length >= 5) {
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      if (mean >= 7 && cv < 0.33) {
        add('even-rhythm', `avg ${mean.toFixed(0)} words/sentence, low variation`, -1,
          'vary sentence length — split one, fuse two, add a fragment');
      }
    }
  }

  // lexical variety (type-token ratio) for longer texts
  if (wordCount >= 80) {
    const unique = new Set(wordList).size;
    const ttr = unique / wordCount;
    if (ttr < 0.42) {
      add('low-ttr', `lexical variety ${(ttr * 100).toFixed(0)}%`, -1,
        'repetitive vocabulary — vary word choice');
    }
  }

  // --- Score ---
  const rawScore = issues.reduce((sum, i) => sum + (WEIGHTS[i.type] || 1), 0);
  const normalizer = Math.max(1, Math.log2(wordCount / 50));
  const score = +(rawScore / normalizer).toFixed(1);

  return {
    score,
    label: bandFor(score),
    issues,
    wordCount,
    bypassFlags: norm.bypassFlags,
    context,
    counts: countByType(issues),
  };
}

function severityFor(type) {
  if (['citation-leak', 'cutoff-disclaimer', 'chatbot-artifact', 'placeholder'].includes(type)) return 'critical';
  if (['reframe', 'tier1', 'bullet-bold-title', 'significance-inflation', 'vague-attribution', 'dead-opening', 'even-rhythm'].includes(type)) return 'high';
  if (['tier2-cluster', 'tier3-density', 'weak-verb', 'vague-relation', 'em-dash', 'low-ttr'].includes(type)) return 'medium';
  return 'low';
}

function bandFor(score) {
  if (score === 0) return 'Clean';
  if (score < 6) return 'Light';
  if (score < 14) return 'Some';
  if (score < 28) return 'Moderate';
  return 'Heavy';
}

function countByType(issues) {
  const c = {};
  for (const i of issues) c[i.type] = (c[i.type] || 0) + 1;
  return c;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function formatReport(result, filename) {
  const lines = [];
  lines.push(`meatsuit — ${filename || 'input'}`);
  lines.push(`Score: ${result.label} (${result.score})  ·  ${result.issues.length} tells  ·  ${result.wordCount} words`);
  if (result.bypassFlags) {
    lines.push('⚠ bypass tricks detected (zero-width / homoglyph) — counted as evidence');
  }
  if (result.issues.length === 0) {
    lines.push('No tells found. Reads clean.');
    return lines.join('\n');
  }
  lines.push('');
  const sorted = [...result.issues].sort((a, b) => (a.line || 0) - (b.line || 0));
  for (const i of sorted) {
    const loc = i.line ? `line ${i.line}` : 'whole text';
    lines.push(`  ${i.severityLabel} [${i.type}] ${loc}: "${i.text}"`);
    if (i.suggestion) lines.push(`       -> ${i.suggestion}`);
  }
  return lines.join('\n');
}

function runCli(argv) {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const ctxIdx = args.indexOf('--context');
  const context = ctxIdx >= 0 ? args[ctxIdx + 1] : 'general';
  const file = args.find((a) => !a.startsWith('--') && a !== context);

  const fs = require('fs');
  let text = '';
  if (file) {
    text = fs.readFileSync(file, 'utf8');
  } else if (!process.stdin.isTTY) {
    text = fs.readFileSync(0, 'utf8');
  } else {
    process.stderr.write('usage: node meatsuit.js <file> [--json] [--context technical]\n');
    process.exit(2);
  }

  const result = scan(text, { context });
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(formatReport(result, file) + '\n');
  }
  process.exit(result.score >= 14 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const api = { scan, TYPE_LABELS, WEIGHTS, bandFor, normalize, formatReport, runCli };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
  if (require.main === module) runCli(process.argv);
} else if (typeof window !== 'undefined') {
  window.meatsuit = api;
}
