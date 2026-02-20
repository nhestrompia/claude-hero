# VibeBlock

Play VibeBlock while Claude Code processes your request.

VibeBlock installs two hooks into Claude Code:

- **UserPromptSubmit** — offers to launch the game when you send a prompt
- **Stop** — signals the game when Claude finishes

## How it works

1. Ask Claude a question
2. A native dialog appears: **Play VibeBlock while you wait?**
3. Click **Play!** — the game opens in a new terminal pane / window
4. Stack blocks using WASD + Space while Claude thinks
5. Header shows **◌ SYNCING...** → **● DONE** when Claude finishes
6. Press **Q** to quit early

## Controls

| Key        | Action               |
| ---------- | -------------------- |
| A / ←      | Move left            |
| D / →      | Move right           |
| W / ↑      | Rotate               |
| S / ↓      | Soft drop            |
| Space      | Hard drop            |
| E          | Hold piece           |
| P          | Pause / resume       |
| M          | Toggle sound effects |
| Q / Ctrl+C | Quit                 |

## Scoring

| Lines cleared | Points (× level) |
| ------------- | ---------------- |
| 1 (Single)    | 100              |
| 2 (Double)    | 300              |
| 3 (Triple)    | 500              |
| 4 (Quad)      | 800              |

Consecutive-clear streak bonus: **+50 × combo × level** per clear.
Gravity speeds up every 10 lines cleared.

## Settings (lobby screen)

When the lobby is open (window waiting for Claude), press **S** to enter settings:

| Key | Setting                               |
| --- | ------------------------------------- |
| 1   | Toggle auto-stop when Claude finishes |
| 2   | Toggle sound effects (default: OFF)   |
| +/- | Starting level (1–10)                 |
| ESC | Back to lobby                         |

## Sound effects

Place three `.wav` files in the `sounds/` directory:

| File               | Plays when                   |
| ------------------ | ---------------------------- |
| `move.wav`         | Block moved / rotated / held |
| `clean.wav`        | Line(s) cleared              |
| `notification.wav` | Claude finishes              |

Sound is **disabled by default**. Toggle in-game with **M**.
