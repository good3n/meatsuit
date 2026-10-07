# Rewrites

How to fix what the scan finds. Knowing a word is banned isn't enough — you need the move that
replaces it without making the sentence worse. Load this during the rewrite step.

The golden rule: **never replace one tell with another.** Swapping "leverage" for "utilize"
fixes nothing. When unsure, cut.

---

## Word substitutions

The replacements live in [banned-vocabulary.md](banned-vocabulary.md). A few that need
judgment rather than a lookup:

- **leverage** → use / draw on / build on / exploit — pick by intent. "Leverage our data" →
  "use our data." "Leverage the lull" → "take advantage of the lull."
- **robust** → strong / solid / reliable / sturdy — pick by what kind of strength. A "robust
  process" is usually "reliable." A "robust frame" is "sturdy."
- **unlock** → reach / get to / open / free up. "Unlock growth" → "grow." Often the whole
  "unlock the potential of X" phrase collapses to just "X."
- **delve into** → look at / dig into / examine / get into. Frequently deletable: "Let's delve
  into the data" → "The data shows…"

Three rules of thumb:

1. If the sentence survives deletion, delete.
2. Prefer the shorter, plainer word.
3. Match the register — don't drop slang into a legal brief or stiffen casual copy.

---

## Em-dash fixes, by position

The fix depends on what the dash is doing.

**Parenthetical aside** — "The tool — which we shipped in March — is fast."
→ Parentheses: "The tool (shipped in March) is fast."
→ Or split: "The tool is fast. We shipped it in March."
→ Or commas: "The tool, shipped in March, is fast."

**Extension after a clause** — "We rebuilt the parser — and it paid off."
→ Colon: "We rebuilt the parser: it paid off."
→ Or two sentences: "We rebuilt the parser. It paid off."

**Emphasis dash** — "There was one problem — money."
→ Period: "There was one problem. Money."
→ Or colon: "There was one problem: money."

---

## Reframe fixes

Find the half that survives. Delete the rest.

> It's not about the tool. It's about the workflow.
→ "The workflow is what matters."

> This isn't a redesign. It's a rethink of how the page loads.
→ "We rethought how the page loads."

> Rather than simply retelling the legend, the film adapts it to modern concerns.
→ "The film adapts the legend to modern concerns."

> The tool is not only faster but also cheaper to run.
→ "The tool is faster and cheaper to run."

> The goal is generally not to erase the loss but to gradually adapt to life after it.
→ "The goal is to adapt to life after the loss, a little at a time."

> Acceptance does not mean being happy about what happened. It also does not mean forgetting
> someone. Acceptance means learning to live alongside the loss.
→ "Acceptance means learning to live alongside the loss without forgetting the person."

> Grief often looks less like climbing a staircase and more like moving through waves.
→ "Grief comes in waves." (If the staircase matters, make it the claim: "You won't move
through the stages in order.")

For headings, drop the contrast and name the thing:

> "Not a tool. A system." → "The system."
> "Less noise, more signal." → "Signal quality."

---

## Staged emphasis fixes

Cut the cue. Join the chopped phrase back into one sentence. If the claim felt too weak to stand
without the staging, the fix is a concrete detail, not a louder delivery.

> Our churn rate dropped by half. Let that sink in.
→ "Our churn rate dropped by half." (Or give it weight: "Our churn rate dropped from 6% to 3%
in one quarter.")

> We made forty calls. Every. Single. Week.
→ "We made forty calls every week."

---

## Self-announcing opener fixes

Delete the announcement and start on the sentence that was going to follow it. The reader is
already reading the piece; telling them what it will do costs a sentence and adds nothing.

> In this article, I will walk through how we moved billing off the old queue. The queue
> dropped messages under load.
→ "Billing used to run on a queue that dropped messages under load, so we moved it."

> This post explores why small teams keep rebuilding the same internal tools.
→ Open on the first reason instead: "Small teams rebuild internal tools because nobody owns the
old one."

---

## Source-disclaimer fixes

Say what the source shows. If something is missing, name the gap in plain words, once, or ask
the user for it. Never fill the gap with a guess about what the answer "likely" is.

> While specific details about his early life are limited, he is believed to have trained in the
> city.
→ "He trained in the city [need: source]." Or, if nothing supports it, cut the sentence.

> Based on the available search results, his work appears in two small collections.
→ "His work is held in two collections: TK and TK."

> Claims that he painted the chapel ceiling should be treated as local tradition rather than as
> documented fact.
→ "Local accounts credit him with the chapel ceiling; no record from the period names the
painter." (Only if that is what the sources say. Otherwise ask.)

---

## Challenges-formula fixes

Say what the problem is and what happened to it. If you don't know, ask or cut the pair.

> Despite its rich history, the town faces several challenges, including an aging population
> and limited investment. Despite these challenges, the town continues to thrive.
→ Name them from the source: "The mill closed in TK, and the town has lost TK residents since.
The summer festival still draws TK visitors." Fill each TK from the source or ask; don't guess.

> Despite these challenges, the company remains committed to innovation.
→ Cut it. If something real follows, say that instead: "It shipped two products last year."

---

## Hedge-density fixes

Go sentence by sentence and ask what each hedge reports. If it marks real doubt or a real
subset, keep it. If it only softens, state the claim.

> You may feel relatively okay one day and overwhelmed the next.
→ "Some days you'll feel okay. The next day you won't."

> Memories might bring warmth along with sadness instead of only pain.
→ "Memories start to bring some warmth along with the sadness."

> About 10% of bereaved people may experience complicated grief.
→ Keep "about 10%"; drop "may": "About 10% of bereaved people experience complicated grief."

## Rule-of-three fixes

Three ways out of a forced triad:

1. **Drop to two** — keep the two that matter. "Fast, simple, and reliable" → "fast and
   reliable."
2. **Expand with specifics** — if three is right, make each item carry weight. "Fast, simple,
   and reliable" → "It answers in under 200ms, needs no config, and hasn't gone down in a year."
3. **Drop the list** — name the single proof. "It's fast, simple, and reliable" → "It answers
   in under 200ms."

---

## Bulleted-bold-title fixes

`**Speed:** The system responds instantly.` Three ways out:

- **Prose** — fold the points into sentences: "The system responds instantly and scales to a
  thousand users without tuning."
- **Plain bullets** — keep the list, drop the bold labels, lead with the content.
- **Table** — if the points are genuinely parallel data, a table beats fake-structured bullets.

---

## When the scan finds 3+ tells in one sentence

Don't patch word by word — the sentence is structurally generated. Rewrite it from the claim.

> "In today's fast-paced world, leveraging cutting-edge AI to streamline your workflow is more
> crucial than ever."

Strip it to what's actually being said — *AI tools save time* — then write that with a real
detail:

> "AI tools cut my Tuesday admin from four hours to one."

---

## When the rule kills the rhythm

The bans can over-correct into clipped, robotic prose — which is its own tell. Counter it:

- **Vary sentence length on purpose.** After two short sentences, let one run. Rhythm is human.
- **Add one concrete image or number.** Specificity is the strongest signal of a real writer.
  Not "our coffee is fresh" → "our coffee was on a tree in Ethiopia three weeks ago."
- **Keep a real aside or hesitation** if the author had one. "I think," "probably," "honestly"
  (used once, mid-thought) read as human. Don't sand them all away.

The target isn't *clean*. Clean and voiceless is what we're escaping. The target is *yours*.
