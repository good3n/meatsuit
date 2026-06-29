#!/usr/bin/env bash
# Full CI gate: tests, plugin sync (no drift), and dogfooding. Run before every commit.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> detector tests"
node detector/meatsuit.test.js

echo "==> category contract"
node detector/categories.test.js

echo "==> plugin sync (must be committed in sync)"
bash scripts/sync-plugin.sh
if ! git diff --quiet -- plugin 2>/dev/null; then
  echo "plugin/ is out of sync with the source — run 'npm run sync' and commit" >&2
  exit 1
fi

echo "==> dogfood: our own procedural prose must pass the detector"
# Honest limitation: any file that *teaches* the tells must quote them, so it will score high
# no matter how well written. We can't dogfood those without the detector misreading the
# examples as slop. So the hard gate runs only on procedural docs that don't catalog tells.
# Everything else gets an informational score (never blocks).
GATED="AGENTS.md CONTRIBUTING.md"
INFO="SKILL.md README.md llms.txt CHANGELOG.md detector/README.md references/banned-structures.md references/rewrites.md references/preserve.md"

# Extract the score label from the detector's JSON. Capture the full output, then match in pure
# bash with no pipe — piping node into a truncating filter (grep -m1 / head) gives the producer a
# SIGPIPE that, under `pipefail`, aborts the whole script even on the informational files.
label_of() {
  local out
  out=$(node detector/meatsuit.js "$1" --json)
  [[ $out =~ \"label\"[^\"]*\"([^\"]*)\" ]] && printf '%s' "${BASH_REMATCH[1]}"
}

fail=0
for f in $GATED; do
  label=$(label_of "$f")
  if [ "$label" = "Heavy" ] || [ "$label" = "Moderate" ]; then
    echo "  gate FAIL: $f scored $label (procedural prose should read clean)" >&2
    fail=1
  else
    echo "  ok: $f ($label)"
  fi
done
for f in $INFO; do
  label=$(label_of "$f")
  echo "  info: $f ($label — quotes tells, not gated)"
done
[ "$fail" -eq 0 ] || exit 1

echo "all checks passed"
