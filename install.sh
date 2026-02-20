#!/usr/bin/env bash
# install.sh — one-command installer for the VibeBlock plugin
#
# Usage: ./install.sh [--scope user|project|local]
#
# This script:
#   1. Builds the TypeScript project (npm run build)
#   2. Makes hook scripts executable
#   3. Installs the Claude Code plugin via `claude plugin install`

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCOPE="${1:-user}"
if [[ "$SCOPE" == "--scope" ]]; then SCOPE="${2:-user}"; fi

echo "� Installing VibeBlock..."
echo ""

# ── Build ────────────────────────────────────────────────────────────────────
echo "📦 Building TypeScript..."
cd "$SCRIPT_DIR"
npm run build
echo "   ✓ Build complete"

# ── Make scripts executable ───────────────────────────────────────────────────
chmod +x "$SCRIPT_DIR/bin/on-prompt.sh"
chmod +x "$SCRIPT_DIR/bin/on-stop.sh"
echo "   ✓ Hook scripts marked executable"

# ── Check for jq (required by hooks) ─────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo ""
  echo "⚠️  jq is required but not found."
  echo "   Install it:"
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "     brew install jq"
  else
    echo "     sudo apt install jq  (or your distro's equivalent)"
  fi
  echo ""
fi

# ── Register hooks in ~/.claude/settings.json ────────────────────────────────
SETTINGS_FILE="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"

# Create settings file if it doesn't exist
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

echo ""
echo "🔌 Registering hooks in $SETTINGS_FILE..."

PROMPT_HOOK="${SCRIPT_DIR}/bin/on-prompt.sh"
STOP_HOOK="${SCRIPT_DIR}/bin/on-stop.sh"

# Use jq to merge hooks into settings (preserves all existing settings)
UPDATED=$(jq \
  --arg prompt "$PROMPT_HOOK" \
  --arg stop "$STOP_HOOK" \
  '
  .hooks.UserPromptSubmit = (
    (.hooks.UserPromptSubmit // []) |
    map(select(
      (.hooks[0].command | test("vibeblock")) | not
    )) +
    [{"hooks": [{"type": "command", "command": $prompt, "statusMessage": "🎮 VibeBlock: setting up..."}]}]
  ) |
  .hooks.Stop = (
    (.hooks.Stop // []) |
    map(select(
      (.hooks[0].command | test("vibeblock")) | not
    )) +
    [{"hooks": [{"type": "command", "command": $stop, "async": true}]}]
  )
  ' "$SETTINGS_FILE")

echo "$UPDATED" > "$SETTINGS_FILE"
echo "   ✓ Hooks registered"

echo ""
echo "✅ VibeBlock is ready!"
echo ""
echo "   Start Claude Code and ask any question — it will offer to play."
echo "   For tmux: run Claude Code inside a tmux session for a split-pane game window."
echo ""
echo "   To uninstall, run: ./uninstall.sh"
