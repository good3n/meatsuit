#!/usr/bin/env bash
# Copy the canonical skill (SKILL.md + references/) into the plugin tree, and assert the
# plugin manifest version matches the SKILL.md frontmatter version. The root is the single
# source of truth; the plugin copy is generated. CI runs this and fails on drift.
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="plugin/skills/meatsuit"
mkdir -p "$DEST/references"

cp SKILL.md "$DEST/SKILL.md"
rm -rf "$DEST/references"
cp -R references "$DEST/references"

# version check
skill_version=$(grep -m1 '^version:' SKILL.md | sed 's/version:[[:space:]]*//' | tr -d '[:space:]')
plugin_version=$(grep -m1 '"version"' plugin/.claude-plugin/plugin.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ "$skill_version" != "$plugin_version" ]; then
  echo "version mismatch: SKILL.md=$skill_version plugin.json=$plugin_version" >&2
  exit 1
fi

echo "plugin synced (v$skill_version)"
