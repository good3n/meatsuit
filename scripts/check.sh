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

echo "==> release notes: no em dashes in the current changelog entry"
# The dogfood pass can only score CHANGELOG.md informationally, because entries quote the very
# tells they describe. Em dashes are the exception: they are never a quoted example here, and
# shipping them in release notes for the tool that removes them is the worst possible look. So
# this is a hard gate, scoped to the entry for the version being released. Older entries
# predate the rule and use an em dash in their own headings, which is why the scope is narrow.
VERSION=$(node -p "require('./package.json').version")
ENTRY=$(awk -v v="## [$VERSION]" 'index($0,v)==1{f=1;next} f&&/^## \[/{exit} f' CHANGELOG.md)
if [ -z "$ENTRY" ]; then
  echo "  gate FAIL: no CHANGELOG.md entry for $VERSION" >&2
  exit 1
fi
if printf '%s' "$ENTRY" | grep -q '—'; then
  echo "  gate FAIL: em dash in the $VERSION changelog entry (use a period, comma, colon, or parentheses)" >&2
  printf '%s' "$ENTRY" | grep -n '—' >&2
  exit 1
fi
echo "  ok: $VERSION entry is clean"

echo "all checks passed"
