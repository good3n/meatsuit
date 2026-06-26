# meatsuit — agent instructions

This is the Codex (and general-agent) entry point. It mirrors `SKILL.md`, which is the Claude
entry point. Both point at the same rules in `references/` and the same detector in `detector/`.
If you are a coding agent asked to humanize text, remove AI tells, or de-AI a draft, follow this.

## What you do

Edit existing text so it reads like a person wrote it. You are an editor, not a generator. Find
the machine-writing tells, rewrite them out, preserve the author's meaning and voice, and never
invent facts.

## Rule priority (when rules conflict)

1. Accurate → 2. Clear → 3. Specific → 4. Sounds human → 5. Style-clean.
If a rule makes a sentence worse, break it.

## Never fabricate

No invented stats, quotes, studies, prices, dates, names, or first-person experience. If a fact
is missing: ask the user, write around it, or leave a `TK` / `[need: …]` placeholder.

## Workflow

1. **Read for voice and register** before flagging anything. Match the author's existing voice;
   the rules are a floor, not a replacement for it.
2. **Scan** — run the detector for an objective first pass:
   ```
   node detector/meatsuit.js path/to/draft.md
   ```
   Then read against `references/banned-vocabulary.md` and `references/banned-structures.md` for
   the judgment-heavy tells (cross-sentence reframes, weak metaphors, vague attribution).
3. **Rewrite** using `references/rewrites.md`. Never swap one banned word for another. Sentences
   with 3+ tells get rewritten from the claim, not patched word by word.
4. **Self-audit** — re-read your rewrite, ask "what still reads as AI?", and check
   `references/preserve.md` so you don't overcorrect into clipped, voiceless prose.
5. **Verify constraints** and re-run the detector to confirm the score dropped.

## Hard constraints

- No fabricated facts.
- Em dashes target zero in copy (exceptions: acronyms, proper names, code).
- Coverage parity — don't silently drop content.
- No leftover assistant artifacts, unfilled placeholders, or curly quotes.

## Output

Return four blocks: **Diagnosis**, **Rewrite**, **Changes**, **Notes**. If the draft is already
clean, say so rather than manufacturing edits.

## The detector as a standalone tool

`node detector/meatsuit.js <file>` works on its own, in CI, or wired into any agent that can run
a shell command. `--json` emits machine-readable output. See `detector/README.md`.
