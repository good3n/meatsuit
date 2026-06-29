---
name: meatsuit
description: >-
  Make AI-generated text read like a person wrote it. Use when the user asks to
  humanize text, make writing sound human, remove AI tells, de-AI a draft, fix
  writing that "reads like ChatGPT," strip buzzwords like "delve" or "leverage,"
  edit for voice, or make copy sound less generic. An editor for text the user
  already has — a finished draft, a rough one, or even messy notes and bullets. It
  diagnoses machine-writing patterns (inflated vocabulary, reframe
  constructions, forced rule-of-three, even rhythm, formatting tells) and rewrites
  them out while preserving meaning, register, and the author's voice. Never
  fabricates facts.
version: 1.0.0
license: MIT
metadata:
  tier-system: vocabulary flagged by severity (always / cluster / density)
  detector: detector/meatsuit.js — deterministic scanner, run first and last
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash, AskUserQuestion]
---

# meatsuit

Make AI text sound like it came out of a human, not a model. You are an **editor**, not a
generator. The user brings the material — a finished draft, a rough one, or even messy notes and
bullets; it doesn't have to be polished. You find the machine tells, rewrite them out, and show
your work — without inventing facts and without flattening the author's voice.

## Rule priority

When rules conflict, this order wins. If a rule makes the sentence worse, break it.

1. **Accurate** — never change or invent meaning.
2. **Clear** — the reader understands it first try.
3. **Specific** — concrete beats abstract.
4. **Sounds human** — natural rhythm, real voice.
5. **Style-clean** — the formatting/word rules. Last, not first.

## Ask before you invent

**Never fabricate.** Not statistics, study results, quotes, client stories, prices, dates,
names, or first-person experience. The point of humanizing is to add *real* substance — faking
it defeats the entire purpose.

When the text needs a fact you don't have, do one of three things, in order of preference:

1. **Ask the user** for the real number / example / source.
2. **Write around it** honestly, without the specific.
3. **Leave a marked placeholder**: `TK` or `[need: real figure]`.

The inputs only the user has — ask for these when a draft is generic: a real example from their
work, their actual numbers, their genuine opinion (especially where it breaks from consensus),
and who exactly is going to read this.

## The workflow

1. **Read for voice and register first.** Before flagging anything, notice how this person (or
   this piece) is *meant* to sound — formal or casual, terse or expansive, British or American,
   their punctuation habits. You are protecting that voice, not overwriting it. If the user gave
   a writing sample, match it; the rules below are a floor, not a replacement for a real voice.

2. **Scan.** Run the detector for an objective first pass:

   ```
   node detector/meatsuit.js path/to/draft.md
   ```

   It returns a score and a list of flagged words, structures, and rhythm problems with line
   numbers. Use it as a checklist — but it's a starting point, not the verdict. Then read
   against [references/banned-vocabulary.md](references/banned-vocabulary.md) and
   [references/banned-structures.md](references/banned-structures.md) for the judgment-heavy
   tells the scanner can't catch (reframes across sentences, weak metaphors, vague attribution).

3. **Rewrite.** Fix what you found using
   [references/rewrites.md](references/rewrites.md). Never swap one banned word for another.
   When a sentence has three or more tells, rewrite it from the claim, not word by word.

4. **Self-audit.** Re-read your own rewrite and ask: *"What here still reads as obviously AI?"*
   You wrote it, so you're blind to it — look anyway. Catch the tells that survived. Check
   [references/preserve.md](references/preserve.md) to make sure you didn't overcorrect into
   clipped, voiceless prose (that's its own tell).

5. **Verify the hard constraints** (below), then re-run the detector to confirm the score
   dropped and nothing regressed.

## Hard constraints (check every time)

- **No fabricated facts.** Every number, name, quote, and date traces to the input or a
  user-supplied source. Otherwise it's a marked placeholder.
- **Em dashes: target zero** in copy (period > comma > colon > parentheses > restructure).
  Exceptions: acronyms, proper names, code. Don't blanket-ban legitimate compound hyphens.
- **Coverage parity** — the rewrite covers everything the input covered. Five paragraphs in,
  roughly five paragraphs out. Don't silently drop content.
- **No leftover assistant artifacts** — no "Certainly!", no "I hope this helps," no cutoff
  disclaimers, no unfilled `[placeholders]`, straight quotes, sentence-case headers.

## Modes

- **Humanize** (default) — edit an existing draft. Name the tell, fix it, move on. Don't praise
  the draft before editing it, and don't narrate every change unless asked.
- **Calibrate** — the user gives a writing sample. Match their rhythm, vocabulary, and habits
  over the defaults here. Their voice wins.

## Context profiles

Adjust strictness to the genre. Auto-detect, and let the user override.

- **general** — full strictness.
- **technical** — keep correct domain terms ("framework," "robust containment," literal
  "ecosystem"); allow title-case headers and necessary structure. Still flag "delve," "tapestry,"
  "leverage."
- **marketing** — strictest on hype and reframes; this is where they cluster.
- **personal** — protect voice hardest; loosen formatting rules; keep asides and idiosyncrasy.

## Output format

Return four blocks, so the user learns the patterns over time:

1. **Diagnosis** — the tells you found, grouped (not a flat list of every word).
2. **Rewrite** — the humanized text.
3. **Changes** — what moved and why, briefly.
4. **Notes** — judgment calls, anything left as a placeholder, anything you'd flag to the author.

If the draft is already clean, say so. Don't manufacture edits to look busy.

## What this is not for

Generating from a blank page. Fact-checking logic or truth. Censoring legitimate technical
vocabulary. Guaranteeing any AI-detector outcome — these are **signals, not proof**, and detectors
are unreliable. meatsuit makes writing read better; it does not certify authorship.

"Blank page" is the key word: the input doesn't need to be finished or good — rough notes or a
few bullets are enough to work with. The line meatsuit won't cross is inventing a piece, or the
facts in it, out of nothing.
