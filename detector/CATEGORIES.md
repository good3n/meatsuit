# Detector categories

Every issue the detector emits carries a `type`. This file is the contract: each type below
must exist in `TYPE_LABELS` inside `meatsuit.js`, and every key in `TYPE_LABELS` must appear
here. `categories.test.js` enforces the mapping in both directions, so the docs and the code
can't silently drift.

The detector covers the **mechanically-detectable** subset of the skill. Judgment-heavy rules
(cross-sentence reframes the regex misses, weak metaphors, whether a domain term is legitimate)
stay with the model in `SKILL.md` and the `references/`. The two halves share this vocabulary.

## Vocabulary

| type | what it flags |
|---|---|
| `tier1` | Always-flagged AI vocabulary (delve, tapestry, leverage, robust…) and Tier-1 phrases (in order to, serves as, due to the fact that). One occurrence is enough. |
| `tier2-cluster` | Tier-2 words flagged only when 2+ distinct ones appear in the same paragraph. |
| `tier3-density` | Tier-3 intensifiers flagged only when combined density exceeds ~3% of words (min 3). |

## Structure

| type | what it flags |
|---|---|
| `reframe` | Negative-parallelism constructions ("it's not X, it's Y", "not just X but Y"). |
| `rule-of-three` | Forced triads of single words ("fast, simple, and reliable"). |
| `weak-verb` | Copula avoidance (stands as a, features a, aims to, is designed to). |
| `dead-transition` | Filler connectors (furthermore, moreover, additionally). |
| `dead-opening` | Throat-clearing and conclusion boilerplate (in today's world, in conclusion). |
| `bullet-bold-title` | Bullet points led by a **Bold Title:** label. |
| `em-dash` | Em dashes (and spaced `--`) in prose. |
| `title-case-header` | Headings in Title Case rather than sentence case (suppressed in technical context). |
| `significance-inflation` | Announcing importance (marking a pivotal moment, a testament to). |
| `vague-attribution` | Sourceless authority (experts say, studies show). |

## Assistant residue

| type | what it flags |
|---|---|
| `chatbot-artifact` | Conversational leftovers (Great question!, I hope this helps). |
| `cutoff-disclaimer` | Knowledge-cutoff hedges (as of my last update). |
| `placeholder` | Unfilled placeholders (`[Your Name]`, `2025-XX-XX`, `TODO`). |
| `citation-leak` | Leaked tool markup (`oai_citation`, `utm_source=chatgpt.com`). |

## Stylometry (detector-only — no single phrase to point at)

| type | what it flags |
|---|---|
| `even-rhythm` | Suspiciously uniform sentence length (low coefficient of variation). |
| `low-ttr` | Low type-token ratio — repetitive vocabulary across a longer text. |

## Skill-only (no detector type — left to model judgment)

These live in the skill and references but are not mechanically detected: cross-sentence
reframes the regex can't span, weak/extended metaphors, analogy frequency caps, whether a
flagged domain term is actually correct in context, coverage parity, and "ask before you
invent." The detector is a first pass, not the whole job.
