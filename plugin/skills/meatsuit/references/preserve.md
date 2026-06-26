# Preserve — restraint and false positives

The most common failure of a humanizing tool is overcorrection: it strips every irregularity
until the text is clean, even, and — paradoxically — *more* machine-like. Sanding a draft to a
uniform finish is how you make it sound like AI. This file is the brake.

Read it before you flag anything aggressively.

---

## The cluster rule

**A single signal means nothing. Flag clusters.**

- One em dash is just punctuation.
- One "robust" is just a word.
- One short emphatic sentence is just emphasis.
- Perfect grammar is not a tell — plenty of humans write cleanly.
- Formal vocabulary is not a tell — plenty of writing is formal.

A tell is a *pile-up*: em dashes **and** a rule-of-three **and** "vibrant tapestry" **and** a
"Conclusion" header. One signal is noise. Several co-occurring is a confession. When you find
exactly one flag in a paragraph, lean toward leaving it alone.

---

## What NOT to flag

- Correct, formal, or technical vocabulary used once and accurately.
- A single em dash, a single semicolon, a single instance of any Tier-2/3 word.
- Domain terms that are simply the right word: a security paper's "robust," a biology paper's
  "intricate," a startup's literal "ecosystem" of integrations.
- One emphatic fragment for effect. ("It worked.")
- "Honestly," "look," "I think" used once, mid-thought.
- Mixed registers — a casual aside inside formal prose is a human move, not an error.
- Clean formatting on its own.

---

## Human signals to actively preserve

When you see these, protect them. They are expensive to fake and they are what makes writing
read as a person:

- **Hard-to-fabricate specific detail.** A real number, a real name, a real date, a real
  street. "The 7:14 from Reading" is human. "An early morning train" is generated.
- **Mixed or unresolved feeling.** Humans hold two minds. Models resolve everything to a tidy
  conclusion. Keep the ambivalence.
- **Defensible first-person choices.** "I cut the intro because it bored me" — keep it.
- **Sentence-length variety.** The bursty rhythm is a feature. Don't smooth it.
- **Genuine self-correction or aside.** "—or it felt that way at the time." Keep it.
- **Idiosyncratic word choice.** A weird-but-right word the author clearly chose on purpose.
- **Opinions with a stake.** A real preference, especially one that breaks from consensus.

---

## The anti-overfitting guard

Before applying a rule, ask: **does this make the sentence better, or just more rule-compliant?**
If the rule makes it worse, break the rule. The priority order is always:

1. Accurate
2. Clear
3. Specific
4. Sounds human
5. Stylistically "clean"

Style is last. A vivid, slightly-irregular sentence beats a sanitized one every time.

Two specific overfitting traps:

- **Don't write to beat detectors.** AI-writing detectors are unreliable — they flag clean
  human prose, especially from non-native speakers and in technical genres. Chasing a detector
  score pushes you toward worse sentences. We remove tells because they read badly, not to game
  a classifier.
- **Don't strip all structure.** Some lists are correct. Some sentences should be parallel.
  Removing every pattern leaves choppy rubble. The goal is natural, not damaged.

---

## When the draft is already clean

Say so. Don't manufacture changes to look busy. "This reads like a person wrote it — two small
things I'd consider, otherwise leave it" is a complete and honest answer. Over-editing good
writing is a failure, not a service.
