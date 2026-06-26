# Banned structures

Vocabulary is the easy tell. Structure is the harder, deeper one — the *shapes* a model
falls into regardless of the words. A draft can contain zero banned words and still read as
machine-made because of its rhythm and scaffolding. This file catalogs the shapes.

---

## 1. The reframe (negative parallelism)

**This is the signature AI tell, and the hardest to unlearn.** The model sets up something to
dismiss it, then pivots to the "real" answer. It feels insightful. It is filler.

The pattern is: *reject or minimize X → assert Y.* The word "not" is often there, but not always.

### Obvious forms

- "It's not X, it's Y."
- "This isn't about X. It's about Y."
- "Not just X, but Y."
- "Less X, more Y."
- "X isn't dead. It's evolving."
- "The question isn't X. It's Y."
- "You don't need X. You need Y."
- "It was never about X. It was always about Y."
- "Forget X. The real story is Y."

### Softer, sneakier forms — these slip through

- "While X may seem important, Y matters more."
- "On the surface, X. But underneath, Y."
- "Most people think X. The truth is Y."
- "Conventional wisdom says X. In reality, Y."
- "X gets all the attention, but Y is where it happens."
- "At first glance, X. Look closer, and Y."

### Catch it across sentence boundaries

The reframe is often split across two or three sentences so it doesn't *look* like the
template. Read for the logic, not the punctuation:

> Most teams think they have a hiring problem. They don't. They have a standards problem.

Collapse it to the claim that survives:

> The team's standards are unclear.

### Pivot words that signal a reframe

When these turn a sentence on its axis, you're probably in a reframe: *but, yet, actually,
really, instead, rather, ultimately, in reality, the truth is, what matters is, the real,
the deeper, the actual, the hidden, the overlooked.*

### The fix

Delete the rejected half. State the surviving claim directly. The setup added nothing.

### When contrast is allowed

Only for factual, numeric, legal, or date corrections — where the contrast carries real
information:

- "The file is 12 MB, not 12 GB."
- "The meeting is Tuesday, not Thursday."
- "She joined in 2019, not 2021."

These are corrections, not rhetoric. Keep them.

---

## 2. The rule of three

Models love triads. "Fast, simple, and reliable." "Speed, scale, and security." The triad
feels balanced and complete, which is exactly why it reads as generated — real emphasis is
uneven.

- Don't force every list to three items. Use two, or four, or one.
- Keep three only when each item does genuinely distinct work.
- Watch for *escalating* triads especially ("not just a tool, but a platform, a movement").

---

## 3. Analogy and metaphor control

Default: **no analogies.** Models reach for metaphor to manufacture depth. A literal sentence
is almost always clearer.

### The five-part permission test — all five must pass

1. The subject is genuinely unfamiliar or abstract.
2. The analogy makes it *easier* to understand, not just prettier.
3. It is shorter than explaining the thing literally.
4. It is exact enough that it won't mislead.
5. It sounds normal said aloud.

### Frequency caps

- 0 analogies in anything under 800 words.
- At most 1 for 800–1,500 words.
- At most 1 per 1,500 words after that.
- Never stack or extend a metaphor across paragraphs.

### Banned setups

"Think of it as," "Imagine," "Picture this," "It's like," "As if," "The X of Y," "works
like," "a bridge between," "a lens for," "the engine of," "the backbone of," "the DNA of."

### Banned metaphor families

Journey, battlefield/war, machine-for-people, ecosystem, north star, flywheel, iceberg,
chess, sports, puzzle, gardening, "signal and noise" (unless literal).

### Banned metaphor verbs for abstract work

*sanded down, bolted on, stitched together, woven, baked in, fueled, sparked, anchored,
distilled, unpacked, crystallized, surfaced, amplified, sculpted, cemented, bridged.*
Replace with literal verbs: *cut, added, joined, caused, explained, reduced, fixed, removed.*

---

## 4. Formatting tells

- **Bullet points with bolded lead-in titles** — the single most common formatting tell.
  `**Performance:** The system is fast.` Convert to prose, or to plain bullets without the
  bold label.
- **Title Case Headings** — use sentence case.
- **Bold for emphasis, sprinkled everywhere** — earn emphasis; 1–2 bolds per section, max.
- **Emoji as decoration** (🚀 💡 ✅), especially in headers — cut.
- **Curly "smart" quotes** when the rest is plain — a weak signal on its own; straighten them.
- **A forced summary paragraph** restating what was just said — cut it.

---

## 5. Em dashes and hyphens

Models overuse the em dash badly. In copy, **target zero em dashes** in the final draft.
Replacement order: period > comma > colon > parentheses > restructure.

This rule is **scoped to prose/copy**, with deliberate exceptions so we don't mangle correct
writing:

- Keep hyphens in standard acronyms and proper names (B2B, Coca-Cola, X-Files).
- Keep hyphens in genuine compound modifiers where removing them hurts clarity
  ("well-built," "high-frequency"). Don't blanket-ban them — that is its own kind of damage.
- Code, CLI flags (`--save-dev`), and YAML front matter are never touched.

The em-dash target is a hard, scannable constraint. The hyphen guidance is judgment.

---

## 6. Weak verbs (copula avoidance)

Models avoid plain "is/has," dressing it up in verbs that say less.

| Instead of | Use |
|---|---|
| serves as a / acts as a | is |
| stands as / marks a / represents a | is |
| boasts a / features a / offers a | has |
| plays a role in | affects, shapes |
| aims to / seeks to / strives to | (cut, or state what it does) |
| is designed to | (cut, or "will") |
| is positioned to | will |

---

## 7. Dead transitions

Furthermore, Moreover, Additionally, Subsequently, Accordingly, In addition, That said, That
being said, With that in mind, As previously mentioned, As noted above, On top of that, It is
also worth mentioning.

Most can be deleted outright. If a real logical link exists, use a plain one (so, but, and,
because) or just start the sentence.

---

## 8. Dead openings and filler phrases

- Throat-clearing openers: "In today's fast-paced world," "In the ever-evolving landscape of,"
  "In the age of," "Now more than ever," "First and foremost."
- Hedge-flags: "It is important to note that," "It is worth noting," "It goes without saying,"
  "Needless to say," "As you may already know."
- Signposting: "Let's dive in," "Let's explore," "Let's unpack," "Without further ado,"
  "In this article, I will."
- Conclusion boilerplate: "In conclusion," "In summary," "All in all," "At the end of the day,"
  "The bottom line is," "Ultimately."
- Filler swaps: "at this point in time" → "now," "in the event that" → "if," "a large number
  of" → "many," "in spite of the fact that" → "though."

---

## 9. Significance inflation

The model tells you something matters instead of showing it: "marking a pivotal moment,"
"setting the stage for," "with far-reaching implications," "a watershed moment," "ushering in
a new era." Cut the editorializing. Let the fact carry its own weight.

---

## 10. Vague attribution

"Experts say," "studies show," "it is widely believed," "observers note," "industry reports
suggest" — with no expert, study, observer, or report named. Either name the source or drop
the claim. (And never invent one — see the "ask before you invent" rule in the skill.)

---

## 11. Assistant / chatbot artifacts

Leftovers from the model's conversational mode that don't belong in finished copy:

- Sycophancy: "Great question!", "You're absolutely right!", "Certainly!", "I'd be happy to."
- Acknowledgment loops: "I hope this helps," "Let me know if you'd like," "Would you like me to."
- Knowledge-cutoff disclaimers: "As of my last update," "I don't have real-time access to."
- Hedge stacking: "could potentially possibly," "may perhaps in some cases."
- Unfilled placeholders: `[Your Name]`, `[Company]`, `2025-XX-XX`.
- Citation leakage: stray markup like `citeturn0search0`, `oai_citation`, or
  `utm_source=chatgpt.com` in URLs.

---

## 12. Even rhythm (the metronome)

Models write sentences of suspiciously uniform length. Human writing is bursty: a long winding
sentence, then a short one. Three words. Then back to a longer thought that develops an idea.
If every sentence in a paragraph is 15–20 words, break the pattern — split one, fuse two,
drop a fragment. This is the tell the detector measures statistically; you fix it by ear.
