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
];

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

const CITATION_LEAK = [
  /\bcite[​‌‍]?turn\d+\w*/gi,
  /\boai_citation\b/gi,
  /utm_source=chatgpt\.com/gi,
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
  runSet(REFRAME, 'reframe', 'delete the rejected half; state the surviving claim');
  runSet(DEAD_OPENINGS, 'dead-opening', 'cut the throat-clearing');
  runSet(SIGNIFICANCE, 'significance-inflation', 'show it, do not announce it');
  runSet(VAGUE_ATTRIBUTION, 'vague-attribution', 'name the source or drop the claim');
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

  // Title Case headings (skip in technical context)
  if (context !== 'technical') {
    const re = /^#{1,6}\s+(.+)$/gm;
    let m;
    while ((m = re.exec(original))) {
      const heading = m[1].trim();
      const w = heading.split(/\s+/).filter(Boolean);
      const cap = w.filter((x) => /^[A-Z][a-z]+$/.test(x)).length;
      if (w.length >= 3 && cap >= w.length - 1) {
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
  if (['tier2-cluster', 'tier3-density', 'weak-verb', 'em-dash', 'low-ttr'].includes(type)) return 'medium';
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
