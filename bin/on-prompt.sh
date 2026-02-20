#!/usr/bin/env bash
# on-prompt.sh — UserPromptSubmit hook for VibeBlock
#
# Fires when the user submits a prompt to Claude Code.
# On macOS: shows a native dialog via osascript (works regardless of TTY state).
# On Linux: auto-launches if VIBEBLOCK_AUTO=1, otherwise skips.
#
# Receives JSON on stdin:
#   { "session_id": "...", "prompt": "...", "cwd": "...", ... }

set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
STATUS_FILE="/tmp/vibeblock-${SESSION_ID}.json"

# Don't re-launch if a game is already running for this session
if [[ -f "$STATUS_FILE" ]]; then
  STATUS=$(jq -r '.status // "done"' "$STATUS_FILE" 2>/dev/null || echo "done")
  if [[ "$STATUS" == "running" ]]; then
    exit 0
  fi
fi

# ── Ask the user ──────────────────────────────────────────────────────────────
ANSWER="n"

if [[ "$(uname)" == "Darwin" ]]; then
  # macOS: native dialog via osascript — works even when Claude Code owns the TTY.
  # On gave up / cancel / Skip: osascript exits non-zero → ANSWER stays "n".
  # On Play!: osascript prints "Play!" and exits 0.
  BTN=$(osascript \
    -e 'set d to display dialog "Claude is thinking...\n\nPlay VibeBlock while you wait?" buttons {"Skip", "Play!"} default button "Play!" with title "VibeBlock" giving up after 15' \
    -e 'if gave up of d then error "gave up"' \
    -e 'button returned of d' \
    2>/dev/null) && [[ "$BTN" == "Play!" ]] && ANSWER="y" || true
else
  # Linux: respect VIBEBLOCK_AUTO env var or skip
  if [[ "${VIBEBLOCK_AUTO:-0}" == "1" ]]; then
    ANSWER="y"
  fi
fi

if [[ "$ANSWER" != "y" ]]; then
  exit 0
fi

# ── Write the status file ─────────────────────────────────────────────────────
STARTED_AT=$(date +%s%3N)   # epoch ms
cat > "$STATUS_FILE" <<EOF
{"status":"running","sessionId":"${SESSION_ID}","startedAt":${STARTED_AT}}
EOF

# ── If lobby window is already open, trigger it instead of spawning new terminal ──
LOBBY_FILE="/tmp/vibeblock-lobby.json"
TRIGGER_FILE="/tmp/vibeblock-trigger.json"

if [[ -f "$LOBBY_FILE" ]]; then
  LOBBY_PID=$(jq -r '.pid // ""' "$LOBBY_FILE" 2>/dev/null || true)
  if [[ -n "$LOBBY_PID" ]] && kill -0 "$LOBBY_PID" 2>/dev/null; then
    # Game window is alive in lobby — send it a trigger
    echo "{\"statusFile\":\"${STATUS_FILE}\",\"timestamp\":${STARTED_AT}}" > "$TRIGGER_FILE"
    exit 0
  fi
  # Stale lobby file — remove it
  rm -f "$LOBBY_FILE"
fi

# ── Build the game command ────────────────────────────────────────────────────
GAME_BIN="${PLUGIN_ROOT}/dist/cli.js"

GAME_CMD="node \"${GAME_BIN}\" --status-file \"${STATUS_FILE}\""

# ── Launch in the best available terminal ─────────────────────────────────────

# 1. tmux split pane (most common for developer workflows)
if [[ -n "${TMUX:-}" ]]; then
  tmux split-window -h "$GAME_CMD"
  exit 0
fi

# 2. macOS — open a new Terminal.app window
if [[ "$(uname)" == "Darwin" ]]; then
  osascript \
    -e 'tell application "Terminal"' \
    -e "do script \"${GAME_CMD//\"/\\\"}\"" \
    -e 'activate' \
    -e 'end tell' \
    > /dev/null 2>&1 || true
  exit 0
fi

# 3. Linux — try common terminal emulators
for TERM_EMU in gnome-terminal xterm kitty alacritty wezterm; do
  if command -v "$TERM_EMU" &>/dev/null; then
    case "$TERM_EMU" in
      gnome-terminal) "$TERM_EMU" -- bash -c "$GAME_CMD; exec bash" & ;;
      xterm)          "$TERM_EMU" -e bash -c "$GAME_CMD; exec bash" & ;;
      kitty)          "$TERM_EMU" bash -c "$GAME_CMD; exec bash" & ;;
      alacritty)      "$TERM_EMU" -e bash -c "$GAME_CMD; exec bash" & ;;
      wezterm)        "$TERM_EMU" start -- bash -c "$GAME_CMD; exec bash" & ;;
    esac
    exit 0
  fi
done

# 4. Fallback: run in background (no separate window)
# This won't show the UI but at least doesn't block Claude Code
echo "[vibeblock] No supported terminal found. Set up tmux for the best experience." >&2
exit 0
