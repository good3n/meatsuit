# Changelog

All notable changes to meatsuit are recorded here. Versions follow
[semantic versioning](https://semver.org/).

## [1.5.0] - 2026-08-18

Adds Tier 1 coverage for the "deep dive" framing and makes the Title Case heading rule aware
of function words, which fixes a miss and a false positive that shared one root cause. No new
issue types.

### Detector
- Tier 1 vocabulary now flags "deep dive" and "deep-dive" in the abstract sense, as in "a deep
  dive into the numbers" or "we did a deep dive on churn." The verb form was already covered as
  a dead opening, but that pattern needs the "let's" frame, so the commoner noun form went
  unflagged. A lookahead exempts literal diving, which in prose nearly always names the depth
  right after the noun ("a deep dive to 40 metres").
- Title Case headings are now judged on their content words rather than on a raw token count.
  The old rule counted every token and allowed one word of slack, which treated a lowercase
  function word as evidence of sentence case. That read both ways as a defect. "The Rise of the
  Machine Age" spent both slack words on "of" and "the" and scored clean, while "Terms of
  Service" fell inside the slack and flagged a proper name with advice ("use sentence case")
  that does not apply to it. The rule now sets function words aside, requires three or more
  capitalized content words, and skips a heading whose last word is a lowercase function word.
  Short proper-noun headings such as "Bank of America" and "Table of Contents" carry two content
  words and no longer flag. A heading holding a dotted, hyphenated, or all-caps token
  ("Deploying to Vercel with Next.js") stays out of scope on purpose, since that is where the
  two cases look alike. A heading whose content words are all proper nouns ("Migrating to
  Kubernetes with Helm") still flags: capitalization alone cannot separate it from Title Case.
  The rule remains suppressed in technical context, which is where that shape lives.

### Tests
- The rule had no coverage before this change, which is how both directions went unnoticed.
  Seven cases now pin it in both directions, plus two for the vocabulary entry.

### References
- Added "deep dive" to the Tier 1 table and the master scan list in banned-vocabulary.md.
- Expanded the Title Case entry in banned-structures.md to say that lowercase function words do
  not make a heading sentence case, and that proper names in headings are not this tell.

## [1.4.0] - 2026-08-18

Adds dead-opening coverage for the lingering-attention frame. No new issue types, and scores
stay put on text that was already clean.

### Detector
- Dead openings now flag the frame that claims a thing has been occupying the writer's
  attention and uses that to introduce the thing, as in "The line I keep coming back to is X"
  or "The quote I can't stop thinking about: X." Deleting the frame loses no information,
  which is what makes it throat-clearing. Three guards keep it off ordinary English. The
  pattern is noun-anchored, so a determiner and an attention noun have to come before the verb
  phrase, and the bare form stays clean when a reason follows ("I keep coming back to
  exit-voice because it predicts which engineers quit"). A sentence-start lookbehind leaves
  mid-sentence uses alone ("there is one part I keep coming back to when I review these").
  A colon or copula has to follow, so "the line I keep coming back to in rehearsal was hard to
  deliver" does not fire. Curly apostrophes are handled.

### References
- Added the opener to the dead-openings section of banned-structures.md, with the carve-out
  for the bare form and a note that the related first-person idioms ("I can't stop thinking
  about it," "it's been rattling around in my head") stay judgment calls under the cluster
  rule rather than automatic flags.

## [1.3.0] - 2026-07-27

Broadens citation-leak detection beyond ChatGPT-era markup. Additive coverage, no new issue
types, and scores only move on text that already carried leaked tokens.

### Detector
- The `citation-leak` type now catches leaked markup from assistants beyond the original set.
  Alongside `oai_citation`, `citeturn…`, and `utm_source=chatgpt.com`, it now flags the inline
  reference wrapper `:contentReference[oaicite:…]` and its bare `oaicite` token (previously only
  the underscore spelling matched), inline `[cite: 3]` / `[cite_start]` markers, the paired
  `[span_2](start_span)` / `(end_span)` wrappers, a `ppl-ai-file-upload` host left in a source
  URL, and `grok_card` / `grok_render_citation_card_json` render tokens. The bracket, paren, and
  host-name shapes are required, so plain prose that merely says "cite," "span," "card," or
  "upload" stays clean.

### References
- `banned-structures.md` §11 and `detector/CATEGORIES.md` updated to describe the broadened
  coverage.

## [1.2.0] - 2026-07-20

Adds Tier 1 coverage for the "load-bearing" metaphor. No new issue types, and scores stay
put on text that was already clean.

### Detector
- Tier 1 vocabulary now flags "load-bearing" when it stands in for a dependency an argument
  rests on, as in "load-bearing assumption," "load-bearing claim," or "the load-bearing
  structure of an argument." The hyphen is required, so "the load bearing down on the bridge"
  stays clean. A lookahead exempts the literal building sense: "load-bearing" right before a
  structural noun such as wall, beam, column, or joist, with room for one material or position
  word in between, as in "load-bearing structural wall." Abstract nouns such as structure,
  element, frame, or foundation are left out of that exemption on purpose, so the metaphor on
  those words still flags.

### References
- Added the word to the Tier 1 table and the master scan list in banned-vocabulary.md.

## [1.1.0] — 2026-07-14

Additive detector coverage. No breaking changes, no new issue types — the new patterns
extend existing categories, so scores only rise on text that was already a tell.

### Detector
- **Reframe** now catches the split-sentence / arbitrary-subject form, where the negation and
  its correction fall in two separate sentences ("The headline isn't the speed. The real story
  is Y.") rather than pivoting on a single dash or comma. The factual-correction guard still
  exempts numeric and date contrasts.
- **Dead openings** now catch speculative scenario openers ("Imagine a world where…", "Picture
  a future in which…"), gated to a world/future/reality object so instructional and literal
  uses ("imagine you have a sorted array") stay clean.
- **Vague attribution** now catches vague third-party / independent-validation claims
  ("independent testing confirms," "analysts agree," "third-party benchmarks show"). Named,
  checkable attribution still passes.

### References
- `banned-structures.md` §8 and §10 updated to match the new detector coverage.

## [1.0.0] — 2026-06-26

First release.

### Skill
- `SKILL.md` router for Claude and `AGENTS.md` for Codex, sharing one rule set.
- Rule-priority hierarchy (accurate > clear > specific > human > style).
- "Ask before you invent" anti-fabrication protocol.
- Five-step workflow with a self-audit pass; four-block output (diagnosis / rewrite / changes /
  notes).
- Context profiles (general / technical / marketing / personal) and a calibrate mode for
  matching a supplied voice.

### References
- `banned-vocabulary.md` — era-grouped word lists in three severity tiers, with replacements.
- `banned-structures.md` — the reframe / negative-parallelism ban, rule-of-three, analogy
  control, formatting tells, weak verbs, dead transitions and openings, significance inflation,
  vague attribution, assistant residue, and the metronome.
- `rewrites.md` — prescriptive fixes, including em-dash fixes by position and a "when the rule
  kills the rhythm" guard.
- `examples.md` — calibration pairs across formats, with edge cases (legitimate technical terms,
  formal register, quoted AI text).
- `preserve.md` — the cluster rule, the "what NOT to flag" list, human signals to protect, and
  the anti-overfitting guard.

### Detector
- `detector/meatsuit.js` — zero-dependency scanner (Node ≥18 + browser), 19 issue types across
  vocabulary, structure, assistant residue, and stylometry (sentence-rhythm variance, lexical
  variety).
- Three-tier vocabulary, length-normalized weighted scoring, banded labels (Clean → Heavy),
  context modes, bypass-trick normalization (zero-width / homoglyph).
- CLI (`npx meatsuit <file>`, `--json`, `--context`, stdin), non-zero exit for CI gating.
- Test suite plus a category contract that prevents the code and `CATEGORIES.md` from drifting.

### Packaging
- Claude Code / Cowork plugin and single-plugin marketplace, generated from source by
  `scripts/sync-plugin.sh`.
- `dist/meatsuit.skill` bundle built by `scripts/build-skill.sh`.
- `llms.txt` for machine discovery. MIT licensed.
