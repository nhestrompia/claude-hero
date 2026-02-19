#!/usr/bin/env bash
# on-stop.sh — Stop hook for Claude Hero
#
# Fires when Claude Code finishes responding.
# Updates the status file so the game shows "Claude: DONE" and then
# exits naturally after the song ends.
#
# Receives JSON on stdin:
#   { "session_id": "...", "last_assistant_message": "...", ... }

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
STATUS_FILE="/tmp/claude-hero-${SESSION_ID}.json"

# Only update if the game is actually running for this session
if [[ -f "$STATUS_FILE" ]]; then
  # Preserve the startedAt timestamp
  STARTED_AT=$(jq -r '.startedAt // 0' < "$STATUS_FILE" 2>/dev/null || echo 0)
  cat > "$STATUS_FILE" <<EOF
{"status":"done","sessionId":"${SESSION_ID}","startedAt":${STARTED_AT}}
EOF
fi

exit 0
