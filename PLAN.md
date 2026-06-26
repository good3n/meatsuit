# meatsuit — Build Plan

> Make AI-generated text read like it came from a person. A downloadable resource
> (Claude skill + plugin + standalone detector) that strips the statistical fingerprints
> of LLM writing while preserving meaning, register, and the author's voice.

The name: text that sounds like it came out of a human *meatsuit*, not a model.

---

## 1. Goal & positioning

**What it is:** an *editor*, not a generator. The user already has text (AI-drafted or AI-smelling).
meatsuit diagnoses the machine tells, rewrites them out, and teaches the user what it changed —
without inventing facts and without flattening the author's voice into clipped, over-corrected prose.

**Theory of the problem.** LLMs optimize for the most statistically likely continuation, so their
output converges on a recognizable default voice: inflated vocabulary, balanced "on one hand / on the
other" structures, reframe constructions, metronomic sentence cadence, and promotional gloss. Each tic
is individually fine; collectively they read as "machine." The cure is a disciplined list of
fingerprints plus the *additive* half most tools skip — real specifics, a real opinion, real rhythm.

**Honest framing (load-bearing).** These are *signals, not proof*. AI-writing detectors are
unreliable (high false-positive rates on non-native English, technical genres, and deadline prose;
accuracy collapses under paraphrase). meatsuit is a **writing-quality tool**, not a verdict machine.
We do not chase detector evasion as a goal — doing so pushes prose toward worse sentences.

**Non-goals:** does not generate from scratch, does not fact-check logic or truth, does not censor
legitimate technical vocabulary, does not guarantee any detector outcome.

---

## 2. What we take from the prior art (the best of each, recombined)

- **Progressive-disclosure architecture** — a thin always-loaded router that defers heavy lookup
  tables to `references/` files loaded only at the workflow step that needs them. Keeps per-invocation
  context small.
- **A real detector engine** — a deterministic, zero-dependency, testable scanner (Node + browser)
  that does the regex- and stylometry-detectable subset mechanically, so the model isn't the only
  line of defense and so the tool is usable as a library/CI check.
- **Maximum content depth** — exhaustive banned-vocabulary, banned phrase-shapes, the
  negative-parallelism/reframe ban, analogy/metaphor control with frequency caps, specificity rules.
- **Restraint & false-positive discipline** — cluster-based detection (never flag on a single signal),
  an explicit "what NOT to flag" list, a "human signals to preserve" list, and an anti-overfitting
  guard so the cure never becomes its own tell.
- **Honesty primitives** — an "ask before you invent" anti-fabrication protocol and a rule-priority
  hierarchy (accurate > clear > specific > human > style).
- **Era-organized, community-maintainable lists** — tells drift as models change, so vocabulary is
  grouped by era with an evidence-gated contribution process.
- **Teaching output + self-audit loop** — a structured four-block result (diagnosis / rewrite /
  changes / notes) and a draft → "what still reads as AI?" → final-rewrite pass.
- **Multi-format delivery from one source of truth**, kept in sync by CI.

We design these as one coherent product rather than four bolted-together features.

---

## 3. Architecture

```
meatsuit/
├── SKILL.md                      # thin router: philosophy, workflow, output format, when-to-load refs
├── references/
│   ├── banned-vocabulary.md      # era-grouped word lists + 3-tier severity rules
│   ├── banned-structures.md      # reframe ban, rule-of-three, formatting, transitions, weak verbs
│   ├── rewrites.md               # prescriptive fix tables + "when the rule kills the rhythm"
│   ├── examples.md               # 40+ before/after calibration pairs across formats (+ edge cases)
│   └── preserve.md               # human signals to keep + false-positive guards + anti-overfitting
├── detector/
│   ├── meatsuit.js               # zero-dependency engine (Node ≥18 + browser global)
│   ├── meatsuit.test.js          # behavior + regression tests (no test framework dep)
│   ├── categories.test.js        # anti-drift contract: every detector type ↔ CATEGORIES.md
│   └── CATEGORIES.md             # the contract mapping detector types ↔ skill rules
├── plugin/                       # Claude Code / Cowork plugin manifest + bundled skill copy
│   └── .claude-plugin/plugin.json
├── .claude-plugin/marketplace.json
├── dist/meatsuit.skill           # packaged bundle (built, not hand-edited)
├── scripts/
│   ├── build-skill.sh            # zip references into dist/*.skill
│   ├── sync-plugin.sh            # copy canonical skill into plugin/, assert version match
│   └── check-counts.sh           # guard advertised counts against source
├── llms.txt                      # machine-readable repo summary for LLM discovery
├── README.md  CONTRIBUTING.md  CHANGELOG.md  LICENSE
└── .github/                      # issue templates (new word / new example / bug), PR template, CI
```

**Single source of truth + CI sync.** The canonical skill lives at the root; the plugin copy and
`dist/*.skill` are generated. CI fails on (a) plugin/skill byte-drift, (b) version mismatch across
manifests, (c) advertised-count drift, (d) detector type ↔ CATEGORIES mismatch, (e) detector test
failures, and (f) **dogfooding**: our own `references/` and docs must pass the detector.

---

## 4. The skill (`SKILL.md` — the thin router)

Always-loaded, deliberately short. Contains:

1. **Frontmatter** — `name`, `version`, `license`, and a rich `description` packed with trigger
   phrases ("humanize this," "make it sound human," "this reads like ChatGPT," "remove the AI tells,"
   "de-AI this," "rewrite this robotic copy," "write in my voice") plus a one-line capability summary.
   The description is what the agent matches on, so it earns its length.
2. **Rule-priority hierarchy** — accurate > clear > specific > sound human > style. "If a rule makes
   the sentence worse, break it." Resolves every downstream conflict.
3. **Ask before you invent** — never fabricate stats, quotes, study results, client stories, prices,
   dates, or first-person experience. When a fact is missing: (a) ask the user, (b) write around it
   honestly, or (c) leave a marked placeholder (`TK` / `[need: real figure]`). Pre-ask for the inputs
   only the user has: a real example, their numbers, their genuine opinion, the specific reader.
4. **Five-step workflow** — (1) read for voice & register; (2) scan against
   `references/banned-vocabulary.md` + `banned-structures.md`; (3) build the rewrite using
   `references/rewrites.md`, naming which reference to load at each step; (4) self-audit: re-read the
   draft and ask "what here still reads as obviously AI?", fix what survived; (5) verify hard
   constraints (see §7) and that the output covers everything the input covered (N paragraphs in → N
   paragraphs out).
5. **Modes** — *Humanize* (edit an existing draft; name the tell, fix it, don't praise the draft) and
   *Calibrate* (user supplies a writing sample; match their rhythm, vocabulary, punctuation habits,
   dialect over our defaults — our rules are a floor, not a replacement for a real voice).
6. **Context profiles** — general / technical / marketing / personal, each with a tolerance matrix
   (e.g. technical mode keeps `robust`, `ecosystem`, `framework`, allows title-case headers; still
   flags `delve`, `tapestry`). Auto-detect with cues; let the user override.
7. **Output format (four blocks)** — **Diagnosis** (the tells found, by cluster), **Rewrite** (the
   text), **Changes** (what moved and why), **Notes** (judgment calls, anything left as a placeholder).
   This teaches the user the patterns over time.
8. **Pushback & edge cases** — what to do when the user disagrees, when a "banned" word is correct in
   context, when the draft is already clean.

---

## 5. The reference files (loaded on demand)

- **`banned-vocabulary.md`** — words grouped by **era** (the tells that defined 2023, 2024, 2025,
  and current), each entry tagged with a **severity tier**:
  - *Tier 1* — always flag (e.g. delve, tapestry, testament to, leverage, seamless, pivotal,
    underscore, realm, vibrant, "due to the fact that," "in order to").
  - *Tier 2* — flag only when 2+ appear in the same paragraph (foster, elevate, ecosystem, myriad,
    cornerstone, harness).
  - *Tier 3* — flag by density (≥ ~3% of words): significant, innovative, compelling, world-class.
  - Each Tier-1 entry ships its natural replacement(s). A master alphabetical scan list at the end.
- **`banned-structures.md`** —
  - **The reframe / negative-parallelism ban** (our signature rule, treated in depth): any construction
    that dismisses X then asserts Y — "This isn't X, it's Y," "Not just X but Y," "Less X, more Y,"
    "The real question is…," and the *softer* variants ("While X may seem…," "On the surface…," "Most
    people think…"). Catch it **across sentence boundaries**, not just within one sentence. Banned
    pivot words when they perform a reframe (but, actually, really, instead, ultimately, "the
    truth is"). Allowed only for factual/numeric/legal corrections ("The file is 12 MB, not 12 GB").
  - **Rule of three** — don't force every claim into a triad; vary the count.
  - **Analogy/metaphor control** — default none; a 5-part permission test; frequency caps by length
    (0 under 800 words, 1 per 1,500 thereafter); banned setups ("Think of it as," "It's like") and
    banned metaphor families (journey, battlefield, flywheel, north-star, iceberg).
  - **Formatting** — bullet-points-with-bolded-titles (the #1 formatting tell) → prose; sentence-case
    headers; earn emphasis; emoji discipline; straight quotes.
  - **Transitions & weak verbs** — Furthermore/Moreover/Additionally; "serves as / boasts / aims to /
    plays a role in" → is / has / uses.
  - **Significance inflation, vague attribution, chatbot artifacts, cutoff disclaimers,
    sycophancy, hedge-stacking, signposting.**
- **`rewrites.md`** — prescriptive fix tables (word substitutions, em-dash fixes *by position*,
  rule-of-three fixes, bulleted-bold-title fixes), a from-scratch sentence-rewrite method (trigger: 3+
  tells in one sentence), and a **"when the rule kills the rhythm"** section (vary sentence length, add
  one concrete image) so fixes don't produce stilted prose.
- **`examples.md`** — 40+ before/after pairs across tweets, email, LinkedIn, blog intros, marketing
  copy, bios, internal comms, docs. Deliberately includes **edge cases**: a legitimately technical
  term kept while a buzzword is stripped; a formal/legal register preserved; quoted AI text left
  verbatim while the surrounding critique is sharpened.
- **`preserve.md`** — **human signals to keep** (hard-to-fabricate specific detail, mixed/unresolved
  feelings, defensible first-person choices, sentence-length variety, genuine asides), the
  **"what NOT to flag"** false-positive list (perfect grammar alone, formal vocabulary alone, a single
  em dash, one emphatic short sentence), the **cluster rule** (a single signal means nothing; flag on
  co-occurring clusters), and the **anti-overfitting guard** (over-sanding every irregularity makes
  text *more* machine-like — disfluency is a feature).

---

## 6. The detector (`detector/meatsuit.js`) — our differentiator

A deterministic, zero-dependency engine usable three ways: as a Node library, a browser global, and a
CI lint. It does the mechanically-detectable subset; the skill covers the judgment-heavy rules. Both
map to one shared category list (`CATEGORIES.md`) enforced by a test.

- **Normalization pre-pass** — strip zero-width characters, map Cyrillic/Greek look-alikes back to
  Latin, and detect role-play markers. Bypass tricks are treated as *corroborating* evidence, not an
  escape hatch.
- **Three-tier vocabulary scan** — always / paragraph-cluster / density, mirroring the skill exactly.
- **Structural detectors** — reframe constructions, rule-of-three, bullet-bold-title lists, transition
  stacks, em-dash density, title-case headers, hedge stacks.
- **Stylometry** — sentence-length burstiness (variance across paragraphs), function-word trigram
  entropy, punctuation-distribution variance, type-token ratio. These catch the *rhythm* tells that
  vocabulary lists can't.
- **Scoring** — dedup by (type, text), non-flat per-category weights, length-normalized so long texts
  don't accumulate unbounded. Output a banded label (Clean → Heavy) plus per-issue `{type, text,
  severity, suggestion, span}`. **Severity tiers P0–P3.**
- **False-positive guards** — ignore CLI flags and YAML `---` for em-dashes, code fences for
  bullet lists, URL fragments for hashtags; strip Markdown blockquotes so quoting AI text doesn't
  penalize the human wrapper; context modes suppress genre-appropriate patterns.
- **Honesty in the API** — bias toward false negatives, surface "signals not proof," and **do not**
  ship calibrated AI-probability numbers we can't back with a labeled corpus (mark them heuristic).
- **Tests** — AI-heavy text must score high, clean human prose must stay low, repeated phrases must not
  multiply the score, a real technical post must not classify as AI (regression guard), homoglyph
  restoration works, blockquotes are excluded.

---

## 7. Hard constraints (verifiable, run in step 5)

- **Em dashes:** target zero in the final rewrite (period > comma > colon > parentheses > restructure).
  Treated as a strict, scannable constraint — but **scoped to copy**, with documented exceptions
  (acronyms, proper names, code) so we don't mutilate correct compound modifiers the way a blanket ban
  does. This is a deliberate softening of the prior art's total hyphen ban.
- **No fabricated facts** — every number, name, quote, and date in the output must trace to the input
  or a user-supplied source; otherwise it's a marked placeholder.
- **Coverage parity** — the rewrite covers everything the input covered.
- **Straight quotes**, sentence-case headers, no leftover chatbot artifacts or cutoff disclaimers.

---

## 8. Delivery & packaging

- **Claude skill** (manual install into `~/.claude/skills/meatsuit/`).
- **Claude Code / Cowork plugin** via a single-plugin marketplace (`/plugin marketplace add …` →
  `/plugin install meatsuit`) + a built `dist/meatsuit.skill` bundle for drag-and-drop.
- **Standalone detector** — `require()` in Node, `<script>` in browser, or `npx meatsuit <file>` CLI.
- **`llms.txt`** — machine-readable summary (purpose, file paths, install, triggers, output format,
  license) for LLM discovery.
- **Cursor rule** (optional, later) — a `.mdc` port, but only if we can wire it into the CI sync;
  unsynced ports rot.

---

## 9. Maintainability — beating the blacklist treadmill

The core risk of every tool in this space: vocabulary tells drift as models change, and a static list
goes stale. Mitigations:

- **Era-grouped lists** make staleness visible and additive.
- **Evidence-gated contributions** — a new banned word needs 3+ public examples from 2+ models and
  must name its era. Merely-overused words are rejected; we target *AI fingerprints*, not bad writing
  in general. **Add, don't replace** — never weaken existing coverage.
- **Issue templates** (new word / new example / bug) + PR template funnel contributions.
- **Dogfooding in CI** — our own reference files and docs must pass the detector.
- **The CATEGORIES contract** keeps the detector and the skill from diverging.
- **Multi-language as a growth axis** — English first, then a per-language section (Spanish, then
  others) following the same evidence bar, never at the cost of English coverage.

---

## 10. Decisions

**Settled:**
- **Platforms** — Claude *and* Codex. Ship the rule content once and provide two thin entry-point
  adapters: `SKILL.md` (Claude Code, `~/.claude/skills/meatsuit/`) and `AGENTS.md` (Codex, repo-root
  standing instructions), both pointing at the same `references/`. The detector CLI works in any agent
  that can run a shell command, so it's the universal fallback.
- **License** — **MIT** (field standard; anyone can use, copy, modify, sell; must retain the notice).
- **Languages** — **English only** for the foreseeable future.
- **Repo** — **public** (`github.com/good3n/meatsuit`), so invest in README, CONTRIBUTING, issue/PR
  templates, and `llms.txt`.

**Still open:**
- **Detector scope for v1** — skill-first (add detector in v1.1), everything in v1, or skill + a
  lightweight word/structure-only CLI. *Pending your call.*

---

## 11. Suggested build order

1. **Content first** — `references/banned-vocabulary.md`, `banned-structures.md`, `rewrites.md`,
   `preserve.md`, and `examples.md`. This is the substance; everything else wraps it.
2. **`SKILL.md` router** — workflow, modes, output format, constraints, wiring to the references.
3. **Detector** — `meatsuit.js` + tests + `CATEGORIES.md`, mapped 1:1 to the skill rules.
4. **Packaging** — plugin manifest, marketplace, build/sync scripts, `dist/*.skill`, `llms.txt`.
5. **Repo hygiene** — README, CONTRIBUTING (evidence bar + dogfooding), CHANGELOG, issue/PR templates,
   CI (sync + count + detector + dogfood checks).
6. **Validation** — run meatsuit on a corpus of known-AI and known-human samples; tune tiers and
   thresholds; confirm clean human prose stays clean.
