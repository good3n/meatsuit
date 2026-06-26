# Changelog

All notable changes to meatsuit are recorded here. Versions follow
[semantic versioning](https://semver.org/).

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
