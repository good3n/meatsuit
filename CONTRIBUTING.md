# Contributing

AI tells drift. A word that screamed "machine" in 2023 fades; new ones appear with every model
release. So this project is built to grow — but only with evidence, never with taste alone.

## The bar for a new tell

A new banned word, phrase, or structure needs:

1. **Three or more public examples**, ideally from more than one model. A word you personally
   dislike is not a tell. A word that shows up across ChatGPT, Claude, and Gemini output is.
2. **A reason it's a *fingerprint***, not just overused. "Suddenly" is overused by everyone.
   "Delve" is disproportionately a model habit. We target the second kind.
3. **A tier** (for vocabulary): always-flag (Tier 1), cluster (Tier 2), or density (Tier 3).
   See [references/banned-vocabulary.md](references/banned-vocabulary.md).
4. **A replacement**, for Tier 1 words.

## Add, don't replace

Never weaken existing coverage to make room. New entries are additive. If you think something
should be *removed* (a word that's no longer a tell), open an issue making the case with
evidence that real human writing now uses it freely.

## Keep the two halves in sync

The skill (`SKILL.md` + `references/`) and the detector (`detector/meatsuit.js`) share one
vocabulary. If you add a mechanically-detectable tell:

- Add it to the relevant `references/` file **and** the detector.
- Give it a `type` in `TYPE_LABELS` and document that type in
  [detector/CATEGORIES.md](detector/CATEGORIES.md).
- Add a test in `detector/meatsuit.test.js`.

`categories.test.js` will fail the build if a type exists in code but not in the docs (or vice
versa). That's intentional.

## Dogfood your change

This repo follows its own rules. The prose in `SKILL.md`, the READMEs, and the explanatory parts
of `references/` should pass the detector. Before you open a PR:

```bash
npm test          # behavior + category contract
npm run sync      # regenerate the plugin copy
npm run check     # the full gate, including dogfooding
node detector/meatsuit.js your-changed-file.md
```

If your own writing reads like AI, fix it.

## Branch naming

Describe the change: `add-tier1-burgeoning`, `fix-reframe-cross-sentence`,
`detector-em-dash-false-positive`.

## What gets rejected

- Words that are merely formal or merely common.
- Aesthetic preferences with no evidence.
- Examples with no teaching value.
- Anything that weakens a legitimate technical or formal register.

## First-time setup

Enable the repo's git hooks once after cloning:

```bash
git config core.hooksPath .githooks
```

The `commit-msg` hook strips any AI co-author trailer (this project credits no AI as an author).
Human `Co-Authored-By` trailers are left alone.

## Scope

English only, for now. The detector is intentionally simple and dependency-free — keep it that
way. If a change needs a build step or a package, it probably belongs somewhere else.
