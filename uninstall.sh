#!/usr/bin/env bash
# uninstall.sh — removes VibeBlock hooks from ~/.claude/settings.json

set -euo pipefail

SETTINGS_FILE="$HOME/.claude/settings.json"

if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "No settings file found. Nothing to do."
  exit 0
fi

echo "Removing VibeBlock hooks from $SETTINGS_FILE..."

UPDATED=$(jq '
  .hooks.UserPromptSubmit = (
    (.hooks.UserPromptSubmit // []) |
    map(select(
      (.hooks[0].command | test("vibeblock")) | not
    ))
  ) |
  .hooks.Stop = (
    (.hooks.Stop // []) |
    map(select(
      (.hooks[0].command | test("vibeblock")) | not
    ))
  )
' "$SETTINGS_FILE")

echo "$UPDATED" > "$SETTINGS_FILE"
echo "Done. VibeBlock hooks removed."
