# Changelog

All notable changes to meatsuit are recorded here. Versions follow
[semantic versioning](https://semver.org/).

## [1.2.0] — 2026-07-20

Additive detector coverage. No breaking changes, no new issue types — the pattern extends
the existing Tier 1 vocabulary category, so scores only rise on text that was already a tell.

### Detector
- **Tier 1 vocabulary** now catches the **"load-bearing" metaphor** — the portable label
  models reach for when naming any dependency an argument rests on ("load-bearing assumption,"
  "load-bearing claim," "load-bearing invariant," "the load-bearing structure of the
  argument"). Hyphen required, so ordinary "load bearing down on the bridge" is untouched. A
  construction carve-out exempts the literal compound before a physical structural noun
  (`wall`, `beam`, `column`, `joist`, `truss`, `stud`, `footing`, `slab`, `lintel`, `pier`,
  `rafter`, `girder`, `partition`, `masonry`), with one optional material/position adjective
  in between ("load-bearing structural wall"). Abstract-capable nouns (structure, element,
  frame, foundation) are intentionally left out so the metaphor still fires on them.

### References
- `banned-vocabulary.md` Tier 1 table and master scan list updated to match.

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
