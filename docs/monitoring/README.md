# Source monitoring

meatsuit tracks a handful of external references on AI-writing patterns. A weekly routine checks
each one for changes, and when something appears that meatsuit doesn't already cover, it opens an
issue labeled [`source-monitoring`](https://github.com/good3n/meatsuit/issues?q=label%3Asource-monitoring)
with a specific, sourced proposal. The routine only files issues — it never edits the skill,
detector, or reference content. A human decides what to act on.

`sources.json` is the routine's state: the last-seen commit, release, or revision for each source.
The routine compares current values against it, reports what's new, then overwrites it. It's
machine-maintained — no need to edit it by hand unless you want to reset the baseline.

The references it watches are monitored for change detection only. meatsuit credits no external
project in its shipped content.
