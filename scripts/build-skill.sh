#!/usr/bin/env bash
# Build the installable .skill bundle (a zip of SKILL.md + references/) for drag-and-drop
# install into Claude.ai / Cowork. Output: dist/meatsuit.skill
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p dist
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/meatsuit/references"
cp SKILL.md "$STAGE/meatsuit/SKILL.md"
cp references/*.md "$STAGE/meatsuit/references/"

rm -f dist/meatsuit.skill
( cd "$STAGE" && zip -q -r -X meatsuit.zip meatsuit )
mv "$STAGE/meatsuit.zip" dist/meatsuit.skill

echo "built dist/meatsuit.skill"
