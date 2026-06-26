# meatsuit detector

A deterministic, zero-dependency scanner that scores how "AI" a piece of text reads. No model,
no network. One file: `meatsuit.js`. Runs in Node ≥18 and the browser.

It does the **mechanically-detectable** subset of the skill. The judgment-heavy rules
(cross-sentence reframes, weak metaphors, whether a domain term is legitimate) stay with the
model. Both halves share the categories in [CATEGORIES.md](CATEGORIES.md).

> These are signals, not proof. The score is a writing-quality reading, not a verdict on
> authorship. Don't use it to accuse anyone of anything.

## CLI

```bash
node meatsuit.js draft.md              # human-readable report
node meatsuit.js draft.md --json       # machine-readable
node meatsuit.js draft.md --context technical
cat draft.md | node meatsuit.js        # from stdin
npx meatsuit draft.md                  # via the published bin
```

Exit code is non-zero when the score reaches Moderate or worse, so it gates CI.

## Library

```js
const { scan } = require('./meatsuit.js');

const r = scan(text, { context: 'general' });
// r.score   number, length-normalized
// r.label   'Clean' | 'Light' | 'Some' | 'Moderate' | 'Heavy'
// r.issues  [ { type, label, text, severity, severityLabel, suggestion, line } ]
// r.counts  { [type]: n }
// r.bypassFlags  bitfield: 1 = zero-width chars, 2 = homoglyphs
```

In the browser, load the file with a `<script>` tag and use `window.meatsuit.scan`.

## How scoring works

- Each issue has a per-type **weight** (a leaked `oai_citation` weighs far more than one em dash).
- The summed weight is **length-normalized** (`/ log2(words/50)`) so long texts don't accumulate
  unbounded and a short post can still score Heavy on one damning signal.
- Vocabulary is flagged in **three tiers**: Tier 1 always, Tier 2 only when 2+ cluster in a
  paragraph, Tier 3 only when density exceeds ~3% of words. This is what keeps single legitimate
  uses from tripping it.
- Text under 10 words is not scored.

## False-positive discipline

- Fenced code blocks and inline code are stripped before scanning.
- Em-dash detection runs on prose only.
- Title-case-heading detection is suppressed in `--context technical`.
- Bypass tricks (zero-width characters, Cyrillic/Greek look-alikes) are normalized away and
  recorded as corroborating evidence rather than letting the text slip through.

## Tests

```bash
node meatsuit.test.js       # behavior + regression
node categories.test.js     # every type ↔ CATEGORIES.md, both directions
```

No framework — just `node:assert`. `categories.test.js` fails the build if the code and the docs
drift apart.
