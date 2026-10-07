# Detector corpus

Whole pieces of writing with a known origin. `corpus.test.js` scans each one and fails the build
if model output scores too low or human writing scores too high. Unit tests show that a rule
fires on the sentence it was written for. The corpus shows the overall score still separates
the two.

- `ai/` holds model output pasted without edits.
- `human/` holds writing published before 2022, from sources we can redistribute.

Every file needs an entry in `manifest.json` with its source and the band it must stay in
(`atLeast` for model output, `atMost` for human writing).

## Adding a sample

Model output: paste the raw response with no edits. Record the model, the month, and the
prompt in `source`. Samples from more than one model and more than one topic are what make the
thresholds trustworthy, so a new topic or model is worth more than another grief article.

Human writing: it must predate 2022 and be public domain or openly licensed for this repo. US
government pages (NIH, CDC, NPS, NASA) work well. Record the URL and the license in `source`.
Copy the article body only, without navigation, related links, or reference lists.

When a detector change moves a sample across its band, fix the rule rather than the
expectation. Loosen an expectation only with a note in the PR saying why.
