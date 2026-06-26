# Banned vocabulary

The words large language models reach for far more often than people do. Each entry
is the *tell* — the giveaway — not necessarily a bad word. "Robust" is fine once. Five
buzzwords in a paragraph is a confession.

Vocabulary is organized two ways at once:

- **By era** — which generation of models made the word a tell. Tells drift. A word that
  screamed "AI" in 2023 may have faded; new ones appear. Grouping by era keeps the list
  honest about *why* a word is here and makes it easy to retire stale entries.
- **By severity tier** — how aggressively to flag it. This is what the detector enforces.

## How the tiers work

- **Tier 1 — always flag.** One occurrence is enough. These words are rare in natural human
  writing and overwhelmingly common in model output. Each ships a replacement.
- **Tier 2 — flag on clustering.** Individually defensible. Flag only when **2 or more** Tier-2
  words appear in the same paragraph. A single "foster" is fine; "foster," "elevate," and
  "ecosystem" together is a pattern.
- **Tier 3 — flag on density.** Common English words that models overuse to the point of
  saturation. Flag only when they exceed roughly **3% of the words** in the text (minimum 3
  occurrences). Don't punish a writer for using "significant" once.

When you replace a word, never swap one banned word for another. Prefer the shorter, plainer,
Saxon-root word. If the sentence reads fine with the word simply deleted, delete it.

---

## Tier 1 — always flag

| Word / phrase | Replace with |
|---|---|
| delve / delve into | look at, dig into, examine, get into |
| tapestry | mix, range, web (or cut) |
| testament to | shows, proves |
| underscore / underscores | shows, highlights, stresses |
| pivotal | key, important, central |
| realm | area, field, world |
| leverage (verb) | use, draw on, build on |
| seamless / seamlessly | smooth, clean (or cut) |
| robust | strong, solid, reliable |
| beacon | (cut, or rewrite literally) |
| nestled | sits, is (e.g. "is in") |
| vibrant | lively, busy (or cut) |
| bustling | busy, crowded |
| meticulous / meticulously | careful, carefully, exact |
| intricate / intricacies | detailed, complex, the details |
| game-changer | (name the actual change) |
| cutting-edge | new, latest, advanced |
| unlock / unlock the potential | open, reach, get to, free up |
| unleash | release, let loose, start |
| harness (verb) | use, tap, put to work |
| utilize | use |
| commence | start, begin |
| myriad | many, countless |
| paradigm | model, approach, pattern |
| embark | start, begin, set out |
| ever-evolving / ever-changing | changing, shifting |
| transformative | (name what it changes) |
| groundbreaking | new, first |
| revolutionize / revolutionary | change, remake (or name it) |
| synergy / synergize | (cut, or name the real overlap) |
| holistic | whole, complete, full |
| supercharge | speed up, boost (or cut) |
| in order to | to |
| due to the fact that | because |
| serves as / acts as | is |
| boasts (a) | has |
| pave the way for | lead to, set up, open the door to |
| at its core | basically, fundamentally (or cut) |
| navigate / navigating (abstract) | handle, deal with, work through |

## Tier 2 — flag on clustering (2+ in a paragraph)

foster, elevate, ecosystem, cornerstone, landscape (figurative), interplay, enduring,
streamline, empower, optimize, scalable, frictionless, effortless, captivate, showcase,
spearhead, multifaceted, noteworthy, paramount, commendable, comprehensive, dynamic,
intuitive, immersive, turnkey, visionary, disruptive, data-driven, mission-critical,
proactive, actionable, impactful, thriving, garner, embrace, endeavor, ascertain,
facilitate, bolster, encompass, underpin, augment, fortify

## Tier 3 — flag on density (>~3% of words, min 3)

significant, innovative / innovation, compelling, unprecedented, world-class, key (as
adjective), valuable, essential, crucial, vital, powerful, seamlessly, effective,
efficient, advanced, premium, enhanced, dynamic, strategic, robust

---

## Master alphabetical scan list

For a fast single pass, here is every flagged word, alphabetized. Tier in parentheses.

actionable (2), advanced (3), ascertain (2), at its core (1), augment (2), beacon (1),
bolster (2), boasts (1), bustling (1), captivate (2), commence (1), commendable (2),
compelling (3), comprehensive (2), cornerstone (2), crucial (3), cutting-edge (1),
data-driven (2), delve (1), disruptive (2), due to the fact that (1), dynamic (2/3),
ecosystem (2), effective (3), efficient (3), effortless (2), elevate (2), embark (1),
embrace (2), empower (2), encompass (2), endeavor (2), enduring (2), enhanced (3),
essential (3), ever-evolving (1), facilitate (2), foster (2), fortify (2),
frictionless (2), game-changer (1), garner (2), groundbreaking (1), harness (1),
holistic (1), immersive (2), impactful (2), in order to (1), innovative (3),
interplay (2), intricate (1), intuitive (2), key (3), landscape (2), leverage (1),
meticulous (1), mission-critical (2), multifaceted (2), myriad (1), navigate (1),
nestled (1), noteworthy (2), optimize (2), paradigm (1), paramount (2),
pave the way for (1), pivotal (1), powerful (3), premium (3), proactive (2),
realm (1), revolutionize (1), robust (1), scalable (2), seamless (1), serves as (1),
showcase (2), significant (3), spearhead (2), strategic (3), streamline (2),
supercharge (1), synergy (2), tapestry (1), testament to (1), thriving (2),
transformative (1), turnkey (2), underpin (2), underscore (1), unleash (1),
unlock (1), unprecedented (3), utilize (1), valuable (3), vibrant (1), visionary (2),
vital (3), world-class (3)

---

## What this list is not

It is not a list of bad words. Every word here is correct in some sentence. A nuclear
engineer's "robust containment vessel" is the right phrase. A biology paper's "intricate
folding" is accurate. The tier system exists precisely so that legitimate single uses pass
and only the machine *pattern* — the same words, piled up, across every topic — gets flagged.
See [preserve.md](preserve.md) for the discipline that keeps this from becoming find-and-replace.
