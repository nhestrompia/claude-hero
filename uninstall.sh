#!/usr/bin/env bash
# uninstall.sh — removes Claude Hero hooks from ~/.claude/settings.json

set -euo pipefail

SETTINGS_FILE="$HOME/.claude/settings.json"

if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "No settings file found. Nothing to do."
  exit 0
fi

echo "Removing Claude Hero hooks from $SETTINGS_FILE..."

UPDATED=$(jq '
  .hooks.UserPromptSubmit = (
    (.hooks.UserPromptSubmit // []) |
    map(select(
      (.hooks[0].command | test("claude-hero")) | not
    ))
  ) |
  .hooks.Stop = (
    (.hooks.Stop // []) |
    map(select(
      (.hooks[0].command | test("claude-hero")) | not
    ))
  )
' "$SETTINGS_FILE")

echo "$UPDATED" > "$SETTINGS_FILE"
echo "Done. Claude Hero hooks removed."
